/**
 * Geometry of the curtain between the home page and a genre (the curtain
 * plugin): a circle centered on a card's arrow, big enough to cover the
 * whole viewport, drawn at full size and scaled down to the arrow.
 */

/** The card's arrow, px: the circle grows out of it and shrinks back into it. */
export const ARROW_SIZE = 44

export interface Circle {
  left: number
  top: number
  /** Diameter, px. */
  size: number
  /** The scale at which the circle is exactly the arrow. */
  arrowScale: number
}

/** The smallest circle centered on (x, y) that covers a width × height viewport. */
export function coveringCircle(x: number, y: number, width: number, height: number): Circle {
  const radius = Math.ceil(Math.hypot(Math.max(x, width - x), Math.max(y, height - y)))
  const size = radius * 2
  return { left: x - radius, top: y - radius, size, arrowScale: ARROW_SIZE / size }
}

export type CurtainKind = 'enter' | 'leave'

/** Home → a genre plays the curtain forward, a genre → home in reverse; nothing else does. */
export function curtainKind(from: string | undefined, to: string | undefined): CurtainKind | undefined {
  const page = (name: string | undefined) => name?.split('___')[0]
  if (page(from) === 'index' && page(to) === 'genre') return 'enter'
  if (page(from) === 'genre' && page(to) === 'index') return 'leave'
  return undefined
}
