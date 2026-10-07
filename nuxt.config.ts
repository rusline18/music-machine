// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // SSR is on by default; kept explicit so it doesn't get disabled by
  // accident later — needed if/when we add SEO (meta tags, sitemap, etc).
  ssr: true,

  modules: ['@nuxtjs/tailwindcss'],

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  typescript: {
    strict: true,
  },

  app: {
    head: {
      title: 'Latin Beat Machine',
      meta: [
        {
          name: 'description',
          content: 'Interactive Salsa & Bachata rhythm trainer — build, practice and share Latin percussion patterns in the browser.',
        },
      ],
    },
  },
})
