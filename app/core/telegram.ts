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
/** A pattern far past share.ts's largest isn't ours: stop unpacking it. */
const MAX_UNPACKED_BYTES = 16_000

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

function bytesFromBase64Url(code: string): Uint8Array<ArrayBuffer> {
  const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Runs `bytes` through a (de)compression stream, giving up past `limit` bytes of output. */
async function transform(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream, limit = Infinity) {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > limit) {
      await reader.cancel()
      throw new Error('too long')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

/** `bytes` deflated and in base64url; null where the browser can't compress (iOS before 16.4). */
export async function deflateToBase64Url(bytes: Uint8Array<ArrayBuffer>): Promise<string | null> {
  if (typeof CompressionStream === 'undefined') return null
  try {
    return bytesToBase64Url(await transform(bytes, new CompressionStream('deflate-raw')))
  } catch {
    return null
  }
}

/** What deflateToBase64Url was given; null if `packed` is broken, unpacks past `limit` bytes, or the browser can't decompress. */
export async function inflateFromBase64Url(packed: string, limit = MAX_UNPACKED_BYTES): Promise<Uint8Array<ArrayBuffer> | null> {
  if (typeof DecompressionStream === 'undefined') return null
  try {
    return await transform(bytesFromBase64Url(packed), new DecompressionStream('deflate-raw'), limit)
  } catch {
    return null
  }
}

/**
 * A share.ts code, compressed (still base64url): how a pattern is kept in
 * the Telegram cloud, and how links to the Mini App carried one before
 * packPattern (compactPattern.ts). Null where the browser can't compress.
 */
export async function packCode(code: string): Promise<string | null> {
  try {
    return await deflateToBase64Url(bytesFromBase64Url(code))
  } catch {
    return null
  }
}

/** The share.ts code packCode was given, or null if `packed` is broken or the browser can't decompress. */
export async function unpackCode(packed: string): Promise<string | null> {
  const bytes = await inflateFromBase64Url(packed)
  return bytes && bytesToBase64Url(bytes)
}
