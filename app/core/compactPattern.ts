import type { Pattern, Track } from './pattern'
import { COUNT_OPTIONS, COUNTS_PER_BAR, patternLength, resizeSteps, trackOf } from './pattern'
import { stepNames } from './resolve'
import type { ShareGenre } from './share'
import { CUSTOM_PATTERN_ID, decodePattern, encodePattern } from './share'
import type { SongGenre } from './song'
import { buildSong, SONG_PATTERN_ID } from './song'
import { deflateToBase64Url, inflateFromBase64Url } from './compress'

/**
 * Patterns packed small enough for a short link to the Telegram Mini App
 * (startapp=salsa-<packed>, core/telegram.ts). Most shared beats are a
 * preset with a few changes, so a pattern is written as bytes, XORed with
 * the same bytes of the preset (or song) it started from, and deflated:
 * what's unchanged turns into a run of zeros that deflate all but erases.
 * An untouched preset takes ~15 characters, a few edits ~20–30.
 *
 * Bytes, before deflating:
 *   version
 *   base: 0 none, 1 + the preset's index, or SONG followed by the number
 *         of sections and each section's preset index
 *   length: COUNT_OPTIONS index, + 4 for 4 steps per count
 *   bpm
 *   per instrument (genre.instruments order), XORed with the base:
 *     volume in percent, + 128 if muted
 *     each step: 0 for silence, else 1 + its index in stepNames
 *   chords, comma-separated, only if they differ from the base's
 *
 * Unpacking goes through share.ts's decoder, so whatever comes out of a
 * link is checked the same way as a site link.
 */

/** What packing needs to know about a genre (a `Genre` fits). */
export interface PackGenre extends ShareGenre, SongGenre {
  presets: readonly Pattern[]
}

const FORMAT_VERSION = 1
const NO_BASE = 0
const SONG = 255
const MUTED = 128
/** 32 counts × 4 steps × a dozen-odd instruments, with room to spare. */
const MAX_BYTES = 4_000

/** The pattern `pattern` is written against, stretched to its length; null if there's none. */
function baseOf(pattern: Pick<Pattern, 'counts' | 'stepsPerCount'>, genre: PackGenre, base: number, sections: string[]): Pattern | null {
  let from: Pattern | undefined
  if (base === SONG) {
    try {
      from = buildSong(genre, sections)
    } catch {
      return null
    }
  } else {
    from = genre.presets[base - 1]
  }
  if (!from) return null
  const length = patternLength(pattern)
  return {
    ...from,
    tracks: from.tracks.map((track) => ({ ...track, steps: resizeSteps(track.steps, length) })),
    ...(from.chords ? { chords: resizeSteps(from.chords, pattern.counts / COUNTS_PER_BAR) as string[] } : {}),
  }
}

/** The per-instrument bytes: volume and mute, then the steps. */
function trackBytes(pattern: Pattern | null, genre: PackGenre, length: number): number[] {
  return genre.instruments.flatMap((instrument) => {
    const track = pattern && trackOf(pattern, instrument)
    if (!track) return [100, ...Array.from({ length }, () => 0)]
    const names = stepNames(genre, instrument)
    const steps = resizeSteps(track.steps, length).map((step) => (step === null ? 0 : names.indexOf(step) + 1))
    return [Math.round(Math.min(1, Math.max(0, track.volume)) * 100) + (track.muted ? MUTED : 0), ...steps]
  })
}

const chordText = (pattern: Pattern | null) => pattern?.chords?.join(',') ?? ''

/** `pattern` packed for a start parameter (base64url); null where the browser can't compress. */
export async function packPattern(pattern: Pattern, genre: PackGenre): Promise<string | null> {
  const shape = COUNT_OPTIONS.indexOf(pattern.counts as (typeof COUNT_OPTIONS)[number])
  if (shape < 0 || ![2, 4].includes(pattern.stepsPerCount)) return null
  const sectionIndexes = (pattern.sections ?? []).map((id) => genre.presets.findIndex((preset) => preset.id === id))
  const isSong = pattern.id === SONG_PATTERN_ID && sectionIndexes.length > 0 && !sectionIndexes.includes(-1)
  const base = isSong ? SONG : genre.presets.findIndex((preset) => preset.id === pattern.id) + 1

  const length = patternLength(pattern)
  const basePattern = base === NO_BASE ? null : baseOf(pattern, genre, base, pattern.sections ?? [])
  const own = trackBytes(pattern, genre, length)
  const theirs = trackBytes(basePattern, genre, length)
  const chords = chordText(pattern)

  const bytes = [
    FORMAT_VERSION,
    base,
    ...(isSong ? [sectionIndexes.length, ...sectionIndexes] : []),
    shape + (pattern.stepsPerCount === 4 ? 4 : 0),
    Math.min(255, Math.max(0, Math.round(pattern.bpm))),
    ...own.map((byte, i) => byte ^ theirs[i]!),
    ...(chords === chordText(basePattern) ? [] : new TextEncoder().encode(chords)),
  ]
  return deflateToBase64Url(Uint8Array.from(bytes))
}

/** The pattern packPattern was given, checked by share.ts; null if `packed` is broken or for another genre's presets. */
export async function unpackPattern(packed: string, genre: PackGenre): Promise<Pattern | null> {
  const bytes = await inflateFromBase64Url(packed, MAX_BYTES)
  if (!bytes) return null
  let at = 0
  const next = () => (at < bytes.length ? bytes[at++]! : -1)

  if (next() !== FORMAT_VERSION) return null
  const base = next()
  const sections: string[] = []
  if (base === SONG) {
    const count = next()
    for (let i = 0; i < count; i++) {
      const id = genre.presets[next()]?.id
      if (!id) return null
      sections.push(id)
    }
  }
  const shape = next()
  const counts = COUNT_OPTIONS[shape & 3]
  const stepsPerCount = shape & 4 ? 4 : 2
  const bpm = next()
  if (shape < 0 || shape > 7 || counts === undefined || bpm < 0) return null

  const length = counts * stepsPerCount
  const basePattern = base === NO_BASE ? null : baseOf({ counts, stepsPerCount }, genre, base, sections)
  if (base !== NO_BASE && !basePattern) return null
  const theirs = trackBytes(basePattern, genre, length)
  if (bytes.length < at + theirs.length) return null
  const own = theirs.map((byte, i) => byte ^ bytes[at + i]!)
  at += theirs.length

  const tracks: Track[] = genre.instruments.map((instrument, i) => {
    const names = stepNames(genre, instrument)
    const [flags, ...steps] = own.slice(i * (length + 1), (i + 1) * (length + 1))
    return {
      instrument,
      steps: steps.map((step) => (step === 0 ? null : names[step - 1] ?? null)),
      volume: (flags! & ~MUTED) / 100,
      muted: (flags! & MUTED) !== 0,
    }
  })
  const chordsLeft = new TextDecoder().decode(bytes.subarray(at))
  const chords = chordsLeft ? chordsLeft.split(',') : basePattern?.chords

  const pattern: Pattern = {
    id: base === SONG ? SONG_PATTERN_ID : basePattern?.id ?? CUSTOM_PATTERN_ID,
    ...(base === SONG ? { sections } : {}),
    counts,
    stepsPerCount,
    bpm,
    ...(chords ? { chords } : {}),
    tracks,
  }
  // Through share.ts's checks, like any link: unknown chords, a song that
  // doesn't add up and tempos out of range don't get in.
  return decodePattern(encodePattern(pattern, genre), genre)
}
