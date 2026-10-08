import type { Note } from './audio/engine'
import type { StepResolver } from './audio/scheduler'
import type { PitchedInstrument } from './harmony'
import { parseChord, voicesToNotes } from './harmony'
import type { Step } from './pattern'
import { chordAt, COUNTS_PER_BAR, countInBlock, patternLength } from './pattern'

/** Step name → sample URL, or several takes of it to rotate through. */
export type SampleMap = Record<string, string | string[]>

/**
 * A voice counting the dance: per locale, `counts[i]` is the sample saying
 * count i + 1 of an 8-count block, and `and` the one for the off-beat.
 */
export type CountingVoice = Record<string, { counts: readonly string[], and: string }>

/** Step names of a counting voice: the number of the count the step is on, or "and". */
export const COUNTING_STEPS = ['count', 'and']

/** Ways the voice can count, offered as one-click presets for its track. */
export const COUNTING_MODES = ['off', 'counts', 'ands'] as const
export type CountingMode = (typeof COUNTING_MODES)[number]

/** One count of voice steps: silence, "1 2 3…", or "1 and 2 and…". */
export function countingFigure(mode: CountingMode, stepsPerCount: number): Step[] {
  return Array.from({ length: stepsPerCount }, (_, i) => {
    if (mode === 'off') return null
    if (i === 0) return 'count'
    return mode === 'ands' && i * 2 === stepsPerCount ? 'and' : null
  })
}

/** What a genre's instruments can play — enough to turn a pattern into notes. */
export interface InstrumentSet {
  /** One-shot instruments: each step name plays a recorded sample. */
  samples: Record<string, SampleMap>
  /** Pitched instruments: each step name plays notes of the current chord. */
  pitched: Record<string, PitchedInstrument>
  /** Counting voices: what they say depends on the step's position and the locale. */
  spoken: Record<string, CountingVoice>
}

/** The voice's words in `locale`, or in its first language if it doesn't speak that one. */
function wordsIn(voice: CountingVoice, locale: string) {
  return voice[locale] ?? Object.values(voice)[0]!
}

/** Played when a pattern with pitched tracks has no chords. */
const DEFAULT_CHORD = 'Am'

/** What a step on this instrument can be set to, in the order the grid cycles through. */
export function stepNames(set: InstrumentSet, instrument: string): string[] {
  if (set.spoken[instrument]) return COUNTING_STEPS
  const pitched = set.pitched[instrument]
  return Object.keys(pitched ? pitched.articulations : set.samples[instrument] ?? {})
}

/** Every sample file the instruments can play in `locale`, for preloading. */
export function sampleUrls(set: InstrumentSet, locale: string): Set<string> {
  return new Set([
    ...Object.values(set.samples).flatMap((map) => Object.values(map).flat()),
    ...Object.values(set.pitched).flatMap((pitched) => pitched.zones.map((zone) => zone.url)),
    ...Object.values(set.spoken).flatMap((voice) => {
      const words = wordsIn(voice, locale)
      return [...words.counts, words.and]
    }),
  ])
}

/**
 * Resolver for plain one-shot tracks: the step name picks a sample URL.
 * Several takes are played in turn (round robin), so repeated hits don't
 * sound like the same recording over and over.
 */
export function sampleResolver(samples: Record<string, SampleMap>): StepResolver {
  const nextTake = new Map<string[], number>()
  return (_pattern, track, stepIndex) => {
    const name = track.steps[stepIndex]
    const entry = name ? samples[track.instrument]?.[name] : undefined
    if (!entry) return []
    if (typeof entry === 'string') return [{ url: entry }]
    const take = nextTake.get(entry) ?? 0
    nextTake.set(entry, (take + 1) % entry.length)
    return [{ url: entry[take]! }]
  }
}

/**
 * Resolver for a whole genre: pitched tracks follow the chords, voices say
 * the count in `locale()` (read on every step, so a language switch applies
 * at once), the rest play samples.
 */
export function stepResolver(set: InstrumentSet, locale: () => string): StepResolver {
  const plain = sampleResolver(set.samples)
  return (pattern, track, stepIndex): Note[] => {
    const voice = set.spoken[track.instrument]
    if (voice) {
      const name = track.steps[stepIndex]
      const words = wordsIn(voice, locale())
      // Each word cuts off the one before, so long words never pile up at fast tempos.
      if (name === 'count') return [{ url: words.counts[countInBlock(stepIndex, pattern.stepsPerCount)]!, group: 'voice' }]
      if (name === 'and') return [{ url: words.and, group: 'voice' }]
      return []
    }
    const pitched = set.pitched[track.instrument]
    if (!pitched) return plain(pattern, track, stepIndex)
    const name = track.steps[stepIndex]
    const articulation = name ? pitched.articulations[name] : undefined
    if (!articulation) return []
    const chord = (step: number) => parseChord(chordAt(pattern, step) ?? DEFAULT_CHORD)
    const nextBar = (stepIndex + pattern.stepsPerCount * COUNTS_PER_BAR) % patternLength(pattern)
    return voicesToNotes(pitched, articulation(chord(stepIndex), chord(nextBar)))
  }
}
