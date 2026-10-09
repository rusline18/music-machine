import { playableFile } from './engine'

/** Files already asked for on this page, so each is fetched once. */
const requested = new Set<string>()

/** The user asked the browser to save data: download sounds only when they're played. */
function savingData(): boolean {
  return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
}

/**
 * Downloads samples ahead of time, at low priority, without decoding them:
 * they land in the HTTP cache (and the service worker's), so a genre page
 * opened next plays at once. Failures are forgotten and tried again later.
 */
export function prefetchSamples(urls: Iterable<string>) {
  if (savingData()) return
  for (const url of urls) {
    const file = playableFile(url)
    if (requested.has(file)) continue
    requested.add(file)
    fetch(file, { priority: 'low' } as RequestInit)
      .then((response) => response.arrayBuffer())
      .catch(() => requested.delete(file))
  }
}
