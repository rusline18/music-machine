export interface HotkeyActions {
  togglePlay: () => void
  /** Change the tempo by this many BPM. */
  nudgeTempo: (delta: number) => void
  /** Switch the n-th instrument (from 0) on or off. */
  toggleInstrument: (index: number) => void
  /** Leave only the n-th instrument (from 0) on, or bring the others back if it already is. */
  toggleOnly: (index: number) => void
}

/**
 * The instruments' keys, in the band's order: the number row, then the row
 * under it, 24 in all (salsa has 14). By the physical key (`code`), so they
 * are the same keys in any keyboard layout; `label` is what's printed on it
 * in the usual (US) layout, for the badges on the grid.
 */
export const INSTRUMENT_KEYS: readonly { code: string, label: string }[] = [
  ...'1234567890'.split('').map((label) => ({ code: `Digit${label}`, label })),
  { code: 'Minus', label: '-' },
  { code: 'Equal', label: '=' },
  ...'QWERTYUIOP'.split('').map((label) => ({ code: `Key${label}`, label })),
  { code: 'BracketLeft', label: '[' },
  { code: 'BracketRight', label: ']' },
]

/** Typing here, or a control that uses the keys itself. */
function ownsKeys(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))
}

/** Controls that handle Space themselves when reached with Tab. */
const SPACE_CONTROLS = 'button, a, summary'

/**
 * Keyboard shortcuts for the machine: Space plays and stops, ←/→ change the
 * tempo (with Shift by 5), INSTRUMENT_KEYS switch instruments on and off
 * (with Shift, only that one stays on). Ignored while typing, with
 * Ctrl/Cmd/Alt, and inside open dialogs.
 */
export function useHotkeys(actions: HotkeyActions) {
  /** Set when Space played or stopped, so its keyup doesn't also press the clicked button. */
  let spaceTaken = false
  /**
   * The control last pressed with the mouse or a finger. It keeps the focus
   * (an instrument's icon, say), but Space is still play/stop then; only one
   * reached with Tab handles Space itself.
   */
  let pressed: Element | null = null

  function onPointerdown(event: PointerEvent) {
    pressed = event.target instanceof Element ? event.target.closest(SPACE_CONTROLS) : null
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab') pressed = null
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || ownsKeys(event.target)) return
    if (event.target instanceof Element && event.target.closest('dialog')) return

    if (event.key === ' ') {
      const control = event.target instanceof Element && event.target.closest(SPACE_CONTROLS)
      if (control && control !== pressed) return
      event.preventDefault()
      spaceTaken = true
      if (!event.repeat) actions.togglePlay()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const step = event.shiftKey ? 5 : 1
      actions.nudgeTempo(event.key === 'ArrowLeft' ? -step : step)
    } else {
      const index = INSTRUMENT_KEYS.findIndex((key) => key.code === event.code)
      if (index < 0) return
      event.preventDefault()
      if (event.shiftKey) actions.toggleOnly(index)
      else actions.toggleInstrument(index)
    }
  }

  function onKeyup(event: KeyboardEvent) {
    if (event.key !== ' ' || !spaceTaken) return
    spaceTaken = false
    event.preventDefault()
  }

  onMounted(() => {
    window.addEventListener('pointerdown', onPointerdown, true)
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('keyup', onKeyup)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('pointerdown', onPointerdown, true)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('keyup', onKeyup)
  })
}
