import { definePattern } from '~/core/pattern'
import { voiceTrack } from '../voice'
import {
  BASS_ONE_THREE,
  BASS_TUMBAO,
  BOLERO_PIANO,
  BONGO_BELL,
  CASCARA_2_3,
  CASCARA_3_2,
  CHACHACHA_TIMBALES,
  CLAVE_2_3,
  CLAVE_3_2,
  GUAJEO_2_3,
  GUAJEO_3_2,
  GUIRO,
  MAMBO_BELL_2_3,
  MAMBO_BELL_3_2,
  MARTILLO,
  MONTUNO_2_3,
  MONTUNO_3_2,
  PACHANGA_CONGAS,
  PROGRESSION,
  RUMBA_CLAVE_3_2,
  TROMBONE_MAMBO_2_3,
  TROMBONE_MAMBO_3_2,
  TROMBONE_MONA_2_3,
  TROMBONE_MONA_3_2,
  TRUMPET_MAMBO_2_3,
  TRUMPET_MAMBO_3_2,
  TRUMPET_MONA_2_3,
  TRUMPET_MONA_3_2,
  TUMBAO,
} from './figures'

// The presets, each built from the figures in figures.ts.

export const salsaVerse = definePattern({
  id: 'salsa-verse-3-2',
  counts: 8,
  bpm: 165,
  chords: PROGRESSION,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_3_2 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', figure: MARTILLO, volume: 0.8 },
    { instrument: 'timbales', figure: CASCARA_3_2, volume: 0.7 },
    { instrument: 'cowbell', volume: 0.7 },
    { instrument: 'timbalebell', volume: 0.7 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.5 },
    { instrument: 'guiro', figure: GUIRO, volume: 0.6, muted: true },
    { instrument: 'bass', figure: BASS_TUMBAO, volume: 0.9 },
    { instrument: 'piano', figure: MONTUNO_3_2, volume: 0.6 },
    { instrument: 'tres', figure: GUAJEO_3_2, volume: 0.5 },
    { instrument: 'trumpet', volume: 0.6 },
    { instrument: 'trombone', volume: 0.6 },
  ],
})

/**
 * Montuno feel: the bongocero puts the bongos down for the bongo bell, the
 * timbalero leaves the shell for the mambo bell, the güiro comes in, and
 * the brass plays its moña: trumpets call, trombones answer.
 * Bass, piano and tres keep their tumbao, montuno and guajeo; the tres
 * digs in a little louder.
 */
export const salsaMontuno = definePattern({
  id: 'salsa-montuno-3-2',
  counts: 8,
  bpm: 170,
  chords: PROGRESSION,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_3_2 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', volume: 0.8 },
    { instrument: 'timbales', volume: 0.7 },
    { instrument: 'cowbell', figure: BONGO_BELL, volume: 0.7 },
    { instrument: 'timbalebell', figure: MAMBO_BELL_3_2, volume: 0.6 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.4, muted: true },
    { instrument: 'guiro', figure: GUIRO, volume: 0.6 },
    { instrument: 'bass', figure: BASS_TUMBAO, volume: 0.9 },
    { instrument: 'piano', figure: MONTUNO_3_2, volume: 0.6 },
    { instrument: 'tres', figure: GUAJEO_3_2, volume: 0.6 },
    { instrument: 'trumpet', figure: TRUMPET_MONA_3_2, volume: 0.6 },
    { instrument: 'trombone', figure: TROMBONE_MONA_3_2, volume: 0.6 },
  ],
})

/** The verse in 2-3 clave. */
export const salsaVerse23 = definePattern({
  id: 'salsa-verse-2-3',
  counts: 8,
  bpm: 165,
  chords: PROGRESSION,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_2_3 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', figure: MARTILLO, volume: 0.8 },
    { instrument: 'timbales', figure: CASCARA_2_3, volume: 0.7 },
    { instrument: 'cowbell', volume: 0.7 },
    { instrument: 'timbalebell', volume: 0.7 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.5 },
    { instrument: 'guiro', figure: GUIRO, volume: 0.6, muted: true },
    { instrument: 'bass', figure: BASS_TUMBAO, volume: 0.9 },
    { instrument: 'piano', figure: MONTUNO_2_3, volume: 0.6 },
    { instrument: 'tres', figure: GUAJEO_2_3, volume: 0.5 },
    { instrument: 'trumpet', volume: 0.6 },
    { instrument: 'trombone', volume: 0.6 },
  ],
})

