import { describe, expect, it } from 'vitest'
import {
  chainPatterns,
  chordAt,
  countInBlock,
  definePattern,
  endWith,
  patternLength,
  resizeSteps,
  setPatternCounts,
  switchStep,
  trackOf,
} from '~/core/pattern'
import type { Pattern } from '~/core/pattern'

function block(id: string, tracks: Array<[string, Array<string | null>, boolean?]>): Pattern {
  return {
    id,
    counts: 2,
    stepsPerCount: 2,
    bpm: 180,
    tracks: tracks.map(([instrument, steps, muted = false]) => ({ instrument, steps, volume: 1, muted })),
  }
}

const verse0 = block('verse', [['clave', ['hit', null, null, 'hit']], ['bell', [null, null, null, null], true]])

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
    const chained = chainPatterns('both', verse, montuno)
    expect(chained.counts).toBe(4)
    expect(chained.tracks[0]!.steps).toEqual(['hit', null, null, 'hit', 'hit', null, 'hit', null])
    expect(chained.tracks[0]!.steps).toHaveLength(patternLength(chained))
  })

  it('plays silence where a track was muted, and unmutes it if any block uses it', () => {
    const chained = chainPatterns('both', verse, montuno)
    expect(chained.tracks[1]).toMatchObject({
      instrument: 'bell',
      steps: [null, null, null, null, 'hit', null, 'hit', null],
      muted: false,
    })
  })

  it('gives each track the volume of the loudest block it plays in', () => {
    const quiet = { ...verse, tracks: verse.tracks.map((t) => ({ ...t, volume: 0.6 })) }
    const loud = { ...montuno, tracks: montuno.tracks.map((t) => ({ ...t, volume: 0.8 })) }
    expect(chainPatterns('both', quiet, loud).tracks.map((t) => t.volume)).toEqual([0.8, 0.8])
    // A block where the track sits out doesn't count, even if it's set louder.
    const mutedLoud = { ...verse, tracks: verse.tracks.map((t) => ({ ...t, volume: 1 })) }
    expect(chainPatterns('both', mutedLoud, loud).tracks[1]!.volume).toBe(0.8)
  })

  it('takes the id from the arguments, tempo from the first block', () => {
    const chained = chainPatterns('both', verse, { ...montuno, bpm: 200 })
    expect(chained).toMatchObject({ id: 'both', bpm: 180 })
  })

  it('joins chords like the steps', () => {
    const a = { ...block('a', [['bass', Array(8).fill(null)]]), counts: 4, chords: ['Am'] }
    const b = { ...block('b', [['bass', Array(16).fill(null)]]), counts: 8, chords: ['Dm', 'E'] }
    expect(chainPatterns('ab', a, b).chords).toEqual(['Am', 'Dm', 'E'])
  })

  it('refuses blocks with a different grid resolution', () => {
    expect(() => chainPatterns('x', verse, { ...montuno, stepsPerCount: 4 })).toThrow(/stepsPerCount/)
  })
})

describe('chordAt', () => {
  it('changes chord every bar and loops the progression', () => {
    const pattern = { stepsPerCount: 2, chords: ['Am', 'Dm'] }
    expect(chordAt(pattern, 0)).toBe('Am')
    expect(chordAt(pattern, 7)).toBe('Am')
    expect(chordAt(pattern, 8)).toBe('Dm')
    expect(chordAt(pattern, 16)).toBe('Am')
    expect(chordAt({ stepsPerCount: 2 }, 0)).toBeUndefined()
  })
})

