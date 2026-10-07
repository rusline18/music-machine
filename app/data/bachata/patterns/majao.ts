import type { Pattern } from '../../../composables/usePattern'

/**
 * Majao (the lighter section): bongos and güira drop the upbeats and play
 * downbeats only; segunda and bass keep the derecho rhythm. Same grid and
 * caveats as derecho.ts.
 */
export const bachataMajaoPattern: Pattern = {
  id: 'bachata-majao',
  name: 'Majao',
  genre: 'bachata',
  stepsPerBar: 16,
  bpm: 130,
  tracks: [
    {
      instrument: 'guira',
      steps: Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? 'long' : null)),
      volume: 0.8,
      muted: false,
    },
    {
      instrument: 'bongos',
      steps: [
        'high', null, null, null, 'high', null, null, null,
        'high', null, null, null, 'low', null, null, null,
      ],
      volume: 1,
      muted: false,
    },
    {
      instrument: 'bass',
      steps: [
        'hit', null, null, null, null, null, 'hit', null,
        'hit', null, null, null, 'hit', null, null, null,
      ],
      volume: 1,
      muted: false,
    },
    {
      instrument: 'requinto',
      steps: Array(16).fill(null),
      volume: 1,
      muted: true,
    },
    {
      instrument: 'segunda',
      steps: Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? 'hit' : null)),
      volume: 0.6,
      muted: false,
    },
  ],
}