/** The montuno in 2-3 clave. */
export const salsaMontuno23 = definePattern({
  id: 'salsa-montuno-2-3',
  counts: 8,
  bpm: 170,
  chords: PROGRESSION,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_2_3 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', volume: 0.8 },
    { instrument: 'timbales', volume: 0.7 },
    { instrument: 'cowbell', figure: BONGO_BELL, volume: 0.7 },
    { instrument: 'timbalebell', figure: MAMBO_BELL_2_3, volume: 0.6 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.4, muted: true },
    { instrument: 'guiro', figure: GUIRO, volume: 0.6 },
    { instrument: 'bass', figure: BASS_TUMBAO, volume: 0.9 },
    { instrument: 'piano', figure: MONTUNO_2_3, volume: 0.6 },
    { instrument: 'tres', figure: GUAJEO_2_3, volume: 0.6 },
    { instrument: 'trumpet', figure: TRUMPET_MONA_2_3, volume: 0.6 },
    { instrument: 'trombone', figure: TROMBONE_MONA_2_3, volume: 0.6 },
  ],
})

/**
 * Mambo: the instrumental peak of a salsa tune, where the singers step back
 * and the brass takes over. Bells as in the montuno, with the maracas and
 * güiro dropped under the horns; trombones and trumpets both play through
 * the whole cycle, louder than in the moña.
 */
export const salsaMambo = definePattern({
  id: 'salsa-mambo-3-2',
  counts: 8,
  bpm: 175,
  chords: PROGRESSION,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_3_2 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', volume: 0.8 },
    { instrument: 'timbales', volume: 0.7 },
    { instrument: 'cowbell', figure: BONGO_BELL, volume: 0.7 },
    { instrument: 'timbalebell', figure: MAMBO_BELL_3_2, volume: 0.65 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.4, muted: true },
    { instrument: 'guiro', figure: GUIRO, volume: 0.6, muted: true },
    { instrument: 'bass', figure: BASS_TUMBAO, volume: 0.9 },
    { instrument: 'piano', figure: MONTUNO_3_2, volume: 0.5 },
    { instrument: 'tres', figure: GUAJEO_3_2, volume: 0.4, muted: true },
    { instrument: 'trumpet', figure: TRUMPET_MAMBO_3_2, volume: 0.75 },
    { instrument: 'trombone', figure: TROMBONE_MAMBO_3_2, volume: 0.75 },
  ],
})

/** The mambo in 2-3 clave. */
export const salsaMambo23 = definePattern({
  id: 'salsa-mambo-2-3',
  counts: 8,
  bpm: 175,
  chords: PROGRESSION,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_2_3 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', volume: 0.8 },
    { instrument: 'timbales', volume: 0.7 },
    { instrument: 'cowbell', figure: BONGO_BELL, volume: 0.7 },
    { instrument: 'timbalebell', figure: MAMBO_BELL_2_3, volume: 0.65 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.4, muted: true },
    { instrument: 'guiro', figure: GUIRO, volume: 0.6, muted: true },
    { instrument: 'bass', figure: BASS_TUMBAO, volume: 0.9 },
    { instrument: 'piano', figure: MONTUNO_2_3, volume: 0.5 },
    { instrument: 'tres', figure: GUAJEO_2_3, volume: 0.4, muted: true },
    { instrument: 'trumpet', figure: TRUMPET_MAMBO_2_3, volume: 0.75 },
    { instrument: 'trombone', figure: TROMBONE_MAMBO_2_3, volume: 0.75 },
  ],
})

/**
 * Cha-cha-chá, charanga style, over 2-3 son clave. Each count is a real
 * quarter note at ~120 BPM rather than salsa's cut time. The güiro gives
 * the name: long on the beat, two shorts after — the shorts on "4 &" plus
 * the long on "1" are the dancer's "cha-cha-chá". The timbalero keeps
 * quarter notes on the cha-cha bell, clicks the shell on 2 and opens the
 * hembra on 4; congas keep the tumbao. Charangas have no bongó, so no
 * bongo bell either. The bass stays on 1 and 3, and the piano plays the
 * montuno softly. Assembled from common descriptions of the style; check
 * by ear against recordings.
 */
export const salsaChachacha = definePattern({
  id: 'salsa-chachacha-2-3',
  counts: 8,
  bpm: 120,
  chords: PROGRESSION,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_2_3, volume: 0.7 },
    { instrument: 'congas', figure: TUMBAO },
    { instrument: 'bongos', volume: 0.8 },
    { instrument: 'timbales', figure: CHACHACHA_TIMBALES, volume: 0.7 },
    { instrument: 'cowbell', volume: 0.7 },
    { instrument: 'timbalebell', figure: ['open', null], volume: 0.7 },
    { instrument: 'maracas', volume: 0.5 },
    { instrument: 'guiro', figure: GUIRO, volume: 0.8 },
    { instrument: 'bass', figure: BASS_ONE_THREE, volume: 0.9 },
    { instrument: 'piano', figure: MONTUNO_2_3, volume: 0.45 },
    // Charangas have no tres or brass (flute and violins instead)
    { instrument: 'tres', volume: 0.5 },
    { instrument: 'trumpet', volume: 0.6 },
    { instrument: 'trombone', volume: 0.6 },
  ],
})

