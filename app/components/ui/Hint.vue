<script setup lang="ts">
defineProps<{
  /** The section's name, shown small and in capitals. */
  label: string
  /** What it does; opens in a bubble from the "?". */
  text: string
  /** The bubble's heading; the label when not given. */
  title?: string
}>()
</script>

<template>
  <UiTooltip
    :text="text"
    :title="title ?? label"
  >
    <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">{{ label }}</span>
    <span
      class="flex size-[1.375rem] items-center justify-center rounded-full border border-neutral-700 text-xs font-bold text-neutral-500 transition hover:border-accent-500 hover:text-accent-400"
      aria-hidden="true"
    >?</span>
    <template #details>
      <slot />
    </template>
  </UiTooltip>
</template>
