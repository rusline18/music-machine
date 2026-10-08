/**
 * `url` if it's a well-formed https:// link, otherwise undefined. Guards
 * links that come from configuration (like the donation page) against a
 * typo or a `javascript:` URL ending up in an href.
 */
export function safeExternalUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url).protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}
