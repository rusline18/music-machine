import { createAudioEngine } from '~/core/audio/engine'
import type { Beat } from '~/core/audio/playhead'
import { createPlayhead } from '~/core/audio/playhead'
import { createScheduler } from '~/core/audio/scheduler'
import { layerOrder } from '~/core/layers'
import type { Pattern } from '~/core/pattern'
import { patternLength, resizeSteps, setPatternCounts, switchStep, trackOf } from '~/core/pattern'
import type { CountingMode } from '~/core/resolve'
import { unpackPattern } from '~/core/compactPattern'
import { decodePattern, encodePattern } from '~/core/share'
import { packCode, unpackCode } from '~/core/telegram'
import type { SectionFit } from '~/core/song'
import { buildSong, sectionFit, songBpm } from '~/core/song'
import { COUNTING_MODES, countingFigure, patternSampleUrls, sampleUrls, stepNames, stepNamesAt, stepResolver } from '~/core/resolve'
import type { TempoChoice } from '~/core/tempo'
import { nudgeBpm, tempoChoice, tempoFor } from '~/core/tempo'
import type { Genre } from '~/genres'

/**
 * How loosely the band plays (0–1, see humanizeNote) and how much room
 * reverb is on the mix (wet level). Fixed: as sliders they taught nothing.
 */
const FEEL = 0.5
const REVERB_WET = 0.21
/** Chance that `randomize` puts a hit on a step. */
const RANDOM_DENSITY = 0.25
/** How long the music fades out when the page is left while it plays: about the curtain closing. */
const LEAVE_FADE_SECONDS = 0.4

/** Query parameter carrying a shared pattern, packed by packPattern (core/compactPattern.ts): /salsa?b=… */
export const SHARE_PARAM = 'b'
/** The same as a share.ts code: older links, and browsers that can't compress. */
export const SHARE_CODE_PARAM = 'p'
const storageKey = (genreId: string) => `latin-beat-machine:pattern:${genreId}`
/** The same pattern in the user's Telegram cloud (CloudStorage keys: letters, digits, _ and -). */
const cloudKey = (genreId: string) => `pattern-${genreId}`
/** Edits come in bursts of taps: the cloud is written once they pause. */
const CLOUD_SAVE_DELAY_MS = 1000

/**
 * Pattern state + audio engine + scheduler for one genre page.
 * Samples start downloading on mount, but the AudioContext is only created
 * on the first `play()` (from a user gesture), so this is safe to call
 * during SSR.
 *
 * `locale` is the language the counting voice speaks; it can change while
 * playing.
 *
 * With `persist: false` (an instrument page, whose presets are that
 * instrument's rhythms) the pattern isn't saved, nor restored from a link
 * or the last visit: the genre page's own pattern is left alone.
 */
