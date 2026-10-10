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
  /**
   * For a song built from presets (see core/song.ts): the preset ids it
   * was put together from, one per 8-count block. Presets leave it out.
   */
  sections?: string[]
  tracks: Track[]
}

export function patternLength(pattern: Pick<Pattern, 'counts' | 'stepsPerCount'>): number {
  return pattern.counts * pattern.stepsPerCount
}

/** The track `instrument` plays on, if the pattern has one. */
export function trackOf(pattern: Pick<Pattern, 'tracks'>, instrument: string | null | undefined): Track | undefined {
  return pattern.tracks.find((track) => track.instrument === instrument)
}

/** Which count of its 8-count block a step falls on, 0–7 (0 = "1"). */
export function countInBlock(stepIndex: number, stepsPerCount: number): number {
  return Math.floor(stepIndex / stepsPerCount) % COUNTS_PER_BLOCK
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

/**
 * A figure started `by` steps later, the skipped part wrapped round to the
 * end. Half a clave cycle turns a 3-2 figure (clave, cáscara) into its 2-3.
 */
export function rotateFigure<T>(figure: readonly T[], by: number): T[] {
  return figure.map((_, i) => figure[(i + by) % figure.length]!)
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

/** The volume of the loudest of these tracks that plays at all. */
function loudest(tracks: (Track | undefined)[]): number | undefined {
  const playing = tracks.filter((track) => track && !track.muted && track.steps.some(Boolean)).map((track) => track!.volume)
  return playing.length ? Math.max(...playing) : undefined
}

/**
 * Join patterns end to end — e.g. an 8-count verse block followed by a
 * montuno block. A track muted in one block plays silence there, and is
 * only muted overall if it's muted in every block. A loop has one volume
 * per track: the loudest of the blocks it plays in, so brass that comes in
 * louder in a later block isn't held back by the first. Tempo comes from
 * the first pattern; chords are joined like the steps.
 */
export function chainPatterns(id: string, first: Pattern, ...rest: Pattern[]): Pattern {
  const blocks = [first, ...rest]
  for (const block of rest) {
    if (block.stepsPerCount !== first.stepsPerCount) {
      throw new Error(`Can't chain ${block.id}: stepsPerCount differs from ${first.id}`)
    }
  }
  return {
    ...first,
    id,
    counts: blocks.reduce((sum, block) => sum + block.counts, 0),
    chords: first.chords && blocks.flatMap((block) => block.chords ?? Array(block.counts / COUNTS_PER_BAR).fill(first.chords![0])),
    tracks: first.tracks.map((track) => ({
      ...track,
      volume: loudest(blocks.map((block) => trackOf(block, track.instrument))) ?? track.volume,
      steps: blocks.flatMap((block) => {
        const blockTrack = trackOf(block, track.instrument)
        return !blockTrack || blockTrack.muted ? Array(patternLength(block)).fill(null) : blockTrack.steps
      }),
      muted: blocks.every((block) => trackOf(block, track.instrument)?.muted ?? true),
    })),
  }
}

/**
 * The same block with `instrument`'s last steps replaced by `ending` — a
 * fill that leads into the next section. Switches the track on, so the
 * fill is heard even where the instrument otherwise sits out.
 */
export function endWith(pattern: Pattern, instrument: string, ending: readonly Step[]): Pattern {
  return {
    ...pattern,
    tracks: pattern.tracks.map((track) => track.instrument !== instrument
      ? track
      : { ...track, steps: [...track.steps.slice(0, -ending.length), ...ending], muted: false }),
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
  // A song's sections repeat along with its steps, one per 8-count block.
  const { sections } = pattern
  if (sections?.length) pattern.sections = resizeSteps(sections, counts / COUNTS_PER_BLOCK).map((id) => id ?? sections[0]!)
  pattern.counts = counts
}

/**
 * The simple-mode click: an empty cell gets the track's main sound (the one
 * it plays most, or the instrument's first), a filled one goes silent.
 */
export function switchStep(current: Step, steps: readonly Step[], names: readonly string[]): Step {
  if (current !== null) return null
  const uses = new Map<string, number>()
  for (const step of steps) if (step && names.includes(step)) uses.set(step, (uses.get(step) ?? 0) + 1)
  let main = names[0]
  let most = 0
  for (const [name, count] of uses) {
    if (count > most) {
      main = name
      most = count
    }
  }
  return main ?? null
}
