<script setup lang="ts">
import { COUNT_OPTIONS } from '../../composables/usePattern'

defineProps<{
  modelValue: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="text-sm font-medium text-neutral-400">Counts</span>
    <div class="flex overflow-hidden rounded-md border border-neutral-700">
      <button
        v-for="option in COUNT_OPTIONS"
        :key="option"
        type="button"
        class="px-3 py-1.5 font-mono text-sm transition"
        :class="option === modelValue ? 'bg-amber-500 text-neutral-900' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'"
        :aria-pressed="option === modelValue"
        @click="emit('update:modelValue', option)"
      >
        {{ option }}
      </button>
    </div>
  </div>
</template>
