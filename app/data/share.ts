import type { Genre, InstrumentTrack, Pattern } from '../composables/usePattern'
import { COUNT_OPTIONS, COUNTS_PER_BAR, resizeSteps } from '../composables/usePattern'
import type { GenreConfig } from './genres'
import { DEFAULT_CHORD, stepNames } from './genres'
import { parseChord } from './harmony'

/**
 * Patterns travel in links (`/salsa?p=…`) and in localStorage as a short
 * code. Each step is one letter — its position in the instrument's step
 * names, `-` for silence — so a 48-count pattern still fits in a chat
 * message. Anything decoded is untrusted: it's checked against the genre
 * and rebuilt, never used as is.
 */

const FORMAT_VERSION = 1
const SILENCE = '-'
const SYMBOLS = 'abcdefghijklmnopqrstuvwxyz'
const STEPS_PER_COUNT = [2, 4]
const MAX_NAME_LENGTH = 60

interface SharedPattern {
  v: number
  g: Genre
  i: string
  n: string
  c: number
  s: number
  b: number
  h?: string[]
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

export function encodePattern(pattern: Pattern, config: GenreConfig): string {
  const shared: SharedPattern = {
    v: FORMAT_VERSION,
    g: pattern.genre,
    i: pattern.id,
    n: pattern.name,
    c: pattern.counts,
    s: pattern.stepsPerCount,
    b: pattern.bpm,
    ...(pattern.chords ? { h: pattern.chords } : {}),
    t: pattern.tracks.map((track) => {
      const names = stepNames(config, track.instrument)
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

/** The pattern a code describes, or null if it's broken or for another genre. */
export function decodePattern(code: string, genre: Genre, config: GenreConfig): Pattern | null {
  let shared: Partial<SharedPattern>
  try {
    shared = JSON.parse(fromBase64Url(code))
  }
  catch {
    return null
  }
  if (!shared || typeof shared !== 'object' || shared.v !== FORMAT_VERSION || shared.g !== genre) return null

  const counts = shared.c
  const stepsPerCount = shared.s
  if (!COUNT_OPTIONS.includes(counts as (typeof COUNT_OPTIONS)[number])) return null
  if (!STEPS_PER_COUNT.includes(stepsPerCount as number)) return null
  if (!isNumber(shared.b) || !Array.isArray(shared.t)) return null
  const length = counts! * stepsPerCount!

  const tracks: InstrumentTrack[] = config.instruments.map((instrument) => {
    const names = stepNames(config, instrument)
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

  const pattern: Pattern = {
    id: typeof shared.i === 'string' ? shared.i.slice(0, 64) : 'shared',
    name: typeof shared.n === 'string' && shared.n.trim() ? shared.n.slice(0, MAX_NAME_LENGTH) : 'Shared pattern',
    genre,
    counts: counts!,
    stepsPerCount: stepsPerCount!,
    bpm: Math.round(clamp(shared.b, config.minBpm, config.maxBpm)),
    tracks,
  }

  if (Object.keys(config.pitched).length > 0) {
    const chords = (Array.isArray(shared.h) ? shared.h : []).map((chord) => {
      try {
        return parseChord(chord).name
      }
      catch {
        return null
      }
    })
    const fallback = chords.find((chord) => chord !== null) ?? DEFAULT_CHORD
    pattern.chords = resizeSteps(chords, counts! / COUNTS_PER_BAR).map((chord) => chord ?? fallback)
  }
  return pattern
}
