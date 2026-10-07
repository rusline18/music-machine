<script setup lang="ts">
import type { Pattern } from '../../composables/usePattern'
import { COUNTS_PER_BLOCK } from '../../composables/usePattern'
import InstrumentTrack from './InstrumentTrack.vue'

const props = defineProps<{
  pattern: Pattern
  samples: Record<string, Record<string, string>>
  activeStep: number
  isPlaying: boolean
}>()

const emit = defineEmits<{
  'toggle-step': [instrument: string, stepIndex: number]
  'update:volume': [instrument: string, volume: number]
  'update:muted': [instrument: string, muted: boolean]
}>()

// The grid is drawn one 8-count block at a time, matching how dancers
// phrase the music; each block's header is labelled 1–8.
const stepsPerBlock = computed(() => COUNTS_PER_BLOCK * props.pattern.stepsPerCount)
const blockCount = computed(() => Math.ceil(props.pattern.counts / COUNTS_PER_BLOCK))

const SUBDIVISION_LABELS: Record<number, string[]> = {
  2: ['&'],
  4: ['e', '&', 'a'],
}

function cellLabel(cellIndex: number): string {
  const position = cellIndex % props.pattern.stepsPerCount
  if (position === 0) return String(Math.floor(cellIndex / props.pattern.stepsPerCount) + 1)
  return SUBDIVISION_LABELS[props.pattern.stepsPerCount]?.[position - 1] ?? ''
}

function isActiveCount(block: number, cellIndex: number): boolean {
  if (!props.isPlaying) return false
  const step = block * stepsPerBlock.value + cellIndex
  const countStart = step - (step % props.pattern.stepsPerCount)
  return props.activeStep >= countStart && props.activeStep < countStart + props.pattern.stepsPerCount
}

function sampleNamesFor(instrument: string): string[] {
  return Object.keys(props.samples[instrument] ?? {})
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
        <span class="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Block {{ block }}
        </span>
        <div class="flex flex-1 gap-1">
          <span
            v-for="cell in stepsPerBlock"
            :key="cell"
            class="flex-1 text-center font-mono text-xs"
            :class="[
              (cell - 1) % pattern.stepsPerCount === 0 ? 'text-neutral-300' : 'text-neutral-600',
              (cell - 1) % pattern.stepsPerCount === 0 && cell > 1 ? 'ml-1.5' : '',
              isActiveCount(block - 1, cell - 1) ? 'text-amber-400' : '',
            ]"
          >
            {{ cellLabel(cell - 1) }}
          </span>
        </div>
        <span class="w-20 shrink-0" />
      </div>

      <InstrumentTrack
        v-for="track in pattern.tracks"
        :key="track.instrument"
        :track="track"
        :sample-names="sampleNamesFor(track.instrument)"
        :active-step="activeStep"
        :start="(block - 1) * stepsPerBlock"
        :length="stepsPerBlock"
        :steps-per-count="pattern.stepsPerCount"
        :show-controls="block === 1"
        @toggle-step="(stepIndex) => emit('toggle-step', track.instrument, stepIndex)"
        @update:volume="(volume) => emit('update:volume', track.instrument, volume)"
        @update:muted="(muted) => emit('update:muted', track.instrument, muted)"
      />
    </div>
  </div>
</template>
