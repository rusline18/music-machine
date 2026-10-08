import type { Genre, Pattern } from './usePattern'
import { clonePattern, COUNTS_PER_BAR, resizeSteps } from './usePattern'
import { genreConfig, stepNames, stepResolver } from '../data/genres'
import { salsaPatterns } from '../data/salsa/patterns'
import { bachataPatterns } from '../data/bachata/patterns'
import { useAudioEngine } from './useAudioEngine'
import { useBeatScheduler } from './useBeatScheduler'
import { decodePattern, encodePattern } from '../data/share'

/** Reverb wet level at the slider's top; beyond this the rhythm smears. */
const MAX_REVERB_WET = 0.6

/** Query parameter carrying a shared pattern: /salsa?p=… */
export const SHARE_PARAM = 'p'
const storageKey = (genre: Genre) => `latin-beat-machine:pattern:${genre}`

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

  /** Presets for the picker, plus the current pattern if it came from a link and isn't one of them. */
  const patternOptions = computed(() =>
    presets.some((p) => p.id === pattern.value.id) ? presets : [...presets, pattern.value],
  )

  /** Swap in a new pattern, carrying on playing if we were. */
  function loadPattern(next: Pattern) {
    const wasPlaying = scheduler.isPlaying.value
    if (wasPlaying) scheduler.stop()
    pattern.value = next
    selectedPatternId.value = next.id
    if (wasPlaying) play()
  }

  function selectPreset(id: string) {
    const preset = presets.find((p) => p.id === id)
    if (preset) loadPattern(clonePattern(preset))
  }

  /** Undo edits: back to the preset this pattern started from (or the first one). */
  function reset() {
    selectPreset(presets.some((p) => p.id === pattern.value.id) ? pattern.value.id : presets[0]!.id)
  }

  /** Code for a link to the current pattern (see data/share.ts). */
  const shareCode = computed(() => encodePattern(pattern.value, config))

  // A link wins over the last session's pattern. Both are read after
  // mounting: the server has no localStorage, and rendering the preset
  // first keeps hydration consistent.
  const route = useRoute()
  const router = useRouter()
  onMounted(() => {
    const fromLink = route.query[SHARE_PARAM]
    let restored: Pattern | null = null
    if (typeof fromLink === 'string') {
      restored = decodePattern(fromLink, genre, config)
      // Drop the code from the address bar: edits from here on are the
      // user's own and get saved locally instead.
      const { [SHARE_PARAM]: _, ...query } = route.query
      router.replace({ query })
    }
    if (!restored) {
      try {
        const saved = localStorage.getItem(storageKey(genre))
        if (saved) restored = decodePattern(saved, genre, config)
      }
      catch { /* storage blocked: start from the preset */ }
    }
    if (restored) loadPattern(restored)
  })

  // Only edits are kept: an untouched preset isn't stored, so it picks up
  // fixes to the preset data on the next visit.
  watch(shareCode, (code) => {
    const preset = presets.find((p) => p.id === pattern.value.id)
    try {
      if (preset && encodePattern(preset, config) === code) localStorage.removeItem(storageKey(genre))
      else localStorage.setItem(storageKey(genre), code)
    }
    catch { /* storage full or blocked: nothing to save to */ }
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
    patternOptions,
    selectedPatternId,
    selectPreset,
    reset,
    shareCode,
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
