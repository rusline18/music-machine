import type { Pattern } from '../../../composables/usePattern'

/**
 * One 8-count block (two bars) in eighth notes: cells 0–7 = counts 1–4,
 * cells 8–15 = counts 5–8.
 *
 * Derecho (verse): bongos martillo and güira on every eighth, segunda on
 * every eighth, bass on 1, &2, 3, 4 of each bar. Built from documented
 * references, but still needs sign-off from a bachata musician (plan
 * section 7/14).
 */
export const bachataDerechoPattern: Pattern = {
  id: 'bachata-derecho',
  name: 'Derecho',
  genre: 'bachata',
  counts: 8,
  stepsPerCount: 2,
  bpm: 130,
  tracks: [
    {
      // Long scrape on the beat, short on the &
      instrument: 'guira',
      steps: Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? 'long' : 'short')),
      volume: 0.8,
      muted: false,
    },
    {
      // Martillo: eighths on the macho, hembra on 4 and 8
      instrument: 'bongos',
      steps: [
        'high', 'high', 'high', 'high', 'high', 'high', 'low', 'high',
        'high', 'high', 'high', 'high', 'high', 'high', 'low', 'high',
      ],
      volume: 1,
      muted: false,
    },
    {
      instrument: 'bass',
      steps: [
        'hit', null, null, 'hit', 'hit', null, 'hit', null,
        'hit', null, null, 'hit', 'hit', null, 'hit', null,
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
      steps: Array(16).fill('hit'),
      volume: 0.6,
      muted: false,
    },
  ],
}
