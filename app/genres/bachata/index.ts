import type { Genre } from '../types'
import { countingVoice } from '../voice'
import { bachataPresets } from './patterns'
import { bachataPitched, bachataSamples } from './samples'

export const bachata: Genre = {
  id: 'bachata',
  instruments: ['voice', 'guira', 'bongos', 'campana', 'bass', 'requinto', 'segunda'],
  samples: bachataSamples,
  pitched: bachataPitched,
  spoken: { voice: countingVoice },
  bpmRange: [90, 160],
  // The güira keeps time and the bass marks the 1; guitars come last.
  teachingOrder: ['guira', 'bass', 'bongos', 'campana', 'segunda', 'requinto'],
  presets: bachataPresets,
}
