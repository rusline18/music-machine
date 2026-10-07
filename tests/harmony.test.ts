import { describe, expect, it } from 'vitest'
import { chordAt } from '../app/composables/usePattern'
import type { Pattern } from '../app/composables/usePattern'
import { genreConfig, stepNames, stepResolver } from '../app/data/genres'
import { CHORD_NAMES, chordTones, noteFrom, parseChord, voicesToNotes } from '../app/data/harmony'

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

describe('chordAt', () => {
  it('changes chord every bar and loops the progression', () => {
    const pattern = { stepsPerCount: 2, chords: ['Am', 'Dm'] }
    expect(chordAt(pattern, 0)).toBe('Am')
    expect(chordAt(pattern, 7)).toBe('Am')
    expect(chordAt(pattern, 8)).toBe('Dm')
    expect(chordAt(pattern, 16)).toBe('Am')
    expect(chordAt({ stepsPerCount: 2 }, 0)).toBeUndefined()
  })
})

describe('bachata pitched tracks', () => {
  const config = genreConfig.bachata
  const resolve = stepResolver(config)
  // Semitones a played note may sit from its recording: guitars have a zone
  // every 3 semitones, the bass a single recorded A2.
  const MAX_SHIFT: Record<string, number> = { bass: 7, requinto: 2, segunda: 2 }

  function notes(instrument: string, step: string, chord: string) {
    const pattern: Pattern = {
      id: 't', name: 't', genre: 'bachata', counts: 4, stepsPerCount: 2, bpm: 130, chords: [chord],
      tracks: [{ instrument, steps: [step], volume: 1, muted: false }],
    }
    return resolve(pattern, pattern.tracks[0]!, 0)
  }

  it('plays the chord root on the segunda bass string', () => {
    // A2 comes from the Bb2 recording a semitone down; E2 is recorded as is.
    expect(notes('segunda', 'bass', 'Am')).toEqual([{ url: '/audio/bachata/guitar/bb2.wav', rate: 2 ** (-1 / 12), gain: 0.9, group: 'low' }])
    expect(notes('segunda', 'bass', 'E')[0]).toMatchObject({ url: '/audio/bachata/guitar/e2.wav', rate: 1 })
  })

  it('arpeggiates three treble chord tones', () => {
    const chord = notes('segunda', 'chord', 'E')
    expect(chord).toHaveLength(3)
    expect(chord.map((n) => n.delay)).toEqual([0, 0.012, 0.024])
  })

  it('cuts the mute short and damps the other strings', () => {
    const mute = notes('segunda', 'mute', 'Am')
    expect(mute.every((n) => n.duration === 0.05)).toBe(true)
    expect(mute[0]!.group).toBe('*')
  })

  it('plays the requinto as one line, with dyads as the third and fifth together', () => {
    const dyad = notes('requinto', 'dyad', 'Am')
    // C5 over E4, a sixth: both are recorded notes, no resampling.
    expect(dyad.map((n) => [n.url, n.rate])).toEqual([['/audio/bachata/guitar/c5.wav', 1], ['/audio/bachata/guitar/e4.wav', 1]])
    expect(dyad[0]!.group).toBe('*')
    expect(notes('requinto', 'root', 'Am')[0]!.group).toBe('*')
  })

  it.each(['bass', 'requinto', 'segunda'])('%s stays close to a recorded note for every chord', (instrument) => {
    for (const chord of CHORD_NAMES) {
      for (const step of stepNames(config, instrument)) {
        for (const note of notes(instrument, step, chord)) {
          const semitones = Math.abs(12 * Math.log2(note.rate!))
          expect(semitones, `${instrument} ${step} over ${chord}`).toBeLessThanOrEqual(MAX_SHIFT[instrument]! + 1e-9)
        }
      }
    }
  })
})
