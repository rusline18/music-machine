<script setup lang="ts">
import { ICON_ACCENTS, ICONS } from '~/icons'

const props = withDefaults(defineProps<{
  /** A key of ICONS: an instrument id or a control name. */
  name: string
  /** Draw the accent layer in the genre's color; false = same color as the lines (muted, dimmed). */
  accent?: boolean
}>(), { accent: true })

/** Looked up once so the template can narrow it: a lookup indexed by a prop doesn't narrow. */
const layer = computed(() => ICON_ACCENTS[props.name])
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
    <!-- In a group of its own so it can move against the accent (the held clave). -->
    <g class="icon-base">
      <path
        v-for="(d, i) in ICONS[name]"
        :key="i"
        :d="d"
      />
    </g>
    <!-- Fill paths get a thin stroke: at 1.75 the sound holes and the
         piano's keys close up. -->
    <g
      v-if="layer"
      class="icon-accent"
      :class="accent ? 'text-accent-400' : ''"
    >
      <path
        v-for="(d, i) in layer.fill"
        :key="`f${i}`"
        :d="d"
        fill="currentColor"
        fill-rule="evenodd"
        stroke-width="1"
      />
      <path
        v-for="(d, i) in layer.line"
        :key="`l${i}`"
        :d="d"
      />
    </g>
  </svg>
</template>
