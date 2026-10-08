import { createAudioEngine } from '~/core/audio/engine'
import { createScheduler } from '~/core/audio/scheduler'
import type { Pattern } from '~/core/pattern'
import { nextStep, patternLength, resizeSteps, setPatternCounts, switchStep } from '~/core/pattern'
import type { CountingMode } from '~/core/resolve'
import { COUNTING_MODES, countingFigure, sampleUrls, stepNames, stepResolver } from '~/core/resolve'
import type { TempoChoice } from '~/core/tempo'
import { tempoChoice, tempoFor } from '~/core/tempo'
import type { Genre } from '~/genres'

/** Reverb wet level at the slider's top; beyond this the rhythm smears. */
const MAX_REVERB_WET = 0.6
/** Chance that `randomize` puts a hit on a step. */
const RANDOM_DENSITY = 0.25

/**
 * Pattern state + audio engine + scheduler for one genre page.
 * The AudioContext is only created on the first `play()` (from a user
 * gesture), so this is safe to call during SSR.
 *
 * `locale` is the language the counting voice speaks; it can change while
 * playing.
 */
export function useBeatMachine(genre: Genre, locale: Ref<string>) {
  const engine = createAudioEngine()
  const scheduler = createScheduler(engine)
  const resolveStep = stepResolver(genre, () => locale.value)
  /** The genre's counting voice track, if it has one. */
  const voiceInstrument = genre.instruments.find((instrument) => genre.spoken[instrument])

  const selectedPresetId = ref(genre.presets[0]!.id)
  const pattern = ref<Pattern>(structuredClone(genre.presets[0]!))
  const isPlaying = ref(false)
  /** The step currently sounding, for the playhead; -1 when stopped. */
  const activeStep = ref(-1)
  /** 0–1: how loosely the band plays (see humanizeNote). */
  const feel = ref(0.5)
  /** 0–1: room reverb on the mix; 1 maps to MAX_REVERB_WET. */
  const reverb = ref(0.35)

  /** Set once the audio graph exists (after the first play). */
  let started = false
  /** Playhead updates waiting for their step to sound. */
  const playheadTimers = new Set<ReturnType<typeof setTimeout>>()

  watch(feel, scheduler.setFeel, { immediate: true })
  watch(reverb, (amount) => {
    // Before the first play there's no audio graph yet; play() applies it.
    if (started) engine.setReverb(amount * MAX_REVERB_WET)
  })

  // The voice's words in the new language load in the background; until
  // they arrive the voice is skipped, the band keeps playing.
  watch(locale, () => {
    if (started) engine.preloadSamples(sampleUrls(genre, locale.value))
  })

  watch(selectedPresetId, (id) => {
    const preset = genre.presets.find((p) => p.id === id)
    if (!preset) return
    const wasPlaying = isPlaying.value
    stop()
    pattern.value = structuredClone(preset)
    if (wasPlaying) play()
  })

  const findTrack = (instrument: string) => pattern.value.tracks.find((t) => t.instrument === instrument)

  /** Moves the playhead when a scheduled step actually sounds, not when it's queued. */
  function showStep(stepIndex: number, time: number) {
    const timer = setTimeout(() => {
      playheadTimers.delete(timer)
      activeStep.value = stepIndex
    }, Math.max(0, (time - engine.now()) * 1000))
    playheadTimers.add(timer)
  }

  async function play() {
    // Already-loaded samples come from the engine's cache.
    await engine.preloadSamples(sampleUrls(genre, locale.value))
    started = true
    for (const track of pattern.value.tracks) {
      engine.setInstrumentVolume(track.instrument, track.volume)
      engine.setInstrumentMuted(track.instrument, track.muted)
    }
    engine.setReverb(reverb.value * MAX_REVERB_WET)
    await scheduler.start(pattern.value, resolveStep, showStep)
    isPlaying.value = true
  }

  function stop() {
    scheduler.stop()
    for (const timer of playheadTimers) clearTimeout(timer)
    playheadTimers.clear()
    isPlaying.value = false
    activeStep.value = -1
  }

  function setChord(bar: number, chord: string) {
    const { chords } = pattern.value
    if (chords && bar < chords.length) chords[bar] = chord
  }

  function toggleStep(instrument: string, stepIndex: number) {
    const track = findTrack(instrument)
    if (track) track.steps[stepIndex] = nextStep(track.steps[stepIndex] ?? null, stepNames(genre, instrument))
  }

  /**
   * Simple mode's click: on with the track's main sound, or off. Adding a
   * hit to a switched-off track switches it on, so the click is heard.
   */
  function switchStepOnOff(instrument: string, stepIndex: number) {
    const track = findTrack(instrument)
    if (!track) return
    track.steps[stepIndex] = switchStep(track.steps[stepIndex] ?? null, track.steps, stepNames(genre, instrument))
    if (track.steps[stepIndex] && track.muted) setMuted(instrument, false)
  }

  /** The tempo the selected preset is written at; the tempo buttons are relative to it. */
  const presetBpm = computed(() => genre.presets.find((p) => p.id === selectedPresetId.value)?.bpm ?? pattern.value.bpm)
  const tempo = computed(() => tempoChoice(pattern.value.bpm, presetBpm.value, genre.bpmRange))

  function setTempo(choice: TempoChoice) {
    pattern.value.bpm = tempoFor(choice, presetBpm.value, genre.bpmRange)
  }

  function setVolume(instrument: string, volume: number) {
    const track = findTrack(instrument)
    if (!track) return
    track.volume = volume
    engine.setInstrumentVolume(instrument, volume)
  }

  function setMuted(instrument: string, muted: boolean) {
    const track = findTrack(instrument)
    if (!track) return
    track.muted = muted
    engine.setInstrumentMuted(instrument, muted)
  }

  /** Which counting preset the voice track matches, if any (it can also be edited cell by cell). */
  const countingMode = computed((): CountingMode | undefined => {
    const track = voiceInstrument && findTrack(voiceInstrument)
    if (!track) return undefined
    if (track.muted) return 'off'
    const length = patternLength(pattern.value)
    return COUNTING_MODES.find((mode) => {
      const steps = resizeSteps(countingFigure(mode, pattern.value.stepsPerCount), length)
      return steps.every((step, i) => step === track.steps[i])
    })
  })

  function setCounting(mode: CountingMode) {
    const track = voiceInstrument && findTrack(voiceInstrument)
    if (!track) return
    track.steps = resizeSteps(countingFigure(mode, pattern.value.stepsPerCount), patternLength(pattern.value))
    setMuted(track.instrument, mode === 'off')
  }

  function randomize() {
    for (const track of pattern.value.tracks) {
      const names = stepNames(genre, track.instrument)
      // The voice is a guide, not part of the groove: leave it alone.
      if (track.muted || names.length === 0 || track.instrument === voiceInstrument) continue
      track.steps = track.steps.map(() => (Math.random() < RANDOM_DENSITY ? names[Math.floor(Math.random() * names.length)]! : null))
    }
  }

  /** Silences every instrument but the counting voice (use the voice control for that). */
  function clear() {
    for (const track of pattern.value.tracks) {
      if (track.instrument !== voiceInstrument) track.steps = track.steps.map(() => null)
    }
  }

  onBeforeUnmount(() => {
    stop()
    engine.dispose()
  })

  return {
    /** Edit freely: the scheduler reads it live, so changes (tempo included) apply while playing. */
    pattern,
    selectedPresetId,
    isPlaying: readonly(isPlaying),
    activeStep: readonly(activeStep),
    feel,
    reverb,
    play,
    stop,
    /** In place, so a running loop picks the new length up on its next tick. */
    setCounts: (counts: number) => setPatternCounts(pattern.value, counts),
    setChord,
    toggleStep,
    switchStep: switchStepOnOff,
    /** Slow / normal / fast, or undefined when the slider set some other tempo. */
    tempo,
    setTempo,
    setVolume,
    setMuted,
    hasVoice: voiceInstrument !== undefined,
    countingMode,
    setCounting,
    randomize,
    clear,
  }
}
