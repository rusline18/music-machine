import type { Genre } from '../types'
import { salsaPresets } from './patterns'
import { salsaSamples } from './samples'

export const salsa: Genre = {
  id: 'salsa',
  instruments: Object.keys(salsaSamples),
  samples: salsaSamples,
  pitched: {},
  bpmRange: [140, 220],
  presets: salsaPresets,
}
