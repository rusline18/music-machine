import { createAudioEngine } from '~/core/audio/engine'
import { createScheduler } from '~/core/audio/scheduler'
import { layerOrder } from '~/core/layers'
import type { Pattern } from '~/core/pattern'
import { nextStep, patternLength, resizeSteps, setPatternCounts, switchStep } from '~/core/pattern'
import type { CountingMode } from '~/core/resolve'
import { decodePattern, encodePattern } from '~/core/share'
import { COUNTING_MODES, countingFigure, sampleUrls, stepNames, stepResolver } from '~/core/resolve'
import type { TempoChoice } from '~/core/tempo'
import { tempoChoice, tempoFor } from '~/core/tempo'
import type { Genre } from '~/genres'

/** Reverb wet level at the slider's top; beyond this the rhythm smears. */
const MAX_REVERB_WET = 0.6
/** Chance that `randomize` puts a hit on a step. */
const RANDOM_DENSITY = 0.25

/** Query parameter carrying a shared pattern: /salsa?p=… */
export const SHARE_PARAM = 'p'
const storageKey = (genreId: string) => `latin-beat-machine:pattern:${genreId}`

/**
 * Pattern state + audio engine + scheduler for one genre page.
 * Samples start downloading on mount, but the AudioContext is only created
 * on the first `play()` (from a user gesture), so this is safe to call
 * during SSR.
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

  /**
   * "Layer by layer": the instruments to bring in, and how many are in so
   * far. Null when the guide isn't running.
   */
  const layers = ref<{ order: string[], added: number } | null>(null)

  /** Set once the audio graph exists (after the first play). */
  let started = false

  const urls = () => [...sampleUrls(genre, locale.value)]
  /** Samples whose download has finished (or failed), for the progress bar. */
  const samplesFetched = ref(0)
  const sampleCount = ref(urls().length)
  /** 0–1 share of the samples downloaded so far. */
  const loadProgress = computed(() => Math.min(1, samplesFetched.value / sampleCount.value))
  /** Play was pressed and is waiting for samples. */
  const isLoading = ref(false)
  /** Samples the last load gave up on; they stay silent until the next Play retries them. */
  const failedSamples = ref(0)
  /** Set once every sample of the current language is decoded. */
  let samplesLoaded = false

  /** The language whose samples are downloading, so each set is fetched once. */
  let prefetchedLocale: string | undefined

  /** Download (not decode) the samples; needs no AudioContext, so it can run before any click. */
  function prefetch() {
    if (prefetchedLocale === locale.value) return
    prefetchedLocale = locale.value
    const list = urls()
    sampleCount.value = list.length
    samplesFetched.value = 0
    engine.prefetchSamples(list, () => {
      samplesFetched.value++
    })
  }

  onMounted(prefetch)
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
    samplesLoaded = false
    if (started) engine.preloadSamples(urls())
    else prefetch()
  })

  /** Swap in a new pattern, carrying on playing if we were. */
  function loadPattern(next: Pattern) {
    layers.value = null
    const wasPlaying = isPlaying.value
    stop()
    pattern.value = next
    selectedPresetId.value = next.id
    if (wasPlaying) play()
  }

  function selectPreset(id: string) {
    const preset = genre.presets.find((p) => p.id === id)
    if (preset) loadPattern(structuredClone(preset))
  }

  /** Undo edits: back to the preset this pattern started from (or the first one). */
  function reset() {
    selectPreset(genre.presets.some((p) => p.id === pattern.value.id) ? pattern.value.id : genre.presets[0]!.id)
  }

  /** Code for a link to the current pattern (see core/share.ts). */
  const shareCode = computed(() => encodePattern(pattern.value, genre))

  // A link wins over the last visit's pattern. Both are read after
  // mounting: the server has no localStorage, and rendering the preset
  // first keeps hydration consistent.
  const route = useRoute()
  const router = useRouter()
  onMounted(() => {
    const fromLink = route.query[SHARE_PARAM]
    let restored: Pattern | null = null
    if (typeof fromLink === 'string') {
      restored = decodePattern(fromLink, genre)
      // Drop the code from the address bar: edits from here on are the
      // user's own and get saved locally instead.
      const { [SHARE_PARAM]: _, ...query } = route.query
      router.replace({ query })
    }
    if (!restored) {
      try {
        const saved = localStorage.getItem(storageKey(genre.id))
        if (saved) restored = decodePattern(saved, genre)
      } catch { /* storage blocked: start from the preset */ }
    }
    if (restored) loadPattern(restored)
  })

  // Only edits are kept: an untouched preset isn't stored, so it picks up
  // fixes to the preset data on the next visit.
  watch(shareCode, (code) => {
    const preset = genre.presets.find((p) => p.id === pattern.value.id)
    try {
      if (preset && encodePattern(preset, genre) === code) localStorage.removeItem(storageKey(genre.id))
      else localStorage.setItem(storageKey(genre.id), code)
    } catch { /* storage full or blocked: nothing to save to */ }
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

  /** Bumped by every play/stop/unmount, so a play still waiting on samples knows it was superseded. */
  let playRequest = 0

  async function play() {
    if (isLoading.value) return
    const request = ++playRequest
    // Create and unlock the AudioContext inside the click itself: Safari
    // refuses to start one after a long await on the network.
    const unlocked = engine.resume()
    isLoading.value = !samplesLoaded
    prefetch()
    const list = urls()
    try {
      // Already-loaded samples come from the engine's cache.
      const failed = await engine.preloadSamples(list)
      failedSamples.value = failed.length
      samplesLoaded = failed.length === 0
      await unlocked
    } finally {
      if (request === playRequest) isLoading.value = false
    }
    // Stopped, or left the page, while loading; or nothing to play at all.
    if (request !== playRequest || failedSamples.value === list.length) return
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
    playRequest++
    isLoading.value = false
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

  /**
   * Starts "layer by layer": silences the band but the first instrument
   * (the counting voice is left as it is) and starts playing.
   */
  function startLayers() {
    const order = layerOrder(pattern.value, genre.teachingOrder)
    if (order.length === 0) return
    for (const track of pattern.value.tracks) {
      if (track.instrument !== voiceInstrument) setMuted(track.instrument, track.instrument !== order[0])
    }
    layers.value = { order, added: 1 }
    if (!isPlaying.value) play()
  }

  function addLayer() {
    const next = layers.value?.order[layers.value.added]
    if (!next) return
    setMuted(next, false)
    layers.value!.added++
  }

  /** Ends the guide; with `addRest`, brings in every instrument it hadn't reached. */
  function endLayers(addRest: boolean) {
    if (addRest) for (const instrument of layers.value?.order ?? []) setMuted(instrument, false)
    layers.value = null
  }

  onBeforeUnmount(() => {
    stop()
    engine.dispose()
  })

  return {
    /** Edit freely: the scheduler reads it live, so changes (tempo included) apply while playing. */
    pattern,
    /** The preset the pattern started from, or CUSTOM_PATTERN_ID for one from a link. */
    selectedPresetId: readonly(selectedPresetId),
    selectPreset,
    reset,
    shareCode,
    isPlaying: readonly(isPlaying),
    isLoading: readonly(isLoading),
    loadProgress,
    failedSamples: readonly(failedSamples),
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
    layers: readonly(layers),
    startLayers,
    addLayer,
    endLayers,
  }
}
