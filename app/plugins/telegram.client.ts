import { parseStartParam, unpackCode } from '~/core/telegram'
import { findGenre } from '~/genres'
import { SHARE_PARAM } from '~/composables/useBeatMachine'

/** The page background (neutral-950), so Telegram's header and edges blend in. */
const BACKGROUND = '#110E0D'
/**
 * A tap on the phone for every control: light for a button or a grid cell,
 * firmer for Play/Stop (Transport's .play-button), a tick when a list or
 * slider settles on a value. Listening on the document covers every
 * control, present and future.
 */
function haptics(feedback: TelegramWebApp['HapticFeedback']) {
  document.addEventListener('click', (event) => {
    const control = (event.target as Element | null)?.closest('button, a[href], [role="button"]')
    if (control) feedback.impactOccurred(control.classList.contains('play-button') ? 'medium' : 'light')
  }, { capture: true, passive: true })
  document.addEventListener('change', (event) => {
    if ((event.target as Element).matches('select, input')) feedback.selectionChanged()
  }, { capture: true, passive: true })
}

/** Set once the link's start parameter is followed, so a reload doesn't follow it again. */
const START_FOLLOWED = 'telegram-start-followed'

/**
 * Inside Telegram (opened as a Mini App): full height, Telegram's colors
 * matched to the site, and its own Back button instead of the browser's.
 * Vertical swipes are off, or dragging across the beat grid would pull the
 * app closed. Controls answer with a light vibration. A link with a start
 * parameter (core/telegram.ts) opens its genre, with the shared pattern if
 * it carries one. The SDK is loaded only there (TELEGRAM_LOADER in
 * nuxt.config.ts); elsewhere this does nothing.
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const localePath = useLocalePath()
  const routeBaseName = useRouteBaseName()

  async function follow(param: string) {
    try {
      if (sessionStorage.getItem(START_FOLLOWED)) return
      sessionStorage.setItem(START_FOLLOWED, '1')
    } catch { /* storage blocked: follow it, at worst again on a reload */ }
    const start = parseStartParam(param)
    const genre = start && findGenre(start.genre)
    if (!genre) return
    // A pattern that won't unpack still opens its genre.
    const code = start.packed ? await unpackCode(start.packed) : null
    await router.replace({ path: localePath(`/${genre.id}`), query: code ? { [SHARE_PARAM]: code } : {} })
  }

  function start() {
    const webApp = telegramWebApp()
    if (!webApp) return

    webApp.ready()
    webApp.expand()
    if (webApp.isVersionAtLeast('7.7')) webApp.disableVerticalSwipes()
    if (webApp.isVersionAtLeast('6.9')) {
      webApp.setHeaderColor(BACKGROUND)
      webApp.setBackgroundColor(BACKGROUND)
    }
    if (webApp.isVersionAtLeast('7.10')) webApp.setBottomBarColor(BACKGROUND)

    if (webApp.isVersionAtLeast('6.1')) {
      haptics(webApp.HapticFeedback)
      const { BackButton } = webApp
      const update = () => {
        if (routeBaseName(router.currentRoute.value) === 'index') BackButton.hide()
        else BackButton.show()
      }
      BackButton.onClick(() => router.push(localePath('/')))
      router.afterEach(update)
      update()
    }

    const param = webApp.initDataUnsafe.start_param
    if (param) onNuxtReady(() => follow(param))
  }

  if (window.Telegram) start()
  else window.addEventListener('telegram-sdk', start, { once: true })
})
