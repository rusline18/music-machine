import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseChord } from '~/core/harmony'
import type { Pattern } from '~/core/pattern'
import { COUNT_OPTIONS, COUNTS_PER_BAR, COUNTS_PER_BLOCK, patternLength } from '~/core/pattern'
import { sampleUrls, stepNames } from '~/core/resolve'
import { genres } from '~/genres'
import { bachataPresets } from '~/genres/bachata/patterns'
import { salsaPresets } from '~/genres/salsa/patterns'

const publicDir = fileURLToPath(new URL('../public', import.meta.url))

/** Indices of the steps where a track plays. */
function onsets(pattern: Pattern, instrument: string): number[] {
  const track = pattern.tracks.find((t) => t.instrument === instrument)!
  return track.steps.flatMap((step, i) => (step ? [i] : []))
}

describe('public/audio', () => {
  // The engine asks for the .webm first (core/audio/engine fileFor) and only
  // then the .wav, so a missing Opus copy is a failed request on every load.
  const wavs = (readdirSync(`${publicDir}/audio`, { recursive: true }) as string[]).filter((f) => f.endsWith('.wav'))

  it.each(wavs)('%s has an Opus copy (npm run samples:encode)', (wav) => {
    expect(existsSync(`${publicDir}/audio/${wav.replace(/\.wav$/, '.webm')}`)).toBe(true)
  })
})

describe.each(genres.map((genre) => [genre.id, genre] as const))('%s', (_id, genre) => {
  it.each([...sampleUrls(genre, 'en'), ...sampleUrls(genre, 'ru')])('%s exists in public/', (url) => {
    expect(existsSync(publicDir + url)).toBe(true)
  })

  it('has a sound for every instrument', () => {
    for (const instrument of genre.instruments) {
      expect(stepNames(genre, instrument).length, instrument).toBeGreaterThan(0)
    }
  })

  it('opens on a preset whose tempo fits the slider', () => {
    for (const preset of genre.presets) {
      expect(preset.bpm, preset.id).toBeGreaterThanOrEqual(genre.bpmRange[0])
      expect(preset.bpm, preset.id).toBeLessThanOrEqual(genre.bpmRange[1])
    }
  })

  describe.each(genre.presets.map((p) => [p.id, p] as const))('preset %s', (_presetId, pattern) => {
    it('is one of the lengths the count selector offers', () => {
      expect(COUNT_OPTIONS).toContain(pattern.counts)
      expect(pattern.counts % COUNTS_PER_BLOCK).toBe(0)
    })

    it('has exactly one track per genre instrument, in order', () => {
      expect(pattern.tracks.map((t) => t.instrument)).toEqual([...genre.instruments])
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
        const known = stepNames(genre, track.instrument)
        for (const step of track.steps) {
          if (step !== null) expect(known, `${track.instrument}: "${step}"`).toContain(step)
        }
      }
    })

    it('has one valid chord per bar if it has pitched tracks', () => {
      const pitched = pattern.tracks.some((t) => !t.muted && genre.pitched[t.instrument])
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
})

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

  it.each(salsaPresets.map((p) => [p.id, p] as const))('%s plays its clave in every block', (id, pattern) => {
    const clave = CLAVE_BY_PRESET[id]
    expect(clave, `no reference clave for ${id}`).toBeDefined()
    const blocks = pattern.counts / COUNTS_PER_BLOCK
    const expected = Array.from({ length: blocks }, (_, b) => clave!.map((i) => i + b * 16)).flat()
    expect(onsets(pattern, 'clave')).toEqual(expected)
  })

  it('2-3 presets keep the 3-2 parts, cáscara turned with the clave, the voice still on 1', () => {
    const verse32 = salsaPresets.find((p) => p.id === 'salsa-verse-3-2')!
    const verse23 = salsaPresets.find((p) => p.id === 'salsa-verse-2-3')!
    // Cáscara 2-3 starts on the 2 side: the 3-2 figure's second bar first.
    expect(onsets(verse23, 'timbales')).toEqual([1, 2, 4, 6, 8, 10, 12, 13, 15])
    // Tumbao, martillo and the counting repeat every bar, so nothing turns.
    for (const instrument of ['congas', 'bongos', 'voice']) {
      expect(verse23.tracks.find((t) => t.instrument === instrument)!.steps, instrument)
        .toEqual(verse32.tracks.find((t) => t.instrument === instrument)!.steps)
    }
  })

  it('cha-cha-chá: güiro long on the beat, two shorts after — the "cha-cha-chá" on 4 & 1', () => {
    const chachacha = salsaPresets.find((p) => p.id === 'salsa-chachacha-2-3')!
    const guiro = chachacha.tracks.find((t) => t.instrument === 'guiro')!.steps
    expect(guiro.slice(6, 9)).toEqual(['short', 'short', 'long'])
    expect(chachacha.bpm).toBeLessThan(130)
  })

  it.each(bachataPresets.map((p) => [p.id, p] as const))('%s keeps the bass on 1, 2&, 3, 4 of each bar', (_id, pattern) => {
    const bars = pattern.counts / COUNTS_PER_BAR
    const expected = Array.from({ length: bars }, (_, b) => [0, 3, 4, 6].map((i) => i + b * 8)).flat()
    expect(onsets(pattern, 'bass')).toEqual(expected)
  })

  it('bachata: the bongo player switches to campana for the mambo only', () => {
    const plays = (pattern: Pattern, instrument: string) => {
      const track = pattern.tracks.find((t) => t.instrument === instrument)!
      return !track.muted && track.steps.some(Boolean)
    }
    for (const pattern of bachataPresets.filter((p) => ['bachata-derecho', 'bachata-majao', 'bachata-mambo'].includes(p.id))) {
      const mambo = pattern.id === 'bachata-mambo'
      expect(plays(pattern, 'campana'), pattern.id).toBe(mambo)
      expect(plays(pattern, 'bongos'), pattern.id).toBe(!mambo)
    }
  })

  it('preset ids are unique', () => {
    const ids = genres.flatMap((genre) => genre.presets.map((p) => p.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
