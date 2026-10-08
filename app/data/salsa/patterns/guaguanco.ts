import type { Pattern } from '../../../composables/usePattern'

/**
 * Rumba guaguancó over 3-2 rumba clave — the street rumba that salsa
 * bands quote in "rumba" sections and Cuban casino dancers break into.
 * One 8-count block is one clave cycle, as in the other presets.
 *
 * Rumba clave differs from son clave in one stroke: the third hit of the
 * 3 side moves from 4 to "4 &". The three congas are folded onto our one
 * conga track by sound: the segundo (open) keeps to the beat — a muffled
 * slap on 2 and 6, open tones on 4 and 5 — and the tumba (low) answers off the
 * beat on "4 &", "7 &" and 8. The palitos play the guagua pattern on the
 * timbal shell (the same figure salsa calls cáscara). The quinto
 * improvises, so it isn't written. A simplified, one-player version of a
 * part that varies between Havana and Matanzas styles: needs sign-off from
 * a rumbero before it's treated as reference.
 */
export const salsaGuaguancoPattern: Pattern = {
  id: 'salsa-guaguanco-3-2',
  name: 'Rumba guaguancó (3-2 rumba clave)',
  genre: 'salsa',
  counts: 8,
  stepsPerCount: 2,
  bpm: 190,
  tracks: [
    {
      // 3-2 rumba clave: 1, 2&, 4& | 6, 7
      instrument: 'clave',
      steps: [
        'hit', null, null, 'hit', null, null, null, 'hit',
        null, null, 'hit', null, 'hit', null, null, null,
      ],
      volume: 1,
      muted: false,
    },
    {
      instrument: 'congas',
      steps: [
        null, null, 'slap', null, null, null, 'open', 'low',
        'open', null, 'slap', null, null, 'low', 'low', null,
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
      // Palitos / guagua
      instrument: 'timbales',
      steps: [
        'rim', null, 'rim', null, 'rim', 'rim', null, 'rim',
        null, 'rim', 'rim', null, 'rim', null, 'rim', null,
      ],
      volume: 0.7,
      muted: false,
    },
    {
      instrument: 'cowbell',
      steps: Array(16).fill(null),
      volume: 0.7,
      muted: true,
    },
    {
      // Shekere-like pulse; off by default, rumba is mostly drums and voices
      instrument: 'maracas',
      steps: Array(16).fill('hit'),
      volume: 0.4,
      muted: true,
    },
    {
      instrument: 'guiro',
      steps: Array(16).fill(null),
      volume: 0.6,
      muted: true,
    },
  ],
}
