// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss', '@nuxtjs/i18n'],

  // Explicit so it doesn't get turned off by accident: pages render on the
  // server for SEO; audio only starts in the browser.
  ssr: true,
  devtools: { enabled: true },
  compatibilityDate: '2025-07-15',

  typescript: {
    strict: true,
    // Also errors on unknown components and props in templates.
    tsConfig: { vueCompilerOptions: { strictTemplates: true } },
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
