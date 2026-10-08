import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { COUNTS_PER_BAR, COUNTS_PER_BLOCK, patternLength } from '../app/composables/usePattern'
import type { Genre, Pattern } from '../app/composables/usePattern'
import { genreConfig, stepNames } from '../app/data/genres'
import { parseChord } from '../app/data/harmony'
import { salsaPatterns } from '../app/data/salsa/patterns'
import { bachataPatterns } from '../app/data/bachata/patterns'

const presets: Record<Genre, Pattern[]> = { salsa: salsaPatterns, bachata: bachataPatterns }
const publicDir = fileURLToPath(new URL('../public', import.meta.url))

/** Indices of the steps where a track plays. */
function onsets(pattern: Pattern, instrument: string): number[] {
  const track = pattern.tracks.find((t) => t.instrument === instrument)!
  return track.steps.flatMap((step, i) => (step ? [i] : []))
}

for (const genre of Object.keys(presets) as Genre[]) {
  const config = genreConfig[genre]
  const { instruments, samples } = config

  describe(`${genre} sample map`, () => {
    it.each(Object.entries(samples).flatMap(([instrument, map]) => Object.values(map).flat().map((url) => [instrument, url])))(
      '%s: %s exists in public/',
      (_instrument, url) => {
        expect(existsSync(publicDir + url)).toBe(true)
      },
    )
  })

  describe.each(presets[genre].map((p) => [p.id, p] as const))(`${genre} preset %s`, (_id, pattern) => {
    it('has the right genre and a whole number of 8-count blocks', () => {
      expect(pattern.genre).toBe(genre)
      expect(pattern.counts % COUNTS_PER_BLOCK).toBe(0)
      expect(pattern.counts).toBeGreaterThan(0)
    })

    it('has exactly one track per genre instrument, in order', () => {
      expect(pattern.tracks.map((t) => t.instrument)).toEqual([...instruments])
    })

    it('has counts × stepsPerCount steps in every track', () => {
      for (const track of pattern.tracks) {
        expect(track.steps, track.instrument).toHaveLength(patternLength(pattern))
      }
    })

    it('only uses step names that exist for the instrument', () => {
      // An unknown name doesn't error — the scheduler silently skips it —
      // so a typo would just make a hit disappear.
      for (const track of pattern.tracks) {
        const known = stepNames(config, track.instrument)
        for (const step of track.steps) {
          if (step !== null) expect(known, `${track.instrument}: "${step}"`).toContain(step)
        }
      }
    })

    it('has one valid chord per bar if it has pitched tracks', () => {
      const pitched = pattern.tracks.some((t) => !t.muted && config.pitched[t.instrument])
      if (!pitched) return expect(pattern.chords).toBeUndefined()
      expect(pattern.chords).toHaveLength(pattern.counts / COUNTS_PER_BAR)
      for (const chord of pattern.chords!) expect(() => parseChord(chord)).not.toThrow()
    })

    it('has volumes between 0 and 1', () => {
      for (const track of pattern.tracks) {
        expect(track.volume).toBeGreaterThanOrEqual(0)
        expect(track.volume).toBeLessThanOrEqual(1)
      }
    })
  })
}

describe('rhythm reference', () => {
  // Eighth-note cells: 2 per count, 16 per 8-count block.
  const SON_CLAVE_3_2 = [0, 3, 6, 10, 12] // 1, 2&, 4 | 6, 7
  const SON_CLAVE_2_3 = [2, 4, 8, 11, 14] // 2, 3 | 5, 6&, 8
  const RUMBA_CLAVE_3_2 = [0, 3, 7, 10, 12] // 1, 2&, 4& | 6, 7
  const CLAVE_BY_PRESET: Record<string, number[]> = {
    'salsa-verse-3-2': SON_CLAVE_3_2,
    'salsa-montuno-3-2': SON_CLAVE_3_2,
    'salsa-verse-montuno': SON_CLAVE_3_2,
    'salsa-verse-2-3': SON_CLAVE_2_3,
    'salsa-montuno-2-3': SON_CLAVE_2_3,
    'salsa-verse-montuno-2-3': SON_CLAVE_2_3,
    'salsa-chachacha-2-3': SON_CLAVE_2_3,
    'salsa-guaguanco-3-2': RUMBA_CLAVE_3_2,
  }

  it.each(salsaPatterns.map((p) => [p.id, p] as const))('%s plays its clave in every block', (id, pattern) => {
    const clave = CLAVE_BY_PRESET[id]
    expect(clave, `no reference clave for ${id}`).toBeDefined()
    const blocks = pattern.counts / COUNTS_PER_BLOCK
    const expected = Array.from({ length: blocks }, (_, b) => clave!.map((i) => i + b * 16)).flat()
    expect(onsets(pattern, 'clave')).toEqual(expected)
  })

  it('2-3 presets keep the 3-2 parts, cáscara turned with the clave', () => {
    const verse32 = salsaPatterns.find((p) => p.id === 'salsa-verse-3-2')!
    const verse23 = salsaPatterns.find((p) => p.id === 'salsa-verse-2-3')!
    // Cáscara 2-3 starts on the 2 side: the 3-2 figure's second bar first.
    expect(onsets(verse23, 'timbales')).toEqual([1, 2, 4, 6, 8, 10, 12, 13, 15])
    // Tumbao and martillo repeat every bar, so turning them changes nothing.
    for (const instrument of ['congas', 'bongos']) {
      expect(onsets(verse23, instrument), instrument).toEqual(onsets(verse32, instrument))
    }
  })

  it('cha-cha-chá: güiro long on the beat, two shorts after — the "cha-cha-chá" on 4 & 1', () => {
    const chachacha = salsaPatterns.find((p) => p.id === 'salsa-chachacha-2-3')!
    const guiro = chachacha.tracks.find((t) => t.instrument === 'guiro')!.steps
    expect(guiro.slice(6, 9)).toEqual(['short', 'short', 'long'])
    expect(chachacha.bpm).toBeLessThan(130)
  })

  it.each(bachataPatterns.map((p) => [p.id, p] as const))('%s keeps the bass on 1, 2&, 3, 4 of each bar', (_id, pattern) => {
    const bars = pattern.counts / 4
    const expected = Array.from({ length: bars }, (_, b) => [0, 3, 4, 6].map((i) => i + b * 8)).flat()
    expect(onsets(pattern, 'bass')).toEqual(expected)
  })

  it('bachata: the bongo player switches to campana for the mambo only', () => {
    const plays = (pattern: Pattern, instrument: string) => {
      const track = pattern.tracks.find((t) => t.instrument === instrument)!
      return !track.muted && track.steps.some(Boolean)
    }
    for (const pattern of bachataPatterns.filter((p) => ['bachata-derecho', 'bachata-majao', 'bachata-mambo'].includes(p.id))) {
      const mambo = pattern.id === 'bachata-mambo'
      expect(plays(pattern, 'campana'), pattern.id).toBe(mambo)
      expect(plays(pattern, 'bongos'), pattern.id).toBe(!mambo)
    }
  })

  it('preset ids are unique', () => {
    const ids = [...salsaPatterns, ...bachataPatterns].map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
