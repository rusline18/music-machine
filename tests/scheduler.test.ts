import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '~/core/audio/engine'
import { createScheduler } from '~/core/audio/scheduler'
import type { Pattern } from '~/core/pattern'
import { sampleResolver } from '~/core/resolve'

function fakeEngine() {
  const context = { currentTime: 0 }
  return {
    context,
    engine: {
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
    counts,
    stepsPerCount: 2,
    bpm,
    // A hit on every cell, so every scheduled step shows up as a playNote call.
    tracks: [{ instrument: 'bass', steps: Array(length).fill('hit'), volume: 1, muted: false }],
  }
}

const samples = sampleResolver({ bass: { hit: '/bass.wav' } })

describe('scheduler', () => {
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
    const scheduler = createScheduler(engine)
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
    const scheduler = createScheduler(engine)
    await scheduler.start(pattern(8, 240), samples, (step) => steps.push(step))
    // 8 counts at 240 → 2 s per loop; run a bit past one loop.
    await runUntil(context, 2.3)

    expect(steps.slice(0, 18)).toEqual([...Array(16).keys(), 0, 1])
    scheduler.stop()
  })

  it('wraps to the start when the pattern is shortened mid-play', async () => {
    const { context, engine } = fakeEngine()
    const steps: number[] = []
    const live = pattern(16, 240)
    const scheduler = createScheduler(engine)
    await scheduler.start(live, samples, (step) => steps.push(step))
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

  it('picks up a tempo change on the next step', async () => {
    const { context, engine } = fakeEngine()
    const live = pattern(8, 120)
    const scheduler = createScheduler(engine)
    await scheduler.start(live, samples)
    await runUntil(context, 0.3) // steps at 0 and 0.25 s are queued, the next one due at 0.5 s
    live.bpm = 240
    await runUntil(context, 1)

    const times = engine.playNote.mock.calls.map(([, , time]) => time)
    // After the change, a cell every 0.125 s.
    expect(times[4]! - times[3]!).toBeCloseTo(0.125)
    scheduler.stop()
  })

  it('reports whether it is playing', async () => {
    const { engine } = fakeEngine()
    const scheduler = createScheduler(engine)
    expect(scheduler.isPlaying).toBe(false)
    await scheduler.start(pattern(8, 120), samples)
    expect(scheduler.isPlaying).toBe(true)
    scheduler.stop()
    expect(scheduler.isPlaying).toBe(false)
  })

  it.each([0, -120, Number.NaN])('stops instead of hanging at bpm %s', async (bpm) => {
    const { context, engine } = fakeEngine()
    const scheduler = createScheduler(engine)
    await scheduler.start(pattern(8, bpm), samples)
    await runUntil(context, 0.1)

    expect(scheduler.isPlaying).toBe(false)
    expect(engine.playNote).not.toHaveBeenCalled()
  })
})
