import type { Pattern, Track } from '../pattern'
import { patternLength } from '../pattern'
import type { AudioEngine, Note } from './engine'
import { humanizeNote } from './humanize'

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_S = 0.1

/** What a track plays at a step: none, one sample, or several (a chord). */
export type StepResolver = (pattern: Pattern, track: Track, stepIndex: number) => Note[]

/** Called as each step is scheduled, with the AudioContext time it will sound at. */
export type StepCallback = (stepIndex: number, time: number) => void

export type Scheduler = ReturnType<typeof createScheduler>

/**
 * Standard "lookahead scheduler" pattern for Web Audio: a setInterval tick
 * repeatedly schedules any steps that fall within the next SCHEDULE_AHEAD_S
 * window, using AudioContext time (not wall-clock setTimeout) for actual
 * sample playback. This keeps timing sample-accurate regardless of JS
 * event-loop jitter, and keeps every instrument perfectly in sync.
 *
 * The pattern is read live on every tick, so edits (steps, tempo, length,
 * mutes) apply while it plays.
 */
export function createScheduler(engine: Pick<AudioEngine, 'now' | 'resume' | 'playNote'>) {
  let timerId: ReturnType<typeof setInterval> | null = null
  let nextStepTime = 0
  let currentStep = 0
  let pattern: Pattern | null = null
  let resolve: StepResolver = () => []
  let onStep: StepCallback | undefined
  let feel = 0

  function scheduleStep(stepIndex: number, time: number) {
    if (!pattern) return
    const offbeat = stepIndex % pattern.stepsPerCount !== 0
    for (const track of pattern.tracks) {
      if (track.muted) continue
      for (const note of resolve(pattern, track, stepIndex)) {
        engine.playNote(track.instrument, humanizeNote(note, feel, offbeat), time)
      }
    }
    onStep?.(stepIndex, time)
  }

  function tick() {
    if (!pattern) return
    while (nextStepTime < engine.now() + SCHEDULE_AHEAD_S) {
      // The pattern can be shortened mid-play; wrap instead of running off the end.
      if (currentStep >= patternLength(pattern)) currentStep = 0
      scheduleStep(currentStep, nextStepTime)
      // bpm counts quarter notes; each count is split into stepsPerCount cells.
      nextStepTime += 60 / pattern.bpm / pattern.stepsPerCount
      currentStep = (currentStep + 1) % patternLength(pattern)
    }
  }

  async function start(newPattern: Pattern, stepResolver: StepResolver, stepCallback?: StepCallback) {
    stop()
    pattern = newPattern
    resolve = stepResolver
    onStep = stepCallback
    await engine.resume()
    nextStepTime = engine.now()
    timerId = setInterval(tick, LOOKAHEAD_MS)
  }

  function stop() {
    if (timerId !== null) clearInterval(timerId)
    timerId = null
    currentStep = 0
  }

  /** 0 = machine-tight, 1 = loose live player; applies from the next scheduled step. */
  function setFeel(amount: number) {
    feel = amount
  }

  return {
    start,
    stop,
    setFeel,
    get isPlaying() {
      return timerId !== null
    },
  }
}