export function useBeatMachine(genre: Genre, locale: Ref<string>, { persist = true }: { persist?: boolean } = {}) {
  const engine = createAudioEngine()
  for (const [instrument, { tone }] of Object.entries(genre.pitched)) if (tone) engine.setInstrumentTone(instrument, tone)
  const scheduler = createScheduler(engine)
  const resolveStep = stepResolver(genre, () => locale.value)
  /** The genre's counting voice track, if it has one. */
  const voiceInstrument = genre.instruments.find((instrument) => genre.spoken[instrument])

  const selectedPresetId = ref(genre.presets[0]!.id)
  const pattern = ref<Pattern>(structuredClone(genre.presets[0]!))
  const isPlaying = ref(false)
  /** The step currently sounding, for the playhead; -1 when stopped. */
  const activeStep = ref(-1)
  /** The instrument heard on its own ("listen alone"), or null for the whole band. */
  const solo = ref<string | null>(null)
  /** Set when soloing started playback, so ending the solo stops it again. */
  let soloStartedPlay = false

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

  /**
   * Decodes every sample in the background, once playback has started with
   * the ones the pattern needs. A sound put in before it arrives is skipped
   * until then.
   */
  async function loadTheRest() {
    const failed = await engine.preloadSamples(urls())
    failedSamples.value = failed.length
    samplesLoaded = failed.length === 0
  }

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

  /** Called with each step as it's heard, and with null on stop. */
  const beatListeners = new Set<(beat: Beat | null) => void>()
  const playhead = createPlayhead(() => engine.now() - engine.outputLatency(), (beat) => {
    activeStep.value = beat.step
    for (const listener of beatListeners) listener(beat)
  })

  scheduler.setFeel(FEEL)

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

  /** Undo edits: back to the preset (or the song) this pattern started from, or the first preset. */
  function reset() {
    if (pattern.value.sections) loadSong(pattern.value.sections, { keepTempo: false })
    else selectPreset(genre.presets.some((p) => p.id === pattern.value.id) ? pattern.value.id : genre.presets[0]!.id)
  }

  /** The sections of the song being played, or null when it's a single preset. */
  const song = computed(() => pattern.value.sections ?? null)

  /**
   * Builds the song and loads it. A change to a song that's already
   * loaded keeps the tempo the user set; grid edits start over.
   */
  function loadSong(sections: readonly string[], { keepTempo = true } = {}) {
    const next = buildSong(genre, sections)
    if (keepTempo && song.value) next.bpm = pattern.value.bpm
    loadPattern(next)
  }

  /** Starts a song from the current preset (or the first one, if this pattern isn't a preset). */
  function startSong() {
    const id = pattern.value.id
    loadSong([genre.presets.some((p) => p.id === id) ? id : genre.presets[0]!.id])
  }

  /** For each preset: whether it can be added to the song now, or why not. */
  const sectionFits = computed(() => new Map<string, SectionFit>(
    genre.presets.map((preset) => [preset.id, sectionFit(genre, song.value ?? [], preset.id)]),
  ))

  function addSection(id: string) {
    if (song.value && sectionFits.value.get(id) === 'ok') loadSong([...song.value, id])
  }

  function removeSection(index: number) {
    if (song.value && song.value.length > 1) loadSong(song.value.filter((_, i) => i !== index))
  }

  /** Code for a link to the current pattern (see core/share.ts). */
  const shareCode = computed(() => encodePattern(pattern.value, genre))

  // A link wins over the last visit's pattern. Both are read after
  // mounting: the server has no localStorage, and rendering the preset
  // first keeps hydration consistent.
  const route = useRoute()
  const router = useRouter()
  onMounted(async () => {
    if (!persist) return
    const { [SHARE_PARAM]: packed, [SHARE_CODE_PARAM]: code, ...query } = route.query
    const fromLink = typeof packed === 'string' || typeof code === 'string'
    let restored: Pattern | null = null
    if (fromLink) {
      // Drop the code from the address bar: edits from here on are the
      // user's own and get saved locally instead.
      router.replace({ query })
      const before = shareCode.value
      restored = typeof packed === 'string' ? await unpackPattern(packed, genre) : decodePattern(code as string, genre)
      // Unpacking waits for the browser: a tap on the grid meanwhile wins.
      if (shareCode.value !== before) return
    }
    if (!restored) {
      try {
        const saved = localStorage.getItem(storageKey(genre.id))
        if (saved) restored = decodePattern(saved, genre)
      } catch { /* storage blocked: start from the preset */ }
    }
    if (restored) loadPattern(restored)
    if (!fromLink && inTelegram()) restoreFromCloud()
  })

  // Inside Telegram the pattern is also kept in the user's Telegram cloud,
  // so it follows them from phone to computer. The cloud copy wins over
  // this device's, unless the user has started editing before it arrives.
  let cloudRead: Promise<void> = Promise.resolve()
  function restoreFromCloud() {
    const before = shareCode.value
    cloudRead = (async () => {
      const packed = await cloudGet(cloudKey(genre.id))
      const code = packed && await unpackCode(packed)
      const fromCloud = code && decodePattern(code, genre)
      if (fromCloud && shareCode.value === before) loadPattern(fromCloud)
    })()
  }

  /** Bumped by every save, so a slower, older one gives way. */
  let cloudSaves = 0
  let cloudTimer: ReturnType<typeof setTimeout> | undefined
  /** Saves `code` to the cloud, or removes it for null (an untouched preset). */
  function saveToCloud(code: string | null) {
    if (!inTelegram()) return
    const save = ++cloudSaves
    clearTimeout(cloudTimer)
    cloudTimer = setTimeout(async () => {
      // Not before the cloud's own copy is in, or this device's older one would overwrite it.
      await cloudRead
      const packed = code === null ? null : await packCode(code)
      if (save !== cloudSaves) return
      if (code === null) cloudSet(cloudKey(genre.id), null)
      // Too long for a cloud value (a long song), or no compression on this phone: this device only.
      else if (packed && packed.length <= CLOUD_VALUE_MAX) cloudSet(cloudKey(genre.id), packed)
    }, CLOUD_SAVE_DELAY_MS)
  }

  /** Presets never change (loading one clones it), so each one's code is worked out once. */
  const presetCodes = new Map<string, string>()
  function presetCode(id: string): string | undefined {
    const preset = genre.presets.find((p) => p.id === id)
    if (!preset) return undefined
    let code = presetCodes.get(id)
    if (code === undefined) presetCodes.set(id, (code = encodePattern(preset, genre)))
    return code
  }

  // Only edits are kept: an untouched preset isn't stored, so it picks up
  // fixes to the preset data on the next visit.
  watch(shareCode, (code) => {
    if (!persist) return
    const edited = presetCode(pattern.value.id) !== code
    try {
      if (edited) localStorage.setItem(storageKey(genre.id), code)
      else localStorage.removeItem(storageKey(genre.id))
    } catch { /* storage full or blocked: nothing to save to */ }
    saveToCloud(edited ? code : null)
  })

  const findTrack = (instrument: string) => trackOf(pattern.value, instrument)

  /** Moves the playhead when a scheduled step actually sounds, not when it's queued. */
  function showStep(step: number, time: number, instruments: string[]) {
    playhead.push({ step, time, instruments })
  }

  /**
   * Run `listener` on every step as it's heard (on an animation frame, in
   * time with the sound) and with null on stop. For effects that touch the
   * DOM directly, so the grid isn't re-rendered on every step. Returns the
   * unsubscribe function; listeners are also dropped on unmount.
   */
  function onBeat(listener: (beat: Beat | null) => void) {
    beatListeners.add(listener)
    return () => beatListeners.delete(listener)
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
    // Only what this pattern plays is waited for; the rest follows once it's playing.
    const needed = [...patternSampleUrls(genre, pattern.value, locale.value)]
    try {
      // Already-loaded samples come from the engine's cache.
      const loading = engine.preloadSamples(needed)
      // The room is worked out while the samples load, not after them.
      engine.setReverb(REVERB_WET)
      const failed = await loading
      failedSamples.value = failed.length
      await unlocked
    } finally {
      if (request === playRequest) isLoading.value = false
    }
    // Stopped, or left the page, while loading; or nothing to play at all.
    if (request !== playRequest || (needed.length > 0 && failedSamples.value === needed.length)) return
    started = true
    if (!samplesLoaded) loadTheRest()
    for (const track of pattern.value.tracks) {
      engine.setInstrumentVolume(track.instrument, track.volume)
      applyMuted(track.instrument)
    }
    // The raw pattern: the scheduler reads it on every step, and edits made
    // through the reactive one land in the same object.
    await scheduler.start(toRaw(pattern.value), resolveStep, showStep)
    isPlaying.value = true
  }

  function stop() {
    playRequest++
    isLoading.value = false
    scheduler.stop()
    playhead.clear()
    isPlaying.value = false
    activeStep.value = -1
    for (const listener of beatListeners) listener(null)
  }

  function setChord(bar: number, chord: string) {
    const { chords } = pattern.value
    if (chords && bar < chords.length) chords[bar] = chord
  }

  /** A sound from the step menu, or null for silence; like a click, a hit switches the track on. */
  function setStep(instrument: string, stepIndex: number, name: string | null) {
    const track = findTrack(instrument)
    if (!track || (name !== null && !stepNames(genre, instrument).includes(name))) return
    track.steps[stepIndex] = name
    if (name && track.muted) setMuted(instrument, false)
  }

  /**
   * A click on a cell: on with the track's main sound, or off. Adding a
   * hit to a switched-off track switches it on, so the click is heard.
   */
  function switchStepOnOff(instrument: string, stepIndex: number) {
    const track = findTrack(instrument)
    if (!track) return
    const names = stepNamesAt(stepNames(genre, instrument), stepIndex, pattern.value.stepsPerCount)
    track.steps[stepIndex] = switchStep(track.steps[stepIndex] ?? null, track.steps, names)
    if (track.steps[stepIndex] && track.muted) setMuted(instrument, false)
  }

  /** The tempo the selected preset (or song) is written at; the tempo buttons are relative to it. */
  const presetBpm = computed(() => (song.value && songBpm(genre, song.value))
    ?? genre.presets.find((p) => p.id === selectedPresetId.value)?.bpm
    ?? pattern.value.bpm)
  const tempo = computed(() => tempoChoice(pattern.value.bpm, presetBpm.value, genre.bpmRange))

  function setTempo(choice: TempoChoice) {
    pattern.value.bpm = tempoFor(choice, presetBpm.value, genre.bpmRange)
  }

  /** Faster (positive) or slower by `delta` BPM, within the genre's range. */
  function nudgeTempo(delta: number) {
    pattern.value.bpm = nudgeBpm(pattern.value.bpm, delta, genre.bpmRange)
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
    applyMuted(instrument)
  }

  /** What the engine hears: switched off, or left out while another instrument plays alone. */
  function applyMuted(instrument: string) {
    const track = findTrack(instrument)
    if (track) engine.setInstrumentMuted(instrument, track.muted || (solo.value !== null && solo.value !== instrument))
  }

  /**
   * Plays one instrument on its own (starting playback if stopped), or the
   * whole band again with null. Switched-off instruments stay off.
   */
  function setSolo(instrument: string | null) {
    if (instrument === solo.value) return
    solo.value = instrument
    for (const track of pattern.value.tracks) applyMuted(track.instrument)
    if (instrument && !isPlaying.value && !isLoading.value) {
      soloStartedPlay = true
      play()
    } else if (!instrument && soloStartedPlay) {
      soloStartedPlay = false
      stop()
    }
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

  // Leaving for another page: the music fades out while the curtain
  // closes instead of cutting off when the page goes. A language change
  // keeps the page and the music.
  let removeFadeGuard: (() => void) | undefined
  onMounted(() => {
    removeFadeGuard = router.beforeEach((to, from) => {
      const samePage = to.params.genre === from.params.genre && to.params.instrument === from.params.instrument
      if (isPlaying.value && !samePage) engine.fadeAll(LEAVE_FADE_SECONDS)
    })
  })

  onBeforeUnmount(() => {
    removeFadeGuard?.()
    stop()
    beatListeners.clear()
    engine.dispose()
  })

  return {
    /** Edit freely: the scheduler reads it live, so changes (tempo included) apply while playing. */
    pattern,
    /** The preset the pattern started from, SONG_PATTERN_ID for a song, or CUSTOM_PATTERN_ID for one from a link. */
    selectedPresetId: readonly(selectedPresetId),
    selectPreset,
    reset,
    /** The song's sections (preset ids), or null when a single preset is loaded. */
    song,
    sectionFits,
    startSong,
    addSection,
    removeSection,
    shareCode,
    isPlaying: readonly(isPlaying),
    isLoading: readonly(isLoading),
    loadProgress,
    failedSamples: readonly(failedSamples),
    /** Changes on every step: read it only where that's cheap; `onBeat` is for the rest. */
    activeStep: readonly(activeStep),
    onBeat,
    solo: readonly(solo),
    setSolo,
    play,
    stop,
    /** In place, so a running loop picks the new length up on its next tick. */
    setCounts: (counts: number) => setPatternCounts(pattern.value, counts),
    setChord,
    setStep,
    switchStep: switchStepOnOff,
    /** Slow / normal / fast, or undefined when the slider set some other tempo. */
    tempo,
    setTempo,
    nudgeTempo,
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
