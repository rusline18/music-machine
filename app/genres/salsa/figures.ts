import type { Step } from '~/core/pattern'
import { rotateFigure } from '~/core/pattern'

// Figures are eighth notes; one 8-count block = one two-bar clave cycle
// (cells 0–7 = counts 1–4, cells 8–15 = counts 5–8). Built from documented
// references, but still needs sign-off from a salsa player. The clave is the
// anchor: every part that isn't the same in both bars (cáscara, bells,
// piano, tres, brass) is written for 3-2 and turned with the clave for 2-3.
//
// This file holds the figures: what each instrument plays, one bar or one
// clave cycle long. patterns.ts builds the presets from them.

/** I–V7, a chord per bar; bass and piano follow it. */
export const PROGRESSION = ['C', 'G7']

/** 3-2 son clave: 1, &2, 4 | 2, 3 */
export const CLAVE_3_2: Step[] = [
  'hit', null, null, 'hit', null, null, 'hit', null,
  null, null, 'hit', null, 'hit', null, null, null,
]
/**
 * Tumbao (one bar), the full hand pattern: heel and toe rock on the drum
 * through 1 and 3, slap on 2, open tones on 4 and &4.
 */
export const TUMBAO: Step[] = ['heel', 'toe', 'slap', 'toe', 'heel', 'toe', 'open', 'open']
/**
 * The tumbao the way it's learnt, the strokes added one at a time: first
 * the open tones on 4 and &4 (what a dancer hears most), then the slap on 2.
 */
export const TUMBAO_OPEN: Step[] = [null, null, null, null, null, null, 'open', 'open']
export const TUMBAO_SLAP_OPEN: Step[] = [null, null, 'slap', null, null, null, 'open', 'open']
/** Martillo (one bar): eighths on the macho, hembra on 4 */
export const MARTILLO: Step[] = ['high', 'high', 'high', 'high', 'high', 'high', 'low', null]
/** Cáscara (3-2) on the timbal shell */
export const CASCARA_3_2: Step[] = [
  'rim', null, 'rim', null, 'rim', 'rim', null, 'rim',
  null, 'rim', 'rim', null, 'rim', null, 'rim', null,
]
/**
 * Mambo bell (3-2) on the timbales bell: the mouth on every beat, the neck
 * on the cáscara's off-beat strokes, so the bell keeps the clave's shape.
 */
export const MAMBO_BELL_3_2: Step[] = CASCARA_3_2.map((step, i) => (i % 2 === 0 ? 'open' : step && 'neck'))
/**
 * Bongo bell (two counts): quarter notes, the mouth on 1 and 3, the neck on
 * 2 and 4 — half as busy as the martillo it replaces.
 */
export const BONGO_BELL: Step[] = ['hit', null, 'neck', null]
/** Güiro (one count): long on the beat, two short scrapes after */
export const GUIRO: Step[] = ['long', null, 'short', 'short']
/**
 * Bass tumbao (one bar): the fifth on &2, then the next bar's root on 4,
 * held over the bar line — the bass doesn't play the 1.
 */
export const BASS_TUMBAO: Step[] = [null, null, null, '5th', null, null, 'push', null]
/**
 * Piano montuno (3-2): octaves on the chord tones over short chord stabs,
 * the next chord pushed on &4 of each bar and left ringing over the 1.
 */
export const MONTUNO_3_2: Step[] = [
  null, 'chord', '3rd', null, 'chord', '5th', null, 'push',
  null, 'chord', 'root', 'chord', null, '3rd', 'chord', 'push',
]
/**
 * Tres guajeo (3-2): single notes and thirds in the gaps the piano leaves,
 * the same push on &4 as the bass and piano, and no downbeat after it.
 */
export const GUAJEO_3_2: Step[] = [
  null, '5th', 'dyad', null, '3rd', 'dyad', 'root', 'push',
  null, '3rd', null, 'dyad', '5th', null, 'dyad', 'push',
]
/**
 * Brass moña (3-2), call and response over the two bars: the trumpets play
 * a riff on the 3 side ending in a push, the trombones answer on the 2
 * side with stabs and their own push into the next cycle.
 */
