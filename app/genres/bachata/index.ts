import type { Genre } from '../types'
import { bachataPresets } from './patterns'
import { bachataPitched, bachataSamples } from './samples'

export const bachata: Genre = {
  id: 'bachata',
  instruments: ['guira', 'bongos', 'campana', 'bass', 'requinto', 'segunda'],
  samples: bachataSamples,
  pitched: bachataPitched,
  bpmRange: [90, 160],
  presets: bachataPresets,
}
