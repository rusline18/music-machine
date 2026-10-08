import { chainPatterns } from '../../../composables/usePattern'
import { bachataDerechoPattern } from './derecho'
import { bachataMajaoPattern } from './majao'
import { bachataMamboPattern } from './mambo'

export const bachataPatterns = [
  bachataDerechoPattern,
  bachataMajaoPattern,
  bachataMamboPattern,
  chainPatterns(
    'bachata-derecho-majao-mambo',
    'Derecho → Majao → Mambo (24 counts)',
    bachataDerechoPattern,
    bachataMajaoPattern,
    bachataMamboPattern,
  ),
]
