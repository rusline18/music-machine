/** How long a finger or the mouse button is held for a long press. */
export const LONG_PRESS_MS = 450
/** Moving further than this is a scroll or a swipe, not a press. */
const PRESS_SLOP_PX = 10
/** The fill and the "keep holding" bubble start a moment after the press lands, so a tap never flashes them. */
const HOLD_LABEL_DELAY_MS = 120

interface LongPressHandlers<K> {
  /** A short press. */
  tap: (key: K) => void
  /** A long press, a right-click or the menu key. */
  longPress: (key: K) => void
  /** The pointer went down (left button or touch); the press may still become either. */
  pressed?: (event: PointerEvent, key: K) => void
  /** The press is over: it moved away, was let go, or became a long press. */
  released?: () => void
}

/**
 * Tap or long press on the same control. iOS doesn't fire contextmenu on
 * touch, hence the timer; elsewhere contextmenu (right-click, the menu key,
 * Android's long press) counts as a long press too. `key` says which of
 * several controls (a cell, a card) the press is on, so one set of
 * handlers serves them all.
 *
 * Bind on the control: pointerdown → down, pointermove → move,
 * pointerup / pointerleave / pointercancel → cancel, click → click,
 * contextmenu (prevented) → contextMenu. State is plain variables, not
 * refs: nothing re-renders while a press is held.
 */
export function useLongPress<K>({ tap, longPress, pressed, released }: LongPressHandlers<K>) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let start: { x: number, y: number } | null = null
  /** Set when a long press fired, so the click that ends it isn't also a tap. */
  let fired = false

  function down(event: PointerEvent, key: K) {
    if (event.button !== 0) return
    fired = false
    start = { x: event.clientX, y: event.clientY }
    pressed?.(event, key)
    clearTimeout(timer)
    timer = setTimeout(() => {
      start = null
      fired = true
      released?.()
      longPress(key)
    }, LONG_PRESS_MS)
  }

  function move(event: PointerEvent) {
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > PRESS_SLOP_PX) cancel()
  }

  function cancel() {
    clearTimeout(timer)
    start = null
    released?.()
  }

  function click(key: K) {
    if (fired) fired = false
    else tap(key)
  }

  function contextMenu(key: K) {
    cancel()
    // Android fires this after our own timer already counted the long press.
    if (!fired) longPress(key)
    fired = false
  }

  onBeforeUnmount(cancel)

  return { down, move, cancel, click, contextMenu }
}

/**
 * An instrument's icon or card: a tap switches it, a long press opens its
 * sheet. A held press fills it until the sheet opens (`holding`); until a
 * long press has opened a sheet once (useHoldHint), a bubble also says
 * what's coming (`holdLabel`; not for a mouse, which has the name beside
 * the icon). Both hold the key of the control being pressed, or null.
 */
export function useHoldToOpen<K>({ tap, open }: { tap: (key: K) => void, open: (key: K) => void }) {
  const holdHint = useHoldHint()
  const holding = shallowRef<K | null>(null)
  const holdLabel = shallowRef<K | null>(null)
  let labelTimer: ReturnType<typeof setTimeout> | undefined

  const press = useLongPress<K>({
    tap,
    longPress: (key) => {
      holdHint.learn()
      open(key)
    },
    pressed: (event, key) => {
      const hint = event.pointerType !== 'mouse' && !holdHint.learnt.value
      clearTimeout(labelTimer)
      labelTimer = setTimeout(() => {
        holding.value = key
        holdLabel.value = hint ? key : null
      }, HOLD_LABEL_DELAY_MS)
    },
    released: () => {
      clearTimeout(labelTimer)
      holding.value = null
      holdLabel.value = null
    },
  })

  return { ...press, holding, holdLabel }
}
