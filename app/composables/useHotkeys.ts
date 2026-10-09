export interface HotkeyActions {
  togglePlay: () => void
  /** Change the tempo by this many BPM. */
  nudgeTempo: (delta: number) => void
  /** Switch the n-th instrument (from 0) on or off. */
  toggleInstrument: (index: number) => void
}

/** Typing here, or a control that uses the keys itself. */
function ownsKeys(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))
}

/**
 * Keyboard shortcuts for the machine: Space plays and stops, ←/→ change the
 * tempo (with Shift by 5), 1–9 switch instruments on and off. Ignored while
 * typing, with Ctrl/Cmd/Alt, and inside open dialogs.
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
    } else if (/^[1-9]$/.test(event.key) && !event.shiftKey) {
      actions.toggleInstrument(Number(event.key) - 1)
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
