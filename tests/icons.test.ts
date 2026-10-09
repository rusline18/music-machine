import { describe, expect, it } from 'vitest'
import { genres } from '~/genres'
import { ICON_ACCENTS, ICONS } from '~/icons'
import { ACCENT_MOTION, INSTRUMENT_MOTION } from '~/core/motion'

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
    expect(ACCENT_MOTION[instrument]?.length).toBeGreaterThan(0)
  })

  it('stays small', () => {
    // A guard against pasting in exported artwork: these are meant to be a few hand-drawn strokes.
    expect(JSON.stringify(ICONS).length).toBeLessThan(8000)
    expect(JSON.stringify(ICON_ACCENTS).length).toBeLessThan(4000)
  })
})
