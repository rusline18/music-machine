/**
 * How each instrument's icon moves when it plays, as Web Animations
 * keyframes on transform only (no layout, no paint of the rest of the page).
 * Keyed by instrument id; tests/icons.test.ts checks every instrument has
 * one.
 *
 * The motions are physical rather than hand-keyed: a hit gives a part a
 * kick, and it then rings at its own frequency and dies away, like the
 * instrument does. Each curve is sampled into dense keyframes played with
 * linear easing, and hits are added on top of the ones still ringing
 * (`composite: 'add'` in useBeatEffects), so a fast run swings harder
 * instead of snapping back to the start.
 */
export interface Motion {
  /** How long the hit rings, ms; the same at any tempo. */
  duration: number
  /** The whole icon. */
  keyframes: Keyframe[]
  /** Where the whole icon pivots, e.g. a bell swings from its handle. */
  origin?: string
  /** The accent layer (ICON_ACCENTS): the part that sounds or strikes. */
  accent: Keyframe[]
  /** Where the accent pivots, in its own box; the center when unset. */
  accentOrigin?: string
  /** The line layer alone, for parts that move against the accent (the held clave). */
  base?: Keyframe[]
  /** The gap cut around the accent (ICON_ACCENTS `gap`): follows it and closes on contact. Played over, not added. */
  gap?: Keyframe[]
  /** The flash where the parts meet (ICON_ACCENTS `spark`), from hidden to hidden; its own duration and center in viewBox px. */
  spark?: { keyframes: Keyframe[], duration: number, origin: string }
  /** How the strings (ICON_ACCENTS `strings`) vibrate: see stringFrames. */
  strum?: Strum
}

/** A strum across the strings: each is plucked `stagger` ms after the one before, swings `amp` and rings at f Hz. */
export interface Strum {
  f: number
  tau: number
  /** How far the curve's control point swings, viewBox px; the middle of the string moves half that. */
  amp: number
  stagger: number
}

// `px` inside the SVG are viewBox units, so 2px is 2/24 of the icon.

const TAU = Math.PI * 2

/** An impulse response: starts at rest with speed (a skin pushed in), rings at f Hz, decays with tau ms. */
function kick(t: number, f: number, tau: number) {
  return Math.exp(-t / tau) * Math.sin(TAU * f * t / 1000)
}

/** The same, starting displaced (a stick at the point of contact). */
function release(t: number, f: number, tau: number) {
  return Math.exp(-t / tau) * Math.cos(TAU * f * t / 1000)
}

/** Few digits: these strings end up in every keyframe. */
function n(x: number) {
  return Math.round(x * 1000) / 1000
}

/** Samples a transform over `duration` ms, about one keyframe per frame, ending at rest. */
function sample(duration: number, transform: (t: number) => string): Keyframe[] {
  const count = Math.max(24, Math.round(duration / 16))
  return Array.from({ length: count + 1 }, (_, i) => ({
    offset: i / count,
    transform: i === count ? 'none' : transform(duration * i / count),
  }))
}

/** Ease in and out over 0–1. */
function smooth(q: number) {
  return q * q * (3 - 2 * q)
}

/** A drum: the skin ripples fast, the shell squashes slower, keeping its volume. */
function drum(skin: { f: number, tau: number, depth: number }, shell: { f: number, tau: number }, duration: number): Motion {
  return {
    duration,
    keyframes: sample(duration, (t) => {
      const k = 0.1 * kick(t, shell.f, shell.tau)
      return `scale(${n(1 + k * 0.6)}, ${n(1 - k)})`
    }),
    origin: '50% 100%',
    accent: sample(duration, (t) => {
      const k = skin.depth * kick(t, skin.f, skin.tau)
      return `scale(${n(1 + k * 0.12)}, ${n(1 - k)})`
    }),
  }
}

/** A plucked string: the strings are strummed, the body breathes at the note, the instrument rocks once. */
function plucked(body: { f: number, tau: number }, rock: { deg: number, f: number, tau: number }, strum: Strum, duration: number): Motion {
  return {
    duration,
    keyframes: sample(duration, (t) => `rotate(${n(rock.deg * kick(t, rock.f, rock.tau))}deg)`),
    origin: '50% 85%',
    // Softer than before the strings: they carry the hit now.
    accent: sample(duration, (t) => `scale(${n(1 + 0.05 * kick(t, body.f, body.tau))})`),
    strum,
  }
}

