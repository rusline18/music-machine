<script setup lang="ts">
import { STEP_GLYPHS } from '~/icons'

const props = defineProps<{
  /** A step name: hit, open, slap… */
  name: string
}>()

const glyph = computed(() => STEP_GLYPHS[props.name])
</script>

<template>
  <!-- In currentColor, so it takes the cell's ink. -->
  <svg
    v-if="glyph"
    viewBox="0 0 24 24"
    stroke-width="2.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="size-4 shrink-0"
  >
    <path
      :d="glyph.d"
      :fill="glyph.fill ? 'currentColor' : 'none'"
      :stroke="glyph.fill ? 'none' : 'currentColor'"
    />
  </svg>
</template>
