/**
 * Sample maps for the Bachata instrument set (plan section 4).
 * Paths point into /public/audio/bachata, built by `npm run samples`.
 */
export const BACHATA_INSTRUMENTS = [
  'guira',
  'bongos',
  'bass',
  'requinto',
  'segunda',
] as const

export type BachataInstrument = (typeof BACHATA_INSTRUMENTS)[number]

export const bachataSamples: Record<BachataInstrument, Record<string, string>> = {
  guira: {
    short: '/audio/bachata/guira/short.wav',
    long: '/audio/bachata/guira/long.wav',
  },
  bongos: {
    low: '/audio/bachata/bongos/low.wav',
    high: '/audio/bachata/bongos/high.wav',
    slap: '/audio/bachata/bongos/slap.wav',
  },
  bass: {
    hit: '/audio/bachata/bass/hit.wav',
  },
  requinto: {
    hit: '/audio/bachata/requinto/hit.wav',
  },
  segunda: {
    hit: '/audio/bachata/segunda/hit.wav',
  },
}
