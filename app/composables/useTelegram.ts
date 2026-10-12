/** The parts of Telegram's Mini App SDK (telegram.org/js/telegram-web-app.js) the site uses. */
export interface TelegramWebApp {
  /** 'unknown' when the SDK runs outside Telegram. */
  platform: string
  initDataUnsafe: {
    /** The `startapp` parameter of the link that opened the app. */
    start_param?: string
    /** Who opened the app; `language_code` is their Telegram language (IETF tag: "ru", "pt-br"). */
    user?: { language_code?: string }
  }
  isVersionAtLeast(version: string): boolean
  ready(): void
  expand(): void
  disableVerticalSwipes(): void
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  setBottomBarColor(color: string): void
  openTelegramLink(url: string): void
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
