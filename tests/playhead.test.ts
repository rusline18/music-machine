import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Beat } from '~/core/audio/playhead'
import { createPlayhead } from '~/core/audio/playhead'

describe('createPlayhead', () => {
  let frames: (() => void)[]
  let audioTime: number
  let shown: Beat[]

  /** Runs the animation frame waiting now, if any. */
  function frame() {
    const callbacks = frames
    frames = []
    for (const callback of callbacks) callback()
  }

  beforeEach(() => {
    frames = []
    audioTime = 0
    shown = []
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => frames.push(callback))
    vi.stubGlobal('cancelAnimationFrame', () => {
      frames = []
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const beat = (step: number, time: number): Beat => ({ step, time, instruments: ['clave'] })

  it('shows a step only once the audio clock reaches it', () => {
    const playhead = createPlayhead(() => audioTime, (b) => shown.push(b))
    playhead.push(beat(0, 0.1))
    frame()
    expect(shown).toEqual([])

    audioTime = 0.1
    frame()
    expect(shown.map((b) => b.step)).toEqual([0])
  })

  it('skips to the latest due step when frames come late', () => {
    const playhead = createPlayhead(() => audioTime, (b) => shown.push(b))
    playhead.push(beat(0, 0.1))
    playhead.push(beat(1, 0.2))
    playhead.push(beat(2, 0.3))
    audioTime = 0.25
    frame()
    expect(shown.map((b) => b.step)).toEqual([1])
  })

  it('asks for frames only while steps are waiting', () => {
    const playhead = createPlayhead(() => audioTime, (b) => shown.push(b))
    expect(frames).toHaveLength(0)
    playhead.push(beat(0, 0))
    playhead.push(beat(1, 0))
    expect(frames).toHaveLength(1)
    frame()
    expect(frames).toHaveLength(0)
  })

  it('forgets queued steps on clear', () => {
    const playhead = createPlayhead(() => audioTime, (b) => shown.push(b))
    playhead.push(beat(0, 0.1))
    playhead.clear()
    audioTime = 1
    frame()
    expect(shown).toEqual([])
  })
})
