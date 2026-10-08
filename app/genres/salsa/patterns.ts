import type { Step } from '~/core/pattern'
import { chainPatterns, definePattern, rotateFigure } from '~/core/pattern'
import { voiceTrack } from '../voice'

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

// 2-3 is the same two-bar cycle started from the other bar. Only the parts
// that follow the clave turn; tumbao, martillo and the bells repeat every
// bar, and the voice keeps counting from the dancer's 1.
/** 2-3 son clave: 2, 3 | 1, &2, 4 */
const CLAVE_2_3 = rotateFigure(CLAVE_3_2, 8)
/** Cáscara (2-3) */
const CASCARA_2_3 = rotateFigure(CASCARA_3_2, 8)
/** 3-2 rumba clave: like son clave, but the third stroke moves from 4 to &4. */
const RUMBA_CLAVE_3_2: Step[] = [
  'hit', null, null, 'hit', null, null, null, 'hit',
  null, null, 'hit', null, 'hit', null, null, null,
]

/** Verse feel in 3-2 son clave: tumbao, martillo, cáscara. */
export const salsaVerse = definePattern({
  id: 'salsa-verse-3-2',
  counts: 8,
  bpm: 180,
  tracks: [
    voiceTrack,
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
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_3_2 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', volume: 0.8 },
    { instrument: 'timbales', volume: 0.7 },
    { instrument: 'cowbell', figure: ['hit', null], volume: 0.7 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.4, muted: true },
    { instrument: 'guiro', figure: GUIRO, volume: 0.6 },
  ],
})

/** The verse in 2-3 clave. */
export const salsaVerse23 = definePattern({
  id: 'salsa-verse-2-3',
  counts: 8,
  bpm: 180,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_2_3 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', figure: MARTILLO, volume: 0.8 },
    { instrument: 'timbales', figure: CASCARA_2_3, volume: 0.7 },
    { instrument: 'cowbell', volume: 0.8 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.5 },
    { instrument: 'guiro', figure: GUIRO, volume: 0.6, muted: true },
  ],
})

/** The montuno in 2-3 clave. */
export const salsaMontuno23 = definePattern({
  id: 'salsa-montuno-2-3',
  counts: 8,
  bpm: 190,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_2_3 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', volume: 0.8 },
    { instrument: 'timbales', volume: 0.7 },
    { instrument: 'cowbell', figure: ['hit', null], volume: 0.7 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.4, muted: true },
    { instrument: 'guiro', figure: GUIRO, volume: 0.6 },
  ],
})

/**
 * Cha-cha-chá, charanga style, over 2-3 son clave. Each count is a real
 * quarter note at ~120 BPM rather than salsa's cut time. The güiro gives
 * the name: long on the beat, two shorts after — the shorts on "4 &" plus
 * the long on "1" are the dancer's "cha-cha-chá". The timbalero keeps
 * quarter notes on the cha-cha bell, clicks the shell on 2 and opens the
 * hembra on 4; congas keep the tumbao. Charangas have no bongó. Assembled
 * from common descriptions of the style; check by ear against recordings.
 */
export const salsaChachacha = definePattern({
  id: 'salsa-chachacha-2-3',
  counts: 8,
  bpm: 120,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_2_3, volume: 0.7 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', volume: 0.8 },
    // Shell click on 2, open hembra on 4
    { instrument: 'timbales', figure: [null, null, 'rim', null, null, null, 'low', null], volume: 0.7 },
    { instrument: 'cowbell', figure: ['hit', null], volume: 0.7 },
    { instrument: 'maracas', volume: 0.5 },
    { instrument: 'guiro', figure: GUIRO, volume: 0.8 },
  ],
})

/**
 * Rumba guaguancó over 3-2 rumba clave — the street rumba that salsa bands
 * quote in "rumba" sections and Cuban casino dancers break into. The three
 * congas are folded onto one track by sound: the segundo (open) keeps to
 * the beat — a muffled slap on 2 and 6, open tones on 4 and 5 — and the
 * tumba (low) answers off the beat on "4 &", "7 &" and 8. The palitos play
 * the guagua pattern on the timbal shell (the figure salsa calls cáscara).
 * The quinto improvises, so it isn't written. A simplified, one-player
 * version of a part that varies between Havana and Matanzas styles: needs
 * sign-off from a rumbero before it's treated as reference.
 */
export const salsaGuaguanco = definePattern({
  id: 'salsa-guaguanco-3-2',
  counts: 8,
  bpm: 190,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: RUMBA_CLAVE_3_2 },
    {
      instrument: 'congas',
      figure: [
        null, null, 'slap', null, null, null, 'open', 'low',
        'open', null, 'slap', null, null, 'low', 'low', null,
      ],
    },
    { instrument: 'bongos', volume: 0.8 },
    { instrument: 'timbales', figure: CASCARA_3_2, volume: 0.7 },
    { instrument: 'cowbell', volume: 0.7 },
    // Shekere-like pulse; off by default, rumba is mostly drums and voices
    { instrument: 'maracas', figure: ['hit'], volume: 0.4, muted: true },
    { instrument: 'guiro', volume: 0.6 },
  ],
})

export const salsaPresets = [
  salsaVerse,
  salsaMontuno,
  chainPatterns('salsa-verse-montuno', salsaVerse, salsaMontuno),
  salsaVerse23,
  salsaMontuno23,
  chainPatterns('salsa-verse-montuno-2-3', salsaVerse23, salsaMontuno23),
  salsaChachacha,
  salsaGuaguanco,
]
