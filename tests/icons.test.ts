import { describe, expect, it } from 'vitest'
import { genres } from '~/genres'
import { ICON_ACCENTS, ICONS } from '~/icons'
import { INSTRUMENT_MOTION } from '~/core/motion'

describe('icons', () => {
  it.each(genres.flatMap((genre) => genre.instruments))('has an icon for %s', (instrument) => {
    expect(ICONS[instrument]?.length).toBeGreaterThan(0)
  })

  it.each(genres.flatMap((genre) => genre.instruments))('has a motion for %s', (instrument) => {
    expect(INSTRUMENT_MOTION[instrument]?.keyframes.length).toBeGreaterThan(0)
  })

  it.each(genres.flatMap((genre) => genre.instruments))('has an accent layer for %s', (instrument) => {
    const accent = ICON_ACCENTS[instrument]
    expect((accent?.fill?.length ?? 0) + (accent?.line?.length ?? 0)).toBeGreaterThan(0)
  })

  it.each(genres.flatMap((genre) => genre.instruments))('has an accent motion for %s', (instrument) => {
    expect(INSTRUMENT_MOTION[instrument]?.accent.length).toBeGreaterThan(0)
  })

  it.each(Object.entries(INSTRUMENT_MOTION))('%s comes to rest where it started', (_, motion) => {
    // Hits are added on top of each other, so each must end at rest.
    for (const keyframes of [motion.keyframes, motion.accent, motion.base ?? []]) {
      expect(keyframes.at(-1)?.transform ?? 'none').toBe('none')
    }
  })

  it('stays small', () => {
    // A guard against pasting in exported artwork: these are meant to be a few hand-drawn strokes.
    expect(JSON.stringify(ICONS).length).toBeLessThan(8000)
    expect(JSON.stringify(ICON_ACCENTS).length).toBeLessThan(4000)
  })
})
