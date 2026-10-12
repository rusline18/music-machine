const MIN_SWEEP_SIZE = 10_000

/**
 * In-memory sliding-window limiter: at most `limit` hits per key within
 * `windowMs`. Per server process, so it resets on restart and isn't shared
 * between instances — enough to blunt spam, not a quota system.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: { limit: number, windowMs: number, now?: () => number }) {
  const hits = new Map<string, number[]>()
  /** Map size that triggers forgetting idle keys; grows with the active ones, so a sweep isn't run on every hit. */
  let sweepAt = MIN_SWEEP_SIZE

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
    if (hits.size > sweepAt) {
      for (const [k, times] of hits) {
        if (times.every((t) => time - t >= windowMs)) hits.delete(k)
      }
      sweepAt = Math.max(MIN_SWEEP_SIZE, hits.size * 2)
    }
    return true
  }
}

/**
 * What a rate limit counts by: the IPv4 address, or an IPv6 address's /64
 * network. One connection usually gets a whole /64, so counting single
 * IPv6 addresses would let one sender rotate through endless "clients".
 */
export function clientKey(ip: string): string {
  if (!ip.includes(':')) return ip
  const address = ip.split('%')[0]!.toLowerCase()
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return mapped[1]!
  const [head = '', tail] = address.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = tail === undefined ? left : [...left, ...Array<string>(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right]
  return `${groups.slice(0, 4).map((group) => (Number.parseInt(group, 16) || 0).toString(16)).join(':')}::/64`
}
