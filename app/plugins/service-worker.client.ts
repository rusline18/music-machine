import { prefetchSamples } from '~/core/audio/prefetch'
import { sampleUrls } from '~/core/resolve'
import { genres } from '~/genres'

/** `/_i18n/<build hash>/<locale>/messages.json`: the translations, fetched by the app at run time. */
const MESSAGES = /^(\/_i18n\/[^/]+\/)[^/]+(\/messages\.json)$/

/**
 * Asks again for the scripts and translations this page loaded before the
 * worker took over (they skipped its cache), and for the translations of
 * every other language, so any page opens offline. Mostly answered from the
 * HTTP cache.
 */
function cacheAppFiles(localeCodes: string[]) {
  const paths = new Set<string>()
  for (const entry of performance.getEntriesByType('resource')) {
    const url = new URL(entry.name)
    if (url.origin !== location.origin) continue
    if (url.pathname.startsWith('/_nuxt/') && !url.pathname.startsWith('/_nuxt/builds/')) paths.add(url.pathname)
    const messages = url.pathname.match(MESSAGES)
    if (messages) for (const code of localeCodes) paths.add(`${messages[1]}${code}${messages[2]}`)
  }
  for (const path of paths) fetch(path).catch(() => {})
}

/**
 * Offline support (public/sw.js), in production builds only: in dev it
 * would serve stale code over hot reloads. Once the worker is in charge,
 * every genre's sounds are fetched in the background so they're cached
 * too, not just the genre that was opened.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.dev || !('serviceWorker' in navigator)) return
  const { buildId } = useRuntimeConfig().app
  const i18n = nuxtApp.$i18n as { locale: Ref<string>, localeCodes: Ref<string[]> }
  const { locale } = i18n
  const localeCodes = i18n.localeCodes.value

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
      cacheAppFiles(localeCodes)
      for (const genre of genres) prefetchSamples(sampleUrls(genre, locale.value))
    })
  })
})
