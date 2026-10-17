import { describe, expect, it } from 'vitest'
import { TAP_RESET_MS, TAP_WINDOW, addTap, swipeDirection, tapTempo } from '~/core/gestures'

describe('swipeDirection', () => {
  it('tells a swipe to the left from one to the right', () => {
    expect(swipeDirection(-80, 10)).toBe(-1)
    expect(swipeDirection(80, -10)).toBe(1)
  })

  it('is 0 for a tap, a short move or a scroll', () => {
    expect(swipeDirection(3, 2)).toBe(0)
    expect(swipeDirection(-30, 0)).toBe(0)
    expect(swipeDirection(60, 100)).toBe(0)
  })
})

describe('tap tempo', () => {
  /** Taps every `gap` ms from 0. */
  const tapped = (count: number, gap: number) =>
    Array.from({ length: count }, (_, i) => i * gap).reduce<number[]>((taps, time) => addTap(taps, time), [])

  it('needs three taps', () => {
    expect(tapTempo(tapped(1, 500))).toBeNull()
    expect(tapTempo(tapped(2, 500))).toBeNull()
    expect(tapTempo(tapped(3, 500))).toBe(120)
  })

  it('averages the gaps', () => {
    expect(tapTempo([0, 300, 700, 1000])).toBe(180)
  })

  it('starts again after a pause', () => {
    const taps = addTap(tapped(4, 500), 1500 + TAP_RESET_MS + 1)
    expect(taps).toHaveLength(1)
  })

  it('keeps only the latest taps', () => {
    expect(tapped(20, 400)).toHaveLength(TAP_WINDOW)
    expect(tapTempo(tapped(20, 400))).toBe(150)
  })
})
