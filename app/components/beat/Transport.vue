<script setup lang="ts">
defineProps<{
  isPlaying: boolean
}>()

const emit = defineEmits<{
  play: []
  stop: []
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      type="button"
      class="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-amber-400 disabled:opacity-50"
      :disabled="isPlaying"
      @click="emit('play')"
    >
      ▶ Play
    </button>
    <button
      type="button"
      class="rounded-md bg-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-neutral-600 disabled:opacity-50"
      :disabled="!isPlaying"
      @click="emit('stop')"
    >
      ■ Stop
    </button>
  </div>
</template>
