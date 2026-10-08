<script setup lang="ts">
import type { Pattern } from '../../composables/usePattern'
import { COUNTS_PER_BAR, COUNTS_PER_BLOCK } from '../../composables/usePattern'
import { CHORD_NAMES } from '../../data/harmony'
import InstrumentTrack from './InstrumentTrack.vue'

const props = defineProps<{
  pattern: Pattern
  /** What each step of an instrument can be set to. */
  stepNames: (instrument: string) => string[]
  activeStep: number
  isPlaying: boolean
}>()

const emit = defineEmits<{
  'toggle-step': [instrument: string, stepIndex: number]
  'update:volume': [instrument: string, volume: number]
  'update:muted': [instrument: string, muted: boolean]
  'update:chord': [bar: number, chord: string]
}>()

const barsPerBlock = COUNTS_PER_BLOCK / COUNTS_PER_BAR

/** Bar indices (into pattern.chords) shown in a block, or none if the pattern has no chords. */
function barsIn(block: number): number[] {
  if (!props.pattern.chords?.length) return []
  return Array.from({ length: barsPerBlock }, (_, i) => block * barsPerBlock + i)
}

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

</script>

<template>
  <!--
    Below ~48rem the steps would shrink past what a finger can hit, so the
    grid scrolls sideways inside this box (not the page) and the instrument
    names stay pinned on the left.
  -->
  <div class="overflow-x-auto overscroll-x-contain">
    <div class="min-w-[48rem] space-y-4">
      <div
        v-for="block in blockCount"
        :key="block"
        class="rounded-lg border border-neutral-800 bg-neutral-950 p-4"
      >
        <div class="flex items-center gap-3 pb-1">
          <span class="sticky left-0 z-10 flex w-28 shrink-0 items-center self-stretch bg-neutral-950 text-xs font-semibold uppercase tracking-wide text-neutral-500">
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

        <div v-if="barsIn(block - 1).length" class="flex items-center gap-3 pb-1">
          <span class="sticky left-0 z-10 flex w-28 shrink-0 items-center self-stretch bg-neutral-950 text-xs text-neutral-500">Chords</span>
          <div class="flex flex-1 gap-1.5">
            <select
              v-for="bar in barsIn(block - 1)"
              :key="bar"
              :value="pattern.chords![bar]"
              :aria-label="`Chord for bar ${bar + 1}`"
              class="min-w-0 flex-1 rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
              @change="emit('update:chord', bar, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="chord in CHORD_NAMES" :key="chord" :value="chord">{{ chord }}</option>
            </select>
          </div>
          <span class="w-20 shrink-0" />
        </div>

        <InstrumentTrack
          v-for="track in pattern.tracks"
          :key="track.instrument"
          :track="track"
          :sample-names="stepNames(track.instrument)"
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
  </div>
</template>
