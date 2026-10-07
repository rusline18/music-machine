<script setup lang="ts">
import type { Pattern } from '../../composables/usePattern'
import InstrumentTrack from './InstrumentTrack.vue'

const props = defineProps<{
  pattern: Pattern
  samples: Record<string, Record<string, string>>
  activeStep: number
}>()

const emit = defineEmits<{
  'toggle-step': [instrument: string, stepIndex: number]
  'update:volume': [instrument: string, volume: number]
  'update:muted': [instrument: string, muted: boolean]
}>()

function sampleNamesFor(instrument: string): string[] {
  return Object.keys(props.samples[instrument] ?? {})
}
</script>

<template>
  <div class="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
    <InstrumentTrack
      v-for="track in pattern.tracks"
      :key="track.instrument"
      :track="track"
      :sample-names="sampleNamesFor(track.instrument)"
      :active-step="activeStep"
      @toggle-step="(stepIndex) => emit('toggle-step', track.instrument, stepIndex)"
      @update:volume="(volume) => emit('update:volume', track.instrument, volume)"
      @update:muted="(muted) => emit('update:muted', track.instrument, muted)"
    />
  </div>
</template>
