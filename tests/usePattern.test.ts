import { describe, expect, it } from 'vitest'
import {
  chainPatterns,
  createEmptyPattern,
  deserializePattern,
  patternLength,
  resizeSteps,
  serializePattern,
} from '../app/composables/usePattern'
import type { Pattern } from '../app/composables/usePattern'

function block(id: string, tracks: Array<[string, Array<string | null>, boolean?]>): Pattern {
  return {
    id,
    name: id,
    genre: 'salsa',
    counts: 2,
    stepsPerCount: 2,
    bpm: 180,
    tracks: tracks.map(([instrument, steps, muted = false]) => ({ instrument, steps, volume: 1, muted })),
  }
}

describe('resizeSteps', () => {
  it('repeats the existing steps when growing', () => {
    expect(resizeSteps(['a', null, 'b'], 7)).toEqual(['a', null, 'b', 'a', null, 'b', 'a'])
  })

  it('truncates when shrinking', () => {
    expect(resizeSteps(['a', null, 'b', 'c'], 2)).toEqual(['a', null])
  })

  it('fills an empty track with silence', () => {
    expect(resizeSteps([], 3)).toEqual([null, null, null])
  })

  it('does not mutate its input', () => {
    const steps = ['a', null]
    resizeSteps(steps, 4)
    expect(steps).toEqual(['a', null])
  })
})

describe('chainPatterns', () => {
  const verse = block('verse', [['clave', ['hit', null, null, 'hit']], ['bell', [null, null, null, null], true]])
  const montuno = block('montuno', [['clave', ['hit', null, 'hit', null]], ['bell', ['hit', null, 'hit', null]]])

  it('joins blocks end to end and adds up the counts', () => {
    const chained = chainPatterns('both', 'Both', verse, montuno)
    expect(chained.counts).toBe(4)
    expect(chained.tracks[0]!.steps).toEqual(['hit', null, null, 'hit', 'hit', null, 'hit', null])
    expect(chained.tracks[0]!.steps).toHaveLength(patternLength(chained))
  })

  it('plays silence where a track was muted, and unmutes it if any block uses it', () => {
    const chained = chainPatterns('both', 'Both', verse, montuno)
    expect(chained.tracks[1]).toMatchObject({
      instrument: 'bell',
      steps: [null, null, null, null, 'hit', null, 'hit', null],
      muted: false,
    })
  })

  it('takes id and name from the arguments, tempo from the first block', () => {
    const chained = chainPatterns('both', 'Both', verse, { ...montuno, bpm: 200 })
    expect(chained).toMatchObject({ id: 'both', name: 'Both', bpm: 180 })
  })

  it('refuses blocks with a different grid resolution', () => {
    expect(() => chainPatterns('x', 'X', verse, { ...montuno, stepsPerCount: 4 })).toThrow(/stepsPerCount/)
  })
})

describe('createEmptyPattern', () => {
  it('defaults to one silent 8-count block', () => {
    const pattern = createEmptyPattern('bachata', ['guira', 'bass'])
    expect(pattern.counts).toBe(8)
    expect(pattern.tracks.map((t) => t.steps)).toEqual([Array(16).fill(null), Array(16).fill(null)])
  })
})

describe('serializePattern', () => {
  it('round-trips, including non-ASCII names', () => {
    const pattern = block('cáscara', [['güiro', ['long', null, 'short', 'short']]])
    expect(deserializePattern(serializePattern(pattern))).toEqual(pattern)
  })
})
