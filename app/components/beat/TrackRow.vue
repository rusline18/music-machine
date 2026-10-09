<script setup lang="ts">
import type { Track } from '~/core/pattern'
import { countInBlock } from '~/core/pattern'

const props = defineProps<{
  track: Track
  /** What a step can be set to; clicking a cell cycles through them. */
  stepNames: string[]
  /** First step shown in this row (rows are 8-count blocks). */
  start: number
  length: number
  stepsPerCount: number
  /** Mute and volume are per track, so only the first block shows them. */
  showControls: boolean
  /** Advanced mode: volume slider, and clicks cycle through the sounds. */
  advanced: boolean
}>()

const emit = defineEmits<{
  'toggle-step': [stepIndex: number]
  'update:volume': [volume: number]
  'update:muted': [muted: boolean]
}>()

const { t } = useI18n()

const stepIndices = computed(() => Array.from({ length: props.length }, (_, i) => props.start + i))
const instrumentName = computed(() => t(`instruments.${props.track.instrument}`))
const cellHint = computed(() => props.advanced
  ? t('help.grid.cellAdvanced', { sounds: props.stepNames.map((name) => t(`steps.${name}`)).join(', ') })
  : t('help.grid.cellSimple'))

/** What a cell shows: the step's name, or for a counting voice the number it says. */
function stepLabel(stepIndex: number): string {
  const name = props.track.steps[stepIndex]
  if (!name) return ''
  return name === 'count' ? String(countInBlock(stepIndex, props.stepsPerCount) + 1) : t(`steps.${name}`)
}
</script>

<template>
  <div class="flex items-center gap-2 border-b border-neutral-800 py-2 sm:gap-3">
    <div class="flex w-[4.5rem] shrink-0 items-center gap-2 sm:w-32">
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
      <UiControlLabel
        v-if="showControls"
        class="min-w-0 text-sm text-neutral-200"
        :label="instrumentName"
        :icon="track.instrument"
        :hint="t(`help.instruments.${track.instrument}`)"
        compact
      />
      <UiControlLabel
        v-else
        class="min-w-0 truncate text-sm text-neutral-500"
        :label="instrumentName"
        :icon="track.instrument"
        compact
      />
    </div>

    <div
      class="flex flex-1 gap-1"
      :class="{ 'opacity-50': track.muted }"
    >
      <button
        v-for="(stepIndex, i) in stepIndices"
        :key="stepIndex"
        type="button"
        class="step-cell h-9 min-w-0 flex-1 overflow-hidden rounded font-mono text-[10px] transition"
        :class="[
          track.steps[stepIndex] ? 'bg-amber-500 text-neutral-900' : 'bg-neutral-800 text-neutral-600 hover:bg-neutral-700',
          { 'ml-1.5': i % stepsPerCount === 0 && i > 0 },
        ]"
        :data-step="stepIndex"
        :title="cellHint"
        :aria-label="t('grid.step', { instrument: instrumentName, n: stepIndex + 1 })"
        @click="emit('toggle-step', stepIndex)"
      >
        {{ stepLabel(stepIndex) }}
      </button>
    </div>

    <input
      v-if="advanced && showControls"
      type="range"
      min="0"
      max="1"
      step="0.05"
      :value="track.volume"
      :aria-label="t('grid.volume', { instrument: instrumentName })"
      class="w-20 shrink-0 accent-amber-500 max-sm:hidden"
      @input="emit('update:volume', Number(($event.target as HTMLInputElement).value))"
    >
    <span
      v-else-if="advanced"
      class="w-20 shrink-0 max-sm:hidden"
    />
  </div>
</template>
