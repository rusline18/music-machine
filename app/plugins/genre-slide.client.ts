import { slideDirection } from '~/core/slide'
import { genres } from '~/genres'

/** A page that never finishes (an error, a lost connection) doesn't leave the screen frozen. */
const STUCK_MS = 4000

function motionOff() {
  return document.documentElement.classList.contains('no-motion')
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * The slide between genres (the switch next to Back): the switch's pill
 * moves over to the genre picked, and the page slides out toward it while
 * the new genre slides in from the other side (main.css).
 *
 * Done with the View Transitions API: the browser shows a still of the old
 * page while the new one mounts, then animates the stills of both on the
 * compositor, so the two beat machines are never on screen together.
 * Skipped when motion is off, on the browser's own back/forward, and where
 * the API is missing; those keep the plain page fade.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!document.startViewTransition) return
  const router = useRouter()
  const order = genres.map((genre) => genre.id)

  /** Lets the slide go on once the new genre is on the page. */
  let rendered: (() => void) | undefined
  let fromHistory = false

  window.addEventListener('popstate', () => (fromHistory = true))

  router.beforeEach((to, from) => {
    const viaHistory = fromHistory
    fromHistory = false
    const direction = slideDirection(
      { name: from.name?.toString(), genre: from.params.genre?.toString() },
      { name: to.name?.toString(), genre: to.params.genre?.toString() },
      order,
    )
    if (!direction || viaHistory || rendered || motionOff()) return

    // The slide is the transition; the page's own fade would only add a wait.
    to.meta.pageTransition = false
    document.documentElement.style.setProperty('--slide-direction', String(direction))

    const shown = new Promise<void>((resolve) => {
      rendered = resolve
      setTimeout(resolve, STUCK_MS)
    })
    // The route changes once the browser has taken the still of the old page.
    return new Promise<void>((goOn) => {
      const transition = document.startViewTransition(() => {
        goOn()
        return shown
      })
      transition.finished.finally(() => (rendered = undefined))
    })
  })

  router.afterEach((_to, _from, failure) => {
    if (failure) rendered?.()
  })

  nuxtApp.hook('page:finish', () => rendered?.())
})
