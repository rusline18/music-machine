import type { Pattern, Step } from './pattern'
import { chainPatterns, COUNT_OPTIONS, endWith } from './pattern'

/**
 * A song: the user's own run of presets ("sections"), e.g. verse → montuno
 * → mambo, played as one loop. It's an ordinary pattern with `sections`
 * set, so editing, sharing and saving work as for any other.
 *
 * One loop has one tempo and one clave, so only sections that agree on
 * both can be joined; `sectionFit` says why one can't, for the UI to show.
 */

/** Id of a pattern built from sections (i18n `presets.song`). */
export const SONG_PATTERN_ID = 'song'

/** A song is no longer than the longest loop the count selector offers. */
export const MAX_SONG_COUNTS = Math.max(...COUNT_OPTIONS)

/**
 * How far apart (in BPM) the tempos the sections are written at may be.
 * Verse 165, montuno 170 and mambo 175 sound right at one tempo; a
 * cha-cha-chá at 120 would be dragged to salsa speed.
 */
export const TEMPO_SPREAD = 20

/** What building a song needs to know about a genre (a `Genre` fits). */
export interface SongGenre {
  presets: readonly Pattern[]
  /** The clave each preset is in, by preset id; genres without one leave it out. */
  clave?: Readonly<Record<string, string>>
  /** Played at the end of a section when the next one is different. */
  transitionFill?: { instrument: string, steps: readonly Step[] }
}

/**
 * Whether `candidate` can be added to a song made of `sections`:
 * 'ok', or why not — the song is already as long as a loop gets ('full'),
 * the candidate is in another clave ('clave'), or it's written at a tempo
 * too far from the song's ('tempo').
 */
export type SectionFit = 'ok' | 'full' | 'clave' | 'tempo'

const findPreset = (genre: SongGenre, id: string) => genre.presets.find((preset) => preset.id === id)

export function sectionFit(genre: SongGenre, sections: readonly string[], candidate: string): SectionFit {
  const preset = findPreset(genre, candidate)
  if (!preset) throw new Error(`Unknown section ${candidate}`)
  const song = sections.map((id) => findPreset(genre, id)).filter((p) => p !== undefined)
  if (song.reduce((sum, p) => sum + p.counts, preset.counts) > MAX_SONG_COUNTS) return 'full'
  if (song.some((p) => genre.clave?.[p.id] !== genre.clave?.[candidate])) return 'clave'
  // Against every section, not just the first: then taking any section out
  // leaves a song whose sections still fit together.
  if (song.some((p) => Math.abs(p.bpm - preset.bpm) > TEMPO_SPREAD)) return 'tempo'
  return 'ok'
}

/** The tempo a song is written at: its first section's. */
export function songBpm(genre: SongGenre, sections: readonly string[]): number | undefined {
  return sections[0] === undefined ? undefined : findPreset(genre, sections[0])?.bpm
}

/**
 * The song as one pattern. Where the next section is a different one
 * (the last section leads back to the first), the section ends with the
 * genre's transition fill.
 */
export function buildSong(genre: SongGenre, sections: readonly string[]): Pattern {
  const blocks = sections.map((id, i) => {
    const preset = findPreset(genre, id)
    if (!preset) throw new Error(`Unknown section ${id}`)
    const fill = genre.transitionFill
    const changes = sections[(i + 1) % sections.length] !== id
    return fill && changes ? endWith(preset, fill.instrument, fill.steps) : preset
  })
  const [first, ...rest] = blocks
  if (!first) throw new Error('A song needs at least one section')
  return structuredClone({ ...chainPatterns(SONG_PATTERN_ID, first, ...rest), sections: [...sections] })
}
