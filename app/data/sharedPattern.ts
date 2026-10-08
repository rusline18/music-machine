import type { Genre, InstrumentTrack, Pattern, Step } from '../composables/usePattern'
import { COUNT_OPTIONS, COUNTS_PER_BAR, patternLength } from '../composables/usePattern'
import { genreConfig, stepNames } from './genres'
import { CHORD_NAMES } from './harmony'

/** Grid resolutions the UI can draw (see SUBDIVISION_LABELS in BeatGrid). */
const STEPS_PER_COUNT = [2, 4]
/** Far above any real pattern; stops huge strings before they're decoded. */
const MAX_ENCODED_LENGTH = 100_000
const MAX_TEXT_LENGTH = 100

export class InvalidPatternError extends Error {
  constructor(reason: string) {
    super(`Invalid shared pattern: ${reason}`)
    this.name = 'InvalidPatternError'
  }
}

function fail(reason: string): never {
  throw new InvalidPatternError(reason)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length > MAX_TEXT_LENGTH) fail(`${field} must be a short string`)
  return value
}

function oneOf<T>(value: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(value as T)) fail(`${field} must be one of ${allowed.join(', ')}`)
  return value as T
}

function list(value: unknown, length: number, field: string): unknown[] {
  if (!Array.isArray(value) || value.length !== length) fail(`${field} must have ${length} entries`)
  return value
}

/**
 * Turns untrusted input (e.g. from a share link) into a Pattern the app can
 * play. Everything is checked against the genre's own instruments, sample
 * names, chords and tempo range, and the result is rebuilt from scratch so
 * no unexpected fields come along. Throws InvalidPatternError otherwise.
 */
export function validatePattern(input: unknown): Pattern {
  if (!isRecord(input)) fail('not an object')
  const genre = oneOf(input.genre, Object.keys(genreConfig) as Genre[], 'genre')
  const config = genreConfig[genre]
  const counts = oneOf(input.counts, COUNT_OPTIONS, 'counts')
  const stepsPerCount = oneOf(input.stepsPerCount, STEPS_PER_COUNT, 'stepsPerCount')
  const { bpm } = input
  if (typeof bpm !== 'number' || !(bpm >= config.minBpm && bpm <= config.maxBpm)) {
    fail(`bpm must be between ${config.minBpm} and ${config.maxBpm}`)
  }
  const length = patternLength({ counts, stepsPerCount })

  if (!Array.isArray(input.tracks) || input.tracks.length > config.instruments.length) fail('tracks must be a list')
  const seen = new Set<string>()
  const tracks = input.tracks.map((raw, i): InstrumentTrack => {
    if (!isRecord(raw)) fail(`tracks[${i}] is not an object`)
    const instrument = oneOf(raw.instrument, config.instruments, `tracks[${i}].instrument`)
    if (seen.has(instrument)) fail(`${instrument} appears twice`)
    seen.add(instrument)
    const names = stepNames(config, instrument)
    const steps = list(raw.steps, length, `${instrument} steps`).map((step): Step => (
      step === null ? null : oneOf(step, names, `${instrument} step`)
    ))
    const { volume, muted } = raw
    if (typeof volume !== 'number' || !(volume >= 0 && volume <= 1)) fail(`${instrument} volume must be 0–1`)
    if (typeof muted !== 'boolean') fail(`${instrument} muted must be true or false`)
    return { instrument, steps, volume, muted }
  })

  const pattern: Pattern = {
    id: text(input.id, 'id'),
    name: text(input.name, 'name'),
    genre,
    counts,
    stepsPerCount,
    bpm,
    tracks,
  }
  if (input.chords !== undefined) {
    pattern.chords = list(input.chords, counts / COUNTS_PER_BAR, 'chords')
      .map((chord) => oneOf(chord, CHORD_NAMES, 'chord'))
  }
  return pattern
}

/** Inverse of serializePattern, for input that can't be trusted. */
export function deserializePattern(encoded: string): Pattern {
  if (encoded.length > MAX_ENCODED_LENGTH) fail('too long')
  let parsed: unknown
  try {
    parsed = JSON.parse(decodeURIComponent(atob(encoded)))
  } catch {
    fail('not a pattern link')
  }
  return validatePattern(parsed)
}
