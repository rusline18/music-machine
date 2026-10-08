import { chainPatterns, rotatePattern } from '../../../composables/usePattern'
import { salsaVersePattern } from './verse'
import { salsaMontunoPattern } from './montuno'
import { salsaChachachaPattern } from './chachacha'
import { salsaGuaguancoPattern } from './guaguanco'

// 2-3 is the same two-bar cycle started from the other bar, so these are
// the 3-2 presets begun 4 counts later — cáscara and all turn with it.
const salsaVerse23Pattern = rotatePattern('salsa-verse-2-3', 'Verse (2-3 clave, cáscara)', salsaVersePattern, 4)
const salsaMontuno23Pattern = rotatePattern('salsa-montuno-2-3', 'Montuno (2-3 clave, bells)', salsaMontunoPattern, 4)

export const salsaPatterns = [
  salsaVersePattern,
  salsaMontunoPattern,
  chainPatterns('salsa-verse-montuno', 'Verse → Montuno (16 counts)', salsaVersePattern, salsaMontunoPattern),
  salsaVerse23Pattern,
  salsaMontuno23Pattern,
  chainPatterns('salsa-verse-montuno-2-3', 'Verse → Montuno, 2-3 (16 counts)', salsaVerse23Pattern, salsaMontuno23Pattern),
  salsaChachachaPattern,
  salsaGuaguancoPattern,
]
