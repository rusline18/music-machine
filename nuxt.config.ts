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

  // Only in production builds: dev relies on Vite's HMR socket and devtools,
  // and a week of audio caching would hide freshly regenerated samples.
  $production: {
    routeRules: {
      '/**': {
        headers: {
          // Nuxt inlines its payload and hydration scripts, hence 'unsafe-inline'.
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "media-src 'self'",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ].join('; '),
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        },
      },
      // Built by `npm run samples` and rarely changed; revalidate after a week.
      '/audio/**': {
        headers: { 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400' },
      },
    },
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
