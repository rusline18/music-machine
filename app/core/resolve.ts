import type { Note } from './audio/engine'
import type { StepResolver } from './audio/scheduler'
import type { PitchedInstrument } from './harmony'
import { parseChord, voicesToNotes } from './harmony'
import type { Pattern, Step, Track } from './pattern'
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

/** One recorded word of a counting voice. */
export interface SpokenWord {
  url: string
  /** Seconds into the file where the vowel comes in: the word's beat, which the ear hears there rather than at its first consonant. */
  lead: number
  /** Seconds the word is heard for. */
  length: number
}

/**
 * A voice counting the dance: per locale, `counts[i]` is the word for
 * count i + 1 of an 8-count block, and `and` the one for the off-beat.
 */
export type CountingVoice = Record<string, { counts: readonly SpokenWord[], and: SpokenWord }>

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
      return [...words.counts, words.and].map((word) => word.url)
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
      for (const word of [...words.counts, words.and]) urls.add(word.url)
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

/** How loud each word is said: the 1 and the 5 lead the 8-count, "and" stays well under the counts. */
const WORD_GAIN = { strong: 1, count: 0.8, and: 0.45 }
/** Silence left before the next word, so the words don't run together. */
const WORD_GAP_S = 0.03
/** How long a word that has to stop before it's done takes to fade out. */
const WORD_FADE_S = 0.04
/** How much faster a word may be said to fit before the next one; more than this sounds sped up. */
const MAX_WORD_RATE = 1.1

/**
 * What a counting voice says at a step, timed like a person counting: the
 * vowel on the beat (the word starts its `lead` early), each word over
 * before the next one starts, said a little quicker or let go of early
 * when it doesn't fit, and louder on the strong counts.
 */
function spokenNotes(words: CountingVoice[string], pattern: Pattern, track: Track, stepIndex: number): Note[] {
  const wordAt = (step: number) => {
    const name = track.steps[step]
    if (name === 'count') return words.counts[countInBlock(step, pattern.stepsPerCount)]
    return name === 'and' ? words.and : undefined
  }
  const said = wordAt(stepIndex)
  if (!said) return []
  const length = track.steps.length
  let steps = 1
  while (steps < length && !wordAt((stepIndex + steps) % length)) steps++
  const next = wordAt((stepIndex + steps) % length) ?? said
  // From this word's start to the next one's, less a breath.
  const room = steps * 60 / pattern.bpm / pattern.stepsPerCount - next.lead + said.lead - WORD_GAP_S
  const rate = Math.min(MAX_WORD_RATE, Math.max(1, said.length / room))
  const count = countInBlock(stepIndex, pattern.stepsPerCount)
  const gain = said === words.and ? WORD_GAIN.and : count % 4 === 0 ? WORD_GAIN.strong : WORD_GAIN.count
  // Each word also cuts off the one before, should a tempo change catch one still sounding.
  const note: Note = { url: said.url, gain, rate, delay: -said.lead / rate, group: 'voice', spoken: true }
  if (said.length / rate > room) {
    note.duration = Math.max(WORD_FADE_S, room - WORD_FADE_S)
    note.release = WORD_FADE_S / 3
  }
  return [note]
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
    if (voice) return spokenNotes(wordsIn(voice, locale()), pattern, track, stepIndex)
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
