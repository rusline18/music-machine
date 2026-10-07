export type Genre = 'salsa' | 'bachata'

/**
 * A single step's sample choice, or null for silence.
 * Sample names must match a key in that instrument's sample map (see samples.ts).
 */
export type Step = string | null

export interface InstrumentTrack {
  instrument: string
  /** Which sample from the instrument's sample map plays at each step. */
  steps: Step[]
  volume: number
  muted: boolean
}

export interface Pattern {
  id: string
  name: string
  genre: Genre
  /** Steps per bar. 16 = sixteenth notes in a 4/4 bar. */
  stepsPerBar: number
  bpm: number
  tracks: InstrumentTrack[]
}

export function createEmptyTrack(instrument: string, stepsPerBar = 16): InstrumentTrack {
  return {
    instrument,
    steps: Array.from({ length: stepsPerBar }, () => null),
    volume: 1,
    muted: false,
  }
}

export function createEmptyPattern(genre: Genre, instruments: string[], stepsPerBar = 16): Pattern {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled pattern',
    genre,
    stepsPerBar,
    bpm: genre === 'salsa' ? 90 : 130,
    tracks: instruments.map((instrument) => createEmptyTrack(instrument, stepsPerBar)),
  }
}

export function clonePattern(pattern: Pattern): Pattern {
  return structuredClone(pattern)
}

export function serializePattern(pattern: Pattern): string {
  return btoa(encodeURIComponent(JSON.stringify(pattern)))
}

export function deserializePattern(encoded: string): Pattern {
  return JSON.parse(decodeURIComponent(atob(encoded)))
}
