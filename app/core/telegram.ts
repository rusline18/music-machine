/**
 * Links that open the site as a Telegram Mini App: t.me/<bot>?startapp=<param>.
 * Telegram hands <param> to the app and allows up to 512 characters of
 * A–Z, a–z, 0–9, `_` and `-`. Ours is a genre id, optionally followed by
 * `_` and a shared pattern (share.ts) compressed to fit: a salsa code is
 * ~790 characters as it is, ~350 compressed.
 */

export const MAX_START_PARAM = 512
const START_PARAM = /^([a-z]+)(?:_([\w-]+))?$/
/** Telegram usernames: 5–32 letters, digits and underscores. */
const BOT_USERNAME = /^\w{5,32}$/
/** A pattern far past share.ts's largest isn't ours: stop unpacking it. */
const MAX_UNPACKED_BYTES = 16_000

export interface StartParam {
  genre: string
  /** A pattern, compressed by packCode. */
  packed?: string
}

/** What a start parameter asks for, or null if it isn't one of ours. */
export function parseStartParam(param: string): StartParam | null {
  if (param.length > MAX_START_PARAM) return null
  const match = param.match(START_PARAM)
  if (!match) return null
  return match[2] ? { genre: match[1]!, packed: match[2] } : { genre: match[1]! }
}

/** The start parameter for a genre and maybe a packed pattern; null if it's too long for Telegram. */
export function startParam(genre: string, packed?: string): string | null {
  const param = packed ? `${genre}_${packed}` : genre
  return parseStartParam(param) ? param : null
}

/** A link that opens the Mini App of `bot` with `param`; null if `bot` isn't a username. */
export function miniAppLink(bot: string, param: string): string | null {
  return BOT_USERNAME.test(bot) ? `https://t.me/${bot}?startapp=${param}` : null
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

/**
 * A share.ts code, compressed for a start parameter (still base64url).
 * Null where the browser can't compress (iOS before 16.4).
 */
export async function packCode(code: string): Promise<string | null> {
  if (typeof CompressionStream === 'undefined') return null
  try {
    return bytesToBase64Url(await transform(bytesFromBase64Url(code), new CompressionStream('deflate-raw')))
  } catch {
    return null
  }
}

/** The share.ts code packCode was given, or null if `packed` is broken or the browser can't decompress. */
export async function unpackCode(packed: string): Promise<string | null> {
  if (typeof DecompressionStream === 'undefined') return null
  try {
    return bytesToBase64Url(await transform(bytesFromBase64Url(packed), new DecompressionStream('deflate-raw'), MAX_UNPACKED_BYTES))
  } catch {
    return null
  }
}
