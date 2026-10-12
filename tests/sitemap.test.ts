import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GENRE_IDS, SITE_LOCALES, sitemapXml } from '#shared/sitemap'
import { genres } from '~/genres'

describe('sitemap', () => {
  it('lists the genres the app has', () => {
    expect([...GENRE_IDS]).toEqual(genres.map((genre) => genre.id))
  })

  it('has every page in every language, with its translations', () => {
    const xml = sitemapXml('https://example.com')
    expect(xml.match(/<loc>/g)).toHaveLength((GENRE_IDS.length + 1) * SITE_LOCALES.length)
    expect(xml).toContain('<loc>https://example.com</loc>')
    expect(xml).toContain('<loc>https://example.com/ru/bachata</loc>')
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="ru-RU" href="https://example.com/ru/salsa"/>')
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/salsa"/>')
  })
})

describe('link-preview images', () => {
  it('exist for every page and language', () => {
    for (const { prefix } of SITE_LOCALES) {
      const code = prefix.slice(1) || 'en'
      for (const page of ['home', ...GENRE_IDS]) {
        expect(existsSync(new URL(`../public/og/${code}-${page}.png`, import.meta.url)), `${code}-${page}`).toBe(true)
      }
    }
  })
})
