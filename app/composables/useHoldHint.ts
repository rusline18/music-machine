const STORAGE_KEY = 'hold-hint-learnt'

/** Shared by every row: once one long press has opened a sheet, no row hints again. */
const learnt = ref(false)
let read = false

/**
 * The hint on a held instrument icon ("keep holding — the sheet opens"),
 * shown until the user has opened a sheet that way once; remembered on
 * this device. Read after mounting: the server has no localStorage.
 */
export function useHoldHint() {
  onMounted(() => {
    if (read) return
    read = true
    try {
      learnt.value = localStorage.getItem(STORAGE_KEY) === '1'
    } catch { /* storage blocked: hint again next visit */ }
  })

  function learn() {
    if (learnt.value) return
    learnt.value = true
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch { /* not remembered, but no more hints this visit */ }
  }

  return { learnt: readonly(learnt), learn }
}
