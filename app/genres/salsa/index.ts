import type { Genre } from '../types'
import { countingVoice } from '../voice'
import { salsaClave, salsaPresets, TIMBALES_FILL } from './patterns'
import { salsaPitched, salsaSamples } from './samples'

export const salsa: Genre = {
  id: 'salsa',
  instruments: ['voice', ...Object.keys(salsaSamples), ...Object.keys(salsaPitched)],
  samples: salsaSamples,
  pitched: salsaPitched,
  spoken: { voice: countingVoice },
  // Bolero sits around 80, cha-cha-chá around 120, fast salsa past 200.
  bpmRange: [60, 230],
  // Clave is the key everything locks to; the congas' tumbao is the pulse,
  // and the bass's tumbao sits on it. Bells, piano and the rest come after.
  teachingOrder: ['clave', 'congas', 'bass', 'bongos', 'maracas', 'timbales', 'cowbell', 'timbalebell', 'guiro', 'piano', 'tres', 'trumpet', 'trombone'],
  presets: salsaPresets,
  clave: salsaClave,
  // Going into the next section of a song, the timbalero plays a fill.
  transitionFill: { instrument: 'timbales', steps: TIMBALES_FILL },
}
