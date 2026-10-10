import type { Note } from './audio/engine'
import type { StepResolver } from './audio/scheduler'
import type { PitchedInstrument } from './harmony'
import { parseChord, voicesToNotes } from './harmony'
import type { Pattern, Step } from './pattern'
import { chordAt, COUNTS_PER_BAR, countInBlock, patternLength } from './pattern'

/**
 * A recorded stroke: its URL, or its URL and how loud to play it (1 = as
 * recorded). Every file is normalized, so a soft stroke — a heel on the
 * conga, the neck of a bell — sets its level here.
 */
export type Sample = string | { url: string, gain: number }

/** Step name → a sample, or several takes of it to rotate through. */
export type SampleMap = Record<string, Sample | Sample[]>

const urlOf = (sample: Sample) => (typeof sample === 'string' ? sample : sample.url)
const noteOf = (sample: Sample): Note => (typeof sample === 'string' ? { url: sample } : { url: sample.url, gain: sample.gain })

/**
 * A voice counting the dance: per locale, `counts[i]` is the sample saying
 * count i + 1 of an 8-count block, and `and` the one for the off-beat.
 */
export type CountingVoice = Record<string, { counts: readonly string[], and: string }>

/** Step names of a counting voice: the number of the count the step is on, or "and". */
export const COUNTING_STEPS: readonly string[] = ['count', 'and']

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

/** Step names already worked out, per instrument set. */
const namesCache = new WeakMap<InstrumentSet, Map<string, readonly string[]>>()

/**
 * What a step on this instrument can be set to, in the order the grid
 * cycles through. Worked out once per instrument: the same array comes back
 * every time, so passing it to a component as a prop doesn't re-render it.
 */
export function stepNames(set: InstrumentSet, instrument: string): readonly string[] {
  let cache = namesCache.get(set)
  if (!cache) namesCache.set(set, (cache = new Map()))
  let names = cache.get(instrument)
  if (!names) {
    const pitched = set.pitched[instrument]
    names = set.spoken[instrument] ? COUNTING_STEPS : Object.keys(pitched ? pitched.articulations : set.samples[instrument] ?? {})
    cache.set(instrument, names)
  }
  return names
}

/** Every sample file the instruments can play in `locale`, for preloading. */
export function sampleUrls(set: InstrumentSet, locale: string): Set<string> {
  return new Set([
    ...Object.values(set.samples).flatMap((map) => Object.values(map).flat().map(urlOf)),
    ...Object.values(set.pitched).flatMap((pitched) => pitched.zones.map((zone) => zone.url)),
    ...Object.values(set.spoken).flatMap((voice) => {
      const words = wordsIn(voice, locale)
      return [...words.counts, words.and]
    }),
  ])
}

/**
 * The sample files a pattern plays, for loading those before the rest.
 * Muted tracks count too, so switching one on is heard at once; tracks
 * with no hits, and sounds no step uses, don't.
 */
export function patternSampleUrls(set: InstrumentSet, pattern: Pick<Pattern, 'tracks'>, locale: string): Set<string> {
  const urls = new Set<string>()
  for (const { instrument, steps } of pattern.tracks) {
    const used = new Set(steps.filter((step) => step !== null))
    if (used.size === 0) continue
    const voice = set.spoken[instrument]
    const pitched = set.pitched[instrument]
    if (voice) {
      const words = wordsIn(voice, locale)
      for (const url of [...words.counts, words.and]) urls.add(url)
    } else if (pitched) {
      for (const zone of pitched.zones) urls.add(zone.url)
    } else {
      for (const name of used) {
        const entry = set.samples[instrument]?.[name]
        if (entry) for (const sample of [entry].flat()) urls.add(urlOf(sample))
      }
    }
  }
  return urls
}

/**
 * Resolver for plain one-shot tracks: the step name picks a sample URL.
 * Several takes are played in turn (round robin), so repeated hits don't
 * sound like the same recording over and over.
 */
export function sampleResolver(samples: Record<string, SampleMap>): StepResolver {
  const nextTake = new Map<Sample[], number>()
  return (_pattern, track, stepIndex) => {
    const name = track.steps[stepIndex]
    const entry = name ? samples[track.instrument]?.[name] : undefined
    if (!entry) return []
    if (!Array.isArray(entry)) return [noteOf(entry)]
    const take = nextTake.get(entry) ?? 0
    nextTake.set(entry, (take + 1) % entry.length)
    return [noteOf(entry[take]!)]
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
