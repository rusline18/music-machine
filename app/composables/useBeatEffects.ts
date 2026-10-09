import type { Beat } from '~/core/audio/playhead'
import { countPulse, INSTRUMENT_MOTION } from '~/core/motion'
import { countInBlock } from '~/core/pattern'

/** Marks what's sounding now: grid cells, count labels and the big count boxes. */
const NOW = 'is-now'
/** Added to the big count box when the step is on the count itself, not its "&". */
const ON_BEAT = 'is-on-beat'

/**
 * How many hits may ring on one icon part at once. A new hit adds on top of
 * the ones still ringing; past this the oldest, by then nearly still, stops.
 */
const MAX_RINGING = 3

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
 * - `.play-button`: breathes on every count;
 * - `.play-halo`: flashes on every count, brightest on 1 and 5.
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
  const ringing = new WeakMap<Element, Animation[]>()

  /** Plays a hit on `element` on top of the hits still ringing there. */
  function ring(element: Element, keyframes: Keyframe[], duration: number) {
    const running = (ringing.get(element) ?? []).filter((animation) => animation.playState === 'running')
    while (running.length >= MAX_RINGING) running.shift()?.cancel()
    running.push(element.animate(keyframes, { duration, composite: 'add' }))
    ringing.set(element, running)
  }

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

    for (const instrument of beat.instruments) {
      const motion = INSTRUMENT_MOTION[instrument]
      if (!motion) continue
      for (const icon of all(`.instrument-icon[data-instrument="${instrument}"]`)) {
        const svg = icon.querySelector('svg')
        if (!svg) continue
        svg.style.transformOrigin = motion.origin ?? '50% 50%'
        ring(svg, motion.keyframes, motion.duration)
        const accent = svg.querySelector<SVGGElement>('.icon-accent')
        if (accent) {
          accent.style.transformOrigin = motion.accentOrigin ?? ''
          ring(accent, motion.accent, motion.duration)
        }
        const base = svg.querySelector('.icon-base')
        if (base && motion.base) ring(base, motion.base, motion.duration)
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
    const anchor = count === 0 || count === 4
    for (const halo of all('.play-halo')) {
      halo.animate([{ opacity: anchor ? 1 : 0.55, transform: 'scale(1.12)' }, { opacity: 0, transform: 'none' }], { duration: Math.min(420, stepMs * options.stepsPerCount()), easing: 'ease-out' })
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
