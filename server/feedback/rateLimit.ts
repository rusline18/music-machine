/**
 * In-memory sliding-window limiter: at most `limit` hits per key within
 * `windowMs`. Per server process, so it resets on restart and isn't shared
 * between instances — enough to blunt spam, not a quota system.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: { limit: number, windowMs: number, now?: () => number }) {
  const hits = new Map<string, number[]>()

  /** Records a hit for `key` and says whether it's within the limit. */
  return function allow(key: string): boolean {
    const time = now()
    const recent = (hits.get(key) ?? []).filter((t) => time - t < windowMs)
    if (recent.length >= limit) {
      hits.set(key, recent)
      return false
    }
    recent.push(time)
    hits.set(key, recent)
    // Forget idle keys now and then so the map can't grow without bound.
    if (hits.size > 10_000) {
      for (const [k, times] of hits) {
        if (times.every((t) => time - t >= windowMs)) hits.delete(k)
      }
    }
    return true
  }
}
