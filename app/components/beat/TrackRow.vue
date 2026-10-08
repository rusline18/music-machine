<script setup lang="ts">
import type { Track } from '~/core/pattern'

const props = defineProps<{
  track: Track
  /** What a step can be set to; clicking a cell cycles through them. */
  stepNames: string[]
  activeStep: number
  /** First step shown in this row (rows are 8-count blocks). */
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

const { t } = useI18n()

const stepIndices = computed(() => Array.from({ length: props.length }, (_, i) => props.start + i))
const instrumentName = computed(() => t(`instruments.${props.track.instrument}`))
const stepOptions = computed(() => props.stepNames.map((name) => t(`steps.${name}`)).join(', '))
</script>

<template>
  <div class="flex items-center gap-3 border-b border-neutral-800 py-2">
    <div class="flex w-32 shrink-0 items-center gap-2">
      <button
        v-if="showControls"
        type="button"
        class="rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition"
        :class="track.muted ? 'bg-neutral-700 text-neutral-400' : 'bg-amber-500/20 text-amber-400'"
        :aria-pressed="track.muted"
        :aria-label="t('grid.mute', { instrument: instrumentName })"
        @click="emit('update:muted', !track.muted)"
      >
        {{ track.muted ? t('grid.off') : t('grid.on') }}
      </button>
      <span
        class="truncate text-sm"
        :class="showControls ? 'text-neutral-200' : 'text-neutral-500'"
      >{{ instrumentName }}</span>
    </div>

    <div
      class="flex flex-1 gap-1"
      :class="{ 'opacity-50': track.muted }"
    >
      <button
        v-for="(stepIndex, i) in stepIndices"
        :key="stepIndex"
        type="button"
        class="h-9 min-w-0 flex-1 overflow-hidden rounded font-mono text-[10px] transition"
        :class="[
          track.steps[stepIndex] ? 'bg-amber-500 text-neutral-900' : 'bg-neutral-800 text-neutral-600 hover:bg-neutral-700',
          { 'ring-2 ring-white': activeStep === stepIndex, 'ml-1.5': i % stepsPerCount === 0 && i > 0 },
        ]"
        :title="stepOptions"
        @click="emit('toggle-step', stepIndex)"
      >
        {{ track.steps[stepIndex] ? t(`steps.${track.steps[stepIndex]}`) : '' }}
      </button>
    </div>

    <input
      v-if="showControls"
      type="range"
      min="0"
      max="1"
      step="0.05"
      :value="track.volume"
      :aria-label="t('grid.volume', { instrument: instrumentName })"
      class="w-20 shrink-0 accent-amber-500"
      @input="emit('update:volume', Number(($event.target as HTMLInputElement).value))"
    >
    <span
      v-else
      class="w-20 shrink-0"
    />
  </div>
</template>
