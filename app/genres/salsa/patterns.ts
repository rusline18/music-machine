import type { Pattern, Step } from '~/core/pattern'
import { chainPatterns, definePattern, rotateFigure } from '~/core/pattern'
import { voiceTrack } from '../voice'

// Figures are eighth notes; one 8-count block = one two-bar clave cycle
// (cells 0–7 = counts 1–4, cells 8–15 = counts 5–8). Built from documented
// references, but still needs sign-off from a salsa player. The clave is the
// anchor: every part that isn't the same in both bars (cáscara, bells,
// piano, tres, brass) is written for 3-2 and turned with the clave for 2-3.

/** I–V7, a chord per bar; bass and piano follow it. */
const PROGRESSION = ['C', 'G7']

/** 3-2 son clave: 1, &2, 4 | 2, 3 */
const CLAVE_3_2: Step[] = [
  'hit', null, null, 'hit', null, null, 'hit', null,
  null, null, 'hit', null, 'hit', null, null, null,
]
/**
 * Tumbao (one bar), the full hand pattern: heel and toe rock on the drum
 * through 1 and 3, slap on 2, open tones on 4 and &4.
 */
const TUMBAO: Step[] = ['heel', 'toe', 'slap', 'toe', 'heel', 'toe', 'open', 'open']
/** Martillo (one bar): eighths on the macho, hembra on 4 */
const MARTILLO: Step[] = ['high', 'high', 'high', 'high', 'high', 'high', 'low', null]
/** Cáscara (3-2) on the timbal shell */
const CASCARA_3_2: Step[] = [
  'rim', null, 'rim', null, 'rim', 'rim', null, 'rim',
  null, 'rim', 'rim', null, 'rim', null, 'rim', null,
]
/**
 * Mambo bell (3-2) on the timbales bell: the mouth on every beat, the neck
 * on the cáscara's off-beat strokes, so the bell keeps the clave's shape.
 */
const MAMBO_BELL_3_2: Step[] = CASCARA_3_2.map((step, i) => (i % 2 === 0 ? 'open' : step && 'neck'))
/** Bongo bell (one count): the mouth on the beat, the neck on the &. */
const BONGO_BELL: Step[] = ['hit', 'neck']
/** Güiro (one count): long on the beat, two short scrapes after */
const GUIRO: Step[] = ['long', null, 'short', 'short']
/**
 * Bass tumbao (one bar): the fifth on &2, then the next bar's root on 4,
 * held over the bar line — the bass doesn't play the 1.
 */
const BASS_TUMBAO: Step[] = [null, null, null, '5th', null, null, 'push', null]
/**
 * Piano montuno (3-2): octaves on the chord tones over short chord stabs,
 * the next chord pushed on &4 of each bar and left ringing over the 1.
 */
const MONTUNO_3_2: Step[] = [
  null, 'chord', '3rd', null, 'chord', '5th', null, 'push',
  null, 'chord', 'root', 'chord', null, '3rd', 'chord', 'push',
]
/**
 * Tres guajeo (3-2): single notes and thirds in the gaps the piano leaves,
 * the same push on &4 as the bass and piano, and no downbeat after it.
 */
const GUAJEO_3_2: Step[] = [
  null, '5th', 'dyad', null, '3rd', 'dyad', 'root', 'push',
  null, '3rd', null, 'dyad', '5th', null, 'dyad', 'push',
]
/**
 * Brass moña (3-2), call and response over the two bars: the trumpets play
 * a riff on the 3 side ending in a push, the trombones answer on the 2
 * side with stabs and their own push into the next cycle.
 */
const TRUMPET_MONA_3_2: Step[] = [
  null, '5th', null, '3rd', null, '5th', '3rd', 'push',
  null, null, null, null, null, null, null, null,
]
const TROMBONE_MONA_3_2: Step[] = [
  null, null, null, null, null, null, null, null,
  null, 'hit', null, 'hit', 'root', null, '5th', 'push',
]
/**
 * Mambo section (3-2): the arranged brass break, both sections at once.
 * The trombones lock into a riff that runs through both bars, pushing on &4;
 * over it the trumpets punch out the clave itself — 2& and 4, then 6 and
 * 7 — and push into the next cycle.
 */
