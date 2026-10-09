import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { genres } from '~/genres'

const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
const pages = JSON.parse(worker.match(/const PAGES = (\[.*\])/)![1]!.replaceAll('\'', '"')) as string[]

describe('service worker', () => {
  // The default language has no prefix (see i18n in nuxt.config.ts).
  const expected = ['', '/ru'].flatMap((prefix) => [prefix || '/', ...genres.map((genre) => `${prefix}/${genre.id}`)])

  it.each(expected)('caches %s for offline use', (path) => {
    expect(pages).toContain(path)
  })
})
