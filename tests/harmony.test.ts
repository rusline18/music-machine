import { describe, expect, it } from 'vitest'
import { CHORD_NAMES, chordTones, noteFrom, parseChord, voicesToNotes } from '~/core/harmony'

describe('parseChord', () => {
  it('reads root and quality', () => {
    expect(parseChord('Am')).toMatchObject({ root: 9, intervals: [0, 3, 7] })
    expect(parseChord('E7')).toMatchObject({ root: 4, intervals: [0, 4, 7, 10] })
    expect(parseChord('Bb')).toMatchObject({ root: 10, intervals: [0, 4, 7] })
    expect(parseChord('F#m7')).toMatchObject({ root: 6, intervals: [0, 3, 7, 10] })
  })

  it('accepts every chord the picker offers', () => {
    for (const name of CHORD_NAMES) expect(() => parseChord(name)).not.toThrow()
  })

  it('rejects nonsense', () => {
    expect(() => parseChord('H')).toThrow(/Unknown chord/)
  })
})

describe('chord tones', () => {
  it('finds the next note of a pitch class', () => {
    expect(noteFrom(40, 9)).toBe(45) // A2 above E2
    expect(noteFrom(40, 4)).toBe(40) // E2 itself
  })

  it('lists chord tones in a range', () => {
    expect(chordTones(parseChord('Am'), 55, 67)).toEqual([57, 60, 64]) // A3 C4 E4
  })
})

describe('voicesToNotes', () => {
  const instrument = { zones: [{ url: 'low', midi: 45 }, { url: 'high', midi: 55 }], articulations: {} }

  it('picks the closest zone and resamples to pitch', () => {
    const [low, high] = voicesToNotes(instrument, [{ midi: 47 }, { midi: 67 }])
    expect(low!.url).toBe('low')
    expect(low!.rate).toBeCloseTo(2 ** (2 / 12))
    expect(high!.url).toBe('high')
    expect(high!.rate).toBeCloseTo(2)
  })
})
