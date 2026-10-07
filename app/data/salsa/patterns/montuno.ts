import type { Pattern } from '../../../composables/usePattern'

/**
 * Montuno feel in 3-2 son clave: the bongocero switches to the bongo bell
 * (quarter notes) and the güiro comes in. Same eighth-note grid and caveats
 * as the verse pattern (see verse.ts). The timbalero would play mambo bell
 * here, which needs its own sample — the track is left empty for now.
 */
export const salsaMontunoPattern: Pattern = {
  id: 'salsa-montuno-3-2',
  name: 'Montuno (3-2 clave, bells)',
  genre: 'salsa',
  stepsPerBar: 16,
  bpm: 95,
  tracks: [
    {
      instrument: 'clave',
      steps: [
        'hit', null, null, 'hit', null, null, 'hit', null,
        null, null, 'hit', null, 'hit', null, null, null,
      ],
      volume: 1,
      muted: false,
    },
    {
      instrument: 'congas',
      steps: [
        null, null, 'slap', null, null, null, 'open', 'open',
        null, null, 'slap', null, null, null, 'open', 'open',
      ],
      volume: 1,
      muted: false,
    },
    {
      instrument: 'bongos',
      steps: Array(16).fill(null),
      volume: 0.8,
      muted: true,
    },
    {
      instrument: 'timbales',
      steps: Array(16).fill(null),
      volume: 0.7,
      muted: true,
    },
    {
      // Bongo bell on every quarter note
      instrument: 'cowbell',
      steps: Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? 'hit' : null)),
      volume: 0.7,
      muted: false,
    },
    {
      instrument: 'maracas',
      steps: Array(16).fill('hit'),
      volume: 0.4,
      muted: true,
    },
    {
      instrument: 'guiro',
      steps: [
        'long', null, 'short', 'short', 'long', null, 'short', 'short',
        'long', null, 'short', 'short', 'long', null, 'short', 'short',
      ],
      volume: 0.6,
      muted: false,
    },
  ],
}
