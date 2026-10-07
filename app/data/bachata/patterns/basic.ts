import type { Pattern } from '../../../composables/usePattern'

/**
 * Placeholder starter pattern — illustrative only, same caveat as the Salsa
 * basic preset: needs review by someone who knows Bachata before it ships
 * as a real preset.
 */
export const bachataBasicPattern: Pattern = {
  id: 'bachata-basic',
  name: 'Basic',
  genre: 'bachata',
  stepsPerBar: 16,
  bpm: 130,
  tracks: [
    {
      instrument: 'guira',
      steps: Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? 'short' : null)),
      volume: 0.8,
      muted: false,
    },
    {
      instrument: 'bongos',
      steps: [
        'low', null, 'high', null, 'low', null, 'high', null,
        'low', null, 'high', null, 'low', null, 'high', 'slap',
      ],
      volume: 1,
      muted: false,
    },
    {
      instrument: 'bass',
      steps: [
        'hit', null, null, null, 'hit', null, null, null,
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
      steps: Array(16).fill(null),
      volume: 1,
      muted: true,
    },
  ],
}
