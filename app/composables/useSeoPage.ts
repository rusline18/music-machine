import type { MaybeRefOrGetter } from 'vue'

interface SeoPage {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  /** Which link-preview image: public/og/<locale>-<image>.png, 'home' or a genre id (scripts/render-og.mjs). */
  image: MaybeRefOrGetter<string>
}

/**
 * Title, description and the cards shown when a link to the page is shared
 * (Open Graph for Telegram, WhatsApp, VK, Facebook; Twitter/X cards), plus
 * a schema.org description for search engines. Canonical and hreflang links
 * come from useLocaleHead in app.vue.
 */
export function useSeoPage(page: SeoPage) {
  const { t, locale } = useI18n()
  const route = useRoute()
  const origin = siteOrigin()
  const image = () => `${origin}/og/${locale.value}-${toValue(page.image)}.png`
  // The title as it appears in the tab, with the site's name after it (app.vue).
  const fullTitle = () => {
    const title = toValue(page.title)
    return title === t('app.name') ? title : `${title} — ${t('app.name')}`
  }

  useSeoMeta({
    title: () => toValue(page.title),
    description: () => toValue(page.description),
    ogType: 'website',
    ogSiteName: () => t('app.name'),
    ogTitle: fullTitle,
    ogDescription: () => toValue(page.description),
    ogImage: image,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/png',
    ogImageAlt: fullTitle,
    twitterCard: 'summary_large_image',
    twitterTitle: fullTitle,
    twitterDescription: () => toValue(page.description),
    twitterImage: image,
    twitterImageAlt: fullTitle,
  })

  useHead({
    script: [{
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: fullTitle(),
        description: toValue(page.description),
        url: origin + route.path,
        image: image(),
        inLanguage: locale.value,
        applicationCategory: 'MusicApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires a browser with Web Audio API',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      }),
    }],
  })
}

/**
 * The site's public address, without a trailing slash: NUXT_PUBLIC_I18N_BASE_URL
 * in production, else whatever host the request came to (dev, previews).
 * Link previews need absolute URLs.
 */
export function siteOrigin(): string {
  const configured = useRuntimeConfig().public.i18n?.baseUrl
  return (typeof configured === 'string' && configured ? configured : useRequestURL().origin).replace(/\/+$/, '')
}
