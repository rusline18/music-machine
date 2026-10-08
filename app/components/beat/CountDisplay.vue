<script setup lang="ts">
import { COUNTS_PER_BLOCK, countInBlock } from '~/core/pattern'

const props = defineProps<{
  /** The step sounding now, or -1 when stopped. */
  activeStep: number
  stepsPerCount: number
}>()

/** The count sounding now, 0–7, or -1 when stopped. */
const current = computed(() => (props.activeStep < 0 ? -1 : countInBlock(props.activeStep, props.stepsPerCount)))
/** On the count itself rather than its "&". */
const onBeat = computed(() => props.activeStep % props.stepsPerCount === 0)
</script>

<template>
  <div class="flex items-center gap-2 sm:gap-3">
    <UiControlLabel
      class="shrink-0 text-sm font-medium text-neutral-400"
      :label="$t('controls.count')"
      :hint="$t('help.controls.count')"
    />
    <!-- Big boxes 1–8; 1 and 5, where each half of the phrase starts, are outlined. -->
    <div
      class="grid flex-1 grid-cols-8 gap-1 sm:gap-1.5"
      aria-hidden="true"
    >
      <span
        v-for="count in COUNTS_PER_BLOCK"
        :key="count"
        class="flex h-10 items-center justify-center rounded-md font-mono text-lg font-bold transition-colors duration-75 sm:h-12 sm:text-xl"
        :class="[
          current === count - 1
            ? onBeat ? 'bg-amber-400 text-neutral-950' : 'bg-amber-500/50 text-neutral-950'
            : 'bg-neutral-900 text-neutral-500',
          { 'ring-1 ring-inset ring-amber-500/60': count === 1 || count === 5 },
        ]"
      >
        {{ count }}
      </span>
    </div>
  </div>
</template>
