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
  presets: salsaPresets,
}
