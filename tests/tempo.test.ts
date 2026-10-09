import { describe, expect, it } from 'vitest'
import { nudgeBpm, tempoChoice, tempoFor } from '~/core/tempo'

const RANGE = [90, 160] as const

describe('tempoFor', () => {
  it('is the preset tempo for normal, slower and faster around it', () => {
    expect(tempoFor('normal', 130, RANGE)).toBe(130)
    expect(tempoFor('slow', 130, RANGE)).toBe(104)
    expect(tempoFor('fast', 130, RANGE)).toBe(150)
  })

  it('stays within the slider range', () => {
    expect(tempoFor('slow', 100, RANGE)).toBe(90)
    expect(tempoFor('fast', 150, RANGE)).toBe(160)
  })
})

describe('tempoChoice', () => {
  it('names the button a tempo came from', () => {
    expect(tempoChoice(104, 130, RANGE)).toBe('slow')
    expect(tempoChoice(130, 130, RANGE)).toBe('normal')
  })

  it('is undefined for a tempo set with the slider', () => {
    expect(tempoChoice(121, 130, RANGE)).toBeUndefined()
  })
})

describe('nudgeBpm', () => {
  it('moves by whole beats', () => {
    expect(nudgeBpm(180, 1, [80, 240])).toBe(181)
    expect(nudgeBpm(180.4, -5, [80, 240])).toBe(175)
  })

  it('stays inside the range', () => {
    expect(nudgeBpm(238, 5, [80, 240])).toBe(240)
    expect(nudgeBpm(82, -5, [80, 240])).toBe(80)
  })
})
