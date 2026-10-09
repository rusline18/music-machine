import type { Genre } from '../types'
import { countingVoice } from '../voice'
import { salsaPresets } from './patterns'
import { salsaPitched, salsaSamples } from './samples'

export const salsa: Genre = {
  id: 'salsa',
  instruments: ['voice', ...Object.keys(salsaSamples), ...Object.keys(salsaPitched)],
  samples: salsaSamples,
  pitched: salsaPitched,
  spoken: { voice: countingVoice },
  // Cha-cha-chá sits around 120, fast salsa past 200.
  bpmRange: [100, 230],
  // Clave is the key everything locks to; the congas' tumbao is the pulse,
  // and the bass's tumbao sits on it. Bells, piano and the rest come after.
  teachingOrder: ['clave', 'congas', 'bass', 'bongos', 'maracas', 'timbales', 'cowbell', 'timbalebell', 'guiro', 'piano'],
  presets: salsaPresets,
}