describe('definePattern', () => {
  const pattern = definePattern({
    id: 'p',
    counts: 4,
    bpm: 100,
    tracks: [
      { instrument: 'clave', figure: ['hit', null, null] },
      { instrument: 'bell', volume: 0.5 },
      { instrument: 'shaker', figure: ['hit'], muted: true },
    ],
  })

  it('repeats each figure over counts × stepsPerCount steps', () => {
    expect(pattern.stepsPerCount).toBe(2)
    expect(pattern.tracks[0]!.steps).toEqual(['hit', null, null, 'hit', null, null, 'hit', null])
  })

  it('makes a track without a figure silent and muted', () => {
    expect(pattern.tracks[1]).toEqual({ instrument: 'bell', steps: Array(8).fill(null), volume: 0.5, muted: true })
  })

  it('defaults to full volume, unmuted unless asked', () => {
    expect(pattern.tracks[0]).toMatchObject({ volume: 1, muted: false })
    expect(pattern.tracks[2]!.muted).toBe(true)
  })
})

describe('setPatternCounts', () => {
  it('repeats steps and chords to fill a longer loop', () => {
    const pattern = { ...block('p', [['bass', Array(16).fill(null).map((_, i) => (i === 0 ? 'root' : null))]]), counts: 8, chords: ['Am', 'E'] }
    setPatternCounts(pattern, 16)
    expect(pattern.counts).toBe(16)
    expect(pattern.tracks[0]!.steps).toHaveLength(32)
    expect(pattern.tracks[0]!.steps[16]).toBe('root')
    expect(pattern.chords).toEqual(['Am', 'E', 'Am', 'E'])
  })

  it('cuts steps and chords for a shorter loop', () => {
    const pattern = { ...block('p', [['bass', Array(32).fill('root')]]), counts: 16, chords: ['Am', 'Dm', 'E', 'Am'] }
    setPatternCounts(pattern, 8)
    expect(pattern.tracks[0]!.steps).toHaveLength(16)
    expect(pattern.chords).toEqual(['Am', 'Dm'])
  })

  it('repeats or cuts the sections of a song with its blocks', () => {
    const pattern = { ...block('song', [['bass', Array(32).fill(null)]]), counts: 16, sections: ['verse', 'montuno'] }
    setPatternCounts(pattern, 32)
    expect(pattern.sections).toEqual(['verse', 'montuno', 'verse', 'montuno'])
    setPatternCounts(pattern, 8)
    expect(pattern.sections).toEqual(['verse'])
  })
})

describe('endWith', () => {
  it('replaces the last steps of one track and switches it on', () => {
    const ended = endWith(verse0, 'bell', ['fill'])
    expect(ended.tracks[1]).toMatchObject({ steps: [null, null, null, 'fill'], muted: false })
    expect(ended.tracks[0]).toBe(verse0.tracks[0])
    expect(verse0.tracks[1]!.steps).toEqual([null, null, null, null])
  })
})

describe('countInBlock', () => {
  it('numbers counts 0–7 within each 8-count block', () => {
    expect(countInBlock(0, 2)).toBe(0)
    expect(countInBlock(3, 2)).toBe(1)
    expect(countInBlock(15, 2)).toBe(7)
    expect(countInBlock(16, 2)).toBe(0)
  })
})

describe('trackOf', () => {
  const tracks = [
    { instrument: 'bongos', steps: [], volume: 1, muted: false },
    { instrument: 'guira', steps: [], volume: 1, muted: false },
  ]

  it('finds the track an instrument plays on, or nothing', () => {
    expect(trackOf({ tracks }, 'guira')).toBe(tracks[1])
    expect(trackOf({ tracks }, 'bass')).toBeUndefined()
    expect(trackOf({ tracks }, null)).toBeUndefined()
  })
})

describe('switchStep', () => {
  const names = ['low', 'high', 'slap']

  it('turns a hit off', () => {
    expect(switchStep('slap', ['slap', 'high'], names)).toBeNull()
  })

  it('turns an empty cell on with the sound the track plays most', () => {
    expect(switchStep(null, ['high', 'high', 'low', null], names)).toBe('high')
  })

  it('uses the first sound on an empty track', () => {
    expect(switchStep(null, [null, null], names)).toBe('low')
  })
})
