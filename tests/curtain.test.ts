import { describe, expect, it } from 'vitest'
import { ARROW_SIZE, coveringCircle, curtainKind } from '~/core/curtain'

describe('coveringCircle', () => {
  it('reaches the farthest corner of the viewport', () => {
    // A phone, the arrow on the lower card: the top-left corner is farthest.
    const circle = coveringCircle(328, 696, 390, 844)
    const radius = circle.size / 2
    expect(radius).toBeGreaterThanOrEqual(Math.hypot(328, 696))
    expect(circle.left + radius).toBe(328)
    expect(circle.top + radius).toBe(696)
  })

  it('scales down to exactly the arrow', () => {
    const circle = coveringCircle(954, 486, 1280, 800)
    expect(circle.size * circle.startScale).toBeCloseTo(ARROW_SIZE)
  })

  it('starts as big as the mark it grows out of', () => {
    const circle = coveringCircle(200, 60, 390, 844, 32)
    expect(circle.size * circle.startScale).toBeCloseTo(32)
  })
})

describe('curtainKind', () => {
  const home = (lang: string) => ({ name: `index___${lang}` })
  const genre = (id: string, lang = 'en') => ({ name: `genre___${lang}`, genre: id })

  it('plays forward from home to a genre and back in reverse, in every language', () => {
    expect(curtainKind(home('en'), genre('bachata'))).toBe('enter')
    expect(curtainKind(genre('salsa', 'ru'), home('ru'))).toBe('leave')
  })

  it('plays across from one genre to the other, both ways', () => {
    expect(curtainKind(genre('bachata'), genre('salsa'))).toBe('switch')
    expect(curtainKind(genre('salsa', 'ru'), genre('bachata', 'ru'))).toBe('switch')
  })

  it('stays out of other moves', () => {
    expect(curtainKind(genre('salsa', 'en'), genre('salsa', 'ru'))).toBeUndefined()
    expect(curtainKind(home('en'), home('ru'))).toBeUndefined()
    expect(curtainKind({}, genre('salsa'))).toBeUndefined()
  })
})
