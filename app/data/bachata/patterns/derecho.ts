import type { Pattern } from '../../../composables/usePattern'
import { resizeSteps } from '../../../composables/usePattern'

/** The minor-key i–iv–V–i turnaround, one chord per bar, used by both bachata presets. */
export const BACHATA_PROGRESSION = ['Am', 'Dm', 'E', 'Am']

/** One bar of segunda: alternating bass, treble arpeggios, a muted chuck on 4. */
export const SEGUNDA_BAR = ['bass', 'chord', 'chord', 'chord', '5th', 'chord', 'mute', 'chord']
/** One bar of bass: root on 1 and 3, fifth on 2& and 4. */
export const BASS_BAR = ['root', null, null, '5th', 'root', null, '5th', null]

/**
 * One 8-count block of requinto in the verse: it stays out of the singer's
 * way and only answers with a pickup run on 7 & 8 &.
 */
const REQUINTO_DERECHO_BLOCK = [
  null, null, null, null, null, null, null, null,
  null, null, null, null, 'root', '3rd', '5th', '3rd',
]

/**
 * Two 8-count blocks (four bars, one chord each) in eighth notes: cells
 * 0–7 = counts 1–4, cells 8–15 = counts 5–8, and so on.
 *
 * Derecho (verse): bongos martillo and güira on every eighth, segunda on
 * every eighth, bass on 1, &2, 3, 4 of each bar, requinto pickups at the
 * end of each block. Built from documented references, but still needs
 * sign-off from a bachata musician (plan section 7/14).
 */
export const bachataDerechoPattern: Pattern = {
  id: 'bachata-derecho',
  name: 'Derecho',
  genre: 'bachata',
  counts: 16,
  stepsPerCount: 2,
  bpm: 130,
  chords: BACHATA_PROGRESSION,
  tracks: [
    {
      // Long scrape on the beat, short on the &
      instrument: 'guira',
      steps: Array.from({ length: 32 }, (_, i) => (i % 2 === 0 ? 'long' : 'short')),
      volume: 0.8,
      muted: false,
    },
    {
      // Martillo: eighths on the macho, hembra on 4 and 8
      instrument: 'bongos',
      steps: resizeSteps([
        'high', 'high', 'high', 'high', 'high', 'high', 'low', 'high',
      ], 32),
      volume: 1,
      muted: false,
    },
    {
      // The bell only comes in for the mambo.
      instrument: 'campana',
      steps: Array(32).fill(null),
      volume: 0.8,
      muted: true,
    },
    {
      instrument: 'bass',
      steps: resizeSteps(BASS_BAR, 32),
      volume: 1,
      muted: false,
    },
    {
      instrument: 'requinto',
      steps: resizeSteps(REQUINTO_DERECHO_BLOCK, 32),
      volume: 0.8,
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
