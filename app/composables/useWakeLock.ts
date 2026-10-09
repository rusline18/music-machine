/**
 * Keeps the screen on while `active` is true (Screen Wake Lock API), so a
 * phone on the floor doesn't go dark mid-practice. The browser drops the
 * lock when the tab is hidden; it's taken again on return. Where the API is
 * missing or refuses (low battery, not allowed), nothing happens.
 */
export function useWakeLock(active: () => boolean) {
  let sentinel: WakeLockSentinel | null = null
  /** Bumped on each request/release, so a slow request that's no longer wanted lets go. */
  let generation = 0

  async function request() {
    if (sentinel || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return
    const mine = ++generation
    try {
      const lock = await navigator.wakeLock.request('screen')
      if (mine !== generation || !active()) {
        lock.release().catch(() => {})
        return
      }
      sentinel = lock
      lock.addEventListener('release', () => {
        if (sentinel === lock) sentinel = null
      })
    } catch { /* not allowed right now: the screen may sleep */ }
  }

  function release() {
    generation++
    sentinel?.release().catch(() => {})
    sentinel = null
  }

  function onVisibility() {
    if (active() && document.visibilityState === 'visible') request()
  }

  watch(active, (on) => (on ? request() : release()))
  onMounted(() => document.addEventListener('visibilitychange', onVisibility))
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    release()
  })
}
