import { describe, expect, it } from 'vitest'
import { layerOrder } from '~/core/layers'
import type { Pattern } from '~/core/pattern'
import { genres } from '~/genres'

const pattern: Pattern = {
  id: 'test',
  counts: 1,
  stepsPerCount: 2,
  bpm: 120,
  tracks: [
    { instrument: 'clave', steps: ['hit', null], volume: 1, muted: false },
    { instrument: 'cowbell', steps: [null, null], volume: 1, muted: false },
    { instrument: 'guiro', steps: ['long', null], volume: 1, muted: true },
    { instrument: 'congas', steps: [null, 'open'], volume: 1, muted: false },
  ],
}

describe('layerOrder', () => {
  it('follows the teaching order, skipping silent and muted tracks', () => {
    expect(layerOrder(pattern, ['congas', 'clave', 'cowbell', 'guiro', 'bongos'])).toEqual(['congas', 'clave'])
  })
})

describe.each(genres.map((genre) => [genre.id, genre] as const))('%s teaching order', (_id, genre) => {
  it('lists every instrument but the counting voice, once', () => {
    const band = genre.instruments.filter((instrument) => !genre.spoken[instrument])
    expect([...genre.teachingOrder].sort()).toEqual([...band].sort())
  })

  it.each(genre.presets.map((preset) => [preset.id, preset] as const))('has layers to build for %s', (_presetId, preset) => {
    expect(layerOrder(preset, genre.teachingOrder).length).toBeGreaterThan(1)
  })
})
