/** The parts of Telegram's Mini App SDK (public/telegram-web-app.js) the site uses. */
export interface TelegramWebApp {
  /** 'unknown' when the SDK runs outside Telegram. */
  platform: string
  isVersionAtLeast(version: string): boolean
  ready(): void
  expand(): void
  disableVerticalSwipes(): void
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  setBottomBarColor(color: string): void
  openTelegramLink(url: string): void
  enableClosingConfirmation(): void
  /** Telegram 8.0+: offers to put a shortcut to the Mini App on the phone's home screen. */
  addToHomeScreen(): void
  /** 'missed': it can be added and isn't yet; 'added', 'unsupported' or 'unknown' otherwise. */
  checkHomeScreenStatus(callback: (status: 'unsupported' | 'unknown' | 'added' | 'missed') => void): void
  onEvent(event: 'homeScreenAdded', handler: () => void): void
  offEvent(event: 'homeScreenAdded', handler: () => void): void
  disableClosingConfirmation(): void
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
    selectionChanged(): void
  }
  /** Up to 1024 keys per user, values up to 4096 characters (Telegram 6.9+). */
  CloudStorage: {
    getItem(key: string, callback: (error: string | null, value?: string) => void): void
    setItem(key: string, value: string, callback?: (error: string | null) => void): void
    removeItem(key: string, callback?: (error: string | null) => void): void
  }
  BackButton: {
    show(): void
    hide(): void
    onClick(callback: () => void): void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
    /** Set by TELEGRAM_LOADER (nuxt.config.ts) when the page was opened as a Mini App. */
    telegramReady?: Promise<void>
  }
}

/**
 * Telegram's SDK when the page runs as a Mini App, otherwise null. The SDK
 * is only loaded there (TELEGRAM_LOADER in nuxt.config.ts).
 */
export function telegramWebApp(): TelegramWebApp | null {
  if (import.meta.server) return null
  const webApp = window.Telegram?.WebApp
  return webApp && webApp.platform !== 'unknown' ? webApp : null
}

/** Whether the page was opened as a Mini App (its SDK may still be loading). */
export function inTelegram(): boolean {
  return import.meta.client && Boolean(window.telegramReady)
}

/** The SDK once it has loaded, inside Telegram; null at once everywhere else. */
export async function whenTelegram(): Promise<TelegramWebApp | null> {
  if (!inTelegram()) return null
  await window.telegramReady
  return telegramWebApp()
}

/** Longest value Telegram's CloudStorage keeps. */
export const CLOUD_VALUE_MAX = 4096

async function cloudStorage() {
  const webApp = await whenTelegram()
  return webApp?.isVersionAtLeast('6.9') ? webApp.CloudStorage : null
}

/**
 * A value from the user's Telegram cloud: the same on every device they use
 * Telegram on. Null outside Telegram, on errors and for missing keys.
 */
export async function cloudGet(key: string): Promise<string | null> {
  const cloud = await cloudStorage()
  if (!cloud) return null
  return new Promise((resolve) => cloud.getItem(key, (error, value) => resolve(error || !value ? null : value)))
}

/** Stores `value` in the user's Telegram cloud, or removes the key for null. Does nothing outside Telegram. */
export async function cloudSet(key: string, value: string | null): Promise<void> {
  const cloud = await cloudStorage()
  if (!cloud) return
  await new Promise<void>((resolve) => {
    if (value === null) cloud.removeItem(key, () => resolve())
    else cloud.setItem(key, value, () => resolve())
  })
}

/**
 * Inside Telegram, asks "close anyway?" before the Mini App closes while
 * `active` is true (Telegram 6.2+), so a stray tap on its close button
 * doesn't cut a practice short. Elsewhere nothing happens.
 */
export function useClosingConfirmation(active: () => boolean) {
  async function apply(on: boolean) {
    const webApp = await whenTelegram()
    if (!webApp?.isVersionAtLeast('6.2')) return
    if (on && active()) webApp.enableClosingConfirmation()
    else webApp.disableClosingConfirmation()
  }

  watch(active, apply)
  onBeforeUnmount(() => apply(false))
}

/**
 * Inside Telegram 8.0+, whether the Mini App can still be put on the
 * phone's home screen, and the call that offers it. `available` stays
 * false everywhere else, and once the shortcut is there.
 */
export function useHomeScreen() {
  const available = ref(false)
  let webApp: TelegramWebApp | null = null
  const added = () => (available.value = false)

  onMounted(async () => {
    webApp = await whenTelegram()
    if (!webApp?.isVersionAtLeast('8.0')) return
    webApp.onEvent('homeScreenAdded', added)
    webApp.checkHomeScreenStatus((status) => (available.value = status === 'missed'))
  })
  onBeforeUnmount(() => webApp?.offEvent('homeScreenAdded', added))

  return { available: readonly(available), add: () => webApp?.addToHomeScreen() }
}
