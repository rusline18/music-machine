import type { Pattern, Track } from '../pattern'
import { patternLength } from '../pattern'
import type { AudioEngine, Note } from './engine'
import { humanizeNote } from './humanize'

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_S = 0.1
/**
 * How far ahead of its step a note may start (a negative `delay`): a spoken
 * word starts before its beat so its vowel lands on it. Steps are queued
 * this much earlier to make room. scripts/generate-samples.mjs cuts the
 * words to fit (MAX_WORD_LEAD_S).
 */
export const MAX_LEAD_S = 0.08
/**
 * Steps due further back than this are skipped: the timer stalled (a
 * background tab, a long pause), and playing them now would sound them all
 * at once.
 */
const MAX_LATE_S = 0.1

/** What a track plays at a step: none, one sample, or several (a chord). */
export type StepResolver = (pattern: Pattern, track: Track, stepIndex: number) => Note[]

/**
 * Called as each step is scheduled, with the AudioContext time it will
 * sound at and the instruments that play on it.
 */
export type StepCallback = (stepIndex: number, time: number, instruments: string[]) => void

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
    const playing: string[] = []
    for (const track of pattern.tracks) {
      if (track.muted) continue
      const notes = resolve(pattern, track, stepIndex)
      if (notes.length) playing.push(track.instrument)
      for (const note of notes) {
        engine.playNote(track.instrument, humanizeNote(note, feel, offbeat), time)
      }
    }
    onStep?.(stepIndex, time, playing)
  }

  function tick() {
    if (!pattern) return
    // bpm counts quarter notes; each count is split into stepsPerCount cells.
    const step = 60 / pattern.bpm / pattern.stepsPerCount
    const length = patternLength(pattern)
    // A negative step would never advance nextStepTime and hang the tab;
    // bpm 0 makes it Infinity and the loop silently stalls.
    if (!(Number.isFinite(step) && step > 0 && length > 0)) {
      stop()
      return
    }
    // The pattern can be shortened mid-play; wrap instead of running off the end.
    if (currentStep >= length) currentStep = 0
    const now = engine.now()
    // Pick up again on the beat it's at now, as if those steps had played.
    if (nextStepTime < now - MAX_LATE_S) {
      const missed = Math.ceil((now - nextStepTime) / step)
      nextStepTime += missed * step
      currentStep = (currentStep + missed) % length
    }
    const horizon = now + SCHEDULE_AHEAD_S + MAX_LEAD_S
    while (nextStepTime < horizon) {
      scheduleStep(currentStep, nextStepTime)
      nextStepTime += step
      currentStep = (currentStep + 1) % length
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
