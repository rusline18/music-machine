export type UiMode = 'simple' | 'advanced'

const STORAGE_KEY = 'ui-mode'

/**
 * Simple mode for beginners, or every control ("Advanced features").
 * Only changes what's shown: the pattern and sound are the same in both.
 * Remembered in this browser; the server always renders simple mode.
 */
export function useUiMode() {
  const mode = useState<UiMode>('ui-mode', () => 'simple')

  onMounted(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'advanced') mode.value = 'advanced'
    } catch {
      // Storage blocked (private window, settings): stay in simple mode.
    }
  })

  function setMode(next: UiMode) {
    mode.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not remembered, but still switched for this visit.
    }
  }

  return {
    advanced: computed(() => mode.value === 'advanced'),
    setMode,
  }
}
