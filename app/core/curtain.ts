/**
 * Geometry of the curtain between pages (the curtain plugin): a circle
 * centered on what was tapped, big enough to cover the whole viewport,
 * drawn at full size and scaled down to where it starts.
 */

/** The home card's arrow, px: the circle grows out of it and shrinks back into it. */
export const ARROW_SIZE = 44

export interface Circle {
  left: number
  top: number
  /** Diameter, px. */
  size: number
  /** The scale at which the circle is exactly as big as where it starts. */
  startScale: number
}

/** The smallest circle centered on (x, y) that covers a width × height viewport, starting `startSize` px across. */
export function coveringCircle(x: number, y: number, width: number, height: number, startSize = ARROW_SIZE): Circle {
  const radius = Math.ceil(Math.hypot(Math.max(x, width - x), Math.max(y, height - y)))
  const size = radius * 2
  return { left: x - radius, top: y - radius, size, startScale: startSize / size }
}

/** Forward into a genre, back out of one, or across from one genre to another. */
export type CurtainKind = 'enter' | 'leave' | 'switch'

/**
 * Home → a genre plays the curtain forward, a genre → home in reverse, and
 * one genre → another grows the new genre's color out of its switch; a
 * language change or anything else plays none.
 */
export function curtainKind(
  from: { name?: string, genre?: string },
  to: { name?: string, genre?: string },
): CurtainKind | undefined {
  const page = (name: string | undefined) => name?.split('___')[0]
  if (page(from.name) === 'index' && page(to.name) === 'genre') return 'enter'
  if (page(from.name) === 'genre' && page(to.name) === 'index') return 'leave'
  if (page(from.name) === 'genre' && page(to.name) === 'genre' && from.genre !== to.genre) return 'switch'
  return undefined
}
