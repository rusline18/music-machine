<script setup lang="ts">
import type { InstrumentTrack } from '../../composables/usePattern'

const props = defineProps<{
  track: InstrumentTrack
  sampleNames: string[]
  activeStep: number
}>()

const emit = defineEmits<{
  'toggle-step': [stepIndex: number]
  'update:volume': [volume: number]
  'update:muted': [muted: boolean]
}>()

function stepLabel(stepIndex: number): string {
  return props.track.steps[stepIndex] ?? ''
}

function cycleStep(stepIndex: number) {
  emit('toggle-step', stepIndex)
}
</script>

<template>
  <div class="flex items-center gap-3 border-b border-neutral-800 py-2">
    <div class="flex w-28 shrink-0 items-center gap-2">
      <button
        type="button"
        class="rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition"
        :class="track.muted ? 'bg-neutral-700 text-neutral-400' : 'bg-amber-500/20 text-amber-400'"
        @click="emit('update:muted', !track.muted)"
      >
        {{ track.muted ? 'off' : 'on' }}
      </button>
      <span class="truncate text-sm capitalize text-neutral-200">{{ track.instrument }}</span>
    </div>

    <div class="flex flex-1 gap-1">
      <button
        v-for="(step, index) in track.steps"
        :key="index"
        type="button"
        class="h-9 flex-1 rounded text-[10px] font-mono transition"
        :class="[
          step ? 'bg-amber-500 text-neutral-900' : 'bg-neutral-800 text-neutral-600 hover:bg-neutral-700',
          activeStep === index ? 'ring-2 ring-white' : '',
        ]"
        :title="sampleNames.join(', ')"
        @click="cycleStep(index)"
      >
        {{ stepLabel(index) }}
      </button>
    </div>

    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      :value="track.volume"
      class="w-20 shrink-0 accent-amber-500"
      @input="emit('update:volume', Number(($event.target as HTMLInputElement).value))"
    >
  </div>
</template>