export const TRUMPET_MONA_3_2: Step[] = [
  null, '5th', null, '3rd', null, '5th', '3rd', 'push',
  null, null, null, null, null, null, null, null,
]
export const TROMBONE_MONA_3_2: Step[] = [
  null, null, null, null, null, null, null, null,
  null, 'hit', null, 'hit', 'root', null, '5th', 'push',
]
/**
 * Mambo section (3-2): the arranged brass break, both sections at once.
 * The trombones lock into a riff that runs through both bars, pushing on &4;
 * over it the trumpets punch out the clave itself — 2& and 4, then 6 and
 * 7 — and push into the next cycle.
 */
export const TROMBONE_MAMBO_3_2: Step[] = [
  null, 'root', null, '3rd', '5th', null, '3rd', 'push',
  null, 'root', null, '3rd', null, '5th', null, 'push',
]
export const TRUMPET_MAMBO_3_2: Step[] = [
  null, null, null, 'hit', null, null, 'hit', null,
  null, null, 'hit', null, 'hit', null, null, 'push',
]
/** Cha-cha-chá timbales (one bar): a click on the shell on 2, the open hembra on 4. */
export const CHACHACHA_TIMBALES: Step[] = [null, null, 'rim', null, null, null, 'low', null]
/** Bass on 1 and 3 (one bar): the root, then the fifth — cha-cha-chá, pachanga, bolero. */
export const BASS_ONE_THREE: Step[] = ['root', null, null, null, '5th', null, null, null]
/** Bolero piano (one bar): the chord on the 1, pushed again on 2&. */
export const BOLERO_PIANO: Step[] = ['chord', null, null, 'chord', null, null, null, null]
/**
 * Timbales fill (the last two counts of a block): macho, then down to the
 * hembra. Leads from one section of a song into the next.
 */
export const TIMBALES_FILL: Step[] = ['high', 'high', 'high', 'low']

// 2-3 is the same two-bar cycle started from the other bar. Only the parts
// that follow the clave turn; tumbao, martillo, bongo bell and bass repeat
// every bar, and the voice keeps counting from the dancer's 1.
/** 2-3 son clave: 2, 3 | 1, &2, 4 */
export const CLAVE_2_3 = rotateFigure(CLAVE_3_2, 8)
/** Cáscara (2-3) */
export const CASCARA_2_3 = rotateFigure(CASCARA_3_2, 8)
/** Mambo bell (2-3) */
export const MAMBO_BELL_2_3 = rotateFigure(MAMBO_BELL_3_2, 8)
/** Piano montuno (2-3) */
export const MONTUNO_2_3 = rotateFigure(MONTUNO_3_2, 8)
/** Tres guajeo (2-3) */
export const GUAJEO_2_3 = rotateFigure(GUAJEO_3_2, 8)
/** Brass moña (2-3) */
export const TRUMPET_MONA_2_3 = rotateFigure(TRUMPET_MONA_3_2, 8)
export const TROMBONE_MONA_2_3 = rotateFigure(TROMBONE_MONA_3_2, 8)
/** Mambo section (2-3) */
export const TRUMPET_MAMBO_2_3 = rotateFigure(TRUMPET_MAMBO_3_2, 8)
export const TROMBONE_MAMBO_2_3 = rotateFigure(TROMBONE_MAMBO_3_2, 8)
/** 3-2 rumba clave: like son clave, but the third stroke moves from 4 to &4. */
export const RUMBA_CLAVE_3_2: Step[] = [
  'hit', null, null, 'hit', null, null, null, 'hit',
  null, null, 'hit', null, 'hit', null, null, null,
]

/**
 * Pachanga conga (one bar): a slap on the beat and two open tones after it,
 * on every other count — the "bouncing" figure the dance's knee bounce
 * follows.
 */
export const PACHANGA_CONGAS: Step[] = ['slap', null, 'open', 'open', 'slap', null, 'open', 'open']
