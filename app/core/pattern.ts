/** Lengths offered in the UI. Dancers phrase in 8-count blocks. */
export const COUNT_OPTIONS = [8, 16, 24, 32] as const
export const COUNTS_PER_BLOCK = 8
/** Chords change at most once a bar. */
export const COUNTS_PER_BAR = 4

/**
 * A single step's sample choice, or null for silence.
 * Names must be one of the instrument's step names (see `stepNames`).
 */
export type Step = string | null

export interface Track {
  instrument: string
  /** What the instrument plays at each step. */
  steps: Step[]
  volume: number
  muted: boolean
}

export interface Pattern {
  /** Also the i18n key of the pattern's name (`presets.<id>`). */
  id: string
  /** Length in dance counts (quarter notes) — a multiple of 8. */
  counts: number
  /** Grid cells per count. 2 = eighth notes ("1 &"). */
  stepsPerCount: number
  /** Tempo in counts per minute, i.e. quarter-note BPM. */
  bpm: number
  /**
   * One chord name per bar (counts / 4), e.g. ['Am', 'Dm', 'E', 'Am'].
   * Pitched tracks (guitars, bass) follow it; patterns without pitched
   * tracks leave it out.
   */
  chords?: string[]
  tracks: Track[]
}

export function patternLength(pattern: Pick<Pattern, 'counts' | 'stepsPerCount'>): number {
  return pattern.counts * pattern.stepsPerCount
}

/** The chord in force at a step, or undefined if the pattern has none. */
export function chordAt(pattern: Pick<Pattern, 'chords' | 'stepsPerCount'>, stepIndex: number): string | undefined {
  if (!pattern.chords?.length) return undefined
  const bar = Math.floor(stepIndex / (pattern.stepsPerCount * COUNTS_PER_BAR))
  return pattern.chords[bar % pattern.chords.length]
}

/**
 * Stretch or cut a list to `length`. Growing repeats what's there, so going
 * from 8 to 16 counts gives a second copy of the block to edit rather than
 * 8 counts of silence.
 */
export function resizeSteps<T>(steps: T[], length: number): (T | null)[] {
  if (steps.length === 0) return Array.from({ length }, () => null)
  return Array.from({ length }, (_, i) => steps[i % steps.length]!)
}

export interface TrackSpec {
  instrument: string
  /** A figure (one bar, one block…) repeated to fill the pattern. Leave out for a silent track. */
  figure?: Step[]
  volume?: number
  /** Defaults to muted for silent tracks, unmuted otherwise. */
  muted?: boolean
}

export interface PatternSpec extends Omit<Pattern, 'tracks' | 'stepsPerCount'> {
  stepsPerCount?: number
  tracks: TrackSpec[]
}

/** Builds a preset from repeating figures, so each one reads like a score. */
export function definePattern({ stepsPerCount = 2, tracks, ...rest }: PatternSpec): Pattern {
  const length = rest.counts * stepsPerCount
  return {
    ...rest,
    stepsPerCount,
    tracks: tracks.map(({ instrument, figure = [], volume = 1, muted = figure.length === 0 }) => ({
      instrument,
      steps: resizeSteps(figure, length),
      volume,
      muted,
    })),
  }
}

/**
 * Join patterns end to end — e.g. an 8-count verse block followed by a
 * montuno block. A track muted in one block plays silence there, and is
 * only muted overall if it's muted in every block. Tempo comes from the
 * first pattern; chords are joined like the steps.
 */
export function chainPatterns(id: string, first: Pattern, ...rest: Pattern[]): Pattern {
  const blocks = [first, ...rest]
  for (const block of rest) {
    if (block.stepsPerCount !== first.stepsPerCount) {
      throw new Error(`Can't chain ${block.id}: stepsPerCount differs from ${first.id}`)
    }
  }
  const trackIn = (block: Pattern, instrument: string) => block.tracks.find((t) => t.instrument === instrument)
  return {
    ...first,
    id,
    counts: blocks.reduce((sum, block) => sum + block.counts, 0),
    chords: first.chords && blocks.flatMap((block) => block.chords ?? Array(block.counts / COUNTS_PER_BAR).fill(first.chords![0])),
    tracks: first.tracks.map((track) => ({
      ...track,
      steps: blocks.flatMap((block) => {
        const blockTrack = trackIn(block, track.instrument)
        return !blockTrack || blockTrack.muted ? Array(patternLength(block)).fill(null) : blockTrack.steps
      }),
      muted: blocks.every((block) => trackIn(block, track.instrument)?.muted ?? true),
    })),
  }
}

/**
 * Change the loop length in counts, in place (so a running scheduler picks
 * it up on its next tick). Steps and chords repeat to fill a longer loop.
 */
export function setPatternCounts(pattern: Pattern, counts: number): void {
  const length = counts * pattern.stepsPerCount
  for (const track of pattern.tracks) track.steps = resizeSteps(track.steps, length)
  const { chords } = pattern
  if (chords?.length) {
    pattern.chords = resizeSteps(chords, counts / COUNTS_PER_BAR).map((chord) => chord ?? chords[0]!)
  }
  pattern.counts = counts
}

/** The step after `current` when a grid cell is clicked: each name in turn, then silence. */
export function nextStep(current: Step, names: string[]): Step {
  const next = (current === null ? -1 : names.indexOf(current)) + 1
  return names[next] ?? null
}
