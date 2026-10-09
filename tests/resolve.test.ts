import { describe, expect, it } from 'vitest'
import { CHORD_NAMES } from '~/core/harmony'
import type { Pattern } from '~/core/pattern'
import { countingFigure, sampleResolver, sampleUrls, stepNames, stepResolver } from '~/core/resolve'
import { bachata } from '~/genres/bachata'
import { salsa } from '~/genres/salsa'

const pattern: Pattern = { id: 't', counts: 2, stepsPerCount: 2, bpm: 120, tracks: [] }

describe('sampleResolver', () => {
  const track = { instrument: 'bongos', steps: ['high', 'high', 'high', 'low'], volume: 1, muted: false }
  const resolve = sampleResolver({ bongos: { high: ['/h1.wav', '/h2.wav'], low: '/l.wav' } })

  it('rotates through the takes of a stroke', () => {
    const urls = [0, 1, 2, 3].map((i) => resolve(pattern, track, i)[0]?.url)
    expect(urls).toEqual(['/h1.wav', '/h2.wav', '/h1.wav', '/l.wav'])
  })

  it('plays a soft stroke at its own level, and only that stroke', () => {
    const soft = sampleResolver({ congas: { heel: [{ url: '/heel.wav', gain: 0.35 }, { url: '/heel-2.wav', gain: 0.35 }], open: '/open.wav' } })
    const congas = { instrument: 'congas', steps: ['heel', 'heel', 'open'], volume: 1, muted: false }
    expect([0, 1, 2].map((i) => soft(pattern, congas, i))).toEqual([
      [{ url: '/heel.wav', gain: 0.35 }],
      [{ url: '/heel-2.wav', gain: 0.35 }],
      [{ url: '/open.wav' }],
    ])
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
    const urls = sampleUrls(bachata, 'en')
    expect(urls).toContain('/audio/bachata/guira/long-3.wav')
    expect(urls).toContain('/audio/bachata/bass/a2.wav')
    expect(urls).toContain('/audio/bachata/guitar/e5.wav')
    // Soft strokes are listed by URL, like any other sample.
    expect(sampleUrls(salsa, 'en')).toContain('/audio/salsa/congas/heel-2.wav')
    expect([...urls].filter((url) => url.includes('/guitar/'))).toHaveLength(13)
  })

  it('includes only the counting voice of the given language', () => {
    expect(sampleUrls(bachata, 'ru')).toContain('/audio/voice/ru/and.wav')
    expect([...sampleUrls(bachata, 'ru')].some((url) => url.startsWith('/audio/voice/en/'))).toBe(false)
  })
})

