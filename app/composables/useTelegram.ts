/** The parts of Telegram's Mini App SDK (telegram.org/js/telegram-web-app.js) the site uses. */
export interface TelegramWebApp {
  /** 'unknown' when the SDK runs outside Telegram. */
  platform: string
  initDataUnsafe: {
    /** The `startapp` parameter of the link that opened the app. */
    start_param?: string
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

/**
 * Telegram's SDK when the page runs as a Mini App, otherwise null. The SDK
 * is only loaded there (TELEGRAM_LOADER in nuxt.config.ts).
 */
export function telegramWebApp(): TelegramWebApp | null {
  if (import.meta.server) return null
  const webApp = window.Telegram?.WebApp
  return webApp && webApp.platform !== 'unknown' ? webApp : null
}
