<script setup lang="ts">
import { COUNTS_PER_BLOCK } from '~/core/pattern'

// The box sounding now is lit by useBeatEffects (classes is-now and
// is-on-beat), so this never re-renders while playing.
</script>

<template>
  <div class="flex items-center gap-2 sm:gap-3">
    <UiControlLabel
      class="shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400 max-sm:hidden"
      :label="$t('controls.count')"
      :hint="$t('help.controls.count')"
    />
    <!-- Big boxes 1–8; 1 and 5, where each half of the phrase starts, are outlined in gold. -->
    <div
      class="grid flex-1 grid-cols-8 gap-1 sm:gap-1.5"
      aria-hidden="true"
    >
      <span
        v-for="count in COUNTS_PER_BLOCK"
        :key="count"
        class="count-box flex h-14 items-center justify-center rounded-xl bg-neutral-800 font-mono text-2xl font-bold transition-colors duration-75 sm:h-14 sm:text-2xl"
        :class="count === 1 || count === 5 ? 'text-neutral-100 ring-2 ring-inset ring-gold-400' : 'text-neutral-500'"
        :data-count-box="count - 1"
      >
        {{ count }}
      </span>
    </div>
  </div>
</template>
