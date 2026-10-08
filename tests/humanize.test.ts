import { describe, expect, it } from 'vitest'
import { humanizeNote } from '~/core/audio/humanize'

describe('humanizeNote', () => {
  const note = { url: '/x.wav', gain: 0.8 }

  it('leaves the note alone at feel 0', () => {
    expect(humanizeNote(note, 0, true)).toBe(note)
  })

  it('stays within its limits at full feel', () => {
    for (const r of [0, 0.5, 0.999]) {
      const out = humanizeNote(note, 1, false, () => r)
      expect(out.delay).toBeGreaterThanOrEqual(0) // never earlier than the grid
      expect(out.delay).toBeLessThan(0.013)
      expect(out.gain).toBeGreaterThanOrEqual(0.8 * 0.85)
      expect(out.gain).toBeLessThanOrEqual(0.8 * 1.15)
      expect(Math.abs(Math.log2(out.rate!) * 1200)).toBeLessThanOrEqual(8)
    }
  })

  it('plays off-beats softer than on-beats', () => {
    const middle = () => 0.5
    expect(humanizeNote(note, 1, true, middle).gain).toBeLessThan(humanizeNote(note, 1, false, middle).gain!)
  })

  it('keeps an existing strum delay and adds to it', () => {
    expect(humanizeNote({ ...note, delay: 0.024 }, 1, false, () => 0.5).delay).toBeCloseTo(0.024 + 0.006)
  })
})
