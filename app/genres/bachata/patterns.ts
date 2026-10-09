import type { Step, TrackSpec } from '~/core/pattern'
import { chainPatterns, definePattern } from '~/core/pattern'
import { voiceTrack } from '../voice'

// Figures are eighth notes: a bar is 8 cells (counts 1–4), an 8-count block
// 16. Each section is one block, like salsa's, over the two-bar i–V loop
// (Am–E). Every part repeats each block, so Counts can stretch it, and the
// chord picker can turn it into the longer i–iv–V–i (Am Dm E Am).
//
// Checked against written breakdowns — see docs/bachata-rhythms.md for each
// part, its sources and what is still unconfirmed. Still needs sign-off
// from a bachata musician by ear.

const PROGRESSION = ['Am', 'E']

/** Güira, derecho: every eighth, evenly — short strokes */
const GUIRA_DERECHO: Step[] = ['short']
/** Bass (one bar): root on 1 and 3, fifth on 2& and 4 */
const BASS: Step[] = ['root', null, null, '5th', 'root', null, '5th', null]
/**
 * Segunda (one bar): a bass note on 1, 3 and 4 following the bass guitar
 * (minus its 2& pickup), strums on every eighth in between
 */
const SEGUNDA: Step[] = ['bass', 'chord', 'chord', 'chord', 'bass', 'chord', '5th', 'chord']

/** The parts that change between sections; bongos and campana are silent if left out. */
interface SectionSpec {
  id: string
  guira: TrackSpec
  bongos?: TrackSpec
  campana?: TrackSpec
  requinto: TrackSpec
}

/** Bass and segunda keep the same rhythm through every section. */
function bachataSection(spec: SectionSpec) {
  return definePattern({
    id: spec.id,
    counts: 8,
    bpm: 130,
    chords: PROGRESSION,
    tracks: [
      voiceTrack,
      spec.guira,
      spec.bongos ?? { instrument: 'bongos' },
      spec.campana ?? { instrument: 'campana', volume: 0.8 },
      { instrument: 'bass', figure: BASS },
      spec.requinto,
      { instrument: 'segunda', figure: SEGUNDA, volume: 0.6 },
    ],
  })
}

/**
 * Derecho (verse): bongo martillo — every eighth on the macho, the hembra
 * on 4 (and 8) — and the güira on every eighth, evenly. The requinto plays
 * a chord arpeggio up and down, one note per eighth.
 */
export const bachataDerecho = bachataSection({
  id: 'bachata-derecho',
  guira: { instrument: 'guira', figure: GUIRA_DERECHO, volume: 0.8 },
  bongos: { instrument: 'bongos', figure: ['high', 'high', 'high', 'high', 'high', 'high', 'low', 'high'] },
  requinto: { instrument: 'requinto', figure: ['root', '3rd', '5th', '3rd'], volume: 0.6 },
})

/**
 * Majao (usually the chorus): the bongo and güira drop the upbeats. The
 * bongo plays only the four beats — 1, 2, 3 on the macho, the hembra still
 * on 4 — and the güira scrapes long on each beat. The requinto answers the
 * singers: a dyad on 4, then a run down on 7 & 8 & (unconfirmed).
 */
export const bachataMajao = bachataSection({
  id: 'bachata-majao',
  guira: { instrument: 'guira', figure: ['long', null], volume: 0.95 },
  bongos: { instrument: 'bongos', figure: ['high', null, 'high', null, 'high', null, 'low', null] },
  requinto: {
    instrument: 'requinto',
    figure: [
      null, null, null, null, null, null, 'dyad', null,
      null, null, null, null, 'dyad', '5th', '3rd', 'root',
    ],
    volume: 0.8,
  },
})

/**
 * Mambo (the instrumental climax): the güira plays its strict mambo figure
 * — 1, 2&, 3, 4& — and the requinto takes the lead with a repeating riff.
 * The bongo player picks up the campana (its rhythm here — open on 1 and 3,
 * neck on 2 and 4 — is unconfirmed).
 */
export const bachataMambo = bachataSection({
  id: 'bachata-mambo',
  guira: { instrument: 'guira', figure: ['long', null, null, 'short', 'long', null, null, 'short'] },
  campana: { instrument: 'campana', figure: ['open', null, 'neck', null], volume: 0.8 },
  requinto: { instrument: 'requinto', figure: ['dyad', '5th', '3rd', 'root', '3rd', '5th', 'dyad', null], volume: 0.9 },
})

export const bachataPresets = [
  bachataDerecho,
  bachataMajao,
  bachataMambo,
  chainPatterns('bachata-derecho-majao', bachataDerecho, bachataMajao),
]
