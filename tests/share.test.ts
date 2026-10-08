import { describe, expect, it } from 'vitest'
import { clonePattern } from '../app/composables/usePattern'
import { genreConfig } from '../app/data/genres'
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
    pattern.chords = ['C', 'G7', 'Am', 'F']
    expect(decodePattern(encodePattern(pattern, bachata), 'bachata', bachata)).toEqual(pattern)
  })

  it('is URL-safe and short', () => {
    const longest = bachataPatterns.find((p) => p.counts === 48)!
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

  it('gives bachata a chord per bar even if the link has bad or missing chords', () => {
    const payload = JSON.parse(atob(encodePattern(bachataPatterns[0]!, bachata).replace(/-/g, '+').replace(/_/g, '/')))
    const decoded = decodePattern(codeFor({ ...payload, h: ['H#', 'Dm'] }), 'bachata', bachata)!
    expect(decoded.chords).toEqual(Array(decoded.counts / 4).fill('Dm'))
  })
})
