import type { Step } from '~/core/pattern'
import { chainPatterns, definePattern } from '~/core/pattern'

// Figures are eighth notes; one 8-count block = one two-bar clave cycle
// (cells 0–7 = counts 1–4, cells 8–15 = counts 5–8). Built from documented
// references, but still needs sign-off from a salsa player.

/** 3-2 son clave: 1, &2, 4 | 2, 3 */
const CLAVE_3_2: Step[] = [
  'hit', null, null, 'hit', null, null, 'hit', null,
  null, null, 'hit', null, 'hit', null, null, null,
]
/** Tumbao (one bar): slap on 2, open tones on 4 and &4 */
const TUMBAO: Step[] = [null, null, 'slap', null, null, null, 'open', 'open']
/** Martillo (one bar): eighths on the macho, hembra on 4 */
const MARTILLO: Step[] = ['high', 'high', 'high', 'high', 'high', 'high', 'low', null]
/** Cáscara (3-2) on the timbal shell */
const CASCARA_3_2: Step[] = [
  'rim', null, 'rim', null, 'rim', 'rim', null, 'rim',
  null, 'rim', 'rim', null, 'rim', null, 'rim', null,
]
/** Güiro (one count): long on the beat, two short scrapes after */
const GUIRO: Step[] = ['long', null, 'short', 'short']

/** Verse feel in 3-2 son clave: tumbao, martillo, cáscara. */
export const salsaVerse = definePattern({
  id: 'salsa-verse-3-2',
  counts: 8,
  bpm: 180,
  tracks: [
    { instrument: 'clave', figure: CLAVE_3_2 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', figure: MARTILLO, volume: 0.8 },
    { instrument: 'timbales', figure: CASCARA_3_2, volume: 0.7 },
    { instrument: 'cowbell', volume: 0.8 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.5 },
    { instrument: 'guiro', figure: GUIRO, volume: 0.6, muted: true },
  ],
})

/**
 * Montuno feel: the bongocero switches to the bongo bell (quarter notes)
 * and the güiro comes in. The timbalero would play mambo bell here, which
 * needs its own sample — the track is left empty for now.
 */
export const salsaMontuno = definePattern({
  id: 'salsa-montuno-3-2',
  counts: 8,
  bpm: 190,
  tracks: [
    { instrument: 'clave', figure: CLAVE_3_2 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', volume: 0.8 },
    { instrument: 'timbales', volume: 0.7 },
    { instrument: 'cowbell', figure: ['hit', null], volume: 0.7 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.4, muted: true },
    { instrument: 'guiro', figure: GUIRO, volume: 0.6 },
  ],
})

export const salsaPresets = [
  salsaVerse,
  salsaMontuno,
  chainPatterns('salsa-verse-montuno', salsaVerse, salsaMontuno),
]
