/**
 * Sample maps for the Salsa instrument set (plan section 4).
 * Paths point into /public/audio/salsa — files are not included yet; see
 * plan section 3/5 (sample sourcing & licensing) before dropping audio in.
 */
export const SALSA_INSTRUMENTS = [
  'clave',
  'congas',
  'bongos',
  'timbales',
  'cowbell',
  'maracas',
  'guiro',
] as const

export type SalsaInstrument = (typeof SALSA_INSTRUMENTS)[number]

export const salsaSamples: Record<SalsaInstrument, Record<string, string>> = {
  clave: {
    hit: '/audio/salsa/clave/hit.wav',
  },
  congas: {
    low: '/audio/salsa/congas/low.wav',
    slap: '/audio/salsa/congas/slap.wav',
    open: '/audio/salsa/congas/open.wav',
  },
  bongos: {
    low: '/audio/salsa/bongos/low.wav',
    high: '/audio/salsa/bongos/high.wav',
    slap: '/audio/salsa/bongos/slap.wav',
  },
  timbales: {
    low: '/audio/salsa/timbales/low.wav',
    high: '/audio/salsa/timbales/high.wav',
    rim: '/audio/salsa/timbales/rim.wav',
  },
  cowbell: {
    hit: '/audio/salsa/cowbell/hit.wav',
  },
  maracas: {
    hit: '/audio/salsa/maracas/hit.wav',
  },
  guiro: {
    short: '/audio/salsa/guiro/short.wav',
    long: '/audio/salsa/guiro/long.wav',
  },
}
