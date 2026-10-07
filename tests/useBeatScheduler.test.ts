import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { humanizeNote, sampleResolver, useBeatScheduler } from '../app/composables/useBeatScheduler'
import type { Note } from '../app/composables/useAudioEngine'
import type { Pattern } from '../app/composables/usePattern'

function fakeEngine() {
  const context = { currentTime: 0 }
  return {
    context,
    engine: {
      getContext: () => context,
      resume: async () => {},
      now: () => context.currentTime,
      playNote: vi.fn<(instrument: string, note: Note, time: number) => void>(),
    },
  }
}

function pattern(counts: number, bpm: number): Pattern {
  const length = counts * 2
  return {
    id: 'test',
    name: 'test',
    genre: 'bachata',
    counts,
    stepsPerCount: 2,
    bpm,
    // A hit on every cell, so every scheduled step shows up as a playNote call.
    tracks: [{ instrument: 'bass', steps: Array(length).fill('hit'), volume: 1, muted: false }],
  }
}

const samples = sampleResolver({ bass: { hit: '/bass.wav' } })

describe('useBeatScheduler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  /** Advance audio time and let the lookahead interval catch up. */
  async function runUntil(context: { currentTime: number }, seconds: number) {
    while (context.currentTime < seconds) {
      context.currentTime = Math.min(seconds, context.currentTime + 0.025)
      await vi.advanceTimersByTimeAsync(25)
    }
  }

  it('spaces steps by 60 / bpm / stepsPerCount seconds', async () => {
    const { context, engine } = fakeEngine()
    const scheduler = useBeatScheduler(engine as never)
    await scheduler.start(pattern(8, 120), samples)
    await runUntil(context, 1)

    const times = engine.playNote.mock.calls.map(([, , time]) => time)
    // 120 counts/min, 2 cells per count → a cell every 0.25 s.
    expect(times.slice(0, 5)).toEqual([0, 0.25, 0.5, 0.75, 1])
    scheduler.stop()
  })

  it('loops after counts × stepsPerCount steps', async () => {
    const { context, engine } = fakeEngine()
    const steps: number[] = []
    const scheduler = useBeatScheduler(engine as never)
    await scheduler.start(pattern(8, 240), samples, { onStep: (step) => steps.push(step) })
    // 8 counts at 240 → 2 s per loop; run a bit past one loop.
    await runUntil(context, 2.3)

    expect(steps.slice(0, 18)).toEqual([...Array(16).keys(), 0, 1])
    scheduler.stop()
  })

  it('wraps to the start when the pattern is shortened mid-play', async () => {
    const { context, engine } = fakeEngine()
    const steps: number[] = []
    const live = pattern(16, 240)
    const scheduler = useBeatScheduler(engine as never)
    await scheduler.start(live, samples, { onStep: (step) => steps.push(step) })
    await runUntil(context, 2.5) // into the second block, step ~20

    live.counts = 8
    live.tracks[0]!.steps = live.tracks[0]!.steps.slice(0, 16)
    steps.length = 0
    await runUntil(context, 3)

    expect(steps.length).toBeGreaterThan(0)
    expect(steps.every((step) => step < 16)).toBe(true)
    expect(steps[0]).toBe(0)
    scheduler.stop()
  })
})

describe('sampleResolver', () => {
  const track = { instrument: 'bongos', steps: ['high', 'high', 'high', 'low'], volume: 1, muted: false }
  const resolve = sampleResolver({ bongos: { high: ['/h1.wav', '/h2.wav'], low: '/l.wav' } })

  it('rotates through the takes of a stroke', () => {
    const urls = [0, 1, 2, 3].map((i) => resolve(pattern(2, 120), track, i)[0]?.url)
    expect(urls).toEqual(['/h1.wav', '/h2.wav', '/h1.wav', '/l.wav'])
  })
})

describe('humanizeNote', () => {
  const note = { url: '/x.wav', gain: 0.8 }

  it('leaves the note alone at feel 0', () => {
    expect(humanizeNote(note, 0, true)).toBe(note)
  })

  it('stays within its limits at full feel', () => {
    for (const r of [0, 0.5, 0.999]) {
      const out = humanizeNote(note, 1, false, () => r)
      expect(out.delay).toBeGreaterThanOrEqual(0) // never earlier than the grid
      expect(out.delay).toBeLessThan(0.013)
      expect(out.gain).toBeGreaterThanOrEqual(0.8 * 0.85)
      expect(out.gain).toBeLessThanOrEqual(0.8 * 1.15)
      expect(Math.abs(Math.log2(out.rate!) * 1200)).toBeLessThanOrEqual(8)
    }
  })

  it('plays off-beats softer than on-beats', () => {
    const middle = () => 0.5
    expect(humanizeNote(note, 1, true, middle).gain).toBeLessThan(humanizeNote(note, 1, false, middle).gain!)
  })

  it('keeps an existing strum delay and adds to it', () => {
    expect(humanizeNote({ ...note, delay: 0.024 }, 1, false, () => 0.5).delay).toBeCloseTo(0.024 + 0.006)
  })
})
