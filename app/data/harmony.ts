import type { Note } from '../composables/useAudioEngine'

/**
 * Just enough harmony for pitched tracks (guitars, bass): chord names, chord
 * tones as MIDI notes, and turning a MIDI note into a pitch-shifted sample.
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const PITCH_CLASS: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
}

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
}

/** Every chord the chord picker offers: 12 roots × major, minor, 7, m7. */
// Spelled out: Object.keys would put the integer-like '7' first.
export const CHORD_NAMES = NOTE_NAMES.flatMap((root) => ['', 'm', '7', 'm7'].map((quality) => root + quality))

export interface Chord {
  name: string
  /** Pitch class of the root, C = 0. */
  root: number
  /** Semitones above the root, root first. */
  intervals: number[]
}

export function parseChord(name: string): Chord {
  const match = /^([A-G][#b]?)(m7|m|7)?$/.exec(name)
  const root = match && PITCH_CLASS[match[1]!]
  if (root === undefined || root === null) throw new Error(`Unknown chord: ${name}`)
  return { name, root, intervals: QUALITIES[match![2] ?? '']! }
}

/** The lowest MIDI note >= `low` with pitch class `pitchClass`. */
export function noteFrom(low: number, pitchClass: number): number {
  return low + ((((pitchClass - low) % 12) + 12) % 12)
}

/** All chord tones between `low` and `high` (inclusive), ascending. */
export function chordTones(chord: Chord, low: number, high: number): number[] {
  const pitchClasses = new Set(chord.intervals.map((i) => (chord.root + i) % 12))
  const tones: number[] = []
  for (let midi = low; midi <= high; midi++) if (pitchClasses.has(midi % 12)) tones.push(midi)
  return tones
}

/** One note an articulation asks for; turned into a sample playback by `PitchedInstrument`. */
export interface Voice {
  midi: number
  /** Seconds after the step. */
  delay?: number
  gain?: number
  /** Cut the note off after this many seconds (muted strokes). */
  duration?: number
  /** A new note stops the ringing notes in its group, like a string re-plucked; '*' stops all. */
  group?: string
}

/** A recorded note that gets pitch-shifted to play nearby notes. */
export interface Zone {
  url: string
  midi: number
}

export interface PitchedInstrument {
  zones: Zone[]
  /** Step name → the notes it plays over the current chord. */
  articulations: Record<string, (chord: Chord) => Voice[]>
}

/**
 * Plays each voice from the closest recorded zone, resampled to pitch.
 * Resampling is fine for a few semitones; further out it starts to sound
 * slowed down / sped up, so keep zones within ~7 semitones of the notes used.
 */
export function voicesToNotes(instrument: PitchedInstrument, voices: Voice[]): Note[] {
  return voices.map(({ midi, ...rest }) => {
    const zone = instrument.zones.reduce((best, z) => (Math.abs(z.midi - midi) < Math.abs(best.midi - midi) ? z : best))
    return { url: zone.url, rate: 2 ** ((midi - zone.midi) / 12), ...rest }
  })
}
