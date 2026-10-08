import type { Pattern } from './pattern'

/**
 * The instruments a layer-by-layer build brings in, one at a time: the
 * genre's teaching order, limited to tracks that play in this pattern (not
 * muted, at least one hit), so the last layer sounds like the preset.
 */
export function layerOrder(pattern: Pattern, teachingOrder: readonly string[]): string[] {
  return teachingOrder.filter((instrument) => {
    const track = pattern.tracks.find((t) => t.instrument === instrument)
    return track !== undefined && !track.muted && track.steps.some((step) => step !== null)
  })
}
