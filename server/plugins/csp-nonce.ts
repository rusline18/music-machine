import { randomBytes } from 'node:crypto'
import { addScriptNonce, contentSecurityPolicy } from '../csp'

/**
 * Nuxt inlines a few scripts into each page (the import map, the runtime
 * config). Instead of allowing every inline script ('unsafe-inline'), each
 * page gets a one-off nonce that only those carry, so a script injected
 * into the markup still wouldn't run. Production only, like the rest of
 * the headers (nuxt.config.ts): dev relies on Vite's own inline scripts.
 */
export default defineNitroPlugin((nitroApp) => {
  if (import.meta.dev) return
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const nonce = randomBytes(16).toString('base64')
    for (const part of ['head', 'bodyPrepend', 'body', 'bodyAppend'] as const) {
      html[part] = html[part].map((chunk) => addScriptNonce(chunk, nonce))
    }
    setResponseHeader(event, 'Content-Security-Policy', contentSecurityPolicy(nonce))
  })
})
