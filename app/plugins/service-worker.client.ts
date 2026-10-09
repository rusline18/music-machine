import { prefetchSamples } from '~/core/audio/prefetch'
import { sampleUrls } from '~/core/resolve'
import { genres } from '~/genres'

/**
 * Offline support (public/sw.js), in production builds only: in dev it
 * would serve stale code over hot reloads. Once the worker is in charge,
 * every genre's sounds are fetched in the background so they're cached
 * too, not just the genre that was opened.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.dev || !('serviceWorker' in navigator)) return
  const { buildId } = useRuntimeConfig().app
  const locale = (nuxtApp.$i18n as { locale: Ref<string> }).locale

  onNuxtReady(async () => {
    try {
      await navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(buildId)}`)
      await navigator.serviceWorker.ready
      // On the first visit the worker takes over this page a moment after
      // it's ready; downloads before that would bypass its cache.
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
      }
    } catch {
      return // blocked (private mode, settings): the site works online as before
    }
    const idle = window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 1000))
    idle(() => {
      for (const genre of genres) prefetchSamples(sampleUrls(genre, locale.value))
    })
  })
})
