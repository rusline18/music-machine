import type { Pattern } from '../../../composables/usePattern'
import { resizeSteps } from '../../../composables/usePattern'
import { BACHATA_PROGRESSION, BASS_BAR, SEGUNDA_BAR } from './derecho'

/** One bar of campana: every count, open on 1 and 3, neck on 2 and 4. */
const CAMPANA_BAR = ['open', null, 'neck', null, 'open', null, 'neck', null]

/** One bar of the requinto's mambo riff: a dyad, a run down, a turn back up. */
const REQUINTO_MAMBO_BAR = ['dyad', '5th', '3rd', 'root', '3rd', '5th', 'dyad', null]

/**
 * Mambo (the instrumental climax): the bongo player puts the bongos down
 * and picks up the campana — the bell is how dancers recognize the mambo.
 * The güira scrapes long on every eighth, and the requinto plays a
 * repeating riff through the whole section. Segunda and bass keep the
 * derecho rhythm over the same chords. Same grid and caveats as derecho.ts.
 */
export const bachataMamboPattern: Pattern = {
  id: 'bachata-mambo',
  name: 'Mambo',
  genre: 'bachata',
  counts: 16,
  stepsPerCount: 2,
  bpm: 130,
  chords: BACHATA_PROGRESSION,
  tracks: [
    {
      instrument: 'guira',
      steps: Array(32).fill('long'),
      volume: 1,
      muted: false,
    },
    {
      // Same player as the campana, so the bongos are silent.
      instrument: 'bongos',
      steps: Array(32).fill(null),
      volume: 1,
      muted: true,
    },
    {
      instrument: 'campana',
      steps: resizeSteps(CAMPANA_BAR, 32),
      volume: 0.8,
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
      steps: resizeSteps(REQUINTO_MAMBO_BAR, 32),
      volume: 0.9,
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
