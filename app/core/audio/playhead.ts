/** A step as it reaches the speakers: which one, when, and who plays on it. */
export interface Beat {
  step: number
  /** AudioContext time the step sounds at. */
  time: number
  /** Instruments with a note on this step (muted ones left out). */
  instruments: string[]
}

/**
 * Beats queued further ahead than this are dropped: in a hidden tab
 * animation frames stop while the scheduler keeps queueing.
 */
const MAX_QUEUED = 64

/**
 * Hands each scheduled step to `onBeat` on the first animation frame after
 * it sounds, going by the audio clock rather than a timer, so the picture
 * matches what's heard. Frames are only requested while beats are queued,
 * so a stopped machine costs nothing.
 *
 * `now` is the audio time reaching the speakers now (context time minus
 * output latency). If a frame comes late, only the latest due beat is
 * shown: a skipped flash is better than a burst of stale ones.
 */
export function createPlayhead(now: () => number, onBeat: (beat: Beat) => void) {
  const queue: Beat[] = []
  let frame = 0

  function tick() {
    frame = 0
    const time = now()
    let due: Beat | undefined
    while (queue.length && queue[0]!.time <= time) due = queue.shift()
    if (due) onBeat(due)
    if (queue.length) frame = requestAnimationFrame(tick)
  }

  function push(beat: Beat) {
    queue.push(beat)
    if (queue.length > MAX_QUEUED) queue.shift()
    if (!frame) frame = requestAnimationFrame(tick)
  }

  function clear() {
    queue.length = 0
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }

  return { push, clear }
}
