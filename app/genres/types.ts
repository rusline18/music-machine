import type { Pattern } from '~/core/pattern'
import type { InstrumentSet } from '~/core/resolve'

/** Everything a genre page needs. Display names live in i18n, keyed by these ids. */
export interface Genre extends InstrumentSet {
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
  /** Presets offered in the pattern picker; the first one loads by default. */
  presets: Pattern[]
}
