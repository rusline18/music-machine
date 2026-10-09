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
      class="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400"
      :label="label"
      :icon="icon"
      :hint="hint"
    />
    <div class="flex gap-1 rounded-2xl bg-neutral-800/70 p-1">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="min-h-11 flex-1 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-sm tabular-nums transition sm:min-h-9"
        :class="option.value === model ? 'bg-neutral-100 font-bold text-neutral-950' : 'font-semibold text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100'"
        :aria-pressed="option.value === model"
        @click="model = option.value"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
