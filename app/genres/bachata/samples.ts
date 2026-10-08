import type { Chord, PitchedInstrument, Voice, Zone } from '~/core/harmony'
import { chordTones, noteFrom } from '~/core/harmony'
import type { SampleMap } from '~/core/resolve'

/**
 * Instruments for Bachata. Paths point into /public/audio/bachata, built by
 * `npm run samples` (which reads the paths from this file). A list of paths
 * is several takes of the same stroke, played in turn.
 *
 * Percussion plays one sample per stroke; bass and guitars are pitched
 * instruments that follow the chords (see the end of this file).
 */
export const bachataSamples: Record<string, SampleMap> = {
  guira: {
    short: ['/audio/bachata/guira/short.wav', '/audio/bachata/guira/short-2.wav', '/audio/bachata/guira/short-3.wav'],
    long: ['/audio/bachata/guira/long.wav', '/audio/bachata/guira/long-2.wav', '/audio/bachata/guira/long-3.wav'],
  },
  bongos: {
    low: ['/audio/bachata/bongos/low.wav', '/audio/bachata/bongos/low-2.wav'],
    high: ['/audio/bachata/bongos/high.wav', '/audio/bachata/bongos/high-2.wav'],
    slap: ['/audio/bachata/bongos/slap.wav', '/audio/bachata/bongos/slap-2.wav'],
  },
  campana: {
    // The bongo player's hand bell in the mambo: open (mouth) and a short,
    // dull stroke near the neck.
    open: '/audio/bachata/campana/open.wav',
    neck: '/audio/bachata/campana/neck.wav',
  },
}

/**
 * Recorded guitar notes every 3 semitones from E2 to E5 (C5 stands in for
 * a missing C#5), tuned exactly to pitch by `npm run samples`. Any other
 * note is at most 2 semitones away, close enough to resample cleanly.
 */
const GUITAR_ZONES: Zone[] = [
  { url: '/audio/bachata/guitar/e2.wav', midi: 40 },
  { url: '/audio/bachata/guitar/g2.wav', midi: 43 },
  { url: '/audio/bachata/guitar/bb2.wav', midi: 46 },
  { url: '/audio/bachata/guitar/db3.wav', midi: 49 },
  { url: '/audio/bachata/guitar/e3.wav', midi: 52 },
  { url: '/audio/bachata/guitar/g3.wav', midi: 55 },
  { url: '/audio/bachata/guitar/bb3.wav', midi: 58 },
  { url: '/audio/bachata/guitar/db4.wav', midi: 61 },
  { url: '/audio/bachata/guitar/e4.wav', midi: 64 },
  { url: '/audio/bachata/guitar/g4.wav', midi: 67 },
  { url: '/audio/bachata/guitar/bb4.wav', midi: 70 },
  { url: '/audio/bachata/guitar/c5.wav', midi: 72 },
  { url: '/audio/bachata/guitar/e5.wav', midi: 76 },
]

// MIDI note numbers: E2 = 40, A2 = 45, G3 = 55, E4 = 64, E5 = 76.

/** Root of the chord between E2 and D#3 — the guitar's bass strings. */
const guitarBass = (chord: Chord) => noteFrom(40, chord.root)
/** The chord's fifth in the same register. */
const guitarFifth = (chord: Chord) => noteFrom(40, chord.root + 7)
/** Up to three chord tones from G3 up — the treble strings. */
const trebleTones = (chord: Chord) => chordTones(chord, 55, 67).slice(0, 3)

/**
 * Segunda: alternating bass note, a quick upward arpeggio on the treble
 * strings, and a muted chuck. Each string chokes its own previous note; the
 * mute damps everything.
 */
const segunda: PitchedInstrument = {
  zones: GUITAR_ZONES,
  articulations: {
    bass: (chord) => [{ midi: guitarBass(chord), gain: 0.9, group: 'low' }],
    '5th': (chord) => [{ midi: guitarFifth(chord), gain: 0.8, group: 'low' }],
    chord: (chord) => trebleTones(chord).map((midi, i): Voice => ({ midi, delay: i * 0.012, gain: 0.55, group: `s${i}` })),
    mute: (chord) => trebleTones(chord).map((midi, i): Voice => ({
      midi,
      delay: i * 0.004,
      gain: 0.7,
      duration: 0.05,
      ...(i === 0 ? { group: '*' } : {}),
    })),
  },
}

/**
 * Requinto: chord tones for melodic lines and arpeggios, each between E4 and
 * D#5 — the bright register the smaller, higher-tuned requinto lives in.
 * It's a lead line, so every note damps the one before; `dyad` is the third
 * and fifth together, the requinto's trademark thirds and sixths.
 */
const requintoNote = (chord: Chord, degree: number) => noteFrom(64, chord.root + chord.intervals[degree]!)
const requinto: PitchedInstrument = {
  zones: GUITAR_ZONES,
  articulations: {
    root: (chord) => [{ midi: requintoNote(chord, 0), group: '*' }],
    '3rd': (chord) => [{ midi: requintoNote(chord, 1), group: '*' }],
    '5th': (chord) => [{ midi: requintoNote(chord, 2), group: '*' }],
    dyad: (chord) => [
      { midi: requintoNote(chord, 1), gain: 0.75, group: '*' },
      { midi: requintoNote(chord, 2), gain: 0.75, group: 'dyad' },
    ],
  },
}

/** Bass: root and fifth, between D2 and D3. One note at a time. */
const bassRoot = (chord: Chord) => noteFrom(38, chord.root)
const bass: PitchedInstrument = {
  zones: [{ url: '/audio/bachata/bass/a2.wav', midi: 45 }],
  articulations: {
    root: (chord) => [{ midi: bassRoot(chord), group: 'bass' }],
    '5th': (chord) => {
      const root = bassRoot(chord)
      // Fifth above if it stays in range, otherwise the fifth below.
      return [{ midi: root + 7 <= 50 ? root + 7 : root - 5, group: 'bass' }]
    },
  },
}

export const bachataPitched: Record<string, PitchedInstrument> = { bass, requinto, segunda }
