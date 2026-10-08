import { describe, expect, it } from 'vitest'
import { clonePattern, serializePattern } from '../app/composables/usePattern'
import type { Pattern } from '../app/composables/usePattern'
import { deserializePattern, InvalidPatternError, validatePattern } from '../app/data/sharedPattern'
import { salsaPatterns } from '../app/data/salsa/patterns'
import { bachataPatterns } from '../app/data/bachata/patterns'

const encode = (value: unknown) => btoa(encodeURIComponent(JSON.stringify(value)))

/** A preset with one field changed, encoded like a share link. */
function tampered(change: (pattern: Record<string, any>) => void): string {
  const pattern = clonePattern(salsaPatterns[0]!) as unknown as Record<string, any>
  change(pattern)
  return encode(pattern)
}

describe('deserializePattern', () => {
  it.each([...salsaPatterns, ...bachataPatterns].map((p) => [p.id, p] as const))('round-trips preset %s', (_id, preset) => {
    expect(deserializePattern(serializePattern(preset))).toEqual(preset)
  })

  it('keeps non-ASCII names', () => {
    const pattern: Pattern = { ...clonePattern(salsaPatterns[0]!), name: 'Cáscara con güiro' }
    expect(deserializePattern(serializePattern(pattern)).name).toBe('Cáscara con güiro')
  })

  it('drops fields it does not know', () => {
    const decoded = deserializePattern(tampered((p) => {
      p.extra = 'x'
      p.tracks[0].extra = 'y'
    }))
    expect(decoded).not.toHaveProperty('extra')
    expect(decoded.tracks[0]).not.toHaveProperty('extra')
  })

  it.each<[string, (p: Record<string, any>) => void]>([
    ['zero bpm', (p) => { p.bpm = 0 }],
    ['negative bpm', (p) => { p.bpm = -180 }],
    ['bpm outside the slider', (p) => { p.bpm = 1000 }],
    ['bpm as a string', (p) => { p.bpm = '180' }],
    ['huge counts', (p) => { p.counts = 1e9 }],
    ['zero stepsPerCount', (p) => { p.stepsPerCount = 0 }],
    ['an unknown genre', (p) => { p.genre = 'tango' }],
    ['an unknown instrument', (p) => { p.tracks[0].instrument = 'constructor' }],
    ['a duplicated instrument', (p) => { p.tracks.push(p.tracks[0]) }],
    ['a prototype key as step name', (p) => { p.tracks[0].steps[0] = 'toString' }],
    ['steps of the wrong length', (p) => { p.tracks[0].steps.pop() }],
    ['volume above 1', (p) => { p.tracks[0].volume = 5 }],
    ['muted as a string', (p) => { p.tracks[0].muted = 'no' }],
    ['an unknown chord', (p) => { p.chords = Array(p.counts / 4).fill('H#') }],
    ['too few chords', (p) => { p.chords = ['Am'] }],
    ['a very long name', (p) => { p.name = 'x'.repeat(1000) }],
  ])('rejects %s', (_case, change) => {
    expect(() => deserializePattern(tampered(change))).toThrow(InvalidPatternError)
  })

  it.each([
    ['not base64', '%%%'],
    ['not JSON', btoa('nope')],
    ['not an object', encode([1, 2, 3])],
    ['null', encode(null)],
    ['too long', 'A'.repeat(200_000)],
  ])('rejects input that is %s', (_case, encoded) => {
    expect(() => deserializePattern(encoded)).toThrow(InvalidPatternError)
  })

  it('accepts a pattern with only some of the instruments', () => {
    const pattern = clonePattern(salsaPatterns[0]!)
    pattern.tracks = pattern.tracks.slice(0, 2)
    expect(validatePattern(pattern).tracks).toHaveLength(2)
  })
})
