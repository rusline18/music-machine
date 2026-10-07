import type { Pattern } from './usePattern'
import type { useAudioEngine } from './useAudioEngine'

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_S = 0.1

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
  let samples: Record<string, Record<string, string>> = {}
  let callbacks: SchedulerCallbacks = {}

  const isPlaying = ref(false)
  const activeStep = ref(0)

  function stepDuration(): number {
    if (!pattern) return 0
    // 16 steps/bar over a 4/4 bar => each step is a sixteenth note.
    const secondsPerBeat = 60 / pattern.bpm
    const beatsPerStep = 4 / pattern.stepsPerBar
    return secondsPerBeat * beatsPerStep
  }

  function scheduleStep(stepIndex: number, time: number) {
    if (!pattern) return
    for (const track of pattern.tracks) {
      if (track.muted) continue
      const sampleName = track.steps[stepIndex]
      if (!sampleName) continue
      const url = samples[track.instrument]?.[sampleName]
      if (!url) continue
      engine.playSample(track.instrument, url, time)
    }
    callbacks.onStep?.(stepIndex, time)
  }

  function tick() {
    if (!pattern) return
    const context = engine.getContext()
    while (nextStepTime < context.currentTime + SCHEDULE_AHEAD_S) {
      scheduleStep(currentStep, nextStepTime)
      const scheduledStep = currentStep
      const scheduledTime = nextStepTime

      const delayMs = Math.max(0, (scheduledTime - context.currentTime) * 1000)
      setTimeout(() => {
        activeStep.value = scheduledStep
      }, delayMs)

      nextStepTime += stepDuration()
      currentStep = (currentStep + 1) % pattern.stepsPerBar
    }
  }

  async function start(
    newPattern: Pattern,
    instrumentSamples: Record<string, Record<string, string>>,
    newCallbacks: SchedulerCallbacks = {},
  ) {
    stop()
    pattern = newPattern
    samples = instrumentSamples
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

  return {
    isPlaying,
    activeStep,
    start,
    stop,
    setBpm,
  }
}
