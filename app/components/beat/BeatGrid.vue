<script setup lang="ts">
import { CHORD_NAMES } from '~/core/harmony'
import type { Pattern } from '~/core/pattern'
import { COUNTS_PER_BAR, COUNTS_PER_BLOCK } from '~/core/pattern'

const props = defineProps<{
  pattern: Pattern
  /** What each step of an instrument can be set to. */
  stepNames: (instrument: string) => string[]
  /** The step sounding now, or -1 when stopped. */
  activeStep: number
}>()

const emit = defineEmits<{
  'toggle-step': [instrument: string, stepIndex: number]
  'update:volume': [instrument: string, volume: number]
  'update:muted': [instrument: string, muted: boolean]
  'update:chord': [bar: number, chord: string]
}>()

const { t } = useI18n()

const BARS_PER_BLOCK = COUNTS_PER_BLOCK / COUNTS_PER_BAR

// The grid is drawn one 8-count block at a time, matching how dancers
// phrase the music; each block's header is labelled 1–8.
const stepsPerBlock = computed(() => COUNTS_PER_BLOCK * props.pattern.stepsPerCount)
const blockCount = computed(() => Math.ceil(props.pattern.counts / COUNTS_PER_BLOCK))

/** Bar indices (into pattern.chords) shown in a block, or none if the pattern has no chords. */
function barsIn(block: number): number[] {
  if (!props.pattern.chords?.length) return []
  return Array.from({ length: BARS_PER_BLOCK }, (_, i) => block * BARS_PER_BLOCK + i)
}

/** "1", "&", "2", "&"… — the count on the beat, "&" halfway through it. */
function cellLabel(cellIndex: number): string {
  const { stepsPerCount } = props.pattern
  const position = cellIndex % stepsPerCount
  if (position === 0) return String(Math.floor(cellIndex / stepsPerCount) + 1)
  return position * 2 === stepsPerCount ? t('grid.and') : ''
}

function isActiveCount(block: number, cellIndex: number): boolean {
  if (props.activeStep < 0) return false
  const { stepsPerCount } = props.pattern
  const countStart = block * stepsPerBlock.value + cellIndex - (cellIndex % stepsPerCount)
  return props.activeStep >= countStart && props.activeStep < countStart + stepsPerCount
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="block in blockCount"
      :key="block"
      class="rounded-lg border border-neutral-800 bg-neutral-950 p-4"
    >
      <div class="flex items-center gap-3 pb-1">
        <span class="w-32 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {{ t('grid.block', { n: block }) }}
        </span>
        <div class="flex flex-1 gap-1">
          <span
            v-for="cell in stepsPerBlock"
            :key="cell"
            class="flex-1 text-center font-mono text-xs"
            :class="[
              (cell - 1) % pattern.stepsPerCount === 0 ? 'text-neutral-300' : 'text-neutral-600',
              {
                'ml-1.5': (cell - 1) % pattern.stepsPerCount === 0 && cell > 1,
                'text-amber-400': isActiveCount(block - 1, cell - 1),
              },
            ]"
          >
            {{ cellLabel(cell - 1) }}
          </span>
        </div>
        <span class="w-20 shrink-0" />
      </div>

      <div v-if="barsIn(block - 1).length" class="flex items-center gap-3 pb-1">
        <span class="w-32 shrink-0 text-xs text-neutral-500">{{ t('grid.chords') }}</span>
        <div class="flex flex-1 gap-1.5">
          <select
            v-for="bar in barsIn(block - 1)"
            :key="bar"
            :value="pattern.chords![bar]"
            :aria-label="t('grid.chordForBar', { n: bar + 1 })"
            class="min-w-0 flex-1 rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
            @change="emit('update:chord', bar, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="chord in CHORD_NAMES" :key="chord" :value="chord">{{ chord }}</option>
          </select>
        </div>
        <span class="w-20 shrink-0" />
      </div>

      <BeatTrackRow
        v-for="track in pattern.tracks"
        :key="track.instrument"
        :track="track"
        :step-names="stepNames(track.instrument)"
        :active-step="activeStep"
        :start="(block - 1) * stepsPerBlock"
        :length="stepsPerBlock"
        :steps-per-count="pattern.stepsPerCount"
        :show-controls="block === 1"
        @toggle-step="(stepIndex: number) => emit('toggle-step', track.instrument, stepIndex)"
        @update:volume="(volume: number) => emit('update:volume', track.instrument, volume)"
        @update:muted="(muted: boolean) => emit('update:muted', track.instrument, muted)"
      />
    </div>
  </div>
</template>
