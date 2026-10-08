/** Tempo buttons for beginners, relative to the tempo a preset is written at. */
export const TEMPO_CHOICES = ['slow', 'normal', 'fast'] as const
export type TempoChoice = (typeof TEMPO_CHOICES)[number]

const TEMPO_FACTORS: Record<TempoChoice, number> = { slow: 0.8, normal: 1, fast: 1.15 }

/** The BPM for a choice, given the preset's own tempo and the genre's slider range. */
export function tempoFor(choice: TempoChoice, presetBpm: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, Math.round(presetBpm * TEMPO_FACTORS[choice])))
}

/** Which choice `bpm` is, or undefined if it was set some other way (the slider). */
export function tempoChoice(bpm: number, presetBpm: number, range: readonly [number, number]): TempoChoice | undefined {
  return TEMPO_CHOICES.find((choice) => tempoFor(choice, presetBpm, range) === bpm)
}
