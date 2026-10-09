import type { Pattern, Track } from './pattern'
import { COUNT_OPTIONS, COUNTS_PER_BAR, resizeSteps } from './pattern'
import { parseChord } from './harmony'
import type { InstrumentSet } from './resolve'
import { stepNames } from './resolve'
import { SONG_PATTERN_ID } from './song'

/**
 * Patterns travel in links (`/salsa?p=…`) and in localStorage as a short
 * code. Each step is one letter — its position in the instrument's step
 * names, `-` for silence — so a long pattern still fits in a chat message.
 * Anything decoded is untrusted: it's checked against the genre and
 * rebuilt, never used as is.
 */

/** What decoding needs to know about a genre (a `Genre` fits). */
export interface ShareGenre extends InstrumentSet {
  id: string
  instruments: readonly string[]
  bpmRange: readonly [min: number, max: number]
  presets: readonly { id: string, counts: number }[]
}

/** Id of a pattern that isn't one of the genre's presets (i18n `presets.custom`). */
export const CUSTOM_PATTERN_ID = 'custom'

const FORMAT_VERSION = 1
const SILENCE = '-'
const SYMBOLS = 'abcdefghijklmnopqrstuvwxyz'
const STEPS_PER_COUNT = [2, 4]
/** A 32-count pattern is ~2 KB; anything far past that isn't ours, so don't decode it. */
const MAX_CODE_LENGTH = 20_000
/** Played when a pattern with pitched tracks comes without usable chords. */
const DEFAULT_CHORD = 'Am'

interface SharedPattern {
  v: number
  /** Genre id. */
  g: string
  /** Preset the pattern started from. */
  i: string
  c: number
  s: number
  b: number
  h?: string[]
  /** A song's sections (preset ids), in order. */
  p?: string[]
  /** [instrument, steps, volume, muted] */
  t: Array<[string, string, number, 0 | 1]>
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(code: string): string {
  const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

export function encodePattern(pattern: Pattern, genre: ShareGenre): string {
  const shared: SharedPattern = {
    v: FORMAT_VERSION,
    g: genre.id,
    i: pattern.id,
    c: pattern.counts,
    s: pattern.stepsPerCount,
    b: pattern.bpm,
    ...(pattern.chords ? { h: pattern.chords } : {}),
    ...(pattern.sections ? { p: pattern.sections } : {}),
    t: pattern.tracks.map((track) => {
      const names = stepNames(genre, track.instrument)
      const steps = track.steps.map((step) => {
        const index = step === null ? -1 : names.indexOf(step)
        return index < 0 ? SILENCE : SYMBOLS[index]
      })
      return [track.instrument, steps.join(''), Math.round(track.volume * 100) / 100, track.muted ? 1 : 0]
    }),
  }
  return toBase64Url(JSON.stringify(shared))
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** A song's sections, if they're all this genre's presets and add up to the pattern's length. */
function songSections(sections: unknown, counts: number, genre: ShareGenre): string[] | undefined {
  if (!Array.isArray(sections) || sections.length === 0) return undefined
  const presets = sections.map((id) => genre.presets.find((preset) => preset.id === id))
  if (presets.some((preset) => !preset)) return undefined
  return presets.reduce((sum, preset) => sum + preset!.counts, 0) === counts ? presets.map((preset) => preset!.id) : undefined
}

/** The pattern a code describes, or null if it's broken or for another genre. */
export function decodePattern(code: string, genre: ShareGenre): Pattern | null {
  if (code.length > MAX_CODE_LENGTH) return null
  let shared: Partial<SharedPattern>
  try {
    shared = JSON.parse(fromBase64Url(code))
  } catch {
    return null
  }
  if (!shared || typeof shared !== 'object' || shared.v !== FORMAT_VERSION || shared.g !== genre.id) return null

  const { c: counts, s: stepsPerCount } = shared
  if (!COUNT_OPTIONS.includes(counts as (typeof COUNT_OPTIONS)[number])) return null
  if (!STEPS_PER_COUNT.includes(stepsPerCount as number)) return null
  if (!isNumber(shared.b) || !Array.isArray(shared.t)) return null
  const length = counts! * stepsPerCount!

  const tracks: Track[] = genre.instruments.map((instrument) => {
    const names = stepNames(genre, instrument)
    const entry = shared.t!.find((t) => Array.isArray(t) && t[0] === instrument)
    if (!entry || typeof entry[1] !== 'string') {
      return { instrument, steps: Array.from({ length }, () => null), volume: 1, muted: true }
    }
    const steps = [...entry[1]].map((symbol) => names[SYMBOLS.indexOf(symbol)] ?? null)
    return {
      instrument,
      steps: resizeSteps(steps, length),
      volume: isNumber(entry[2]) ? clamp(entry[2], 0, 1) : 1,
      muted: entry[3] === 1,
    }
  })

  const sections = songSections(shared.p, counts!, genre)
  const pattern: Pattern = {
    id: sections ? SONG_PATTERN_ID : genre.presets.some((preset) => preset.id === shared.i) ? shared.i! : CUSTOM_PATTERN_ID,
    ...(sections ? { sections } : {}),
    counts: counts!,
    stepsPerCount: stepsPerCount!,
    bpm: Math.round(clamp(shared.b, ...genre.bpmRange)),
    tracks,
  }

  if (Object.keys(genre.pitched).length > 0) {
    const chords = (Array.isArray(shared.h) ? shared.h : []).map((chord) => {
      try {
        return parseChord(chord).name
      } catch {
        return null
      }
    })
    const fallback = chords.find((chord) => chord !== null) ?? DEFAULT_CHORD
    pattern.chords = resizeSteps(chords, counts! / COUNTS_PER_BAR).map((chord) => chord ?? fallback)
  }
  return pattern
}
