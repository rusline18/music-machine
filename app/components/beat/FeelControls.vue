<script setup lang="ts">
defineProps<{
  /** 0–1, see humanizeNote. */
  feel: number
  /** 0–1 room reverb. */
  reverb: number
}>()

const emit = defineEmits<{
  'update:feel': [value: number]
  'update:reverb': [value: number]
}>()

const percent = (value: number) => `${Math.round(value * 100)}%`
const valueOf = (event: Event) => Number((event.target as HTMLInputElement).value)
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
    <label class="flex items-center gap-3" title="0% plays exactly on the grid; higher adds small timing, volume and pitch variations, like a live band">
      <span class="text-sm font-medium text-neutral-400">Feel</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="feel"
        class="w-32 accent-amber-500"
        @input="emit('update:feel', valueOf($event))"
      >
      <span class="w-10 text-right font-mono text-sm text-neutral-200">{{ percent(feel) }}</span>
    </label>
    <label class="flex items-center gap-3" title="How much room sound is added to the mix">
      <span class="text-sm font-medium text-neutral-400">Reverb</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="reverb"
        class="w-32 accent-amber-500"
        @input="emit('update:reverb', valueOf($event))"
      >
      <span class="w-10 text-right font-mono text-sm text-neutral-200">{{ percent(reverb) }}</span>
    </label>
  </div>
</template>
