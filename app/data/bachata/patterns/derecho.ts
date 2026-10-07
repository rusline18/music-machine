import type { Pattern } from '../../../composables/usePattern'

/**
 * Bachata grid: 16 sixteenth-note steps in one 4/4 bar, `bpm` in quarter
 * notes. The dancer's 1–8 count spans two bars.
 *
 * Derecho (verse): bongos martillo and güira on every eighth, segunda on
 * every eighth, bass on 1, &2, 3, 4. Built from documented references, but
 * still needs sign-off from a bachata musician (plan section 7/14).
 */
export const bachataDerechoPattern: Pattern = {
  id: 'bachata-derecho',
  name: 'Derecho',
  genre: 'bachata',
  stepsPerBar: 16,
  bpm: 130,
  tracks: [
    {
      // Long scrape on the beat, short on the &
      instrument: 'guira',
      steps: [
        'long', null, 'short', null, 'long', null, 'short', null,
        'long', null, 'short', null, 'long', null, 'short', null,
      ],
      volume: 0.8,
      muted: false,
    },
    {
      // Martillo: eighths on the macho, hembra on 4
      instrument: 'bongos',
      steps: [
        'high', null, 'high', null, 'high', null, 'high', null,
        'high', null, 'high', null, 'low', null, 'high', null,
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
