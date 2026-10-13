import type { Note } from './engine'

// How far a fully loose (feel = 1) player strays from the grid.
const MAX_LATE_S = 0.012
const MAX_GAIN_SPREAD = 0.15
const MAX_DETUNE_CENTS = 8
const OFFBEAT_SOFTENING = 0.2

/**
 * Makes a note sound played rather than programmed: a few ms late, a little
 * louder or softer, a few cents off pitch, and softer off the beat. `feel`
 * runs from 0 (untouched) to 1. Notes only ever move later, never earlier,
 * so nothing gets scheduled in the past. A spoken word keeps its pitch (a
 * detuned voice sounds synthetic) and its own level off the beat.
 */
export function humanizeNote(note: Note, feel: number, offbeat: boolean, random: () => number = Math.random): Note {
  if (feel <= 0) return note
  const spread = (amount: number) => (random() * 2 - 1) * amount * feel
  const accent = offbeat && !note.spoken ? 1 - OFFBEAT_SOFTENING * feel : 1
  const delay = (note.delay ?? 0) + random() * MAX_LATE_S * feel
  const gain = (note.gain ?? 1) * accent * (1 + spread(MAX_GAIN_SPREAD))
  if (note.spoken) return { ...note, delay, gain }
  return { ...note, delay, gain, rate: (note.rate ?? 1) * 2 ** (spread(MAX_DETUNE_CENTS) / 1200) }
}
