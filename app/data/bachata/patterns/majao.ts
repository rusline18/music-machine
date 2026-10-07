import type { Pattern } from '../../../composables/usePattern'
import { resizeSteps } from '../../../composables/usePattern'
import { BACHATA_PROGRESSION, BASS_BAR, SEGUNDA_BAR } from './derecho'

/**
 * One bar of majao bongo: the martillo opens up — a slap on 1&, open
 * hembra (low) tones driving through 3, 4 and 4&.
 */
const BONGOS_MAJAO_BAR = ['high', 'slap', 'high', 'high', 'low', 'high', 'low', 'low']

/**
 * One 8-count block of requinto in the majao: the singers have the chorus,
 * so the requinto answers — a dyad on 4, then a run down on 7 & 8 &.
 */
const REQUINTO_MAJAO_BLOCK = [
  null, null, null, null, null, null, 'dyad', null,
  null, null, null, null, 'dyad', '5th', '3rd', 'root',
]

/**
 * Majao (usually the chorus): a step up in energy from the derecho. The
 * bongo leaves the even martillo for a more syncopated pattern with open
 * tones, the güira digs in harder, and the requinto answers the singers.
 * Segunda and bass keep the derecho rhythm over the same chords. Same grid
 * and caveats as derecho.ts — this one especially needs a bachata
 * musician's ear.
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
      // Long scrape on the beat, short on the &, as in derecho but louder.
      instrument: 'guira',
      steps: Array.from({ length: 32 }, (_, i) => (i % 2 === 0 ? 'long' : 'short')),
      volume: 0.95,
      muted: false,
    },
    {
      instrument: 'bongos',
      steps: resizeSteps(BONGOS_MAJAO_BAR, 32),
      volume: 1,
      muted: false,
    },
    {
      instrument: 'campana',
      steps: Array(32).fill(null),
      volume: 0.8,
      muted: true,
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
