import type { Step, TrackSpec } from '~/core/pattern'
import { chainPatterns, definePattern } from '~/core/pattern'
import { voiceTrack } from '../voice'

// Figures are eighth notes: a bar is 8 cells (counts 1–4), an 8-count block
// 16. Each section is one block, like salsa's, over the two-bar i–V loop
// (Am–E). Every part repeats each block, so Counts can stretch it, and the
// chord picker can turn it into the longer i–iv–V–i (Am Dm E Am). Built
// from documented references, but still needs sign-off from a bachata
// musician.

const PROGRESSION = ['Am', 'E']

/** Güira: long scrape on the beat, short on the & */
const GUIRA: Step[] = ['long', 'short']
/** Bass (one bar): root on 1 and 3, fifth on 2& and 4 */
const BASS: Step[] = ['root', null, null, '5th', 'root', null, '5th', null]
/** Segunda (one bar): alternating bass, treble arpeggios, a muted chuck on 4 */
const SEGUNDA: Step[] = ['bass', 'chord', 'chord', 'chord', '5th', 'chord', 'mute', 'chord']

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
 * Derecho (verse): bongo martillo — eighths on the macho, hembra on 4 and
 * 8 — and the güira on every eighth. The requinto stays out of the singer's
 * way and only answers with a pickup run on 7 & 8 &.
 */
export const bachataDerecho = bachataSection({
  id: 'bachata-derecho',
  guira: { instrument: 'guira', figure: GUIRA, volume: 0.8 },
  bongos: { instrument: 'bongos', figure: ['high', 'high', 'high', 'high', 'high', 'high', 'low', 'high'] },
  requinto: {
    instrument: 'requinto',
    figure: [
      null, null, null, null, null, null, null, null,
      null, null, null, null, 'root', '3rd', '5th', '3rd',
    ],
    volume: 0.8,
  },
})

/**
 * Majao (usually the chorus): a step up in energy. The bongo leaves the
 * even martillo for a syncopated bar — a slap on 1&, open hembra tones
 * through 3, 4 and 4& — the güira digs in harder, and the requinto answers
 * the singers: a dyad on 4, then a run down on 7 & 8 &. This one especially
 * needs a bachata musician's ear.
 */
export const bachataMajao = bachataSection({
  id: 'bachata-majao',
  guira: { instrument: 'guira', figure: GUIRA, volume: 0.95 },
  bongos: { instrument: 'bongos', figure: ['high', 'slap', 'high', 'high', 'low', 'high', 'low', 'low'] },
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
 * Mambo (the instrumental climax): the bongo player puts the bongos down
 * and picks up the campana — open on 1 and 3, neck on 2 and 4; the bell is
 * how dancers recognize the mambo. The güira scrapes long on every eighth,
 * and the requinto repeats a riff: a dyad, a run down, a turn back up.
 */
export const bachataMambo = bachataSection({
  id: 'bachata-mambo',
  guira: { instrument: 'guira', figure: ['long'] },
  campana: { instrument: 'campana', figure: ['open', null, 'neck', null], volume: 0.8 },
  requinto: { instrument: 'requinto', figure: ['dyad', '5th', '3rd', 'root', '3rd', '5th', 'dyad', null], volume: 0.9 },
})

export const bachataPresets = [
  bachataDerecho,
  bachataMajao,
  bachataMambo,
  chainPatterns('bachata-derecho-majao', bachataDerecho, bachataMajao),
]
