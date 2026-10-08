import type { Pattern } from '../../../composables/usePattern'

/**
 * Cha-cha-chá, charanga style, over 2-3 son clave. Same eighth-note grid as
 * the salsa presets, but each count is a real quarter note at ~120 BPM
 * rather than salsa's cut time.
 *
 * The name is the güiro: long on the beat, two short scrapes after —
 * the shorts on "4 &" plus the long on "1" are the dancer's "cha-cha-chá".
 * The timbalero keeps quarter notes on the cha-cha bell, clicks the shell
 * on 2 and opens the hembra on 4; congas keep the tumbao. Charangas have
 * no bongó, so bongos and maracas sit out. Assembled from common
 * descriptions of the style; check by ear against recordings.
 */
export const salsaChachachaPattern: Pattern = {
  id: 'salsa-chachacha-2-3',
  name: 'Cha-cha-chá (2-3 clave)',
  genre: 'salsa',
  counts: 8,
  stepsPerCount: 2,
  bpm: 120,
  tracks: [
    {
      // 2-3 son clave: 2, 3 | 1, 2&, 4
      instrument: 'clave',
      steps: [
        null, null, 'hit', null, 'hit', null, null, null,
        'hit', null, null, 'hit', null, null, 'hit', null,
      ],
      volume: 0.7,
      muted: false,
    },
    {
      // Tumbao: slap on 2, open tones on 4 and &4, leading into the "chá"
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
      // Shell click on 2, open hembra on 4
      instrument: 'timbales',
      steps: [
        null, null, 'rim', null, null, null, 'low', null,
        null, null, 'rim', null, null, null, 'low', null,
      ],
      volume: 0.7,
      muted: false,
    },
    {
      // Cha-cha bell: every quarter note
      instrument: 'cowbell',
      steps: Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? 'hit' : null)),
      volume: 0.7,
      muted: false,
    },
    {
      instrument: 'maracas',
      steps: Array(16).fill(null),
      volume: 0.5,
      muted: true,
    },
    {
      // Long, short-short: 1, 2 &, 3, 4 &
      instrument: 'guiro',
      steps: [
        'long', null, 'short', 'short', 'long', null, 'short', 'short',
        'long', null, 'short', 'short', 'long', null, 'short', 'short',
      ],
      volume: 0.8,
      muted: false,
    },
  ],
}
