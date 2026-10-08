import { bachata } from './bachata'
import { salsa } from './salsa'
import type { Genre } from './types'

export type { Genre } from './types'

/** Every genre, in the order the home page lists them. */
export const genres: readonly Genre[] = [salsa, bachata]

export function findGenre(id: string): Genre | undefined {
  return genres.find((genre) => genre.id === id)
}
