/**
 * The slide between genres (the genre-slide plugin): the page moves toward
 * the genre picked, in the order the genre switch lists them.
 */

export interface PageRef {
  /** The route's name, e.g. `genre___ru`. */
  name?: string
  /** The genre on a genre page. */
  genre?: string
}

/**
 * 1 when the page should slide left (the genre picked is further along
 * the switch), -1 when right, undefined when this isn't a move from one
 * genre page to another (home, a language change, the same genre).
 */
export function slideDirection(from: PageRef, to: PageRef, order: readonly string[]): 1 | -1 | undefined {
  const page = (name: string | undefined) => name?.split('___')[0]
  if (page(from.name) !== 'genre' || page(to.name) !== 'genre') return undefined
  const a = order.indexOf(from.genre ?? '')
  const b = order.indexOf(to.genre ?? '')
  if (a < 0 || b < 0 || a === b) return undefined
  return b > a ? 1 : -1
}
