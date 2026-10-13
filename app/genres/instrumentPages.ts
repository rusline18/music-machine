import type { Pattern } from '~/core/pattern'
import { patternLength, resizeSteps, trackOf } from '~/core/pattern'
import type { Genre, InstrumentPage, InstrumentVariant } from './types'

/** How loud the rest of the band plays under the instrument a page is about. */
export const BAND_DUCK = 0.5

/** Who's heard: the instrument (with its companions) on its own, or the whole band. */
export const INSTRUMENT_MIXES = ['solo', 'band'] as const
export type InstrumentMix = (typeof INSTRUMENT_MIXES)[number]

/** The page for `instrument`, if it has one. The counting voice never does. */
export function findInstrumentPage(genre: Genre, instrument: string): InstrumentPage | undefined {
  if (genre.spoken[instrument] || !genre.instruments.includes(instrument)) return undefined
  return genre.instrumentPages?.[instrument]
}

/** Instruments of `genre` with a page, in grid order. */
export function instrumentsWithPages(genre: Genre): string[] {
  return genre.instruments.filter((instrument) => findInstrumentPage(genre, instrument))
}

/** The preset a variant plays over. */
export function bandOf(genre: Genre, variant: InstrumentVariant): Pattern {
  return genre.presets.find((preset) => preset.id === variant.band) ?? genre.presets[0]!
}

/**
 * One pattern per variant, for the page's machine: its band preset with
 * the instrument playing the variant at full volume and the rest of the
 * band quieter under it. The variant's id is the pattern's.
 */
export function instrumentPatterns(genre: Genre, instrument: string): Pattern[] {
  const page = findInstrumentPage(genre, instrument)
  return (page?.variants ?? []).map((variant) => {
    const pattern = structuredClone(bandOf(genre, variant))
    pattern.id = variant.id
    for (const track of pattern.tracks) {
      if (track.instrument === instrument) {
        track.steps = resizeSteps([...variant.figure], patternLength(pattern))
        track.volume = 1
        track.muted = false
      } else if (!genre.spoken[track.instrument]) {
        track.volume *= BAND_DUCK
      }
    }
    return pattern
  })
}

/**
 * Whether each track of `pattern` (a variant from instrumentPatterns) is
 * switched off in `mix`: on its own, only the instrument and its
 * companions play; with the band, whatever the preset plays. The counting
 * voice is left out: it has its own switch.
 */
export function mixMutes(genre: Genre, instrument: string, pattern: Pattern, mix: InstrumentMix): Map<string, boolean> {
  const page = findInstrumentPage(genre, instrument)
  const variant = page?.variants.find(({ id }) => id === pattern.id)
  const band = variant ? bandOf(genre, variant) : genre.presets[0]!
  const heardAlone = new Set([instrument, ...page?.companions ?? []])
  return new Map(pattern.tracks
    .filter((track) => !genre.spoken[track.instrument])
    .map((track) => {
      const inBand = track.instrument === instrument || !(trackOf(band, track.instrument)?.muted ?? true)
      return [track.instrument, !(mix === 'solo' ? heardAlone.has(track.instrument) : inBand)]
    }))
}
