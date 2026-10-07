import { chainPatterns } from '../../../composables/usePattern'
import { salsaVersePattern } from './verse'
import { salsaMontunoPattern } from './montuno'

export const salsaPatterns = [
  salsaVersePattern,
  salsaMontunoPattern,
  chainPatterns('salsa-verse-montuno', 'Verse → Montuno (16 counts)', salsaVersePattern, salsaMontunoPattern),
]