describe('counting voice', () => {
  let locale = 'en'
  const resolve = stepResolver(bachata, () => locale)

  /** What the voice says at each step of a 16-count pattern with these steps. */
  function says(steps: (string | null)[]) {
    const pattern: Pattern = { id: 't', counts: 16, stepsPerCount: 2, bpm: 130, tracks: [{ instrument: 'voice', steps, volume: 1, muted: false }] }
    return steps.map((_, i) => resolve(pattern, pattern.tracks[0]!, i)[0]?.url.replace(/^\/audio\/voice\//, '') ?? null)
  }

  it('says the number of the count the step is on, starting over every 8 counts', () => {
    const steps = Array.from({ length: 32 }, (_, i) => (i % 2 === 0 ? 'count' : null))
    expect(says(steps).filter(Boolean)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => `en/${n}.wav`))
  })

  it('says "and" off the beat', () => {
    expect(says(['count', 'and', 'count', 'and'])).toEqual(['en/1.wav', 'en/and.wav', 'en/2.wav', 'en/and.wav'])
  })

  it('speaks the current language, falling back to the first one', () => {
    locale = 'ru'
    expect(says(['count'])).toEqual(['ru/1.wav'])
    locale = 'de'
    expect(says(['count'])).toEqual(['en/1.wav'])
    locale = 'en'
  })

  it('cuts off its previous word', () => {
    const pattern: Pattern = { id: 't', counts: 8, stepsPerCount: 2, bpm: 130, tracks: [{ instrument: 'voice', steps: ['count'], volume: 1, muted: false }] }
    expect(resolve(pattern, pattern.tracks[0]!, 0)[0]!.group).toBe('voice')
  })
})

describe('countingFigure', () => {
  it('builds one count of voice steps per mode', () => {
    expect(countingFigure('off', 2)).toEqual([null, null])
    expect(countingFigure('counts', 2)).toEqual(['count', null])
    expect(countingFigure('ands', 2)).toEqual(['count', 'and'])
    expect(countingFigure('ands', 4)).toEqual(['count', null, 'and', null])
  })
})

describe('bachata pitched tracks', () => {
  const resolve = stepResolver(bachata, () => 'en')
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

describe('salsa pitched tracks', () => {
  const resolve = stepResolver(salsa, () => 'en')
  // The bass has a single recorded A2; piano and guitar (tres) zones are
  // 3–4 semitones apart, plus the tres's few cents of course detuning.
  const MAX_SHIFT: Record<string, number> = { bass: 7, piano: 2, tres: 2.05 }

  /** Notes for `step` on count 4 of the first bar, over `chords` (a chord per bar). */
  function notesOn4(instrument: string, step: string, chords: string[]) {
    const steps = Array<string | null>(16).fill(null)
    steps[6] = step
    const pattern: Pattern = {
      id: 't', counts: 8, stepsPerCount: 2, bpm: 180, chords,
      tracks: [{ instrument, steps, volume: 1, muted: false }],
    }
    return resolve(pattern, pattern.tracks[0]!, 6)
  }
  const pitchOf = (note: { url: string, rate?: number }) => {
    const zone = Object.values(salsa.pitched).flatMap((p) => p.zones).find((z) => z.url === note.url)!
    return Math.round(zone.midi + 12 * Math.log2(note.rate ?? 1))
  }

  it('pushes the next bar’s chord: the bass anticipates the 1', () => {
    // C2 = 36, so the root of C in D2–D3 is C3 (48); G is G2 (43).
    expect(notesOn4('bass', 'root', ['C', 'G7']).map(pitchOf)).toEqual([48])
    expect(notesOn4('bass', 'push', ['C', 'G7']).map(pitchOf)).toEqual([43])
  })

  it('wraps round: the last bar pushes the first chord', () => {
    const steps = Array<string | null>(16).fill(null)
    steps[14] = 'push'
    const pattern: Pattern = {
      id: 't', counts: 8, stepsPerCount: 2, bpm: 180, chords: ['C', 'G7'],
      tracks: [{ instrument: 'bass', steps, volume: 1, muted: false }],
    }
    expect(resolve(pattern, pattern.tracks[0]!, 14).map(pitchOf)).toEqual([48])
  })

  it('plays the piano push as the next chord’s root in octaves over its chord', () => {
    const pitches = notesOn4('piano', 'push', ['C', 'F']).map(pitchOf)
    // F4 and F5, then A4 C5 F5's stab tones from E4 up
    expect(pitches.slice(0, 2)).toEqual([65, 77])
    expect(pitches.slice(2).map((p) => p % 12).sort()).toEqual([0, 5, 9])
  })

  it('doubles every tres note like a course: the root in octaves, the rest in unison, a little apart', () => {
    const root = notesOn4('tres', 'root', ['C', 'G7'])
    // C on the G course: C4 with C5 above it, a few ms later
    expect(root.map(pitchOf)).toEqual([60, 72])
    expect(root[1]!.delay).toBeGreaterThan(root[0]!.delay ?? 0)
    expect(root[0]!.group).toBe('*')
    const third = notesOn4('tres', '3rd', ['C', 'G7'])
    expect(third.map(pitchOf)).toEqual([64, 64])
    expect(third[0]!.rate).not.toBe(third[1]!.rate)
  })

  it('plays the tres push as the next chord in thirds', () => {
    // Next chord G7: B4 and D5, each a doubled course
    expect(notesOn4('tres', 'push', ['C', 'G7']).map(pitchOf)).toEqual([71, 71, 74, 74])
  })

  it.each(['bass', 'piano', 'tres'])('%s stays close to a recorded note for every chord', (instrument) => {
    for (const chord of CHORD_NAMES) {
      for (const next of ['C', 'F#m7', 'B7']) {
        for (const step of stepNames(salsa, instrument)) {
          for (const note of notesOn4(instrument, step, [chord, next])) {
            const semitones = Math.abs(12 * Math.log2(note.rate!))
            expect(semitones, `${instrument} ${step} over ${chord}`).toBeLessThanOrEqual(MAX_SHIFT[instrument]! + 1e-9)
          }
        }
      }
    }
  })
})
