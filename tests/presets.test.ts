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
import { salsaSamples } from '~/genres/salsa/samples'

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

    it('has one valid chord per bar if the genre has pitched instruments', () => {
      // Even if they're muted: a shared link always comes back with chords.
      if (Object.keys(genre.pitched).length === 0) return expect(pattern.chords).toBeUndefined()
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

describe('salsa soft strokes', () => {
  // Every file is normalized; heel, toe and the bell necks get their level
  // from the sample map, below the full strokes around them.
  it.each([['congas', 'heel'], ['congas', 'toe'], ['cowbell', 'neck'], ['timbalebell', 'neck']])('%s %s is played softer', (instrument, stroke) => {
    const takes = [salsaSamples[instrument]![stroke]!].flat()
    for (const take of takes) {
      expect(typeof take === 'object' && take.gain, `${instrument} ${stroke}`).toBeGreaterThan(0)
      expect(typeof take === 'object' && take.gain, `${instrument} ${stroke}`).toBeLessThan(1)
    }
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
    'salsa-mambo-3-2': SON_CLAVE_3_2,
    'salsa-mambo-2-3': SON_CLAVE_2_3,
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

  it.each(salsaPresets.filter((p) => p.id !== 'salsa-guaguanco-3-2' && p.id !== 'salsa-chachacha-2-3').map((p) => [p.id, p] as const))(
    '%s: full tumbao on the congas, bass on 2& and 4 and never on the 1',
    (_id, pattern) => {
      const bars = pattern.counts / COUNTS_PER_BAR
      const congas = pattern.tracks.find((t) => t.instrument === 'congas')!.steps
      expect(congas.slice(0, 8)).toEqual(['heel', 'toe', 'slap', 'toe', 'heel', 'toe', 'open', 'open'])
      expect(onsets(pattern, 'bass')).toEqual(Array.from({ length: bars }, (_, b) => [3, 6].map((i) => i + b * 8)).flat())
      const bass = pattern.tracks.find((t) => t.instrument === 'bass')!.steps
      expect(bass.filter((_, i) => i % 8 === 6).every((step) => step === 'push')).toBe(true)
    },
  )

  it('montuno: bongo player and timbalero move to their bells, the brass comes in; verse: bongos and cáscara', () => {
    const plays = (pattern: Pattern, instrument: string) => {
      const track = pattern.tracks.find((t) => t.instrument === instrument)!
      return !track.muted && track.steps.some(Boolean)
    }
    for (const id of ['salsa-verse-3-2', 'salsa-montuno-3-2', 'salsa-verse-2-3', 'salsa-montuno-2-3']) {
      const pattern = salsaPresets.find((p) => p.id === id)!
      const montuno = id.includes('montuno')
      expect(plays(pattern, 'cowbell'), id).toBe(montuno)
      expect(plays(pattern, 'timbalebell'), id).toBe(montuno)
      expect(plays(pattern, 'trumpet'), id).toBe(montuno)
      expect(plays(pattern, 'trombone'), id).toBe(montuno)
      expect(plays(pattern, 'bongos'), id).toBe(!montuno)
      expect(plays(pattern, 'timbales'), id).toBe(!montuno)
      // The tres keeps its guajeo through both.
      expect(plays(pattern, 'tres'), id).toBe(true)
    }
  })

  it('mambo bell, piano montuno, tres guajeo and brass moña turn with the clave', () => {
    const steps = (id: string, instrument: string) =>
      salsaPresets.find((p) => p.id === id)!.tracks.find((t) => t.instrument === instrument)!.steps
    for (const instrument of ['timbalebell', 'piano', 'tres', 'trumpet', 'trombone']) {
      const turned = [...steps('salsa-montuno-3-2', instrument).slice(8), ...steps('salsa-montuno-3-2', instrument).slice(0, 8)]
      expect(steps('salsa-montuno-2-3', instrument), instrument).toEqual(turned)
    }
    // Moña in 3-2: the trumpets call on the 3 side, the trombones answer on the 2 side.
    const montuno = salsaPresets.find((p) => p.id === 'salsa-montuno-3-2')!
    expect(onsets(montuno, 'trumpet').every((i) => i < 8)).toBe(true)
    expect(onsets(montuno, 'trombone').every((i) => i >= 8)).toBe(true)
    // The bell's mouth keeps the beat; its neck strokes are the cáscara's off-beats.
    const bell = steps('salsa-montuno-3-2', 'timbalebell')
    expect(bell.filter((_, i) => i % 2 === 0).every((step) => step === 'open')).toBe(true)
    expect(bell.flatMap((step, i) => (step === 'neck' ? [i] : []))).toEqual([5, 7, 9])
  })

  it('mambo: both brass sections play through the whole cycle, the trumpets on the clave', () => {
    const steps = (id: string, instrument: string) =>
      salsaPresets.find((p) => p.id === id)!.tracks.find((t) => t.instrument === instrument)!.steps
    const mambo = salsaPresets.find((p) => p.id === 'salsa-mambo-3-2')!
    for (const instrument of ['trumpet', 'trombone']) {
      const track = mambo.tracks.find((t) => t.instrument === instrument)!
      expect(track.muted, instrument).toBeFalsy()
      expect(onsets(mambo, instrument).some((i) => i < 8), instrument).toBe(true)
      expect(onsets(mambo, instrument).some((i) => i >= 8), instrument).toBe(true)
      // Pushes into the next cycle on &8, like the rest of the band.
      expect(steps('salsa-mambo-3-2', instrument)[15], instrument).toBe('push')
      const turned = [...steps('salsa-mambo-3-2', instrument).slice(8), ...steps('salsa-mambo-3-2', instrument).slice(0, 8)]
      expect(steps('salsa-mambo-2-3', instrument), instrument).toEqual(turned)
    }
    // Trumpet stabs land on the clave strokes after the 1 (it rings with the push).
    expect(onsets(mambo, 'trumpet').slice(0, 4)).toEqual(SON_CLAVE_3_2.slice(1))
  })

  it.each(['salsa-verse-montuno', 'salsa-verse-montuno-2-3'])('%s: the timbales fill into the montuno', (id) => {
    const timbales = salsaPresets.find((p) => p.id === id)!.tracks.find((t) => t.instrument === 'timbales')!.steps
    expect(timbales.slice(12, 16)).toEqual(['high', 'high', 'high', 'low'])
    expect(timbales.slice(16).every((step) => step === null)).toBe(true)
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

  // Rules confirmed by written breakdowns; see docs/bachata-rhythms.md.
  const bachataSection = (id: string) => bachataPresets.find((p) => p.id === id)!
  /** Onsets of an instrument within each bar, the same for every bar. */
  const barOnsets = (pattern: Pattern, instrument: string) => {
    const bars = Array.from({ length: pattern.counts / COUNTS_PER_BAR }, (_, b) =>
      onsets(pattern, instrument).filter((i) => Math.floor(i / 8) === b).map((i) => i % 8))
    for (const bar of bars) expect(bar, instrument).toEqual(bars[0])
    return bars[0]
  }
  const hits = (pattern: Pattern, instrument: string, positions: number[]) =>
    positions.map((i) => pattern.tracks.find((t) => t.instrument === instrument)!.steps[i])

  it('bachata derecho: bongo and güira on every eighth, the hembra on 4', () => {
    const derecho = bachataSection('bachata-derecho')
    expect(barOnsets(derecho, 'bongos')).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(barOnsets(derecho, 'guira')).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(hits(derecho, 'bongos', [0, 4, 6])).toEqual(['high', 'high', 'low'])
  })

  it('bachata derecho: segunda bass notes on 1, 3, 4, strums in between', () => {
    const derecho = bachataSection('bachata-derecho')
    expect(barOnsets(derecho, 'segunda')).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    const steps = hits(derecho, 'segunda', [0, 1, 2, 3, 4, 5, 6, 7])
    expect(steps.flatMap((s, i) => (s === 'chord' ? [] : [i]))).toEqual([0, 4, 6])
  })

  it('bachata majao: bongo and güira drop the upbeats, the hembra still on 4', () => {
    const majao = bachataSection('bachata-majao')
    expect(barOnsets(majao, 'bongos')).toEqual([0, 2, 4, 6])
    expect(barOnsets(majao, 'guira')).toEqual([0, 2, 4, 6])
    expect(hits(majao, 'bongos', [0, 2, 4, 6])).toEqual(['high', 'high', 'high', 'low'])
  })

  it('bachata mambo: güira on 1, 2&, 3, 4&', () => {
    expect(barOnsets(bachataSection('bachata-mambo'), 'guira')).toEqual([0, 3, 4, 7])
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
