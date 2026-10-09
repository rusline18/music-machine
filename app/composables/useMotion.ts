const STORAGE_KEY = 'animation'

/**
 * Whether to animate: off when the system asks for reduced motion, or when
 * switched off here (remembered in this browser). While off, <html> gets
 * the `no-motion` class, which stills CSS transitions too (main.css).
 */
export function useMotion() {
  const switchedOff = useState('motion-switched-off', () => false)
  const reduced = useState('motion-reduced', () => false)

  onMounted(() => {
    try {
      switchedOff.value = localStorage.getItem(STORAGE_KEY) === 'off'
    } catch { /* storage blocked: animate */ }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced.value = query.matches
    query.addEventListener('change', (event) => (reduced.value = event.matches))
  })

  watch(switchedOff, (off) => document.documentElement.classList.toggle('no-motion', off), { immediate: import.meta.client })

  function setSwitchedOff(off: boolean) {
    switchedOff.value = off
    try {
      localStorage.setItem(STORAGE_KEY, off ? 'off' : 'on')
    } catch { /* not remembered */ }
  }

  return {
    /** Animations wanted: neither the system nor the user said no. */
    enabled: computed(() => !switchedOff.value && !reduced.value),
    switchedOff: readonly(switchedOff),
    setSwitchedOff,
  }
}
