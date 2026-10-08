<script setup lang="ts">
defineProps<{
  label: string
  /** A key of ICONS shown before the label. */
  icon?: string
  /** Explanation shown in a tooltip; without one the label is plain text. */
  hint?: string
}>()
</script>

<template>
  <UiTooltip
    v-if="hint"
    :text="hint"
  >
    <UiIcon
      v-if="icon"
      :name="icon"
    />
    <span class="border-b border-dotted border-neutral-600">{{ label }}</span>
  </UiTooltip>
  <span
    v-else
    class="inline-flex items-center gap-1.5"
  >
    <UiIcon
      v-if="icon"
      :name="icon"
    />
    {{ label }}
  </span>
</template>
