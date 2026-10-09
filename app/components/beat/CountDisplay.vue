<script setup lang="ts">
import { COUNTS_PER_BLOCK } from '~/core/pattern'

// The box sounding now is lit by useBeatEffects (classes is-now and
// is-on-beat), so this never re-renders while playing.
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
        class="count-box flex h-10 items-center justify-center rounded-md bg-neutral-900 font-mono text-lg font-bold text-neutral-500 transition-colors duration-75 sm:h-12 sm:text-xl"
        :class="{ 'ring-1 ring-inset ring-amber-500/60': count === 1 || count === 5 }"
        :data-count-box="count - 1"
      >
        {{ count }}
      </span>
    </div>
  </div>
</template>
