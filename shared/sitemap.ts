/**
 * What /sitemap.xml lists. Kept apart from app/genres, which the server
 * doesn't load (it pulls in the audio engine); tests/sitemap.test.ts checks
 * the two agree.
 */
export const GENRE_IDS = ['salsa', 'bachata'] as const

/** Instruments with a page of their own, per genre (Genre.instrumentPages): /salsa/congas. */
export const INSTRUMENT_PAGES: Partial<Record<(typeof GENRE_IDS)[number], readonly string[]>> = {
  salsa: ['clave', 'congas', 'bongos', 'timbales', 'cowbell', 'timbalebell', 'maracas', 'guiro', 'bass', 'piano', 'tres', 'trumpet', 'trombone'],
  bachata: ['guira', 'bongos', 'campana', 'bass', 'requinto', 'segunda'],
}

/** The site's languages: English at /, the rest under a prefix (nuxt.config.ts). */
export const SITE_LOCALES = [
  { language: 'en-US', prefix: '' },
  { language: 'ru-RU', prefix: '/ru' },
] as const

/**
 * Every page in every language, each listing its translations (hreflang).
 * URLs are written as the canonical links are (useLocaleHead): the home
 * page without a trailing slash.
 */
export function sitemapXml(origin: string): string {
  const pages = ['', ...GENRE_IDS.flatMap((id) => [`/${id}`, ...(INSTRUMENT_PAGES[id] ?? []).map((instrument) => `/${id}/${instrument}`)])]
  const url = (prefix: string, page: string) => `${origin}${prefix}${page}`
  const entries = pages.flatMap((page) => SITE_LOCALES.map(({ prefix }) => {
    const alternates = [
      ...SITE_LOCALES.map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt.language}" href="${url(alt.prefix, page)}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${url('', page)}"/>`,
    ]
    return `  <url>\n    <loc>${url(prefix, page)}</loc>\n${alternates.join('\n')}\n  </url>`
  }))
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`
}
