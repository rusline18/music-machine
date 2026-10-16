import type { AudioEngine } from '~/core/audio/engine'
import type { Genre } from '~/genres'
import { sampleUrls } from '~/core/resolve'

/**
 * A genre's samples, in two steps: downloaded on mount (no AudioContext
 * needed, so before any click), then decoded once playback has started
 * with the ones the pattern needs (see useBeatMachine's play).
 */
export function useSampleLoading(engine: AudioEngine, genre: Genre, locale: Ref<string>) {
  const urls = () => [...sampleUrls(genre, locale.value)]
  /** Samples whose download has finished (or failed), for the progress bar. */
  const samplesFetched = ref(0)
  const sampleCount = ref(urls().length)
  /** 0–1 share of the samples downloaded so far. */
  const loadProgress = computed(() => Math.min(1, samplesFetched.value / sampleCount.value))
  /** Samples the last load gave up on; they stay silent until the next Play retries them. */
  const failedSamples = ref(0)
  /** Set once every sample of the current language is decoded. */
  let allLoaded = false
  /** Set once the audio graph exists (after the first play). */
  let started = false

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

  // The voice's words in the new language load in the background; until
  // they arrive the voice is skipped, the band keeps playing.
  watch(locale, () => {
    allLoaded = false
    if (started) engine.preloadSamples(urls())
    else prefetch()
  })

  /**
   * Playback has started: decodes every sample in the background. A sound
   * put in before it arrives is skipped until then.
   */
  async function playing() {
    started = true
    if (allLoaded) return
    const failed = await engine.preloadSamples(urls())
    failedSamples.value = failed.length
    allLoaded = failed.length === 0
  }

  return {
    loadProgress,
    failedSamples,
    prefetch,
    playing,
    /** Whether every sample is decoded, so Play has nothing to wait for. */
    allLoaded: () => allLoaded,
  }
}
