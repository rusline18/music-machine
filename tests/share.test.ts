import { describe, expect, it } from 'vitest'
import { chainPatterns, clonePattern } from '../app/composables/usePattern'
import { genreConfig, stepNames } from '../app/data/genres'
import { decodePattern, encodePattern } from '../app/data/share'
import { salsaPatterns } from '../app/data/salsa/patterns'
import { bachataPatterns } from '../app/data/bachata/patterns'

const salsa = genreConfig.salsa
const bachata = genreConfig.bachata

/** Build a code from a hand-written payload, the way a tampered link would. */
const codeFor = (payload: unknown) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

describe('pattern links', () => {
  it.each([...salsaPatterns, ...bachataPatterns].map((p) => [p.id, p] as const))('%s round-trips', (_id, pattern) => {
    const config = genreConfig[pattern.genre]
    expect(decodePattern(encodePattern(pattern, config), pattern.genre, config)).toEqual(pattern)
  })

  it('keeps edits: tempo, length, mutes, volumes, chords, names', () => {
    const pattern = clonePattern(bachataPatterns[0]!)
    pattern.bpm = 141
    pattern.name = 'Домашка: derecho'
    pattern.tracks[0]!.muted = true
    pattern.tracks[1]!.volume = 0.35
    pattern.chords = ['C', 'G7']
    expect(decodePattern(encodePattern(pattern, bachata), 'bachata', bachata)).toEqual(pattern)
  })

  it('is URL-safe and short', () => {
    // The longest the app offers: 48 counts of bachata, six derecho blocks.
    const derecho = bachataPatterns.find((p) => p.id === 'bachata-derecho')!
    const longest = chainPatterns('long', 'Long', derecho, derecho, derecho, derecho, derecho, derecho)
    expect(longest.counts).toBe(48)
    const code = encodePattern(longest, bachata)
    expect(code).toMatch(/^[\w-]+$/)
    expect(code.length).toBeLessThan(2000)
  })

  it('rejects garbage and other genres', () => {
    expect(decodePattern('not a code!', 'salsa', salsa)).toBeNull()
    expect(decodePattern(codeFor({ hello: 1 }), 'salsa', salsa)).toBeNull()
    expect(decodePattern(encodePattern(bachataPatterns[0]!, bachata), 'salsa', salsa)).toBeNull()
  })

  it('rejects lengths the app does not offer', () => {
    const payload = JSON.parse(atob(encodePattern(salsaPatterns[0]!, salsa).replace(/-/g, '+').replace(/_/g, '/')))
    expect(decodePattern(codeFor({ ...payload, c: 7 }), 'salsa', salsa)).toBeNull()
    expect(decodePattern(codeFor({ ...payload, s: 3 }), 'salsa', salsa)).toBeNull()
  })

  it('repairs what it can: tempo, volume, unknown instruments and strokes, wrong lengths', () => {
    const decoded = decodePattern(codeFor({
      v: 1, g: 'salsa', i: 'x', n: '', c: 8, s: 2, b: 9999,
      t: [['clave', 'a-z-', 7, 0], ['theremin', 'aaaa', 1, 0]],
    }), 'salsa', salsa)!
    expect(decoded.bpm).toBe(salsa.maxBpm)
    expect(decoded.name).toBe('Shared pattern')
    expect(decoded.tracks.map((t) => t.instrument)).toEqual([...salsa.instruments])
    const clave = decoded.tracks[0]!
    expect(clave.volume).toBe(1)
    expect(clave.steps).toHaveLength(16)
    expect(clave.steps.slice(0, 4)).toEqual(['hit', null, null, null])
    // Instruments missing from the link come back silent and muted.
    expect(decoded.tracks[1]).toMatchObject({ instrument: 'congas', muted: true })
    expect(decoded.tracks[1]!.steps.every((s) => s === null)).toBe(true)
  })

  it.each<[string, (p: Record<string, any>) => void]>([
    ['zero tempo', (p) => { p.b = 0 }],
    ['negative tempo', (p) => { p.b = -180 }],
    ['tempo as a string', (p) => { p.b = '180' }],
    ['huge counts', (p) => { p.c = 1e9 }],
    ['zero stepsPerCount', (p) => { p.s = 0 }],
    ['a prototype key as instrument', (p) => { p.t[0][0] = 'constructor' }],
    ['a duplicated instrument', (p) => { p.t.push(p.t[0]) }],
    ['strokes outside the alphabet', (p) => { p.t[0][1] = '{}?!'.repeat(4) }],
    ['steps of the wrong length', (p) => { p.t[0][1] = p.t[0][1].slice(1) }],
    ['volume above 1', (p) => { p.t[0][2] = 5 }],
    ['muted as a string', (p) => { p.t[0][3] = 'no' }],
    ['a very long name', (p) => { p.n = 'x'.repeat(1000) }],
    ['extra fields', (p) => { p.extra = 'x'; p.t[0].push('y') }],
  ])('turns a link with %s into a safe pattern or nothing', (_case, change) => {
    const payload = JSON.parse(atob(encodePattern(salsaPatterns[0]!, salsa).replace(/-/g, '+').replace(/_/g, '/')))
    change(payload)
    const decoded = decodePattern(codeFor(payload), 'salsa', salsa)
    if (decoded === null) return
    // Exactly what the scheduler and grid rely on, nothing else.
    expect(Object.keys(decoded).sort()).toEqual(['bpm', 'counts', 'genre', 'id', 'name', 'stepsPerCount', 'tracks'])
    expect(decoded.bpm).toBeGreaterThanOrEqual(salsa.minBpm)
    expect(decoded.bpm).toBeLessThanOrEqual(salsa.maxBpm)
    expect(decoded.name.length).toBeLessThanOrEqual(60)
    expect(decoded.tracks.map((t) => t.instrument)).toEqual([...salsa.instruments])
    for (const track of decoded.tracks) {
      expect(Object.keys(track).sort()).toEqual(['instrument', 'muted', 'steps', 'volume'])
      expect(track.steps).toHaveLength(decoded.counts * decoded.stepsPerCount)
      const known = stepNames(salsa, track.instrument)
      for (const step of track.steps) if (step !== null) expect(known).toContain(step)
      expect(track.volume).toBeGreaterThanOrEqual(0)
      expect(track.volume).toBeLessThanOrEqual(1)
      expect(typeof track.muted).toBe('boolean')
    }
  })

  it('does not decode oversized codes', () => {
    expect(decodePattern('A'.repeat(200_000), 'salsa', salsa)).toBeNull()
  })

  it('gives bachata a chord per bar even if the link has bad or missing chords', () => {
    const payload = JSON.parse(atob(encodePattern(bachataPatterns[0]!, bachata).replace(/-/g, '+').replace(/_/g, '/')))
    const decoded = decodePattern(codeFor({ ...payload, h: ['H#', 'Dm'] }), 'bachata', bachata)!
    expect(decoded.chords).toEqual(Array(decoded.counts / 4).fill('Dm'))
  })
})
