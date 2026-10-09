/**
 * How each instrument's icon moves when it plays: a short Web Animations
 * keyframe list, transform and opacity only (no layout, no paint of the
 * rest of the page). Keyed by instrument id; tests/icons.test.ts checks
 * every instrument has one.
 */
export interface Motion {
  keyframes: Keyframe[]
  /** Where the icon pivots, e.g. a bell swings from its handle. */
  origin?: string
}

/** A drum skin struck: a quick squash and bounce. */
const thump: Motion = {
  keyframes: [{ transform: 'scale(1.25, 0.85)' }, { transform: 'scale(0.95, 1.05)' }, { transform: 'none' }],
  origin: '50% 100%',
}
/** A scraper: the stick runs along the ridges. */
const scrape: Motion = {
  keyframes: [{ transform: 'translateX(-2px)' }, { transform: 'translateX(2px)' }, { transform: 'translateX(-1px)' }, { transform: 'none' }],
}
/** Sticks struck: a bright flash. */
const flash: Motion = {
  keyframes: [{ transform: 'scale(1.3)', opacity: 1 }, { transform: 'none', opacity: 0.7 }, { opacity: 1 }],
}
/** A bell swinging from its handle. */
const swing: Motion = {
  keyframes: [{ transform: 'rotate(-14deg)' }, { transform: 'rotate(8deg)' }, { transform: 'none' }],
  origin: '50% 0',
}
/** Shakers. */
const shake: Motion = {
  keyframes: [{ transform: 'rotate(-8deg)' }, { transform: 'rotate(6deg)' }, { transform: 'none' }],
  origin: '50% 100%',
}
/** A plucked string: a short wobble. */
const pluck: Motion = {
  keyframes: [{ transform: 'scale(1.15) rotate(-4deg)' }, { transform: 'none' }],
}
/** The voice: a nod. */
const nod: Motion = {
  keyframes: [{ transform: 'translateY(-2px) scale(1.1)' }, { transform: 'none' }],
}

export const INSTRUMENT_MOTION: Record<string, Motion> = {
  voice: nod,
  clave: flash,
  congas: thump,
  bongos: thump,
  timbales: thump,
  cowbell: swing,
  campana: swing,
  timbalebell: swing,
  maracas: shake,
  guiro: scrape,
  guira: scrape,
  bass: pluck,
  piano: pluck,
  tres: pluck,
  trumpet: flash,
  trombone: flash,
  requinto: pluck,
  segunda: pluck,
}

/** The count box pulsing on a beat; 1 and 5, where the halves of the phrase start, harder. */
export function countPulse(strong: boolean): Keyframe[] {
  return [{ transform: `scale(${strong ? 1.18 : 1.08})` }, { transform: 'none' }]
}