/**
 * Rumba guaguancó over 3-2 rumba clave — the street rumba that salsa bands
 * quote in "rumba" sections and Cuban casino dancers break into. The three
 * congas are folded onto one track by sound: the segundo (open) keeps to
 * the beat — a muffled slap on 2 and 6, open tones on 4 and 5 — and the
 * tumba (low) answers off the beat on "4 &", "7 &" and 8. The palitos play
 * the guagua pattern on the timbal shell (the figure salsa calls cáscara).
 * The quinto improvises, so it isn't written. Rumba has no bells, bass,
 * piano, tres or brass. A simplified, one-player version of a part that
 * varies between Havana and Matanzas styles: needs sign-off from a rumbero
 * before it's treated as reference.
 */
export const salsaGuaguanco = definePattern({
  id: 'salsa-guaguanco-3-2',
  counts: 8,
  bpm: 190,
  // For the bass and piano if they're switched on.
  chords: PROGRESSION,
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
    { instrument: 'timbalebell', volume: 0.6 },
    // Shekere-like pulse; off by default, rumba is mostly drums and voices
    { instrument: 'maracas', figure: ['hit'], volume: 0.4, muted: true },
    { instrument: 'guiro', volume: 0.6 },
    { instrument: 'bass', volume: 0.9 },
    { instrument: 'piano', volume: 0.6 },
    { instrument: 'tres', volume: 0.5 },
    { instrument: 'trumpet', volume: 0.6 },
    { instrument: 'trombone', volume: 0.6 },
  ],
})

/**
 * Son montuno over 2-3 son clave: the Cuban son that salsa grew out of, as
 * a septeto plays it. Slower than salsa; the bongó keeps the martillo, the
 * maracas every eighth, the tres plays its guajeo and the bass its tumbao.
 * A septeto has no congas, timbales or piano, and its one trumpet improvises
 * over the montuno, so those tracks start muted. Assembled from common
 * descriptions of the style; check by ear against recordings.
 */
export const salsaSon = definePattern({
  id: 'salsa-son-2-3',
  counts: 8,
  bpm: 110,
  chords: PROGRESSION,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_2_3 },
    { instrument: 'congas', figure: TUMBAO, volume: 0.7, muted: true },
    { instrument: 'bongos', figure: MARTILLO, volume: 0.85 },
    { instrument: 'timbales', volume: 0.7 },
    { instrument: 'cowbell', volume: 0.7 },
    { instrument: 'timbalebell', volume: 0.7 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.6 },
    { instrument: 'guiro', volume: 0.6 },
    { instrument: 'bass', figure: BASS_TUMBAO, volume: 0.9 },
    { instrument: 'piano', figure: MONTUNO_2_3, volume: 0.5, muted: true },
    { instrument: 'tres', figure: GUAJEO_2_3, volume: 0.7 },
    { instrument: 'trumpet', volume: 0.6 },
    { instrument: 'trombone', volume: 0.6 },
  ],
})

/**
 * Bolero, the slow romantic song: around 80 BPM, each count a real quarter
 * note. The maracas keep even eighths, the bongó a soft martillo, the
 * congas a light tumbao; the bass marks 1 and 3, and the piano rings the
 * chord on the 1 and pushes it again on 2& — the bolero's lilt. The clave
 * is played softly, as some bolero-son bands do. Assembled from common
 * descriptions of the style; check by ear against recordings.
 */
export const salsaBolero = definePattern({
  id: 'salsa-bolero',
  counts: 8,
  bpm: 80,
  chords: PROGRESSION,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_2_3, volume: 0.5 },
    { instrument: 'congas', figure: TUMBAO, volume: 0.6 },
    { instrument: 'bongos', figure: MARTILLO, volume: 0.6 },
    { instrument: 'timbales', volume: 0.7 },
    { instrument: 'cowbell', volume: 0.7 },
    { instrument: 'timbalebell', volume: 0.7 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.6 },
    { instrument: 'guiro', volume: 0.6 },
    { instrument: 'bass', figure: BASS_ONE_THREE, volume: 0.9 },
    { instrument: 'piano', figure: BOLERO_PIANO, volume: 0.45 },
    { instrument: 'tres', volume: 0.5 },
    { instrument: 'trumpet', volume: 0.6 },
    { instrument: 'trombone', volume: 0.6 },
  ],
})

