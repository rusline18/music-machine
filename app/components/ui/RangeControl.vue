<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  min: number
  max: number
  step?: number
  /** A key of ICONS shown before the label. */
  icon?: string
  /** Tooltip explaining the control. */
  hint?: string
  /** How the current value is shown next to the slider. */
  format?: (value: number) => string
}>(), {
  step: 1,
  icon: undefined,
  hint: undefined,
  format: (value: number) => String(value),
})

const model = defineModel<number>({ required: true })
</script>

<template>
  <div class="flex items-center gap-3">
    <UiControlLabel
      class="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400"
      :label="label"
      :icon="icon"
      :hint="hint"
    />
    <input
      v-model.number="model"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :aria-label="label"
      class="w-32 accent-accent-500 sm:w-40"
    >
    <span class="w-10 text-right font-mono text-sm text-neutral-200">{{ format(model) }}</span>
  </div>
</template>
