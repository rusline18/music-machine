/*
 * Service worker: the trainer keeps working without a connection (a dance
 * hall with no signal). Registered by app/plugins/service-worker.client.ts
 * as /sw.js?v=<build id>, so every deploy installs a fresh copy.
 *
 * - Pages: network first, so a deploy shows up at once; the cached copy
 *   when offline. Every genre page in every language is cached on install.
 * - /_nuxt/ (hashed, never change): cache first.
 * - /audio/: cache first, in a cache of their own that outlives deploys
 *   (they're 0.5 MB, rarely change). Bump AUDIO_VERSION after
 *   `npm run samples` to make phones download them again.
 */

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const PAGES_CACHE = `pages-${VERSION}`
const AUDIO_VERSION = 1
const AUDIO_CACHE = `audio-v${AUDIO_VERSION}`

/** Every page a dancer may open offline: tests/service-worker.test.ts checks it against the genres and languages. */
const PAGES = ['/', '/salsa', '/bachata', '/ru', '/ru/salsa', '/ru/bachata']

/**
 * A response the browser accepts for a navigation: a redirected one (the
 * home page goes to the remembered language) can't be replayed as is.
 */
async function storable(response) {
  if (!response.redirected) return response
  return new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers: response.headers })
}

/** The page plus the scripts and styles it loads. */
async function precachePage(cache, path) {
  const response = await fetch(path, { credentials: 'same-origin' })
  if (!response.ok) return
  const html = await response.clone().text()
  await cache.put(path, await storable(response))
  const assets = new Set(html.match(/\/_nuxt\/[\w.-]+\.(?:js|css)/g))
  await Promise.all([...assets].map(async (asset) => {
    if (!(await cache.match(asset))) await cache.add(asset)
  }))
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PAGES_CACHE)
    // One page failing (a flaky connection) shouldn't stop the others.
    await Promise.allSettled(PAGES.map((path) => precachePage(cache, path)))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== PAGES_CACHE && key !== AUDIO_CACHE) await caches.delete(key)
    }
    await self.clients.claim()
  })())
})

async function networkFirst(request) {
  const cache = await caches.open(PAGES_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request, await storable(response.clone()))
    return response
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true })
    if (cached) return cached
    throw error
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') event.respondWith(networkFirst(request))
  else if (url.pathname.startsWith('/audio/')) event.respondWith(cacheFirst(request, AUDIO_CACHE))
  // builds/ says which deploy is current: always ask the server first.
  else if (url.pathname.startsWith('/_nuxt/') && !url.pathname.startsWith('/_nuxt/builds/')) event.respondWith(cacheFirst(request, PAGES_CACHE))
  else event.respondWith(networkFirst(request))
})
