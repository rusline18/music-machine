import type { InstrumentTrack, Pattern } from './usePattern'
import { patternLength } from './usePattern'
import type { Note, useAudioEngine } from './useAudioEngine'

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_S = 0.1

/** What a track plays at a step: none, one sample, or several (a chord). */
export type StepResolver = (pattern: Pattern, track: InstrumentTrack, stepIndex: number) => Note[]

/** instrument → step name → sample URL, or several takes of it to rotate through. */
export type SampleMap = Record<string, Record<string, string | string[]>>

/**
 * Resolver for plain one-shot tracks: the step name picks a sample URL.
 * Several takes are played in turn (round robin), so repeated hits don't
 * sound like the same recording over and over.
 */
export function sampleResolver(samples: SampleMap): StepResolver {
  const nextTake = new Map<string[], number>()
  return (_pattern, track, stepIndex) => {
    const name = track.steps[stepIndex]
    const entry = name ? samples[track.instrument]?.[name] : undefined
    if (!entry) return []
    if (typeof entry === 'string') return [{ url: entry }]
    const take = nextTake.get(entry) ?? 0
    nextTake.set(entry, (take + 1) % entry.length)
    return [{ url: entry[take]! }]
  }
}

// How far a fully loose (feel = 1) player strays from the grid.
const MAX_LATE_S = 0.012
const MAX_GAIN_SPREAD = 0.15
const MAX_DETUNE_CENTS = 8
const OFFBEAT_SOFTENING = 0.2

/**
 * Makes a note sound played rather than programmed: a few ms late, a little
 * louder or softer, a few cents off pitch, and softer off the beat. `feel`
 * runs from 0 (untouched) to 1. Notes only ever move later, never earlier,
 * so nothing gets scheduled in the past.
 */
export function humanizeNote(note: Note, feel: number, offbeat: boolean, random: () => number = Math.random): Note {
  if (feel <= 0) return note
  const spread = (amount: number) => (random() * 2 - 1) * amount * feel
  const accent = offbeat ? 1 - OFFBEAT_SOFTENING * feel : 1
  return {
    ...note,
    delay: (note.delay ?? 0) + random() * MAX_LATE_S * feel,
    gain: (note.gain ?? 1) * accent * (1 + spread(MAX_GAIN_SPREAD)),
    rate: (note.rate ?? 1) * 2 ** (spread(MAX_DETUNE_CENTS) / 1200),
  }
}

export interface SchedulerCallbacks {
  /** Called when a step is scheduled, for UI playhead highlighting. */
  onStep?: (stepIndex: number, time: number) => void
}

/**
 * Standard "lookahead scheduler" pattern for Web Audio: a setInterval tick
 * repeatedly schedules any steps that fall within the next SCHEDULE_AHEAD_S
 * window, using AudioContext time (not wall-clock setTimeout) for actual
 * sample playback. This keeps timing sample-accurate regardless of JS
 * event-loop jitter, and keeps every instrument perfectly in sync (plan
 * section 10/11).
 */
export function useBeatScheduler(engine: ReturnType<typeof useAudioEngine>) {
  let timerId: ReturnType<typeof setInterval> | null = null
  let nextStepTime = 0
  let currentStep = 0
  let pattern: Pattern | null = null
  let resolve: StepResolver = () => []
  let callbacks: SchedulerCallbacks = {}
  let feel = 0

  const isPlaying = ref(false)
  const activeStep = ref(0)

  function stepDuration(): number {
    if (!pattern) return 0
    // bpm counts quarter notes; each count is split into stepsPerCount cells.
    return 60 / pattern.bpm / pattern.stepsPerCount
  }

  function scheduleStep(stepIndex: number, time: number) {
    if (!pattern) return
    const offbeat = stepIndex % pattern.stepsPerCount !== 0
    for (const track of pattern.tracks) {
      if (track.muted) continue
      for (const note of resolve(pattern, track, stepIndex)) {
        engine.playNote(track.instrument, humanizeNote(note, feel, offbeat), time)
      }
    }
    callbacks.onStep?.(stepIndex, time)
  }

  function tick() {
    if (!pattern) return
    const context = engine.getContext()
    while (nextStepTime < context.currentTime + SCHEDULE_AHEAD_S) {
      // The pattern can be shortened mid-play; wrap instead of running off the end.
      if (currentStep >= patternLength(pattern)) currentStep = 0
      scheduleStep(currentStep, nextStepTime)
      const scheduledStep = currentStep
      const scheduledTime = nextStepTime

      const delayMs = Math.max(0, (scheduledTime - context.currentTime) * 1000)
      setTimeout(() => {
        activeStep.value = scheduledStep
      }, delayMs)

      nextStepTime += stepDuration()
      currentStep = (currentStep + 1) % patternLength(pattern)
    }
  }

  async function start(
    newPattern: Pattern,
    stepResolver: StepResolver,
    newCallbacks: SchedulerCallbacks = {},
  ) {
    stop()
    pattern = newPattern
    resolve = stepResolver
    callbacks = newCallbacks

    await engine.resume()
    currentStep = 0
    nextStepTime = engine.now()
    isPlaying.value = true
    timerId = setInterval(tick, LOOKAHEAD_MS)
  }

  function stop() {
    if (timerId !== null) {
      clearInterval(timerId)
      timerId = null
    }
    isPlaying.value = false
    activeStep.value = 0
    currentStep = 0
  }

  /** Update BPM on an already-running pattern without breaking sync. */
  function setBpm(bpm: number) {
    if (pattern) pattern.bpm = bpm
  }

  /** 0 = machine-tight, 1 = loose live player; applies from the next scheduled step. */
  function setFeel(amount: number) {
    feel = amount
  }

  return {
    isPlaying,
    activeStep,
    start,
    stop,
    setFeel,
    setBpm,
  }
}
