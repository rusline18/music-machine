/** What a phone shows: big instrument switches for practice, or the grid for editing. */
export type BeatView = 'practice' | 'editor'

const STORAGE_KEY = 'beat-view'

/**
 * Practice or editor view. Only phones switch between them (with CSS, so
 * the server-rendered page is right from the start); wider screens show
 * both at once. Remembered in this browser.
 */
export function useBeatView() {
  const view = useState<BeatView>('beat-view', () => 'practice')

  onMounted(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'editor') view.value = 'editor'
    } catch { /* storage blocked: practice */ }
  })

  function setView(next: BeatView) {
    view.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch { /* not remembered */ }
  }

  return { view: readonly(view), setView }
}
