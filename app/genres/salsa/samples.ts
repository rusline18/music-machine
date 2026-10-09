import type { Chord, PitchedInstrument, Voice, Zone } from '~/core/harmony'
import { chordTones, noteFrom } from '~/core/harmony'
import type { Sample, SampleMap } from '~/core/resolve'

/** Takes of a soft stroke, each played at `gain`. */
const soft = (gain: number, ...urls: string[]): Sample[] => urls.map((url) => ({ url, gain }))

/**
 * Sample maps for the Salsa percussion, in grid order.
 * Paths point into /public/audio/salsa, built by `npm run samples` (which
 * reads the paths from this file). A list of paths is several takes of the
 * same stroke, played in turn; `soft` sets a quiet stroke's level. New
 * strokes go at the end of a map: shared links store each step as its
 * position in the map.
 *
 * Bass and piano are pitched instruments that follow the chords (see the
 * end of this file).
 */
export const salsaSamples: Record<string, SampleMap> = {
  clave: {
    hit: '/audio/salsa/clave/hit.wav',
  },
  congas: {
    // Low = open tone on the tumba; heel and toe are the quiet palm and
    // fingertip strokes that fill the tumbao between slap and open tones.
    low: '/audio/salsa/congas/low.wav',
    slap: '/audio/salsa/congas/slap.wav',
    open: '/audio/salsa/congas/open.wav',
    heel: soft(0.35, '/audio/salsa/congas/heel.wav', '/audio/salsa/congas/heel-2.wav'),
    toe: soft(0.3, '/audio/salsa/congas/toe.wav', '/audio/salsa/congas/toe-2.wav'),
  },
  bongos: {
    low: ['/audio/salsa/bongos/low.wav', '/audio/salsa/bongos/low-2.wav'],
    high: ['/audio/salsa/bongos/high.wav', '/audio/salsa/bongos/high-2.wav'],
    slap: ['/audio/salsa/bongos/slap.wav', '/audio/salsa/bongos/slap-2.wav'],
  },
  timbales: {
    low: '/audio/salsa/timbales/low.wav',
    high: '/audio/salsa/timbales/high.wav',
    rim: '/audio/salsa/timbales/rim.wav',
  },
  // The bongo player's hand bell (campana) for the montuno: the mouth of the
  // bell, and a short, dull stroke near the neck.
  cowbell: {
    hit: '/audio/salsa/cowbell/hit.wav',
    neck: soft(0.5, '/audio/salsa/cowbell/neck.wav'),
  },
  // The bell mounted on the timbales: mambo bell in the montuno, cha-cha
  // bell in cha-cha-chá. A different, higher bell than the bongo bell.
  timbalebell: {
    open: '/audio/salsa/timbalebell/open.wav',
    neck: soft(0.5, '/audio/salsa/timbalebell/neck.wav'),
  },
  maracas: {
    hit: '/audio/salsa/maracas/hit.wav',
  },
  guiro: {
    short: '/audio/salsa/guiro/short.wav',
    long: '/audio/salsa/guiro/long.wav',
  },
}

// MIDI note numbers: D2 = 38, C4 = 60, E4 = 64, C6 = 84.

/**
 * Bass: root and fifth between D2 and D3, one note at a time. `push` is the
 * next bar's root, played early — the anticipation that lets the tumbao
 * skip the 1.
 */
const bassRoot = (chord: Chord) => noteFrom(38, chord.root)
const bass: PitchedInstrument = {
  zones: [{ url: '/audio/salsa/bass/a2.wav', midi: 45 }],
  articulations: {
    root: (chord) => [{ midi: bassRoot(chord), group: 'bass' }],
    '5th': (chord) => {
      const root = bassRoot(chord)
      // Fifth above if it stays in range, otherwise the fifth below.
      return [{ midi: root + 7 <= 50 ? root + 7 : root - 5, group: 'bass' }]
    },
    push: (_chord, next) => [{ midi: bassRoot(next), group: 'bass' }],
  },
}

/**
 * Recorded grand piano notes every 3–4 semitones from C4 to C6, tuned
 * exactly by `npm run samples`. Every note the montuno plays is at most 2
 * semitones from one of them.
 */
const PIANO_ZONES: Zone[] = [
  { url: '/audio/salsa/piano/c4.wav', midi: 60 },
  { url: '/audio/salsa/piano/e4.wav', midi: 64 },
  { url: '/audio/salsa/piano/g4.wav', midi: 67 },
  { url: '/audio/salsa/piano/b4.wav', midi: 71 },
  { url: '/audio/salsa/piano/d5.wav', midi: 74 },
  { url: '/audio/salsa/piano/f5.wav', midi: 77 },
  { url: '/audio/salsa/piano/a5.wav', midi: 81 },
  { url: '/audio/salsa/piano/c6.wav', midi: 84 },
]

/** A chord tone doubled in octaves, the lower one from C4 to B4 — the montuno's melody. */
const octave = (chord: Chord, degree: number): Voice[] => {
  const low = noteFrom(60, chord.root + chord.intervals[degree]!)
  return [{ midi: low, gain: 0.8, group: 'top' }, { midi: low + 12, gain: 0.6, group: 'top2' }]
}
/** A short chord stab: up to three tones from E4 to D#5. */
const fill = (chord: Chord): Voice[] =>
  chordTones(chord, 64, 75).slice(0, 3).map((midi, i) => ({ midi, gain: 0.5, duration: 0.18, group: `f${i}` }))

/**
 * Piano montuno: octaves on chord tones ringing over short chord stabs.
 * `push` is the next bar's chord, struck ahead of the bar line.
 */
const piano: PitchedInstrument = {
  zones: PIANO_ZONES,
  articulations: {
    root: (chord) => octave(chord, 0),
    '3rd': (chord) => octave(chord, 1),
    '5th': (chord) => octave(chord, 2),
    chord: (chord) => fill(chord),
    push: (_chord, next) => [...octave(next, 0), ...fill(next)],
  },
}

export const salsaPitched: Record<string, PitchedInstrument> = { bass, piano }
