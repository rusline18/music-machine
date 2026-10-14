import type { Pattern, Step } from '~/core/pattern'
import type { InstrumentSet } from '~/core/resolve'
import type { SongGenre } from '~/core/song'

/** Everything a genre page needs. Display names live in i18n, keyed by these ids. */
export interface Genre extends InstrumentSet, SongGenre {
  /** Route segment and i18n key (`genres.<id>`). */
  id: string
  /** Track order on the grid; also the i18n keys `instruments.<name>`. */
  instruments: readonly string[]
  /** Range of the tempo slider, in counts per minute. */
  bpmRange: readonly [min: number, max: number]
  /**
   * The order "layer by layer" brings instruments in: the foundation first
   * (the one the others lock to), then the rest. The counting voice is
   * left out; it has its own switch.
   */
  teachingOrder: readonly string[]
  /**
   * Presets offered in the pattern picker; the first one loads by default.
   * Each is also a section the user can build a song from (core/song.ts).
   */
  presets: Pattern[]
  /**
   * Instruments that have a page of their own (/<genre>/<instrument>), with
   * the rhythms it offers. Texts: i18n `instrumentPages.<genre>.<instrument>`.
   */
  instrumentPages?: Record<string, InstrumentPage>
}

export interface InstrumentPage {
  /**
   * Rhythms offered in the picker, each played over a preset; the first
   * one loads by default. Names: i18n
   * `instrumentPages.<genre>.<instrument>.variants.<id>`.
   */
  variants: readonly InstrumentVariant[]
  /** Play along, quieter, when the instrument is heard on its own (e.g. the clave under the congas). */
  companions?: readonly string[]
}

export interface InstrumentVariant {
  id: string
  /** Repeated to fill the pattern, like a preset's figure. */
  figure: readonly Step[]
  /**
   * The preset it plays over, where the rest of the band fits it (a 2-3
   * clave over a 2-3 preset, the mambo bell over the montuno). Defaults to
   * the genre's first preset.
   */
  band?: string
}
