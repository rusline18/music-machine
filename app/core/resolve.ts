import type { Note } from './audio/engine'
import type { StepResolver } from './audio/scheduler'
import type { PitchedInstrument } from './harmony'
import { parseChord, voicesToNotes } from './harmony'
import { chordAt } from './pattern'

/** Step name → sample URL, or several takes of it to rotate through. */
export type SampleMap = Record<string, string | string[]>

/** What a genre's instruments can play — enough to turn a pattern into notes. */
export interface InstrumentSet {
  /** One-shot instruments: each step name plays a recorded sample. */
  samples: Record<string, SampleMap>
  /** Pitched instruments: each step name plays notes of the current chord. */
  pitched: Record<string, PitchedInstrument>
}

/** Played when a pattern with pitched tracks has no chords. */
const DEFAULT_CHORD = 'Am'

/** What a step on this instrument can be set to, in the order the grid cycles through. */
export function stepNames(set: InstrumentSet, instrument: string): string[] {
  const pitched = set.pitched[instrument]
  return Object.keys(pitched ? pitched.articulations : set.samples[instrument] ?? {})
}

/** Every sample file the instruments can play, for preloading. */
export function sampleUrls(set: InstrumentSet): Set<string> {
  return new Set([
    ...Object.values(set.samples).flatMap((map) => Object.values(map).flat()),
    ...Object.values(set.pitched).flatMap((pitched) => pitched.zones.map((zone) => zone.url)),
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

/** Resolver for a whole genre: pitched tracks follow the chords, the rest play samples. */
export function stepResolver(set: InstrumentSet): StepResolver {
  const plain = sampleResolver(set.samples)
  return (pattern, track, stepIndex): Note[] => {
    const pitched = set.pitched[track.instrument]
    if (!pitched) return plain(pattern, track, stepIndex)
    const name = track.steps[stepIndex]
    const articulation = name ? pitched.articulations[name] : undefined
    if (!articulation) return []
    return voicesToNotes(pitched, articulation(parseChord(chordAt(pattern, stepIndex) ?? DEFAULT_CHORD)))
  }
}
