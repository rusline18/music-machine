import { createAudioEngine } from '~/core/audio/engine'
import { createScheduler } from '~/core/audio/scheduler'
import type { Pattern } from '~/core/pattern'
import { nextStep, setPatternCounts } from '~/core/pattern'
import { sampleUrls, stepNames, stepResolver } from '~/core/resolve'
import type { Genre } from '~/genres'

/** Reverb wet level at the slider's top; beyond this the rhythm smears. */
const MAX_REVERB_WET = 0.6
/** Chance that `randomize` puts a hit on a step. */
const RANDOM_DENSITY = 0.25

/**
 * Pattern state + audio engine + scheduler for one genre page.
 * The AudioContext is only created on the first `play()` (from a user
 * gesture), so this is safe to call during SSR.
 */
export function useBeatMachine(genre: Genre) {
  const engine = createAudioEngine()
  const scheduler = createScheduler(engine)
  const resolveStep = stepResolver(genre)

  const selectedPresetId = ref(genre.presets[0]!.id)
  const pattern = ref<Pattern>(structuredClone(genre.presets[0]!))
  const isPlaying = ref(false)
  /** The step currently sounding, for the playhead; -1 when stopped. */
  const activeStep = ref(-1)
  /** 0–1: how loosely the band plays (see humanizeNote). */
  const feel = ref(0.5)
  /** 0–1: room reverb on the mix; 1 maps to MAX_REVERB_WET. */
  const reverb = ref(0.35)

  let samplesLoaded = false
  /** Playhead updates waiting for their step to sound. */
  const playheadTimers = new Set<ReturnType<typeof setTimeout>>()

  watch(feel, scheduler.setFeel, { immediate: true })
  watch(reverb, (amount) => {
    // Before the first play there's no audio graph yet; play() applies it.
    if (samplesLoaded) engine.setReverb(amount * MAX_REVERB_WET)
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
    if (!samplesLoaded) {
      await engine.preloadSamples(sampleUrls(genre))
      samplesLoaded = true
    }
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

  function randomize() {
    for (const track of pattern.value.tracks) {
      const names = stepNames(genre, track.instrument)
      if (track.muted || names.length === 0) continue
      track.steps = track.steps.map(() => (Math.random() < RANDOM_DENSITY ? names[Math.floor(Math.random() * names.length)]! : null))
    }
  }

  function clear() {
    for (const track of pattern.value.tracks) track.steps = track.steps.map(() => null)
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
    setVolume,
    setMuted,
    randomize,
    clear,
  }
}
