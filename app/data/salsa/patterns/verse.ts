import type { Pattern } from '../../../composables/usePattern'

/**
 * One 8-count block = one two-bar clave cycle, in eighth notes
 * (cells 0–7 = counts 1–4, cells 8–15 = counts 5–8).
 *
 * Verse feel in 3-2 son clave: tumbao on congas, martillo on bongos,
 * cáscara on the timbal shell. Built from documented references, but still
 * needs sign-off from a salsa player before shipping (plan section 7/14).
 */
export const salsaVersePattern: Pattern = {
  id: 'salsa-verse-3-2',
  name: 'Verse (3-2 clave, cáscara)',
  genre: 'salsa',
  counts: 8,
  stepsPerCount: 2,
  bpm: 180,
  tracks: [
    {
      // 3-2 son clave: 1, &2, 4 | 2, 3
      instrument: 'clave',
      steps: [
        'hit', null, null, 'hit', null, null, 'hit', null,
        null, null, 'hit', null, 'hit', null, null, null,
      ],
      volume: 1,
      muted: false,
    },
    {
      // Tumbao: slap on 2, open tones on 4 and &4
      instrument: 'congas',
      steps: [
        null, null, 'slap', null, null, null, 'open', 'open',
        null, null, 'slap', null, null, null, 'open', 'open',
      ],
      volume: 1,
      muted: false,
    },
    {
      // Martillo: eighths on the macho, hembra on 4
      instrument: 'bongos',
      steps: [
        'high', 'high', 'high', 'high', 'high', 'high', 'low', null,
        'high', 'high', 'high', 'high', 'high', 'high', 'low', null,
      ],
      volume: 0.8,
      muted: false,
    },
    {
      // Cáscara (3-2) on the shell
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
      volume: 0.8,
      muted: true,
    },
    {
      instrument: 'maracas',
      steps: Array(16).fill('hit'),
      volume: 0.5,
      muted: false,
    },
    {
      // Long on the beat, two short scrapes after
      instrument: 'guiro',
      steps: [
        'long', null, 'short', 'short', 'long', null, 'short', 'short',
        'long', null, 'short', 'short', 'long', null, 'short', 'short',
      ],
      volume: 0.6,
      muted: true,
    },
  ],
}
