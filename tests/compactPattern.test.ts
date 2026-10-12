import { describe, expect, it } from 'vitest'
import { packPattern, unpackPattern } from '~/core/compactPattern'
import { CUSTOM_PATTERN_ID, decodePattern, encodePattern } from '~/core/share'
import { buildSong } from '~/core/song'
import { stepNames } from '~/core/resolve'
import { inflateFromBase64Url, deflateToBase64Url, MAX_START_PARAM } from '~/core/telegram'
import { findGenre, genres } from '~/genres'

const salsa = findGenre('salsa')!
const bachata = findGenre('bachata')!

/** What a share.ts link would give: the pattern as the site sees it. */
const asShared = (pattern: Parameters<typeof encodePattern>[0], genre = salsa) => decodePattern(encodePattern(pattern, genre), genre)

describe('packed patterns', () => {
  it.each(genres.flatMap((genre) => genre.presets.map((p) => [p.id, genre, p] as const)))('%s packs into a few characters', async (_id, genre, preset) => {
    const packed = (await packPattern(preset, genre))!
    expect(packed.length).toBeLessThan(24)
    expect(await unpackPattern(packed, genre)).toEqual(asShared(preset, genre))
  })

  it('keep a preset with a few edits short', async () => {
    const pattern = structuredClone(salsa.presets[0]!)
    const clave = pattern.tracks.find((track) => track.instrument === 'clave')!
    clave.steps[1] = stepNames(salsa, 'clave')[0]!
    pattern.bpm += 7
    pattern.tracks[2]!.volume = 0.35
    pattern.tracks[3]!.muted = !pattern.tracks[3]!.muted
    const packed = (await packPattern(pattern, salsa))!
    expect(packed.length).toBeLessThan(40)
    expect(await unpackPattern(packed, salsa)).toEqual(asShared(pattern))
  })

  it('keep a preset stretched to another length and chords', async () => {
    const preset = bachata.presets[0]!
    const pattern = { ...structuredClone(preset), counts: 16, stepsPerCount: 4 }
    pattern.tracks = pattern.tracks.map((track) => ({ ...track, steps: Array.from({ length: 64 }, (_, i) => track.steps[i % track.steps.length]!) }))
    pattern.chords = ['Am', 'Dm', 'E7', 'Am']
    expect(await unpackPattern((await packPattern(pattern, bachata))!, bachata)).toEqual(asShared(pattern, bachata))
  })

  it('keep songs, and fit the longest one into a start parameter', async () => {
    const ids = salsa.presets.filter((p) => p.counts === 8).slice(0, 4).map((p) => p.id)
    const song = buildSong(salsa, ids)
    const packed = (await packPattern(song, salsa))!
    expect(packed.length).toBeLessThan(MAX_START_PARAM)
    expect(await unpackPattern(packed, salsa)).toEqual(asShared(song))
  })

  it('keep a pattern that started from nothing', async () => {
    const pattern = { ...structuredClone(salsa.presets[0]!), id: CUSTOM_PATTERN_ID }
    const packed = (await packPattern(pattern, salsa))!
    expect(await unpackPattern(packed, salsa)).toEqual(asShared(pattern))
  })

  it('that are broken or for another genre unpack to nothing', async () => {
    expect(await unpackPattern('not-deflate', salsa)).toBeNull()
    expect(await unpackPattern((await deflateToBase64Url(Uint8Array.from([9, 1, 0, 165])))!, salsa)).toBeNull()
    // Cut short: the steps run out.
    const packed = (await packPattern(salsa.presets[0]!, salsa))!
    const bytes = (await inflateFromBase64Url(packed))!
    expect(await unpackPattern((await deflateToBase64Url(bytes.slice(0, 20)))!, salsa)).toBeNull()
    // A preset index past the genre's presets.
    expect(await unpackPattern((await deflateToBase64Url(Uint8Array.from([1, 200, 0, 165])))!, salsa)).toBeNull()
  })
})
