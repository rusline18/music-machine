<script setup lang="ts" generic="T extends string | number">
defineProps<{
  label: string
  options: readonly { value: T, label: string }[]
  /** A key of ICONS shown before the label. */
  icon?: string
  /** Tooltip explaining the control. */
  hint?: string
}>()

/** Undefined when the value matches none of the options (nothing is highlighted). */
const model = defineModel<T | undefined>({ required: true })
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-3 gap-y-1.5"
    role="group"
    :aria-label="label"
  >
    <UiControlLabel
      class="text-sm font-medium text-neutral-400"
      :label="label"
      :icon="icon"
      :hint="hint"
    />
    <div class="flex overflow-hidden rounded-md border border-neutral-700">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="whitespace-nowrap px-3 py-1.5 font-mono text-sm transition"
        :class="option.value === model ? 'bg-amber-500 text-neutral-900' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'"
        :aria-pressed="option.value === model"
        @click="model = option.value"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
