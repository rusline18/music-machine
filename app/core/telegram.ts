/**
 * Links that open the site as a Telegram Mini App: t.me/<bot>?startapp=<param>.
 * Telegram hands <param> to the app and allows up to 512 characters of
 * A–Z, a–z, 0–9, `_` and `-`. Ours is a genre id, optionally followed by
 * `-` and a pattern packed by packPattern (compactPattern.ts): a preset
 * with a few steps changed takes ~20 characters. Older links have `_` and
 * a share.ts code compressed by packCode (~350 characters) instead.
 */

export const MAX_START_PARAM = 512
const START_PARAM = /^([a-z]+)(?:([_-])([\w-]+))?$/
/** Telegram usernames: 5–32 letters, digits and underscores. */
const BOT_USERNAME = /^\w{5,32}$/

export interface StartParam {
  genre: string
  /** A pattern packed by packPattern (compactPattern.ts). */
  pattern?: string
  /** A pattern from an older link: a share.ts code compressed by packCode. */
  packed?: string
}

/** What a start parameter asks for, or null if it isn't one of ours. */
export function parseStartParam(param: string): StartParam | null {
  if (param.length > MAX_START_PARAM) return null
  const match = param.match(START_PARAM)
  if (!match) return null
  const [, genre, separator, value] = match
  if (!value) return { genre: genre! }
  return separator === '-' ? { genre: genre!, pattern: value } : { genre: genre!, packed: value }
}

/** The start parameter for a genre and maybe a pattern packed by packPattern; null if it's too long for Telegram. */
export function startParam(genre: string, pattern?: string): string | null {
  const param = pattern ? `${genre}-${pattern}` : genre
  return parseStartParam(param) ? param : null
}

/** A link that opens the Mini App of `bot` with `param`; null if `bot` isn't a username. */
export function miniAppLink(bot: string, param: string): string | null {
  return BOT_USERNAME.test(bot) ? `https://t.me/${bot}?startapp=${param}` : null
}

/** What the site needs of the parameters Telegram launches the Mini App with. */
export interface LaunchParams {
  /** The `startapp` parameter of the link that opened the app. */
  startParam?: string
  /** The user's Telegram language (IETF tag: "ru", "pt-br"). */
  language?: string
}

/**
 * Reads Telegram's launch parameters from the URL hash (#tgWebAppData=…)
 * or, after a reload, from `stored`: the copy its SDK keeps in
 * sessionStorage (`__telegram__initParams`). Needs no SDK.
 */
export function parseLaunchParams(hash: string, stored: string | null): LaunchParams {
  let data = new URLSearchParams(hash.replace(/^#/, '')).get('tgWebAppData')
  if (data === null && stored) {
    try {
      const params: unknown = JSON.parse(stored)
      const value = (params as { tgWebAppData?: unknown } | null)?.tgWebAppData
      if (typeof value === 'string') data = value
    } catch { /* not the SDK's */ }
  }
  if (!data) return {}
  const init = new URLSearchParams(data)
  let language: unknown
  try {
    language = (JSON.parse(init.get('user') ?? '') as { language_code?: unknown } | null)?.language_code
  } catch { /* no user */ }
  return {
    startParam: init.get('start_param') || undefined,
    language: typeof language === 'string' ? language : undefined,
  }
}

/** Telegram's "share to a chat" link for `url`, with `text` as the message. */
export function telegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
}
