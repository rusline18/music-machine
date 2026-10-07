import { SALSA_INSTRUMENTS, salsaSamples } from './salsa/samples'
import { BACHATA_INSTRUMENTS, bachataPitched, bachataSamples } from './bachata/samples'
import type { PitchedInstrument } from './harmony'
import { parseChord, voicesToNotes } from './harmony'
import type { Genre } from '../composables/usePattern'
import { chordAt } from '../composables/usePattern'
import type { SampleMap, StepResolver } from '../composables/useBeatScheduler'
import { sampleResolver } from '../composables/useBeatScheduler'

export interface GenreConfig {
  instruments: readonly string[]
  /** Every sample file per instrument (for preloading). */
  samples: SampleMap
  /** Tracks that follow the chords instead of playing one sample per step name. */
  pitched: Record<string, PitchedInstrument>
  defaultBpm: number
}

export const genreConfig: Record<Genre, GenreConfig> = {
  salsa: {
    instruments: SALSA_INSTRUMENTS,
    samples: salsaSamples,
    pitched: {},
    defaultBpm: 180,
  },
  bachata: {
    instruments: BACHATA_INSTRUMENTS,
    samples: bachataSamples,
    pitched: bachataPitched as Record<string, PitchedInstrument>,
    defaultBpm: 130,
  },
}

/** Played when a pattern with pitched tracks has no chords. */
const DEFAULT_CHORD = 'Am'

/** What a step on this instrument can be set to, in the order the grid cycles through. */
export function stepNames(config: GenreConfig, instrument: string): string[] {
  const pitched = config.pitched[instrument]
  return Object.keys(pitched ? pitched.articulations : config.samples[instrument] ?? {})
}

export function stepResolver(config: GenreConfig): StepResolver {
  const plain = sampleResolver(config.samples)
  return (pattern, track, stepIndex) => {
    const pitched = config.pitched[track.instrument]
    if (!pitched) return plain(pattern, track, stepIndex)
    const name = track.steps[stepIndex]
    const articulation = name ? pitched.articulations[name] : undefined
    if (!articulation) return []
    return voicesToNotes(pitched, articulation(parseChord(chordAt(pattern, stepIndex) ?? DEFAULT_CHORD)))
  }
}
