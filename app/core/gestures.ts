/** A sideways swipe moves at least this far… */
const SWIPE_PX = 50
/** …and clearly more sideways than up or down. */
const SWIPE_RATIO = 1.5

/**
 * Which way a finger moved `dx`, `dy` pixels between going down and up:
 * -1 for a swipe to the left (to what's next), 1 to the right (back), 0
 * for anything else (a tap, a scroll).
 */
export function swipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < SWIPE_RATIO * Math.abs(dy)) return 0
  return dx < 0 ? -1 : 1
}

/** A tap later than this after the one before starts counting again. */
export const TAP_RESET_MS = 2000
/** Tap tempo goes by this many of the latest taps, so it follows a change of speed. */
export const TAP_WINDOW = 8
/** It takes this many taps (two gaps between them) to tell a tempo. */
const TAPS_NEEDED = 3

/** The taps that still count once one lands at `now` (ms): the recent ones, plus it. */
export function addTap(taps: readonly number[], now: number): number[] {
  const last = taps.at(-1)
  const kept = last !== undefined && now - last <= TAP_RESET_MS ? taps : []
  return [...kept, now].slice(-TAP_WINDOW)
}

/** The BPM the taps (ms, oldest first) were tapped at, or null until there are enough of them. */
export function tapTempo(taps: readonly number[]): number | null {
  if (taps.length < TAPS_NEEDED) return null
  const gap = (taps.at(-1)! - taps[0]!) / (taps.length - 1)
  return gap > 0 ? Math.round(60_000 / gap) : null
}

/**
 * Whether a press on `target` drags something of its own (a slider, a
 * field) or is inside a dialog, so a swipe there isn't a page's swipe.
 */
export function dragsItself(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('input, select, textarea, dialog'))
}
