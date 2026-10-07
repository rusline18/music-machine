import type { Pattern } from '../../../composables/usePattern'

/**
 * Placeholder starter pattern — illustrative only. The plan (section 7/14)
 * flags that pattern correctness needs sign-off from someone who knows the
 * style before this ships as a real preset (e.g. a proper 2-3 son clave).
 */
export const salsaBasicPattern: Pattern = {
  id: 'salsa-basic',
  name: 'Basic',
  genre: 'salsa',
  stepsPerBar: 16,
  bpm: 90,
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
        'low', null, 'slap', null, 'low', null, 'open', null,
        'low', null, 'slap', null, 'low', null, 'open', null,
      ],
      volume: 1,
      muted: false,
    },
    {
      instrument: 'bongos',
      steps: Array(16).fill(null),
      volume: 1,
      muted: true,
    },
    {
      instrument: 'timbales',
      steps: Array(16).fill(null),
      volume: 1,
      muted: true,
    },
    {
      instrument: 'cowbell',
      steps: [
        'hit', null, 'hit', null, 'hit', null, 'hit', null,
        'hit', null, 'hit', null, 'hit', null, 'hit', null,
      ],
      volume: 0.8,
      muted: false,
    },
    {
      instrument: 'maracas',
      steps: Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? 'hit' : null)),
      volume: 0.6,
      muted: false,
    },
    {
      instrument: 'guiro',
      steps: Array(16).fill(null),
      volume: 1,
      muted: true,
    },
  ],
}
