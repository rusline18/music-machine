<script setup lang="ts">
import { ICONS } from '~/icons'

defineProps<{
  /** A key of ICONS: an instrument id or a control name. */
  name: string
}>()
</script>

<template>
  <svg
    v-if="ICONS[name]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="size-5 shrink-0"
  >
    <path
      v-for="(d, i) in ICONS[name]"
      :key="i"
      :d="d"
    />
  </svg>
</template>
