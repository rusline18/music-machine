export interface HotkeyActions {
  togglePlay: () => void
  /** Change the tempo by this many BPM. */
  nudgeTempo: (delta: number) => void
  /** Switch the n-th instrument (from 0) on or off. */
  toggleInstrument: (index: number) => void
  /** Play the n-th instrument (from 0) on its own, or the whole band again if it already is. */
  toggleSolo: (index: number) => void
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

/**
 * Keyboard shortcuts for the machine: Space plays and stops, ←/→ change the
 * tempo (with Shift by 5), INSTRUMENT_KEYS switch instruments on and off
 * (with Shift, play one alone). Ignored while typing, with Ctrl/Cmd/Alt,
 * and inside open dialogs.
 */
export function useHotkeys(actions: HotkeyActions) {
  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || ownsKeys(event.target)) return
    if (event.target instanceof Element && event.target.closest('dialog')) return

    if (event.key === ' ') {
      // A focused button or link handles Space itself (Play/Stop included).
      if (event.target instanceof Element && event.target.closest('button, a, summary')) return
      event.preventDefault()
      actions.togglePlay()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const step = event.shiftKey ? 5 : 1
      actions.nudgeTempo(event.key === 'ArrowLeft' ? -step : step)
    } else {
      const index = INSTRUMENT_KEYS.findIndex((key) => key.code === event.code)
      if (index < 0) return
      event.preventDefault()
      if (event.shiftKey) actions.toggleSolo(index)
      else actions.toggleInstrument(index)
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
