export type Genre = 'salsa' | 'bachata'

/** Lengths offered in the UI. Dancers phrase in 8-count blocks. */
export const COUNT_OPTIONS = [8, 16, 24, 32] as const
export const COUNTS_PER_BLOCK = 8

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
  /** Length in dance counts (quarter notes) — a multiple of 8. */
  counts: number
  /** Grid cells per count. 2 = eighth notes ("1 &"). */
  stepsPerCount: number
  /** Tempo in counts per minute, i.e. quarter-note BPM. */
  bpm: number
  tracks: InstrumentTrack[]
}

export function patternLength(pattern: Pick<Pattern, 'counts' | 'stepsPerCount'>): number {
  return pattern.counts * pattern.stepsPerCount
}

export function createEmptyTrack(instrument: string, length = 16): InstrumentTrack {
  return {
    instrument,
    steps: Array.from({ length }, () => null),
    volume: 1,
    muted: false,
  }
}

export function createEmptyPattern(genre: Genre, instruments: string[], counts = 8, stepsPerCount = 2): Pattern {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled pattern',
    genre,
    counts,
    stepsPerCount,
    bpm: genre === 'salsa' ? 180 : 130,
    tracks: instruments.map((instrument) => createEmptyTrack(instrument, counts * stepsPerCount)),
  }
}

/**
 * Stretch or cut a step list to `length`. Growing repeats what's there, so
 * going from 8 to 16 counts gives a second copy of the block to edit rather
 * than 8 counts of silence.
 */
export function resizeSteps(steps: Step[], length: number): Step[] {
  if (steps.length === 0) return Array.from({ length }, () => null)
  return Array.from({ length }, (_, i) => steps[i % steps.length]!)
}

/**
 * Join patterns end to end — e.g. an 8-count verse block followed by a
 * montuno block. A track muted in one block plays silence there, and is
 * only muted overall if it's muted in every block. Tempo comes from the
 * first pattern.
 */
export function chainPatterns(id: string, name: string, first: Pattern, ...rest: Pattern[]): Pattern {
  const blocks = [first, ...rest]
  for (const block of rest) {
    if (block.stepsPerCount !== first.stepsPerCount) {
      throw new Error(`Can't chain ${block.id}: stepsPerCount differs from ${first.id}`)
    }
  }
  return {
    ...first,
    id,
    name,
    counts: blocks.reduce((sum, block) => sum + block.counts, 0),
    tracks: first.tracks.map((track) => {
      const parts = blocks.map((block) => {
        const blockTrack = block.tracks.find((t) => t.instrument === track.instrument)
        if (!blockTrack || blockTrack.muted) return Array.from({ length: patternLength(block) }, () => null)
        return blockTrack.steps
      })
      return {
        ...track,
        steps: parts.flat(),
        muted: blocks.every((block) => block.tracks.find((t) => t.instrument === track.instrument)?.muted ?? true),
      }
    }),
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
