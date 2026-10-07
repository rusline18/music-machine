import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBeatScheduler } from '../app/composables/useBeatScheduler'
import type { Pattern } from '../app/composables/usePattern'

function fakeEngine() {
  const context = { currentTime: 0 }
  return {
    context,
    engine: {
      getContext: () => context,
      resume: async () => {},
      now: () => context.currentTime,
      playSample: vi.fn<(instrument: string, url: string, time: number) => void>(),
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
    // A hit on every cell, so every scheduled step shows up as a playSample call.
    tracks: [{ instrument: 'bass', steps: Array(length).fill('hit'), volume: 1, muted: false }],
  }
}

const samples = { bass: { hit: '/bass.wav' } }

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

    const times = engine.playSample.mock.calls.map(([, , time]) => time)
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
