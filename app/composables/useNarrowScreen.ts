/** Below Tailwind's `sm` breakpoint. */
const NARROW_QUERY = '(max-width: 639px)'

/**
 * True on a phone-sized screen. Always false during SSR and hydration, so
 * the server and client agree; it switches right after mounting.
 */
export function useNarrowScreen() {
  const narrow = ref(false)
  let query: MediaQueryList | undefined
  const update = () => (narrow.value = query!.matches)

  onMounted(() => {
    query = window.matchMedia(NARROW_QUERY)
    update()
    query.addEventListener('change', update)
  })
  onBeforeUnmount(() => query?.removeEventListener('change', update))

  return readonly(narrow)
}
