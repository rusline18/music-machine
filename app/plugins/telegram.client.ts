/** The parts of Telegram's Mini App SDK (telegram.org/js/telegram-web-app.js) the site uses. */
interface TelegramWebApp {
  /** 'unknown' when the SDK runs outside Telegram. */
  platform: string
  isVersionAtLeast(version: string): boolean
  ready(): void
  expand(): void
  disableVerticalSwipes(): void
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  setBottomBarColor(color: string): void
  BackButton: {
    show(): void
    hide(): void
    onClick(callback: () => void): void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

/** The page background (neutral-950), so Telegram's header and edges blend in. */
const BACKGROUND = '#110E0D'

/**
 * Inside Telegram (opened as a Mini App): full height, Telegram's colors
 * matched to the site, and its own Back button instead of the browser's.
 * Vertical swipes are off, or dragging across the beat grid would pull the
 * app closed. The SDK is loaded only there (TELEGRAM_LOADER in nuxt.config.ts);
 * elsewhere this does nothing.
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const localePath = useLocalePath()
  const routeBaseName = useRouteBaseName()

  function start() {
    const webApp = window.Telegram?.WebApp
    if (!webApp || webApp.platform === 'unknown') return

    webApp.ready()
    webApp.expand()
    if (webApp.isVersionAtLeast('7.7')) webApp.disableVerticalSwipes()
    if (webApp.isVersionAtLeast('6.9')) {
      webApp.setHeaderColor(BACKGROUND)
      webApp.setBackgroundColor(BACKGROUND)
    }
    if (webApp.isVersionAtLeast('7.10')) webApp.setBottomBarColor(BACKGROUND)

    if (webApp.isVersionAtLeast('6.1')) {
      const { BackButton } = webApp
      const update = () => {
        if (routeBaseName(router.currentRoute.value) === 'index') BackButton.hide()
        else BackButton.show()
      }
      BackButton.onClick(() => router.push(localePath('/')))
      router.afterEach(update)
      update()
    }
  }

  if (window.Telegram) start()
  else window.addEventListener('telegram-sdk', start, { once: true })
})
