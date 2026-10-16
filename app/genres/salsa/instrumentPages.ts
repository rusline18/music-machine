import type { InstrumentPage } from '../types'
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
  RUMBA_CLAVE_3_2,
  TROMBONE_MAMBO_3_2,
  TROMBONE_MONA_3_2,
  TRUMPET_MAMBO_3_2,
  TRUMPET_MONA_3_2,
  TUMBAO,
  TUMBAO_OPEN,
  TUMBAO_SLAP_OPEN,
} from './figures'
import {
  salsaBolero,
  salsaChachacha,
  salsaGuaguanco,
  salsaMambo,
  salsaMontuno,
  salsaMontuno23,
  salsaSon,
  salsaVerse23,
} from './patterns'

/**
 * Every instrument has a page of its own. Each rhythm plays over the
 * preset it's heard in: the verse unless said otherwise.
 */
export const salsaInstrumentPages: Record<string, InstrumentPage> = {
  clave: {
    variants: [
      { id: 'son-3-2', figure: CLAVE_3_2 },
      { id: 'son-2-3', figure: CLAVE_2_3, band: salsaVerse23.id },
      { id: 'rumba-3-2', figure: RUMBA_CLAVE_3_2, band: salsaGuaguanco.id },
    ],
  },
  congas: {
    variants: [
      { id: 'tumbao', figure: TUMBAO },
      { id: 'slap-open', figure: TUMBAO_SLAP_OPEN },
      { id: 'open', figure: TUMBAO_OPEN },
    ],
  },
  bongos: {
    variants: [
      { id: 'martillo', figure: MARTILLO },
      { id: 'bolero', figure: MARTILLO, band: salsaBolero.id },
    ],
  },
  // The bells come in with the montuno, when the bongocero and the
  // timbalero put down their drums for them.
  cowbell: {
    variants: [
      { id: 'bongo-bell', figure: BONGO_BELL, band: salsaMontuno.id },
    ],
  },
  timbalebell: {
    variants: [
      { id: 'mambo-3-2', figure: MAMBO_BELL_3_2, band: salsaMontuno.id },
      { id: 'mambo-2-3', figure: MAMBO_BELL_2_3, band: salsaMontuno23.id },
      { id: 'chachacha', figure: ['open', null], band: salsaChachacha.id },
    ],
  },
  guiro: {
    variants: [
      { id: 'montuno', figure: GUIRO, band: salsaMontuno.id },
      { id: 'chachacha', figure: GUIRO, band: salsaChachacha.id },
    ],
  },
  timbales: {
    variants: [
      { id: 'cascara-3-2', figure: CASCARA_3_2 },
      { id: 'cascara-2-3', figure: CASCARA_2_3, band: salsaVerse23.id },
      { id: 'chachacha', figure: CHACHACHA_TIMBALES, band: salsaChachacha.id },
    ],
  },
  maracas: {
    variants: [
      { id: 'eighths', figure: ['hit'] },
      { id: 'son', figure: ['hit'], band: salsaSon.id },
    ],
  },
  bass: {
    variants: [
      { id: 'tumbao', figure: BASS_TUMBAO },
      { id: 'one-three', figure: BASS_ONE_THREE, band: salsaChachacha.id },
    ],
  },
  piano: {
    variants: [
      { id: 'montuno-3-2', figure: MONTUNO_3_2 },
      { id: 'montuno-2-3', figure: MONTUNO_2_3, band: salsaVerse23.id },
      { id: 'bolero', figure: BOLERO_PIANO, band: salsaBolero.id },
    ],
  },
  tres: {
    variants: [
      { id: 'guajeo-3-2', figure: GUAJEO_3_2 },
      { id: 'son', figure: GUAJEO_2_3, band: salsaSon.id },
    ],
  },
  trumpet: {
    variants: [
      { id: 'mona', figure: TRUMPET_MONA_3_2, band: salsaMontuno.id },
      { id: 'mambo', figure: TRUMPET_MAMBO_3_2, band: salsaMambo.id },
    ],
  },
  trombone: {
    variants: [
      { id: 'mona', figure: TROMBONE_MONA_3_2, band: salsaMontuno.id },
      { id: 'mambo', figure: TROMBONE_MAMBO_3_2, band: salsaMambo.id },
    ],
  },
}
