import { SALSA_INSTRUMENTS, salsaSamples } from './salsa/samples'
import { BACHATA_INSTRUMENTS, bachataSamples } from './bachata/samples'
import type { Genre } from '../composables/usePattern'

export const genreConfig: Record<Genre, { instruments: readonly string[]; samples: Record<string, Record<string, string>>; defaultBpm: number }> = {
  salsa: {
    instruments: SALSA_INSTRUMENTS,
    samples: salsaSamples,
    defaultBpm: 90,
  },
  bachata: {
    instruments: BACHATA_INSTRUMENTS,
    samples: bachataSamples,
    defaultBpm: 130,
  },
}
