import { describe, expect, it } from 'vitest'
import { CHORD_NAMES } from '~/core/harmony'
import type { Pattern } from '~/core/pattern'
import { sampleResolver, sampleUrls, stepNames, stepResolver } from '~/core/resolve'
import { bachata } from '~/genres/bachata'

const pattern: Pattern = { id: 't', counts: 2, stepsPerCount: 2, bpm: 120, tracks: [] }

describe('sampleResolver', () => {
  const track = { instrument: 'bongos', steps: ['high', 'high', 'high', 'low'], volume: 1, muted: false }
  const resolve = sampleResolver({ bongos: { high: ['/h1.wav', '/h2.wav'], low: '/l.wav' } })

  it('rotates through the takes of a stroke', () => {
    const urls = [0, 1, 2, 3].map((i) => resolve(pattern, track, i)[0]?.url)
    expect(urls).toEqual(['/h1.wav', '/h2.wav', '/h1.wav', '/l.wav'])
  })
})


describe('stepNames', () => {
  it('lists sample names for one-shots and articulations for pitched instruments', () => {
    expect(stepNames(bachata, 'campana')).toEqual(['open', 'neck'])
    expect(stepNames(bachata, 'bass')).toEqual(['root', '5th'])
    expect(stepNames(bachata, 'unknown')).toEqual([])
  })
})

describe('sampleUrls', () => {
  it('includes every take and every pitched zone, once', () => {
    const urls = sampleUrls(bachata)
    expect(urls).toContain('/audio/bachata/guira/long-3.wav')
    expect(urls).toContain('/audio/bachata/bass/a2.wav')
    expect(urls).toContain('/audio/bachata/guitar/e5.wav')
    expect([...urls].filter((url) => url.includes('/guitar/'))).toHaveLength(13)
  })
})

describe('bachata pitched tracks', () => {
  const resolve = stepResolver(bachata)
  // Semitones a played note may sit from its recording: guitars have a zone
  // every 3 semitones, the bass a single recorded A2.
  const MAX_SHIFT: Record<string, number> = { bass: 7, requinto: 2, segunda: 2 }

  function notes(instrument: string, step: string, chord: string) {
    const pattern: Pattern = {
      id: 't', counts: 4, stepsPerCount: 2, bpm: 130, chords: [chord],
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
      for (const step of stepNames(bachata, instrument)) {
        for (const note of notes(instrument, step, chord)) {
          const semitones = Math.abs(12 * Math.log2(note.rate!))
          expect(semitones, `${instrument} ${step} over ${chord}`).toBeLessThanOrEqual(MAX_SHIFT[instrument]! + 1e-9)
        }
      }
    }
  })
})
