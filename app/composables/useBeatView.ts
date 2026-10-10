/** What a phone shows: big instrument switches for practice, the grid for editing, or (advanced mode) the mixer. */
export type BeatView = 'practice' | 'editor' | 'mixer'
const VIEWS: readonly string[] = ['practice', 'editor', 'mixer'] satisfies BeatView[]

const STORAGE_KEY = 'beat-view'

/**
 * Practice, editor or mixer view. Only phones switch between them (with CSS, so
 * the server-rendered page is right from the start); wider screens show
 * both at once. Remembered in this browser.
 */
export function useBeatView() {
  const view = useState<BeatView>('beat-view', () => 'practice')

  onMounted(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && VIEWS.includes(saved)) view.value = saved as BeatView
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
