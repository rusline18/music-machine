<script setup lang="ts">
defineProps<{
  label: string
  /** A key of ICONS shown before the label. */
  icon?: string
  /** Explanation shown in a tooltip; without one the label is plain text. */
  hint?: string
  /** On a phone show only the icon (the label stays for screen readers). */
  compact?: boolean
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
    <span
      class="border-b border-dotted border-neutral-600"
      :class="{ 'max-sm:sr-only': compact && icon }"
    >{{ label }}</span>
  </UiTooltip>
  <span
    v-else
    class="inline-flex items-center gap-1.5"
  >
    <UiIcon
      v-if="icon"
      :name="icon"
    />
    <span :class="{ 'max-sm:sr-only': compact && icon }">{{ label }}</span>
  </span>
</template>
