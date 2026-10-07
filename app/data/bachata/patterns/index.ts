import { chainPatterns } from '../../../composables/usePattern'
import { bachataDerechoPattern } from './derecho'
import { bachataMajaoPattern } from './majao'

export const bachataPatterns = [
  bachataDerechoPattern,
  bachataMajaoPattern,
  chainPatterns('bachata-derecho-majao', 'Derecho → Majao (32 counts)', bachataDerechoPattern, bachataMajaoPattern),
]
