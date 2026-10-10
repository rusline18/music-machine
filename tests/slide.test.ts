import { describe, expect, it } from 'vitest'
import { slideDirection } from '~/core/slide'

const ORDER = ['salsa', 'bachata']
const genre = (id: string, lang = 'en') => ({ name: `genre___${lang}`, genre: id })

describe('slideDirection', () => {
  it('slides toward the genre picked, in the order of the switch, in every language', () => {
    expect(slideDirection(genre('salsa'), genre('bachata'), ORDER)).toBe(1)
    expect(slideDirection(genre('bachata', 'ru'), genre('salsa', 'ru'), ORDER)).toBe(-1)
  })

  it('stays out of other moves', () => {
    expect(slideDirection(genre('salsa', 'en'), genre('salsa', 'ru'), ORDER)).toBeUndefined()
    expect(slideDirection({ name: 'index___en' }, genre('salsa'), ORDER)).toBeUndefined()
    expect(slideDirection(genre('salsa'), { name: 'index___en' }, ORDER)).toBeUndefined()
    expect(slideDirection(genre('salsa'), genre('merengue'), ORDER)).toBeUndefined()
  })
})
