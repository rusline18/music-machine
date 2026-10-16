import { unpackPattern } from '~/core/compactPattern'
import { packCode, unpackCode } from '~/core/compress'
import type { Pattern } from '~/core/pattern'
import { decodePattern, encodePattern } from '~/core/share'
import type { Genre } from '~/genres'

/**
 * Where a pattern lives besides the page. Two link formats are read:
 *   ?b=… packed by packPattern (core/compactPattern.ts): what links carry now
 *   ?p=… a share.ts code: older links, and browsers that can't compress
 * The last visit's pattern is kept in localStorage (as a share.ts code), and
 * inside Telegram also in the user's Telegram cloud (packed by packCode).
 */

/** Query parameter carrying a shared pattern, packed by packPattern (core/compactPattern.ts): /salsa?b=… */
export const SHARE_PARAM = 'b'
/** The same as a share.ts code: older links, and browsers that can't compress. */
export const SHARE_CODE_PARAM = 'p'
const storageKey = (genreId: string) => `latin-beat-machine:pattern:${genreId}`
/** The same pattern in the user's Telegram cloud (CloudStorage keys: letters, digits, _ and -). */
const cloudKey = (genreId: string) => `pattern-${genreId}`
/** Edits come in bursts of taps: the cloud is written once they pause. */
const CLOUD_SAVE_DELAY_MS = 1000

/**
 * Restores the pattern on mount (a link wins over the last visit) and saves
 * every edit. `shareCode` is the current pattern's share.ts code;
 * `loadPattern` swaps a restored one in.
 */
export function usePatternStorage(genre: Genre, pattern: Ref<Pattern>, shareCode: Ref<string>, loadPattern: (next: Pattern) => void) {
  // Both are read after mounting: the server has no localStorage, and
  // rendering the preset first keeps hydration consistent.
  const route = useRoute()
  const router = useRouter()
  onMounted(async () => {
    const { [SHARE_PARAM]: packed, [SHARE_CODE_PARAM]: code, ...query } = route.query
    const fromLink = typeof packed === 'string' || typeof code === 'string'
    let restored: Pattern | null = null
    if (fromLink) {
      // Drop the code from the address bar: edits from here on are the
      // user's own and get saved locally instead.
      router.replace({ query })
      const before = shareCode.value
      restored = typeof packed === 'string' ? await unpackPattern(packed, genre) : decodePattern(code as string, genre)
      // Unpacking waits for the browser: a tap on the grid meanwhile wins.
      if (shareCode.value !== before) return
    }
    if (!restored) {
      try {
        const saved = localStorage.getItem(storageKey(genre.id))
        if (saved) restored = decodePattern(saved, genre)
      } catch { /* storage blocked: start from the preset */ }
    }
    if (restored) loadPattern(restored)
    if (!fromLink && inTelegram()) restoreFromCloud()
  })

  // Inside Telegram the pattern is also kept in the user's Telegram cloud,
  // so it follows them from phone to computer. The cloud copy wins over
  // this device's, unless the user has started editing before it arrives.
  let cloudRead: Promise<void> = Promise.resolve()
  function restoreFromCloud() {
    const before = shareCode.value
    cloudRead = (async () => {
      const packed = await cloudGet(cloudKey(genre.id))
      const code = packed && await unpackCode(packed)
      const fromCloud = code && decodePattern(code, genre)
      if (fromCloud && shareCode.value === before) loadPattern(fromCloud)
    })()
  }

  /** Bumped by every save, so a slower, older one gives way. */
  let cloudSaves = 0
  let cloudTimer: ReturnType<typeof setTimeout> | undefined
  /** Saves `code` to the cloud, or removes it for null (an untouched preset). */
  function saveToCloud(code: string | null) {
    if (!inTelegram()) return
    const save = ++cloudSaves
    clearTimeout(cloudTimer)
    cloudTimer = setTimeout(async () => {
      // Not before the cloud's own copy is in, or this device's older one would overwrite it.
      await cloudRead
      const packed = code === null ? null : await packCode(code)
      if (save !== cloudSaves) return
      if (code === null) cloudSet(cloudKey(genre.id), null)
      // Too long for a cloud value (a long song), or no compression on this phone: this device only.
      else if (packed && packed.length <= CLOUD_VALUE_MAX) cloudSet(cloudKey(genre.id), packed)
    }, CLOUD_SAVE_DELAY_MS)
  }

  /** Presets never change (loading one clones it), so each one's code is worked out once. */
  const presetCodes = new Map<string, string>()
  function presetCode(id: string): string | undefined {
    const preset = genre.presets.find((p) => p.id === id)
    if (!preset) return undefined
    let code = presetCodes.get(id)
    if (code === undefined) presetCodes.set(id, (code = encodePattern(preset, genre)))
    return code
  }

  // Only edits are kept: an untouched preset isn't stored, so it picks up
  // fixes to the preset data on the next visit.
  watch(shareCode, (code) => {
    const edited = presetCode(pattern.value.id) !== code
    try {
      if (edited) localStorage.setItem(storageKey(genre.id), code)
      else localStorage.removeItem(storageKey(genre.id))
    } catch { /* storage full or blocked: nothing to save to */ }
    saveToCloud(edited ? code : null)
  })
}
