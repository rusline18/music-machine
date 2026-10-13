import { contentSecurityPolicy } from './server/csp'

/**
 * Loads Telegram's Mini App SDK, but only when the page was opened as a Mini
 * App: Telegram passes its launch parameters in the URL hash (#tgWebAppData=…),
 * and the SDK keeps them in sessionStorage for reloads. Ordinary visitors
 * download nothing extra. window.telegramReady settles once the SDK has
 * loaded or failed to (useTelegram.ts); outside Telegram it isn't set.
 *
 * The SDK is served from the site (public/telegram-web-app.js): telegram.org
 * is slow or blocked for many users in Russia. Telegram shows its loading
 * screen until the app calls ready(), so that's called as soon as the SDK
 * and the server-rendered page are both in, without waiting for the app.
 */
const TELEGRAM_LOADER = `(function () {
  try {
    if (!/[#&]tgWebApp/.test(location.hash) && !sessionStorage.getItem('__telegram__initParams')) return
  } catch (e) { return }
  window.telegramReady = new Promise(function (resolve) {
    var script = document.createElement('script')
    script.src = '/telegram-web-app.js'
    script.onload = script.onerror = function () {
      resolve()
      function show() {
        try { window.Telegram.WebApp.ready() } catch (e) {}
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show)
      else show()
    }
    document.head.appendChild(script)
  })
})()`

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss', '@nuxtjs/i18n'],

  // Only in production builds: dev relies on Vite's HMR socket and devtools,
  // and a week of audio caching would hide freshly regenerated samples.
  $production: {
    routeRules: {
      '/**': {
        headers: {
          // Pages replace it with one carrying their scripts' nonce (server/plugins/csp-nonce.ts).
          // It also stands in for X-Frame-Options, which can't allow Telegram Web.
          'Content-Security-Policy': contentSecurityPolicy(),
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        },
      },
      // Checked on every visit, so a new deploy's worker is picked up at once.
      '/sw.js': {
        headers: { 'Cache-Control': 'no-cache' },
      },
      // Built by `npm run samples` and rarely changed; revalidate after a week.
      '/audio/**': {
        headers: { 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400' },
      },
    },
  },

  // Explicit so it doesn't get turned off by accident: pages render on the
  // server for SEO; audio only starts in the browser.
  ssr: true,
  devtools: { enabled: true },

  app: {
    head: {
      // viewport-fit=cover: the page runs under the notch and the home bar,
      // and the practice bar keeps clear of them with env(safe-area-inset-*).
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      // Installable on a phone's home screen (public/manifest.webmanifest).
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      meta: [{ name: 'theme-color', content: '#110E0D' }],
      // Runs before the app, while Telegram's launch parameters are still in
      // the URL; the telegram plugin takes it from there.
      script: [{ innerHTML: TELEGRAM_LOADER, tagPriority: 'critical' }],
    },
    // Pages fade into each other, so salsa's coral turning into bachata's
    // teal reads as one app changing color (main.css).
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  // Self-hosted (the CSP allows no font CDN): Onest for text, with Cyrillic;
  // JetBrains Mono for BPM, counts and step labels. Each subset downloads
  // only when the page uses its characters.
  css: ['@fontsource-variable/onest', '@fontsource-variable/jetbrains-mono'],

  // Overridable by env vars at runtime.
  runtimeConfig: {
    /** NUXT_FEEDBACK_WEBHOOK_URL: also POST each piece of feedback here (Slack, Discord, automation tools). */
    feedbackWebhookUrl: '',
    /** NUXT_FEEDBACK_TRUST_PROXY=true when behind a reverse proxy, so rate limits see real client IPs. */
    feedbackTrustProxy: false,
    public: {
      // Link to a donation page (Boosty, Ko-fi…), https only. Empty hides the
      // button. Set with the NUXT_PUBLIC_DONATE_URL environment variable.
      donateUrl: '',
      /**
       * NUXT_PUBLIC_TELEGRAM_BOT: the bot's username (without @). Inside the
       * Mini App, sharing then sends a t.me link that opens the pattern in
       * the app (docs/telegram.md). Empty: Telegram gets the site's link.
       */
      telegramBot: '',
      /**
       * NUXT_PUBLIC_FEEDBACK_ENABLED=true shows the "Send feedback" link and
       * opens /api/feedback. Off until it's decided where feedback goes.
       */
      feedbackEnabled: false,
    },
  },

  compatibilityDate: '2025-07-15',

  nitro: {
    // Pre-compressed .gz/.br copies of the build, served by Nitro's own
    // server when the browser accepts them (no CDN needed for that).
    compressPublicAssets: true,
    // Where /api/feedback keeps what users send. Files under .data/ (git-ignored)
    // by default; swap the driver (redis, s3, cloudflare-kv-binding, …) to
    // keep it elsewhere: https://unstorage.unjs.io/drivers
    storage: {
      feedback: { driver: 'fs', base: './.data/feedback' },
    },
    devStorage: {
      feedback: { driver: 'fs', base: './.data/feedback' },
    },
  },

  typescript: {
    strict: true,
    // Also errors on unknown components and props in templates.
    // data-* attributes are allowed: the playhead finds elements by them.
    tsConfig: { vueCompilerOptions: { strictTemplates: true, dataAttributes: ['data-*'] } },
  },

  // ESLint does both linting and formatting (no Prettier). Style options
  // match the existing code: `(x) => …`, `} else {`, no semicolons, single
  // quotes. Extra rules go in eslint.config.mjs.
  eslint: {
    config: {
      stylistic: { arrowParens: true, braceStyle: '1tbs', quoteProps: 'as-needed' },
    },
  },

  // Messages live in i18n/locales/<code>.json. English is served at /,
  // other languages under a prefix (/ru/...).
  i18n: {
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'ru', language: 'ru-RU', name: 'Русский', file: 'ru.json' },
    ],
    // First visit to / goes to the browser's language; the choice is then remembered.
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root',
    },
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },
})
