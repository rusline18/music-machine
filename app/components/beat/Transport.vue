<script setup lang="ts">
const props = defineProps<{
  isPlaying: boolean
  /** Play was pressed and is waiting for samples. */
  isLoading?: boolean
  /** 0–1 share of samples downloaded; drawn as a bar on Play until complete. */
  loadProgress?: number
  /** Samples that failed to load on the last Play. */
  failedSamples?: number
}>()

const emit = defineEmits<{
  play: []
  stop: []
}>()

const progress = computed(() => props.loadProgress ?? 1)
const percent = computed(() => Math.round(progress.value * 100))
</script>

<template>
  <div class="flex flex-col items-end gap-1">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="relative overflow-hidden rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-amber-400 disabled:opacity-50"
        :class="isLoading ? 'disabled:opacity-80' : ''"
        :disabled="isPlaying || isLoading"
        :aria-busy="isLoading"
        @click="emit('play')"
      >
        <span v-if="isLoading" class="tabular-nums">Loading {{ percent }}%</span>
        <span v-else>▶ Play</span>
        <span
          v-if="progress < 1"
          role="progressbar"
          aria-label="Sounds downloaded"
          :aria-valuenow="percent"
          aria-valuemin="0"
          aria-valuemax="100"
          class="absolute inset-x-0 bottom-0 h-1 bg-neutral-900/20"
        >
          <span class="block h-full bg-neutral-900/60 transition-[width]" :style="{ width: `${percent}%` }" />
        </span>
      </button>
      <button
        type="button"
        class="rounded-md bg-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-neutral-600 disabled:opacity-50"
        :disabled="!isPlaying && !isLoading"
        @click="emit('stop')"
      >
        ■ Stop
      </button>
    </div>
    <p v-if="failedSamples" role="status" class="text-xs text-red-400">
      {{ failedSamples }} {{ failedSamples === 1 ? 'sound' : 'sounds' }} didn't load — check your connection and press Play to retry.
    </p>
  </div>
</template>
