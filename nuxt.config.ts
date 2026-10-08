// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Explicit so it doesn't get turned off by accident: pages render on the
  // server for SEO; audio only starts in the browser.
  ssr: true,

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/i18n'],

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
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

  typescript: {
    strict: true,
    // Also errors on unknown components and props in templates.
    tsConfig: { vueCompilerOptions: { strictTemplates: true } },
  },
})
