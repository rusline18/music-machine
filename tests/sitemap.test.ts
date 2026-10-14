import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GENRE_IDS, INSTRUMENT_PAGES, SITE_LOCALES, sitemapXml } from '#shared/sitemap'
import { genres } from '~/genres'
import { instrumentsWithPages } from '~/genres/instrumentPages'

describe('sitemap', () => {
  it('lists the genres the app has', () => {
    expect([...GENRE_IDS]).toEqual(genres.map((genre) => genre.id))
  })

  it('lists the instrument pages the app has', () => {
    for (const genre of genres) {
      expect(INSTRUMENT_PAGES[genre.id as (typeof GENRE_IDS)[number]] ?? [], genre.id).toEqual(instrumentsWithPages(genre))
    }
  })

  it('has every page in every language, with its translations', () => {
    const xml = sitemapXml('https://example.com')
    const instrumentPages = Object.values(INSTRUMENT_PAGES).flat().length
    expect(xml.match(/<loc>/g)).toHaveLength((GENRE_IDS.length + instrumentPages + 1) * SITE_LOCALES.length)
    expect(xml).toContain('<loc>https://example.com</loc>')
    expect(xml).toContain('<loc>https://example.com/ru/bachata</loc>')
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="ru-RU" href="https://example.com/ru/salsa"/>')
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/salsa"/>')
    expect(xml).toContain('<loc>https://example.com/ru/salsa/congas</loc>')
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
