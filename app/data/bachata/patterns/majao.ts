import type { Pattern } from '../../../composables/usePattern'
import { resizeSteps } from '../../../composables/usePattern'
import { BACHATA_PROGRESSION, BASS_BAR, SEGUNDA_BAR } from './derecho'

/**
 * One 8-count block of requinto in the majao, where it steps forward:
 * thirds/sixths on 1 and 2& (echoing the bass), arpeggios in between, a
 * run back down to lead into the next block.
 */
const REQUINTO_MAJAO_BLOCK = [
  'dyad', null, null, 'dyad', null, 'root', '3rd', '5th',
  'dyad', null, null, 'dyad', '5th', '3rd', 'root', null,
]

/**
 * Majao (the lighter section): bongos and güira drop the upbeats and play
 * downbeats only; segunda and bass keep the derecho rhythm over the same
 * chords, and the requinto takes the lead. Same grid and caveats as
 * derecho.ts.
 */
export const bachataMajaoPattern: Pattern = {
  id: 'bachata-majao',
  name: 'Majao',
  genre: 'bachata',
  counts: 16,
  stepsPerCount: 2,
  bpm: 130,
  chords: BACHATA_PROGRESSION,
  tracks: [
    {
      instrument: 'guira',
      steps: Array.from({ length: 32 }, (_, i) => (i % 2 === 0 ? 'long' : null)),
      volume: 0.8,
      muted: false,
    },
    {
      instrument: 'bongos',
      steps: resizeSteps(['high', null, 'high', null, 'high', null, 'low', null], 32),
      volume: 1,
      muted: false,
    },
    {
      instrument: 'bass',
      steps: resizeSteps(BASS_BAR, 32),
      volume: 1,
      muted: false,
    },
    {
      instrument: 'requinto',
      steps: resizeSteps(REQUINTO_MAJAO_BLOCK, 32),
      volume: 0.8,
      muted: false,
    },
    {
      instrument: 'segunda',
      steps: resizeSteps(SEGUNDA_BAR, 32),
      volume: 0.6,
      muted: false,
    },
  ],
}
