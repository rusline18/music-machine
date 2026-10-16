/**
 * Compression for links and the Telegram cloud: bytes deflated with the
 * browser's own CompressionStream, written in base64url so they fit in a
 * URL. Used by packPattern (compactPattern.ts) and for share.ts codes kept
 * in the Telegram cloud or carried by older Mini App links.
 */

/** A pattern far past share.ts's largest isn't ours: stop unpacking it. */
const MAX_UNPACKED_BYTES = 16_000

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
