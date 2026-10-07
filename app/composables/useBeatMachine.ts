import type { Genre, Pattern } from './usePattern'
import { clonePattern } from './usePattern'
import { genreConfig } from '../data/genres'
import { salsaPatterns } from '../data/salsa/patterns'
import { bachataPatterns } from '../data/bachata/patterns'
import { useAudioEngine } from './useAudioEngine'
import { useBeatScheduler } from './useBeatScheduler'

const presetsByGenre: Record<Genre, Pattern[]> = {
  salsa: salsaPatterns,
  bachata: bachataPatterns,
}

/**
 * Wires pattern state + audio engine + scheduler together for a genre page.
 * The AudioContext is only created lazily on the first `play()` (from a user
 * gesture), so this composable is safe to call during SSR — nothing here
 * touches `window`/`AudioContext` until the component is interactive.
 */
export function useBeatMachine(genre: Genre) {
  const config = genreConfig[genre]
  const presets = presetsByGenre[genre]

  const selectedPatternId = ref(presets[0]!.id)
  const pattern = ref<Pattern>(clonePattern(presets[0]!))

  const engine = useAudioEngine()
  const scheduler = useBeatScheduler(engine)

  const samplesLoaded = ref(false)

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
    const urls = Object.values(config.samples).flatMap((sampleMap) => Object.values(sampleMap))
    await engine.preloadSamples(urls)
    samplesLoaded.value = true
  }

  function syncTrackGains() {
    for (const track of pattern.value.tracks) {
      engine.setInstrumentVolume(track.instrument, track.volume)
      engine.setInstrumentMuted(track.instrument, track.muted)
    }
  }

  async function play() {
    await ensureSamplesLoaded()
    syncTrackGains()
    await scheduler.start(pattern.value, config.samples as Record<string, Record<string, string>>)
  }

  function stop() {
    scheduler.stop()
  }

  function setBpm(bpm: number) {
    pattern.value.bpm = bpm
    scheduler.setBpm(bpm)
  }

  function toggleStep(instrument: string, stepIndex: number) {
    const track = pattern.value.tracks.find((t) => t.instrument === instrument)
    if (!track) return
    const sampleNames = Object.keys(config.samples[instrument as keyof typeof config.samples] ?? {})
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
      const sampleNames = Object.keys(config.samples[track.instrument as keyof typeof config.samples] ?? {})
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
    scheduler.stop()
    engine.dispose()
  })

  return {
    config,
    presets,
    selectedPatternId,
    pattern,
    isPlaying: scheduler.isPlaying,
    activeStep: scheduler.activeStep,
    play,
    stop,
    setBpm,
    toggleStep,
    updateVolume,
    updateMuted,
    randomize,
    clear,
  }
}
