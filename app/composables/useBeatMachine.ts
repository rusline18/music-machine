import type { Genre, Pattern } from './usePattern'
import { clonePattern, COUNTS_PER_BAR, resizeSteps } from './usePattern'
import { genreConfig, stepNames, stepResolver } from '../data/genres'
import { salsaPatterns } from '../data/salsa/patterns'
import { bachataPatterns } from '../data/bachata/patterns'
import { useAudioEngine } from './useAudioEngine'
import { useBeatScheduler } from './useBeatScheduler'

/** Reverb wet level at the slider's top; beyond this the rhythm smears. */
const MAX_REVERB_WET = 0.6

const presetsByGenre: Record<Genre, Pattern[]> = {
  salsa: salsaPatterns,
  bachata: bachataPatterns,
}

/**
 * Wires pattern state + audio engine + scheduler together for a genre page.
 * Samples start downloading on mount, but the AudioContext is only created
 * on the first `play()` (from a user gesture), so this composable is safe to
 * call during SSR — nothing here touches `window`/`AudioContext` until the
 * component is mounted.
 */
export function useBeatMachine(genre: Genre) {
  const config = genreConfig[genre]
  const presets = presetsByGenre[genre]

  const selectedPatternId = ref(presets[0]!.id)
  const pattern = ref<Pattern>(clonePattern(presets[0]!))

  const engine = useAudioEngine()
  const scheduler = useBeatScheduler(engine)

  const samplesLoaded = ref(false)
  const resolveStep = stepResolver(config)

  const sampleUrls = [...new Set(Object.values(config.samples).flatMap((sampleMap) => Object.values(sampleMap).flat()))]
  /** Samples whose download has finished (or failed), for the progress bar. */
  const samplesFetched = ref(0)
  /** 0–1 share of the genre's samples downloaded so far. */
  const loadProgress = computed(() => samplesFetched.value / sampleUrls.length)
  /** Play was pressed and is waiting for samples. */
  const isLoading = ref(false)
  /** Samples the last load gave up on; they stay silent until the next Play retries them. */
  const failedSamples = ref(0)
  let prefetchStarted = false

  /** Download (not decode) every sample; safe before any click, as it needs no AudioContext. */
  function prefetch() {
    if (prefetchStarted) return
    prefetchStarted = true
    engine.prefetchSamples(sampleUrls, () => {
      samplesFetched.value++
    })
  }

  onMounted(prefetch)

  /** 0–1: how loosely the band plays (see humanizeNote). */
  const feel = ref(0.5)
  /** 0–1: room reverb on the mix; 1 maps to MAX_REVERB_WET. */
  const reverb = ref(0.35)
  scheduler.setFeel(feel.value)

  function stepNamesFor(instrument: string): string[] {
    return stepNames(config, instrument)
  }

  watch(selectedPatternId, (id) => {
    const preset = presets.find((p) => p.id === id)
    if (!preset) return
    const wasPlaying = scheduler.isPlaying.value
    if (wasPlaying) scheduler.stop()
    pattern.value = clonePattern(preset)
    if (wasPlaying) play()
  })

  async function ensureSamplesLoaded() {
    if (samplesLoaded.value) return
    prefetch()
    const failed = await engine.preloadSamples(sampleUrls)
    failedSamples.value = failed.length
    samplesLoaded.value = failed.length === 0
  }

  function syncTrackGains() {
    for (const track of pattern.value.tracks) {
      engine.setInstrumentVolume(track.instrument, track.volume)
      engine.setInstrumentMuted(track.instrument, track.muted)
    }
  }

  /** Bumped by every play/stop/unmount, so a play still waiting on samples knows it was superseded. */
  let playRequest = 0

  async function play() {
    if (isLoading.value) return
    const request = ++playRequest
    // Create and unlock the AudioContext inside the click itself: Safari
    // refuses to start one after a long await on the network.
    const unlocked = engine.resume()
    isLoading.value = !samplesLoaded.value
    try {
      await ensureSamplesLoaded()
      await unlocked
    } finally {
      if (request === playRequest) isLoading.value = false
    }
    // Stopped, or left the page, while loading; or nothing to play at all.
    if (request !== playRequest || failedSamples.value === sampleUrls.length) return
    syncTrackGains()
    engine.setReverb(reverb.value * MAX_REVERB_WET)
    await scheduler.start(pattern.value, resolveStep)
  }

  function stop() {
    playRequest++
    isLoading.value = false
    scheduler.stop()
  }

  function setFeel(amount: number) {
    feel.value = amount
    scheduler.setFeel(amount)
  }

  function setReverb(amount: number) {
    reverb.value = amount
    // Before the first play there's no audio graph yet; play() applies it.
    if (samplesLoaded.value) engine.setReverb(amount * MAX_REVERB_WET)
  }

  function setBpm(bpm: number) {
    pattern.value.bpm = bpm
    scheduler.setBpm(bpm)
  }

  /**
   * Change the loop length in counts. Mutates the pattern in place so a
   * running scheduler picks it up on its next tick without restarting.
   */
  function setCounts(counts: number) {
    const length = counts * pattern.value.stepsPerCount
    for (const track of pattern.value.tracks) {
      track.steps = resizeSteps(track.steps, length)
    }
    const { chords } = pattern.value
    if (chords?.length) {
      pattern.value.chords = resizeSteps(chords, counts / COUNTS_PER_BAR).map((chord) => chord ?? chords[0]!)
    }
    pattern.value.counts = counts
  }

  function setChord(bar: number, chord: string) {
    const chords = pattern.value.chords
    if (chords && bar < chords.length) chords[bar] = chord
  }

  function toggleStep(instrument: string, stepIndex: number) {
    const track = pattern.value.tracks.find((t) => t.instrument === instrument)
    if (!track) return
    const sampleNames = stepNamesFor(instrument)
    if (sampleNames.length === 0) return
    const current = track.steps[stepIndex]
    const currentIndex = current ? sampleNames.indexOf(current) : -1
    const nextIndex = currentIndex + 1
    track.steps[stepIndex] = nextIndex >= sampleNames.length ? null : sampleNames[nextIndex]!
  }

  function updateVolume(instrument: string, volume: number) {
    const track = pattern.value.tracks.find((t) => t.instrument === instrument)
    if (!track) return
    track.volume = volume
    engine.setInstrumentVolume(instrument, volume)
  }

  function updateMuted(instrument: string, muted: boolean) {
    const track = pattern.value.tracks.find((t) => t.instrument === instrument)
    if (!track) return
    track.muted = muted
    engine.setInstrumentMuted(instrument, muted)
  }

  function randomize() {
    for (const track of pattern.value.tracks) {
      if (track.muted) continue
      const sampleNames = stepNamesFor(track.instrument)
      if (sampleNames.length === 0) continue
      track.steps = track.steps.map(() => (Math.random() > 0.75 ? sampleNames[Math.floor(Math.random() * sampleNames.length)]! : null))
    }
  }

  function clear() {
    for (const track of pattern.value.tracks) {
      track.steps = track.steps.map(() => null)
    }
  }

  onUnmounted(() => {
    stop()
    engine.dispose()
  })

  return {
    config,
    presets,
    selectedPatternId,
    pattern,
    isPlaying: scheduler.isPlaying,
    isLoading,
    loadProgress,
    failedSamples,
    activeStep: scheduler.activeStep,
    play,
    stop,
    setBpm,
    setCounts,
    setChord,
    feel,
    setFeel,
    reverb,
    setReverb,
    stepNamesFor,
    toggleStep,
    updateVolume,
    updateMuted,
    randomize,
    clear,
  }
}
