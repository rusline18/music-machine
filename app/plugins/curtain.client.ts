import { coveringCircle, curtainKind } from '~/core/curtain'

/** Where the next home → genre curtain starts: the tapped card's arrow, in its color. */
interface Origin {
  x: number
  y: number
  color: string
}

const GROW = { duration: 420, easing: 'cubic-bezier(.2,.7,.1,1)' }
const SHRINK = { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)' }
const FADE = { duration: 260, easing: 'ease' }
/** How long the genre page's parts take to rise in, the last one included (main.css). */
const ARRIVE_MS = 800
/** A page that never finishes (an error, a lost connection) doesn't leave the screen covered. */
const STUCK_MS = 4000

function motionOff() {
  return document.documentElement.classList.contains('no-motion')
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Resolves once the new page has painted and the main thread is free
 * (mounting the beat machine keeps it busy for a moment), so what comes
 * next starts smoothly instead of in the middle of that work.
 */
function settled() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
    if (window.requestIdleCallback) window.requestIdleCallback(() => resolve(), { timeout: 500 })
    else setTimeout(resolve, 100)
  })))
}

function center(element: Element) {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/**
 * The curtain between the home page and a genre. Forward: a circle of the
 * genre's color grows out of the tapped card's arrow until it covers the
 * screen, the genre page renders underneath, and the curtain melts away
 * while the page's parts rise in. Back: the curtain fades in over the
 * genre and shrinks into that genre's arrow on the home page.
 *
 * One fixed element, animated by transform and opacity only, so it runs
 * on the compositor. Skipped when motion is off and on the browser's own
 * back/forward (a phone's swipe already animates); those keep the plain
 * page fade.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()

  const curtain = document.createElement('div')
  curtain.className = 'genre-curtain'
  curtain.setAttribute('aria-hidden', 'true')
  document.body.append(curtain)

  let origin: Origin | undefined
  let pending: { kind: 'enter' | 'leave', genre: string, lifting?: boolean } | undefined
  let fromHistory = false
  let stuck: ReturnType<typeof setTimeout> | undefined

  window.addEventListener('popstate', () => (fromHistory = true))

  function place(x: number, y: number) {
    const circle = coveringCircle(x, y, window.innerWidth, window.innerHeight)
    Object.assign(curtain.style, {
      left: `${circle.left}px`,
      top: `${circle.top}px`,
      width: `${circle.size}px`,
      height: `${circle.size}px`,
    })
    return circle.arrowScale
  }

  function show(color: string) {
    curtain.style.backgroundColor = color
    curtain.classList.add('is-on')
    clearTimeout(stuck)
    stuck = setTimeout(hide, STUCK_MS)
  }

  function hide() {
    clearTimeout(stuck)
    curtain.classList.remove('is-on')
    for (const animation of curtain.getAnimations()) animation.cancel()
    pending = undefined
  }

  /** Runs an animation and waits for it; a cancelled one (hide) counts as done. Holds its last frame until hide. */
  async function play(keyframes: Keyframe[], timing: KeyframeAnimationOptions) {
    await curtain.animate(keyframes, { ...timing, fill: 'forwards' }).finished.catch(() => {})
  }

  router.beforeEach(async (to, from) => {
    const viaHistory = fromHistory
    fromHistory = false
    const kind = curtainKind(from.name?.toString(), to.name?.toString())
    const start = origin
    origin = undefined
    if (!kind || viaHistory || pending || motionOff()) return
    if (kind === 'enter' && !start) return

    // The curtain is the transition; the page's own fade would only add a wait.
    to.meta.pageTransition = false

    if (kind === 'enter' && start) {
      const arrowScale = place(start.x, start.y)
      show(start.color)
      pending = { kind, genre: String(to.params.genre) }
      await play([{ transform: `scale(${arrowScale})` }, { transform: 'none' }], GROW)
    } else {
      // The accent channels of the genre being left (main.css), e.g. "47 198 180".
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-500').trim()
      place(window.innerWidth / 2, window.innerHeight / 2)
      show(`rgb(${accent})`)
      pending = { kind, genre: String(from.params.genre) }
      await play([{ opacity: 0 }, { opacity: 1 }], FADE)
    }
  })

  router.afterEach((_to, _from, failure) => {
    if (failure && pending) hide()
  })

  async function lift(kind: 'enter' | 'leave', genre: string) {
    await settled()
    if (kind === 'enter') {
      const root = document.documentElement
      root.classList.add('curtain-arrive')
      await play([{ opacity: 1 }, { opacity: 0 }], FADE)
      setTimeout(() => root.classList.remove('curtain-arrive'), ARRIVE_MS - FADE.duration)
    } else {
      const arrow = document.querySelector(`[data-genre="${CSS.escape(genre)}"] [data-curtain-target]`)
      if (arrow) {
        const { x, y } = center(arrow)
        const arrowScale = place(x, y)
        await play([{ transform: 'none' }, { transform: `scale(${arrowScale})` }], SHRINK)
      } else {
        await play([{ opacity: 1 }, { opacity: 0 }], FADE)
      }
    }
    hide()
  }

  // The new page is rendered (under the curtain): lift it. Not awaited:
  // Nuxt waits on this hook to scroll the new page.
  nuxtApp.hook('page:finish', () => {
    if (!pending || pending.lifting) return
    pending.lifting = true
    lift(pending.kind, pending.genre)
  })

  return {
    provide: {
      curtain: {
        /** Call on a genre card's click: the curtain will grow out of its arrow, in the card's color. */
        aim(card: HTMLElement) {
          const arrow = card.querySelector('[data-curtain-target]') ?? card
          origin = { ...center(arrow), color: getComputedStyle(card).backgroundColor }
        },
      },
    },
  }
})
