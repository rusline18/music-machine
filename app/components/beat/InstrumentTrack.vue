<script setup lang="ts">
import type { InstrumentTrack } from '../../composables/usePattern'

const props = defineProps<{
  track: InstrumentTrack
  sampleNames: string[]
  activeStep: number
  /** First step of the track shown in this row (rows are 8-count blocks). */
  start: number
  length: number
  stepsPerCount: number
  /** Mute and volume are per track, so only the first block shows them. */
  showControls: boolean
}>()

const emit = defineEmits<{
  'toggle-step': [stepIndex: number]
  'update:volume': [volume: number]
  'update:muted': [muted: boolean]
}>()

const stepIndices = computed(() => Array.from({ length: props.length }, (_, i) => props.start + i))

function stepLabel(stepIndex: number): string {
  return props.track.steps[stepIndex] ?? ''
}

function cycleStep(stepIndex: number) {
  emit('toggle-step', stepIndex)
}
</script>

<template>
  <div class="flex items-center gap-3 border-b border-neutral-800 py-2">
    <div class="sticky left-0 z-10 flex w-28 shrink-0 items-center gap-2 self-stretch bg-neutral-950">
      <button
        v-if="showControls"
        type="button"
        class="rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition"
        :aria-label="`${track.muted ? 'Unmute' : 'Mute'} ${track.instrument}`"
        :class="track.muted ? 'bg-neutral-700 text-neutral-400' : 'bg-amber-500/20 text-amber-400'"
        @click="emit('update:muted', !track.muted)"
      >
        {{ track.muted ? 'off' : 'on' }}
      </button>
      <span
        class="truncate text-sm capitalize"
        :class="showControls ? 'text-neutral-200' : 'text-neutral-500'"
      >{{ track.instrument }}</span>
    </div>

    <div class="flex flex-1 gap-1" :class="track.muted ? 'opacity-50' : ''">
      <button
        v-for="(stepIndex, i) in stepIndices"
        :key="stepIndex"
        type="button"
        class="h-9 min-w-0 flex-1 overflow-hidden rounded text-[10px] font-mono transition"
        :class="[
          track.steps[stepIndex] ? 'bg-amber-500 text-neutral-900' : 'bg-neutral-800 text-neutral-600 hover:bg-neutral-700',
          activeStep === stepIndex ? 'ring-2 ring-white' : '',
          i % stepsPerCount === 0 && i > 0 ? 'ml-1.5' : '',
        ]"
        :title="sampleNames.join(', ')"
        :aria-label="`${track.instrument} step ${stepIndex + 1}`"
        @click="cycleStep(stepIndex)"
      >
        {{ stepLabel(stepIndex) }}
      </button>
    </div>

    <input
      v-if="showControls"
      type="range"
      min="0"
      max="1"
      step="0.05"
      :value="track.volume"
      class="w-20 shrink-0 accent-amber-500"
      @input="emit('update:volume', Number(($event.target as HTMLInputElement).value))"
    >
    <span v-else class="w-20 shrink-0" />
  </div>
</template>