/**
 * The `values` of a string's SMIL <animate> on `d`: the string `[x, top,
 * bottom]` bowed by a released pluck, sampled every ~20 ms over `duration`.
 * SMIL rather than Web Animations: Safari can't animate `d` any other way.
 * String `index` is plucked `stagger` ms after the first; all end straight.
 */
export function stringFrames(strum: Strum, [x, top, bottom]: readonly [number, number, number], index: number, duration: number): string {
  const mid = n((top + bottom) / 2)
  const count = Math.round(duration / 20)
  const delay = index * strum.stagger
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = duration * i / count
    const bow = i === count || t < delay ? 0 : strum.amp * release(t - delay, strum.f, strum.tau)
    return `M${x} ${top}Q${n(x + bow)} ${mid} ${x} ${bottom}`
  }).join(';')
}

/** Brass: a push back from the lips; the bell swells with the breath (soft attack) and a little vibrato. */
function brass(push: number, duration: number): Motion {
  return {
    duration,
    keyframes: sample(duration, (t) => `translateX(${n(-push * kick(t, 3.5, 140))}%)`),
    origin: '0 50%',
    accent: sample(duration, (t) => {
      const breath = (1 - Math.exp(-t / 35)) * Math.exp(-t / 230)
      return `scale(${n(1 + 0.3 * breath * (1 + 0.25 * Math.sin(TAU * 7 * t / 1000)))})`
    }),
  }
}

/** A scraper: sweeps `length` along `axis` catching on each ridge, then springs home. */
function scrape(axis: 'x' | 'y', length: number, ridges: number, duration: number): Motion {
  const sweep = 0.55
  return {
    duration,
    keyframes: sample(duration, (t) => {
      const q = Math.min(1, t / duration / sweep)
      return `rotate(${n(1.2 * Math.sin(TAU * ridges * q) * (1 - q))}deg)`
    }),
    accent: sample(duration, (t) => {
      let along = length * release(t - sweep * duration, 4, 70)
      let across = 0
      if (t < sweep * duration) {
        const q = t / duration / sweep
        along = length * (smooth(q) - 0.03 * Math.sin(TAU * ridges * q))
        across = -0.45 * Math.abs(Math.sin(Math.PI * ridges * q))
      }
      return axis === 'x' ? `translate(${n(along)}px, ${n(across)}px)` : `translate(${n(across)}px, ${n(along)}px)`
    }),
  }
}

/** A bell: swings from `origin`, its mouth shimmering at a high pitch. */
function bell(swing: { deg: number, f: number, tau: number }, origin: string, mouth: (k: number) => string, ring: { f: number, tau: number }, duration: number): Motion {
  return {
    duration,
    keyframes: sample(duration, (t) => `rotate(${n(swing.deg * kick(t, swing.f, swing.tau))}deg)`),
    origin,
    accent: sample(duration, (t) => mouth(kick(t, ring.f, ring.tau))),
  }
}

/**
 * The claves, struck crosswise: they rest as an X with the striker (accent)
 * raised off the held stick — a gap cut around it shows the held one passing
 * under. On the hit the striker is already down on it: the gap closes, a
 * spark flashes where they cross, they stay together CLAVE_HOLD ms (that
 * pause is what reads as a blow rather than a twitch), then the striker
 * bounces up past its rest and settles. 1 = down on the held stick.
 */
const CLAVE_HOLD = 60
function claveDown(t: number) {
  return t < CLAVE_HOLD ? 1 : release(t - CLAVE_HOLD, 4, 150)
}
/** The striker's move toward the held stick, at `down`. */
function claveStrike(down: number) {
  return `translate(${n(0.9 * down)}px, ${n(1.6 * down)}px)`
}

