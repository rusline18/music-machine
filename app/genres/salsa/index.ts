import type { Genre } from '../types'
import { countingVoice } from '../voice'
import { salsaPresets } from './patterns'
import { salsaSamples } from './samples'

export const salsa: Genre = {
  id: 'salsa',
  instruments: ['voice', ...Object.keys(salsaSamples)],
  samples: salsaSamples,
  pitched: {},
  spoken: { voice: countingVoice },
  bpmRange: [140, 220],
  // Clave is the key everything locks to; the congas' tumbao is the pulse.
  teachingOrder: ['clave', 'congas', 'bongos', 'maracas', 'timbales', 'cowbell', 'guiro'],
  presets: salsaPresets,
}