const TROMBONE_MAMBO_3_2: Step[] = [
  null, 'root', null, '3rd', '5th', null, '3rd', 'push',
  null, 'root', null, '3rd', null, '5th', null, 'push',
]
const TRUMPET_MAMBO_3_2: Step[] = [
  null, null, null, 'hit', null, null, 'hit', null,
  null, null, 'hit', null, 'hit', null, null, 'push',
]
/** Timbales fill (the last two counts of a block): macho, then down to the hembra. */
const TIMBALES_FILL: Step[] = ['high', 'high', 'high', 'low']

// 2-3 is the same two-bar cycle started from the other bar. Only the parts
// that follow the clave turn; tumbao, martillo, bongo bell and bass repeat
// every bar, and the voice keeps counting from the dancer's 1.
/** 2-3 son clave: 2, 3 | 1, &2, 4 */
const CLAVE_2_3 = rotateFigure(CLAVE_3_2, 8)
/** Cáscara (2-3) */
const CASCARA_2_3 = rotateFigure(CASCARA_3_2, 8)
/** Mambo bell (2-3) */
const MAMBO_BELL_2_3 = rotateFigure(MAMBO_BELL_3_2, 8)
/** Piano montuno (2-3) */
const MONTUNO_2_3 = rotateFigure(MONTUNO_3_2, 8)
/** Tres guajeo (2-3) */
const GUAJEO_2_3 = rotateFigure(GUAJEO_3_2, 8)
/** Brass moña (2-3) */
const TRUMPET_MONA_2_3 = rotateFigure(TRUMPET_MONA_3_2, 8)
const TROMBONE_MONA_2_3 = rotateFigure(TROMBONE_MONA_3_2, 8)
/** Mambo section (2-3) */
const TRUMPET_MAMBO_2_3 = rotateFigure(TRUMPET_MAMBO_3_2, 8)
const TROMBONE_MAMBO_2_3 = rotateFigure(TROMBONE_MAMBO_3_2, 8)
/** 3-2 rumba clave: like son clave, but the third stroke moves from 4 to &4. */
const RUMBA_CLAVE_3_2: Step[] = [
  'hit', null, null, 'hit', null, null, null, 'hit',
  null, null, 'hit', null, 'hit', null, null, null,
]

/**
 * The same block with `instrument`'s last steps replaced by `ending` — a
 * fill that leads into the next section.
 */
function endWith(pattern: Pattern, instrument: string, ending: Step[]): Pattern {
  return {
    ...pattern,
    tracks: pattern.tracks.map((track) => track.instrument !== instrument
      ? track
      : { ...track, steps: [...track.steps.slice(0, -ending.length), ...ending], muted: false }),
  }
}

/** Verse feel in 3-2 son clave: tumbao, martillo, cáscara, bass, piano montuno and tres guajeo. */
export const salsaVerse = definePattern({
  id: 'salsa-verse-3-2',
  counts: 8,
  bpm: 180,
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
  bpm: 190,
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
  bpm: 180,
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
  bpm: 190,
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
  bpm: 195,
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
  bpm: 195,
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
    // Shell click on 2, open hembra on 4
    { instrument: 'timbales', figure: [null, null, 'rim', null, null, null, 'low', null], volume: 0.7 },
    { instrument: 'cowbell', volume: 0.7 },
    { instrument: 'timbalebell', figure: ['open', null], volume: 0.7 },
    { instrument: 'maracas', volume: 0.5 },
    { instrument: 'guiro', figure: GUIRO, volume: 0.8 },
    { instrument: 'bass', figure: ['root', null, null, null, '5th', null, null, null], volume: 0.9 },
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

// Going into the montuno, the timbalero ends the verse with a fill.
export const salsaPresets = [
  salsaVerse,
  salsaMontuno,
  salsaMambo,
  chainPatterns('salsa-verse-montuno', endWith(salsaVerse, 'timbales', TIMBALES_FILL), salsaMontuno),
  salsaVerse23,
  salsaMontuno23,
  salsaMambo23,
  chainPatterns('salsa-verse-montuno-2-3', endWith(salsaVerse23, 'timbales', TIMBALES_FILL), salsaMontuno23),
  salsaChachacha,
  salsaGuaguanco,
]
