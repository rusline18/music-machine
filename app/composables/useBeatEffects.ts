import type { Beat } from '~/core/audio/playhead'
import { countInBlock } from '~/core/pattern'

/** Marks what's sounding now: grid cells, count labels and the big count boxes. */
const NOW = 'is-now'
/** Added to the big count box when the step is on the count itself, not its "&". */
const ON_BEAT = 'is-on-beat'

/**
 * Shows the playhead by toggling classes inside `root` on each beat,
 * instead of passing the step down as a prop: that would re-render every
 * cell of the grid ~7 times a second. Elements opt in with data attributes:
 *
 * - `data-step="N"`: a grid cell of step N;
 * - `data-count="N"`: the label of count N (from the pattern's start);
 * - `data-count-box="N"`: the big 1–8 display, N = 0–7 within the block.
 */
export function useBeatEffects(
  root: Readonly<Ref<HTMLElement | null | undefined>>,
  onBeat: (listener: (beat: Beat | null) => void) => void,
  stepsPerCount: () => number,
) {
  let marked: Element[] = []

  function unmark() {
    for (const element of marked) element.classList.remove(NOW, ON_BEAT)
    marked = []
  }

  function mark(selector: string, onBeat = false) {
    for (const element of root.value?.querySelectorAll(selector) ?? []) {
      element.classList.add(NOW)
      if (onBeat) element.classList.add(ON_BEAT)
      marked.push(element)
    }
  }

  onBeat((beat) => {
    unmark()
    if (!beat) return
    const perCount = stepsPerCount()
    const onCount = beat.step % perCount === 0
    mark(`[data-step="${beat.step}"]`)
    mark(`[data-count="${Math.floor(beat.step / perCount)}"]`)
    mark(`[data-count-box="${countInBlock(beat.step, perCount)}"]`, onCount)
  })
}
