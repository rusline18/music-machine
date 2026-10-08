<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  min: number
  max: number
  step?: number
  /** Tooltip explaining the control. */
  hint?: string
  /** How the current value is shown next to the slider. */
  format?: (value: number) => string
}>(), {
  step: 1,
  hint: undefined,
  format: (value: number) => String(value),
})

const model = defineModel<number>({ required: true })
</script>

<template>
  <label
    class="flex items-center gap-3"
    :title="hint"
  >
    <span class="text-sm font-medium text-neutral-400">{{ label }}</span>
    <input
      v-model.number="model"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      class="w-32 accent-amber-500 sm:w-40"
    >
    <span class="w-10 text-right font-mono text-sm text-neutral-200">{{ format(model) }}</span>
  </label>
</template>
