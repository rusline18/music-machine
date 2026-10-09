import { describe, expect, it } from 'vitest'
import { chainPatterns } from '~/core/pattern'
import { stepNames } from '~/core/resolve'
import { CUSTOM_PATTERN_ID, decodePattern, encodePattern } from '~/core/share'
import { buildSong } from '~/core/song'
import { findGenre, genres } from '~/genres'

const salsa = findGenre('salsa')!
const bachata = findGenre('bachata')!

/** A decoded link, loosely typed: the tests below break it on purpose. */
interface Payload {
  [key: string]: unknown
  b: unknown
  c: unknown
  s: unknown
  t: unknown[][]
}

/** Build a code from a hand-written payload, the way a tampered link would. */
const codeFor = (payload: unknown) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const payloadOf = (code: string): Payload => JSON.parse(atob(code.replace(/-/g, '+').replace(/_/g, '/')))

describe('pattern links', () => {
  it.each(genres.flatMap((genre) => genre.presets.map((p) => [p.id, genre, p] as const)))('%s round-trips', (_id, genre, pattern) => {
    expect(decodePattern(encodePattern(pattern, genre), genre)).toEqual(pattern)
  })

  it('keeps old salsa links working: new strokes are added after the old ones', () => {
    // A link stores a step as its position in the instrument's step names.
    expect(stepNames(salsa, 'congas').slice(0, 3)).toEqual(['low', 'slap', 'open'])
    expect(stepNames(salsa, 'cowbell')[0]).toBe('hit')
  })

  it('keeps edits: tempo, length, mutes, volumes, chords, the voice', () => {
    const pattern = structuredClone(bachata.presets[0]!)
    pattern.bpm = 141
    pattern.tracks[0]!.muted = true
    pattern.tracks[1]!.volume = 0.35
    pattern.tracks[2]!.steps[3] = stepNames(bachata, pattern.tracks[2]!.instrument)[0]!
    pattern.chords = pattern.chords!.map(() => 'G7')
    expect(decodePattern(encodePattern(pattern, bachata), bachata)).toEqual(pattern)
  })

  it('is URL-safe and short', () => {
    // The longest the app offers: 32 counts.
    const derecho = bachata.presets[0]!
    const longest = chainPatterns('long', derecho, ...Array.from({ length: 32 / derecho.counts - 1 }, () => derecho))
    expect(longest.counts).toBe(32)
    const code = encodePattern(longest, bachata)
    expect(code).toMatch(/^[\w-]+$/)
    expect(code.length).toBeLessThan(2000)
  })

  it('keeps the sections of a song, and drops ones that are not presets or do not add up', () => {
    const song = buildSong(salsa, ['salsa-verse-3-2', 'salsa-montuno-3-2'])
    expect(decodePattern(encodePattern(song, salsa), salsa)).toEqual(song)
    const tampered = (sections: unknown) => {
      const payload = payloadOf(encodePattern(song, salsa))
      return decodePattern(codeFor({ ...payload, p: sections }), salsa)!
    }
    for (const sections of [['nope', 'salsa-montuno-3-2'], ['salsa-verse-3-2'], 'salsa-verse-3-2', []]) {
      const decoded = tampered(sections)
      expect(decoded.sections, JSON.stringify(sections)).toBeUndefined()
      expect(decoded.id).toBe(CUSTOM_PATTERN_ID)
    }
  })

  it('marks a pattern that is not one of the presets as custom', () => {
    const pattern = { ...structuredClone(salsa.presets[0]!), id: 'something-else' }
    expect(decodePattern(encodePattern(pattern, salsa), salsa)!.id).toBe(CUSTOM_PATTERN_ID)
  })

  it('rejects garbage and other genres', () => {
    expect(decodePattern('not a code!', salsa)).toBeNull()
    expect(decodePattern(codeFor({ hello: 1 }), salsa)).toBeNull()
    expect(decodePattern(encodePattern(bachata.presets[0]!, bachata), salsa)).toBeNull()
    expect(decodePattern('A'.repeat(200_000), salsa)).toBeNull()
  })

  it('rejects lengths the app does not offer', () => {
    const payload = payloadOf(encodePattern(salsa.presets[0]!, salsa))
    expect(decodePattern(codeFor({ ...payload, c: 7 }), salsa)).toBeNull()
    expect(decodePattern(codeFor({ ...payload, c: 48 }), salsa)).toBeNull()
    expect(decodePattern(codeFor({ ...payload, s: 3 }), salsa)).toBeNull()
  })

  it('repairs what it can: tempo, volume, unknown instruments and strokes, wrong lengths', () => {
    const decoded = decodePattern(codeFor({
      v: 1, g: 'salsa', i: 'x', c: 8, s: 2, b: 9999,
      t: [['clave', 'a-z-', 7, 0], ['theremin', 'aaaa', 1, 0]],
    }), salsa)!
    expect(decoded.bpm).toBe(salsa.bpmRange[1])
    expect(decoded.id).toBe(CUSTOM_PATTERN_ID)
    expect(decoded.tracks.map((t) => t.instrument)).toEqual([...salsa.instruments])
    const clave = decoded.tracks.find((t) => t.instrument === 'clave')!
    expect(clave.volume).toBe(1)
    expect(clave.steps).toHaveLength(16)
    expect(clave.steps.slice(0, 4)).toEqual(['hit', null, null, null])
    // Instruments missing from the link come back silent and muted.
    const congas = decoded.tracks.find((t) => t.instrument === 'congas')!
    expect(congas.muted).toBe(true)
    expect(congas.steps.every((s) => s === null)).toBe(true)
  })

  it.each<[string, (p: Payload) => void]>([
    ['zero tempo', (p) => { p.b = 0 }],
    ['negative tempo', (p) => { p.b = -180 }],
    ['tempo as a string', (p) => { p.b = '180' }],
    ['huge counts', (p) => { p.c = 1e9 }],
    ['zero stepsPerCount', (p) => { p.s = 0 }],
    ['a prototype key as instrument', (p) => { p.t[0]![0] = 'constructor' }],
    ['a duplicated instrument', (p) => { p.t.push(p.t[0]!) }],
    ['strokes outside the alphabet', (p) => { p.t[0]![1] = '{}?!'.repeat(4) }],
    ['steps of the wrong length', (p) => { p.t[0]![1] = (p.t[0]![1] as string).slice(1) }],
    ['volume above 1', (p) => { p.t[0]![2] = 5 }],
    ['muted as a string', (p) => { p.t[0]![3] = 'no' }],
    ['extra fields', (p) => {
      p.extra = 'x'
      p.t[0]!.push('y')
    }],
  ])('turns a link with %s into a safe pattern or nothing', (_case, change) => {
    const payload = payloadOf(encodePattern(salsa.presets[0]!, salsa))
    change(payload)
    const decoded = decodePattern(codeFor(payload), salsa)
    if (decoded === null) return
    // Exactly what the scheduler and grid rely on, nothing else.
    expect(Object.keys(decoded).sort()).toEqual(['bpm', 'chords', 'counts', 'id', 'stepsPerCount', 'tracks'])
    expect(decoded.chords).toHaveLength(decoded.counts / 4)
    expect(decoded.bpm).toBeGreaterThanOrEqual(salsa.bpmRange[0])
    expect(decoded.bpm).toBeLessThanOrEqual(salsa.bpmRange[1])
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

  it('gives bachata a chord per bar even if the link has bad or missing chords', () => {
    const payload = payloadOf(encodePattern(bachata.presets[0]!, bachata))
    const decoded = decodePattern(codeFor({ ...payload, h: ['H#', 'Dm'] }), bachata)!
    expect(decoded.chords).toEqual(Array(decoded.counts / 4).fill('Dm'))
  })
})
