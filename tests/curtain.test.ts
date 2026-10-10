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
    expect(circle.size * circle.arrowScale).toBeCloseTo(ARROW_SIZE)
  })
})

describe('curtainKind', () => {
  it('plays forward from home to a genre and back in reverse, in every language', () => {
    expect(curtainKind('index___en', 'genre___en')).toBe('enter')
    expect(curtainKind('genre___ru', 'index___ru')).toBe('leave')
  })

  it('stays out of other moves', () => {
    expect(curtainKind('genre___en', 'genre___en')).toBeUndefined()
    expect(curtainKind('index___en', 'index___ru')).toBeUndefined()
    expect(curtainKind(undefined, 'genre___en')).toBeUndefined()
  })
})
