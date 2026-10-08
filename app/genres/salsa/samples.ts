import type { SampleMap } from '~/core/resolve'

/**
 * Sample maps for the Salsa instruments, in grid order.
 * Paths point into /public/audio/salsa, built by `npm run samples` (which
 * reads the paths from this file). A list of paths is several takes of the
 * same stroke, played in turn.
 */
export const salsaSamples: Record<string, SampleMap> = {
  clave: {
    hit: '/audio/salsa/clave/hit.wav',
  },
  congas: {
    low: '/audio/salsa/congas/low.wav',
    slap: '/audio/salsa/congas/slap.wav',
    open: '/audio/salsa/congas/open.wav',
  },
  bongos: {
    low: ['/audio/salsa/bongos/low.wav', '/audio/salsa/bongos/low-2.wav'],
    high: ['/audio/salsa/bongos/high.wav', '/audio/salsa/bongos/high-2.wav'],
    slap: ['/audio/salsa/bongos/slap.wav', '/audio/salsa/bongos/slap-2.wav'],
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