const clave: Motion = {
  duration: 700,
  // The pair shivers on contact.
  keyframes: sample(700, (t) => `rotate(${n(1.5 * kick(t, 12, 60))}deg)`),
  accent: sample(700, (t) => claveStrike(claveDown(t))),
  // The held stick gives under the blow and rings.
  base: sample(700, (t) => {
    const give = kick(t, 9, 70)
    return `translate(${n(0.5 * give)}px, ${n(0.85 * give)}px) rotate(${n(2.5 * kick(t, 19, 75))}deg)`
  }),
  gap: sample(700, (t) => claveStrike(claveDown(t))).map((frame, i, all) => ({
    ...frame,
    opacity: i === all.length - 1 ? 1 : n(Math.min(1, Math.max(0, 1 - 1.6 * claveDown(700 * i / (all.length - 1))))),
  })),
  // Where the sticks cross when down.
  spark: {
    duration: 260,
    origin: '11.5px 12.7px',
    keyframes: [{ opacity: 1, transform: 'scale(0.7)' }, { offset: 0.25, opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.3)' }],
  },
}

export const INSTRUMENT_MOTION: Record<string, Motion> = {
  // The bubble pops from its tail; the dots bounce like someone talking.
  voice: {
    duration: 700,
    keyframes: sample(700, (t) => `scale(${n(1 + 0.09 * kick(t, 4, 130))})`),
    origin: '20% 95%',
    accent: sample(700, (t) => `translateY(${n(-1.6 * Math.exp(-t / 170) * Math.abs(Math.sin(TAU * 3.2 * t / 1000)))}px)`),
  },
  clave,
  congas: drum({ f: 12, tau: 120, depth: 0.6 }, { f: 6, tau: 90 }, 700),
  bongos: drum({ f: 20, tau: 75, depth: 0.55 }, { f: 9, tau: 60 }, 480),
  // Metal shells: they ring longer.
  timbales: drum({ f: 22, tau: 170, depth: 0.45 }, { f: 8, tau: 70 }, 850),
  cowbell: bell({ deg: 9, f: 2.4, tau: 300 }, '50% 8%', (k) => `scale(${n(1 + 0.16 * k)}, ${n(1 - 0.1 * k)})`, { f: 26, tau: 220 }, 1300),
  // On its stand: it only rocks, but its mouth rings.
  timbalebell: bell({ deg: 3, f: 6, tau: 120 }, '45% 95%', (k) => `scale(${n(1 - 0.18 * k)}, ${n(1 + 0.1 * k)})`, { f: 24, tau: 260 }, 1100),
  // The stick is at the bell when the sound starts and bounces off it.
  campana: {
    duration: 1100,
    keyframes: sample(1100, (t) => `rotate(${n(6 * kick(t, 2.8, 260))}deg)`),
    origin: '55% 5%',
    accent: sample(1100, (t) => {
      const k = release(t, 7, 90)
      return `translate(${n(1.6 * k)}px, ${n(-1.6 * k)}px)`
    }),
  },
  // The heads lag behind the handles, the seeds rattle inside.
  maracas: {
    duration: 900,
    keyframes: sample(900, (t) => `rotate(${n(12 * kick(t, 4, 170))}deg)`),
    origin: '50% 100%',
    accent: sample(900, (t) => {
      const seeds = Math.exp(-t / 200)
      const x = -1.3 * kick(Math.max(0, t - 35), 4, 170) + 0.35 * seeds * (Math.sin(TAU * 41 * t / 1000) + 0.6 * Math.sin(TAU * 67 * t / 1000 + 1))
      const y = 0.3 * seeds * Math.sin(TAU * 53 * t / 1000 + 2)
      return `translate(${n(x)}px, ${n(y)}px)`
    }),
  },
  guiro: scrape('x', 3, 5, 620),
  guira: scrape('y', 5, 6, 620),
  // Deep and slow: the longest ring.
  bass: plucked({ f: 5, tau: 320 }, { deg: 3, f: 3, tau: 260 }, { f: 6, tau: 260, amp: 2.2, stagger: 45 }, 1300),
  // The keys go down with the sound and spring back up.
  piano: {
    duration: 600,
    keyframes: sample(600, (t) => `scale(1, ${n(1 - 0.03 * kick(t, 6, 90))})`),
    origin: '50% 100%',
    accent: sample(600, (t) => `translateY(${n(1.6 * release(t, 3, 90))}px)`),
  },
  tres: plucked({ f: 11, tau: 170 }, { deg: 4, f: 6, tau: 140 }, { f: 11, tau: 150, amp: 2, stagger: 35 }, 850),
  trumpet: brass(3, 900),
  trombone: brass(4, 1000),
  requinto: plucked({ f: 15, tau: 140 }, { deg: 5, f: 8, tau: 110 }, { f: 14, tau: 120, amp: 1.8, stagger: 30 }, 700),
  segunda: plucked({ f: 9, tau: 200 }, { deg: 3.5, f: 5, tau: 170 }, { f: 9, tau: 180, amp: 2, stagger: 40 }, 1000),
}

/** The count box pulsing on a beat; 1 and 5, where the halves of the phrase start, harder. */
export function countPulse(strong: boolean): Keyframe[] {
  return [{ transform: `scale(${strong ? 1.18 : 1.08})` }, { transform: 'none' }]
}
