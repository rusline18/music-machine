/**
 * The Content-Security-Policy. Rendered pages get a fresh `nonce` for the
 * inline scripts Nuxt writes into them (server/plugins/csp-nonce.ts); every
 * other response gets the policy without one, so no inline script runs.
 * Styles stay 'unsafe-inline': Vue's :style bindings and transitions set
 * style attributes.
 */
export function contentSecurityPolicy(nonce?: string): string {
  return [
    'default-src \'self\'',
    // telegram.org: the Mini App SDK, loaded only inside Telegram (TELEGRAM_LOADER in nuxt.config.ts).
    `script-src 'self'${nonce ? ` 'nonce-${nonce}'` : ''} https://telegram.org`,
    'style-src \'self\' \'unsafe-inline\'',
    'img-src \'self\' data:',
    // Vite inlines the smallest font subsets as data: URIs.
    'font-src \'self\' data:',
    'media-src \'self\'',
    'connect-src \'self\'',
    'object-src \'none\'',
    'base-uri \'self\'',
    'form-action \'self\'',
    // Telegram Web shows Mini Apps in an iframe; nobody else may frame the site.
    'frame-ancestors \'self\' https://web.telegram.org',
  ].join('; ')
}

/** Adds `nonce` to every <script> tag in a piece of rendered HTML. */
export function addScriptNonce(html: string, nonce: string): string {
  return html.replace(/<script(?=[\s>])/g, `<script nonce="${nonce}"`)
}
