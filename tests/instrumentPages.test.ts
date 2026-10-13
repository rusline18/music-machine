import { describe, expect, it } from 'vitest'
import { patternLength, trackOf } from '~/core/pattern'
import { stepNames } from '~/core/resolve'
import { findGenre, genres } from '~/genres'
import { BAND_DUCK, findInstrumentPage, instrumentPatterns, instrumentsWithPages, mixMutes } from '~/genres/instrumentPages'

const salsa = findGenre('salsa')!

describe.each(genres.flatMap((genre) => instrumentsWithPages(genre).map((instrument) => [`${genre.id}/${instrument}`, genre, instrument] as const)))(
  'instrument page %s',
  (_page, genre, instrument) => {
    const page = findInstrumentPage(genre, instrument)!

    it('offers at least one rhythm, each with its own id', () => {
      expect(page.variants.length).toBeGreaterThan(0)
      const ids = page.variants.map((variant) => variant.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('only uses strokes the instrument has a sound for', () => {
      const known = stepNames(genre, instrument)
      for (const variant of page.variants) {
        expect(variant.figure.some(Boolean), variant.id).toBe(true)
        for (const step of variant.figure) if (step !== null) expect(known, `${variant.id}: "${step}"`).toContain(step)
      }
    })

    it('fits the band its rhythms play over', () => {
      const length = patternLength(genre.presets[0]!)
      for (const variant of page.variants) expect(length % variant.figure.length, variant.id).toBe(0)
    })

    it('has companions from the genre', () => {
      for (const companion of page.companions ?? []) expect(genre.instruments).toContain(companion)
    })
  },
)

describe('findInstrumentPage', () => {
  it('finds pages the genre has, and nothing else', () => {
    expect(findInstrumentPage(salsa, 'congas')).toBeDefined()
    expect(findInstrumentPage(salsa, 'voice')).toBeUndefined()
    expect(findInstrumentPage(salsa, 'nope')).toBeUndefined()
    expect(findInstrumentPage(findGenre('bachata')!, 'congas')).toBeUndefined()
  })
})

describe('instrumentPatterns', () => {
  const [tumbao, , open] = instrumentPatterns(salsa, 'congas')
  const band = salsa.presets[0]!

  it('plays each rhythm over the first preset, the instrument up front', () => {
    expect(tumbao!.id).toBe('tumbao')
    expect(trackOf(open!, 'congas')!.steps.slice(0, 8)).toEqual([null, null, null, null, null, null, 'open', 'open'])
    expect(trackOf(open!, 'congas')!.volume).toBe(1)
    expect(trackOf(open!, 'clave')!.steps).toEqual(trackOf(band, 'clave')!.steps)
    expect(trackOf(open!, 'clave')!.volume).toBeCloseTo(trackOf(band, 'clave')!.volume * BAND_DUCK)
  })

  it('leaves the counting voice and the preset itself alone', () => {
    expect(trackOf(open!, 'voice')).toEqual(trackOf(band, 'voice'))
    expect(trackOf(band, 'congas')!.steps[0]).toBe('heel')
  })
})

describe('mixMutes', () => {
  const [tumbao] = instrumentPatterns(salsa, 'congas')
  const band = salsa.presets[0]!

  it('on its own, keeps only the instrument and its companions', () => {
    const mutes = mixMutes(salsa, 'congas', tumbao!, 'solo')
    expect(mutes.get('congas')).toBe(false)
    expect(mutes.get('clave')).toBe(false)
    expect(mutes.get('bass')).toBe(true)
    expect(mutes.has('voice')).toBe(false)
  })

  it('with the band, plays what the preset plays', () => {
    const mutes = mixMutes(salsa, 'congas', tumbao!, 'band')
    for (const track of band.tracks) {
      if (track.instrument !== 'voice') expect(mutes.get(track.instrument), track.instrument).toBe(track.muted)
    }
  })
})
