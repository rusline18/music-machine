import { describe, expect, it } from 'vitest'
import { genres } from '~/genres'
import { ICONS } from '~/icons'
import { INSTRUMENT_MOTION } from '~/core/motion'

describe('icons', () => {
  it.each(genres.flatMap((genre) => genre.instruments))('has an icon for %s', (instrument) => {
    expect(ICONS[instrument]?.length).toBeGreaterThan(0)
  })

  it.each(genres.flatMap((genre) => genre.instruments))('has a motion for %s', (instrument) => {
    expect(INSTRUMENT_MOTION[instrument]?.keyframes.length).toBeGreaterThan(0)
  })

  it('stays small', () => {
    // A guard against pasting in exported artwork: these are meant to be a few hand-drawn strokes.
    expect(JSON.stringify(ICONS).length).toBeLessThan(8000)
  })
})