/**
 * Pachanga: the charanga dance craze of the early 1960s, between cha-cha-chá
 * and salsa in tempo. Like cha-cha-chá it's a charanga sound (no bongó,
 * tres or brass): quarter notes on the timbales bell, the güiro's
 * "cha-cha-chá" figure, the bass on 1 and 3. The congas give it its bounce.
 * Assembled from common descriptions of the style; check by ear against
 * recordings.
 */
export const salsaPachanga = definePattern({
  id: 'salsa-pachanga-2-3',
  counts: 8,
  bpm: 135,
  chords: PROGRESSION,
  tracks: [
    voiceTrack,
    { instrument: 'clave', figure: CLAVE_2_3, volume: 0.7 },
    { instrument: 'congas', figure: PACHANGA_CONGAS },
    { instrument: 'bongos', volume: 0.8 },
    { instrument: 'timbales', figure: CHACHACHA_TIMBALES, volume: 0.6 },
    { instrument: 'cowbell', volume: 0.7 },
    { instrument: 'timbalebell', figure: ['open', null], volume: 0.7 },
    { instrument: 'maracas', volume: 0.5 },
    { instrument: 'guiro', figure: GUIRO, volume: 0.7 },
    { instrument: 'bass', figure: BASS_ONE_THREE, volume: 0.9 },
    { instrument: 'piano', figure: MONTUNO_2_3, volume: 0.5 },
    { instrument: 'tres', volume: 0.5 },
    { instrument: 'trumpet', volume: 0.6 },
    { instrument: 'trombone', volume: 0.6 },
  ],
})

/**
 * For dancers "on 2": the voice says only "2" and "6", the break steps,
 * and the congas lead the band at full volume — their slap lands on the
 * same counts. Everything else is the verse, pulled back so the tumbao
 * stands out.
 */
export const salsaOn2 = definePattern({
  id: 'salsa-on2-3-2',
  counts: 8,
  bpm: 165,
  chords: PROGRESSION,
  tracks: [
    {
      instrument: 'voice',
      figure: [
        null, null, 'count', null, null, null, null, null,
        null, null, 'count', null, null, null, null, null,
      ],
      volume: 0.9,
    },
    { instrument: 'clave', figure: CLAVE_3_2, volume: 0.7 },
    { instrument: 'congas', figure: TUMBAO, volume: 1 },
    { instrument: 'bongos', figure: MARTILLO, volume: 0.5 },
    { instrument: 'timbales', figure: CASCARA_3_2, volume: 0.4 },
    { instrument: 'cowbell', volume: 0.7 },
    { instrument: 'timbalebell', volume: 0.7 },
    { instrument: 'maracas', figure: ['hit'], volume: 0.4 },
    { instrument: 'guiro', figure: GUIRO, volume: 0.6, muted: true },
    { instrument: 'bass', figure: BASS_TUMBAO, volume: 0.7 },
    { instrument: 'piano', figure: MONTUNO_3_2, volume: 0.4 },
    { instrument: 'tres', figure: GUAJEO_3_2, volume: 0.35 },
    { instrument: 'trumpet', volume: 0.6 },
    { instrument: 'trombone', volume: 0.6 },
  ],
})

export const salsaPresets = [
  salsaVerse,
  salsaMontuno,
  salsaMambo,
  salsaVerse23,
  salsaMontuno23,
  salsaMambo23,
  salsaOn2,
  salsaSon,
  salsaBolero,
  salsaChachacha,
  salsaPachanga,
  salsaGuaguanco,
]

/** The clave each preset is in: only sections in the same clave go in one song. */
export const salsaClave: Record<string, string> = {
  'salsa-verse-3-2': 'son-3-2',
  'salsa-montuno-3-2': 'son-3-2',
  'salsa-mambo-3-2': 'son-3-2',
  'salsa-verse-2-3': 'son-2-3',
  'salsa-montuno-2-3': 'son-2-3',
  'salsa-mambo-2-3': 'son-2-3',
  'salsa-on2-3-2': 'son-3-2',
  'salsa-son-2-3': 'son-2-3',
  'salsa-bolero': 'son-2-3',
  'salsa-chachacha-2-3': 'son-2-3',
  'salsa-pachanga-2-3': 'son-2-3',
  'salsa-guaguanco-3-2': 'rumba-3-2',
}
