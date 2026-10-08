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
  // Cha-cha-chá sits around 120, fast salsa past 200.
  bpmRange: [100, 230],
  // Clave is the key everything locks to; the congas' tumbao is the pulse.
  teachingOrder: ['clave', 'congas', 'bongos', 'maracas', 'timbales', 'cowbell', 'guiro'],
  presets: salsaPresets,
}
