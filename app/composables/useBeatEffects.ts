import type { Beat } from '~/core/audio/playhead'
import { ACCENT_MOTION, countPulse, INSTRUMENT_MOTION } from '~/core/motion'
import { countInBlock } from '~/core/pattern'

/** Marks what's sounding now: grid cells, count labels and the big count boxes. */
const NOW = 'is-now'
/** Added to the big count box when the step is on the count itself, not its "&". */
const ON_BEAT = 'is-on-beat'

/** No hit animation lasts longer than this, however slow the tempo. */
const MAX_HIT_MS = 220

export interface BeatEffectsOptions {
  stepsPerCount: () => number
  bpm: () => number
  /** False with reduced motion or animation switched off: the playhead still shows, nothing moves. */
  animate: () => boolean
}

/**
 * Shows the playhead by toggling classes inside `root` on each beat,
 * instead of passing the step down as a prop: that would re-render every
 * cell of the grid ~7 times a second. Elements opt in with data attributes:
 *
 * - `data-step="N"`: a grid cell of step N;
 * - `data-count="N"`: the label of count N (from the pattern's start);
 * - `data-count-box="N"`: the big 1–8 display, N = 0–7 within the block;
 * - `.instrument-icon[data-instrument]`: moves when that instrument plays;
 * - `.play-button`: breathes on every count.
 *
 * Animations use the Web Animations API on transform and opacity only, and
 * run on the same animation frame the playhead does, so they land with the
 * sound. Grid cells only get the playhead ring: scaling ~8 of them a step
 * cost a slow phone more frames than it was worth.
 */
export function useBeatEffects(
  root: Readonly<Ref<HTMLElement | null | undefined>>,
  onBeat: (listener: (beat: Beat | null) => void) => void,
  options: BeatEffectsOptions,
) {
  let marked: Element[] = []

  const all = (selector: string) => root.value?.querySelectorAll<HTMLElement>(selector) ?? []

  function unmark() {
    for (const element of marked) element.classList.remove(NOW, ON_BEAT)
    marked = []
  }

  function mark(selector: string, onBeat = false) {
    for (const element of all(selector)) {
      element.classList.add(NOW)
      if (onBeat) element.classList.add(ON_BEAT)
      marked.push(element)
    }
  }

  function animate(beat: Beat, onCount: boolean, count: number) {
    const stepMs = 60_000 / options.bpm() / options.stepsPerCount()
    const hitMs = Math.min(MAX_HIT_MS, stepMs * 1.5)

    for (const instrument of beat.instruments) {
      const motion = INSTRUMENT_MOTION[instrument]
      if (!motion) continue
      for (const icon of all(`.instrument-icon[data-instrument="${instrument}"]`)) {
        const svg = icon.querySelector('svg')
        if (!svg) continue
        svg.style.transformOrigin = motion.origin ?? '50% 50%'
        svg.animate(motion.keyframes, { duration: hitMs, easing: 'ease-out' })
        const accent = ACCENT_MOTION[instrument]
        if (accent) svg.querySelector('.icon-accent')?.animate(accent, { duration: hitMs, easing: 'ease-out' })
      }
    }
    if (!onCount) return
    for (const box of all(`[data-count-box="${count}"]`)) {
      box.animate(countPulse(count === 0 || count === 4), { duration: Math.min(260, stepMs * options.stepsPerCount()), easing: 'ease-out' })
    }
    // A slow swell over the whole count: the tempo, felt rather than read.
    for (const button of all('.play-button')) {
      button.animate([{ transform: 'scale(1.04)' }, { transform: 'none' }], { duration: stepMs * options.stepsPerCount(), easing: 'ease-in-out' })
    }
  }

  onBeat((beat) => {
    unmark()
    if (!beat) return
    const perCount = options.stepsPerCount()
    const onCount = beat.step % perCount === 0
    const count = countInBlock(beat.step, perCount)
    mark(`[data-step="${beat.step}"]`)
    mark(`[data-count="${Math.floor(beat.step / perCount)}"]`)
    mark(`[data-count-box="${count}"]`, onCount)
    if (options.animate()) animate(beat, onCount, count)
  })
}
