import { unpackCode } from '~/core/compress'
import { parseLaunchParams, parseStartParam } from '~/core/telegram'
import { findGenre } from '~/genres'
import { SHARE_CODE_PARAM, SHARE_PARAM } from '~/composables/usePatternStorage'
import { MINI_APP_VIEWPORT } from '#shared/viewport'

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
/** Set once Telegram's language has been applied, so a later pick in the switcher sticks. */
const LANGUAGE_APPLIED = 'telegram-language-applied'

/**
 * Inside Telegram (opened as a Mini App): full height, Telegram's colors
 * matched to the site, and its own Back button instead of the browser's.
 * Vertical swipes are off, or dragging across the beat grid would pull the
 * app closed; so is zoom (shared/viewport.ts, and main.css by data-telegram).
 * Controls answer with a light vibration. The first time, the site takes
 * the language Telegram is set to, if it has it (the switcher still changes
 * it after that). A link with a start parameter (core/telegram.ts) opens its genre, with the shared pattern if
 * it carries one. The SDK is loaded only there (TELEGRAM_LOADER in
 * nuxt.config.ts); elsewhere this does nothing.
 */
export default defineNuxtPlugin(() => {
  if (!inTelegram()) return
  useHead({
    meta: [{ name: 'viewport', content: MINI_APP_VIEWPORT }],
    htmlAttrs: { 'data-telegram': '' },
  })
  const router = useRouter()
  const localePath = useLocalePath()
  const switchLocalePath = useSwitchLocalePath()
  const routeBaseName = useRouteBaseName()
  const { locale, localeCodes } = useNuxtApp().$i18n

  /** Switches to Telegram's language on the first launch, if the site has it. */
  async function adoptLanguage(languageCode: string | undefined) {
    try {
      if (localStorage.getItem(LANGUAGE_APPLIED)) return
      localStorage.setItem(LANGUAGE_APPLIED, '1')
    } catch {
      return // nowhere to remember it: switching every launch would undo the user's pick
    }
    const code = languageCode?.toLowerCase().split('-')[0]
    const target = localeCodes.value.find((available) => available === code)
    if (target && target !== locale.value) await router.replace(switchLocalePath(target))
  }

  async function follow(param: string) {
    try {
      if (sessionStorage.getItem(START_FOLLOWED)) return
      sessionStorage.setItem(START_FOLLOWED, '1')
    } catch { /* storage blocked: follow it, at worst again on a reload */ }
    const start = parseStartParam(param)
    const genre = start && findGenre(start.genre)
    if (!genre) return
    // The page unpacks the pattern, as from a site link; older links carry
    // a share.ts code. One that won't unpack still opens its genre.
    const code = start.packed ? await unpackCode(start.packed) : null
    const query = start.pattern ? { [SHARE_PARAM]: start.pattern } : code ? { [SHARE_CODE_PARAM]: code } : {}
    await router.replace({ path: localePath(`/${genre.id}`), query })
  }

  function start(webApp: TelegramWebApp | null) {
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
  }

  // Language first, so a start link opens its genre in that language. Both
  // are read from the launch URL and done once the page is up, without
  // waiting for the SDK: a switch that came later could land while the user
  // is already on the way to a genre, and take them back home.
  let stored: string | null = null
  try {
    stored = sessionStorage.getItem('__telegram__initParams')
  } catch { /* storage blocked: the hash is all there is */ }
  const { language, startParam } = parseLaunchParams(location.hash, stored)
  onNuxtReady(async () => {
    await adoptLanguage(language)
    if (startParam) await follow(startParam)
  })

  whenTelegram().then(start)
})
