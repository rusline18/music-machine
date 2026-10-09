import { describe, expect, it } from 'vitest'
import { patternLength } from '~/core/pattern'
import { buildSong, MAX_SONG_COUNTS, SONG_PATTERN_ID, sectionFit, songBpm } from '~/core/song'
import { findGenre } from '~/genres'

const salsa = findGenre('salsa')!
const bachata = findGenre('bachata')!
const steps = (pattern: { tracks: { instrument: string, steps: (string | null)[] }[] }, instrument: string) =>
  pattern.tracks.find((t) => t.instrument === instrument)!.steps

describe('sectionFit', () => {
  it('lets any section start a song', () => {
    for (const preset of salsa.presets) expect(sectionFit(salsa, [], preset.id), preset.id).toBe('ok')
  })

  it('joins sections in the same clave written at close tempos', () => {
    expect(sectionFit(salsa, ['salsa-verse-3-2'], 'salsa-montuno-3-2')).toBe('ok')
    expect(sectionFit(salsa, ['salsa-verse-2-3'], 'salsa-montuno-2-3')).toBe('ok')
    expect(sectionFit(salsa, ['salsa-verse-3-2', 'salsa-montuno-3-2'], 'salsa-mambo-3-2')).toBe('ok')
    expect(sectionFit(salsa, ['salsa-montuno-3-2'], 'salsa-mambo-2-3')).toBe('clave')
    // The same section again is fine: verse ×2 → montuno ×2.
    expect(sectionFit(salsa, ['salsa-verse-3-2'], 'salsa-verse-3-2')).toBe('ok')
  })

  it('refuses another clave, and says so', () => {
    expect(sectionFit(salsa, ['salsa-verse-3-2'], 'salsa-verse-2-3')).toBe('clave')
    // Same tempo as the montuno, but rumba clave.
    expect(sectionFit(salsa, ['salsa-montuno-3-2'], 'salsa-guaguanco-3-2')).toBe('clave')
  })

  it('refuses a section written at a far-off tempo, and says so', () => {
    // Both in 2-3, but cha-cha-chá is 120 against salsa's 180.
    expect(sectionFit(salsa, ['salsa-verse-2-3'], 'salsa-chachacha-2-3')).toBe('tempo')
  })

  it('stops at the longest loop', () => {
    const full = Array.from({ length: MAX_SONG_COUNTS / 8 }, () => 'salsa-verse-3-2')
    expect(sectionFit(salsa, full, 'salsa-montuno-3-2')).toBe('full')
    expect(sectionFit(salsa, full.slice(1), 'salsa-montuno-3-2')).toBe('ok')
  })

  it('joins anything in a genre without clave and at one tempo', () => {
    for (const preset of bachata.presets) expect(sectionFit(bachata, ['bachata-derecho'], preset.id), preset.id).toBe('ok')
  })
})

describe('buildSong', () => {
  it('plays the sections one after another, at the first one\'s tempo', () => {
    const song = buildSong(salsa, ['salsa-verse-3-2', 'salsa-montuno-3-2'])
    expect(song).toMatchObject({ id: SONG_PATTERN_ID, counts: 16, bpm: 180, sections: ['salsa-verse-3-2', 'salsa-montuno-3-2'] })
    expect(songBpm(salsa, song.sections!)).toBe(180)
    for (const track of song.tracks) expect(track.steps, track.instrument).toHaveLength(patternLength(song))
    // Bongo bell only in the montuno.
    expect(steps(song, 'cowbell').slice(0, 16).every((step) => step === null)).toBe(true)
    expect(steps(song, 'cowbell').slice(16).some(Boolean)).toBe(true)
  })

  it('ends a section with the timbales fill where the next one is different, the loop included', () => {
    const song = buildSong(salsa, ['salsa-verse-3-2', 'salsa-verse-3-2', 'salsa-montuno-3-2'])
    const timbales = steps(song, 'timbales')
    const fill = ['high', 'high', 'high', 'low']
    // Verse into verse: no fill, the cáscara carries on.
    expect(timbales.slice(12, 16)).not.toEqual(fill)
    // Verse into montuno, and montuno back round to the verse.
    expect(timbales.slice(28, 32)).toEqual(fill)
    expect(timbales.slice(44, 48)).toEqual(fill)
    expect(song.tracks.find((t) => t.instrument === 'timbales')!.muted).toBe(false)
  })

  it('plays one section on its own without a fill', () => {
    expect(steps(buildSong(salsa, ['salsa-verse-3-2']), 'timbales')).toEqual(steps(salsa.presets[0]!, 'timbales'))
  })

  it('leaves the presets untouched', () => {
    const before = structuredClone(salsa.presets)
    const song = buildSong(salsa, ['salsa-verse-3-2', 'salsa-montuno-3-2'])
    song.tracks[1]!.steps[0] = null
    song.chords![0] = 'Dm'
    expect(salsa.presets).toEqual(before)
  })

  it('builds a bachata song without a fill', () => {
    const song = buildSong(bachata, ['bachata-derecho', 'bachata-majao'])
    expect(song.counts).toBe(16)
    expect(steps(song, 'bongos').slice(0, 16)).toEqual(steps(bachata.presets[0]!, 'bongos'))
  })
})
