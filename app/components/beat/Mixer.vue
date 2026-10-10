<script setup lang="ts">
import type { Track } from '~/core/pattern'

defineProps<{
  tracks: readonly Track[]
}>()

const emit = defineEmits<{
  'update:muted': [instrument: string, muted: boolean]
  'update:volume': [instrument: string, volume: number]
}>()

const { t } = useI18n()
</script>

<template>
  <!-- A phone's mixer: every instrument's switch and volume on one screen. -->
  <div class="flex flex-col gap-3">
    <p class="rounded-2xl bg-neutral-900 px-4 py-3 text-sm leading-snug text-neutral-300">
      {{ t('advanced.volumeHelp') }}
    </p>
    <ul class="rounded-3xl border border-neutral-800 bg-neutral-900 px-4">
      <li
        v-for="track in tracks"
        :key="track.instrument"
        class="instrument-icon border-t border-neutral-800 py-2.5 first:border-t-0"
        :data-instrument="track.instrument"
      >
        <div class="flex items-center gap-3">
          <UiIcon
            :name="track.instrument"
            :accent="!track.muted"
            :class="track.muted ? 'text-neutral-500' : 'text-neutral-200'"
          />
          <span
            class="flex-1 font-medium"
            :class="track.muted ? 'text-neutral-500' : 'text-neutral-100'"
          >{{ t(`instruments.${track.instrument}`) }}</span>
          <UiTooltip :text="t(`help.instruments.${track.instrument}`)">
            <span
              class="flex size-11 items-center justify-center"
              :aria-label="t('advanced.more', { name: t(`instruments.${track.instrument}`) })"
            >
              <span class="flex size-7 items-center justify-center rounded-full border border-neutral-700 text-xs font-bold text-neutral-500">?</span>
            </span>
          </UiTooltip>
          <button
            type="button"
            role="switch"
            class="flex h-11 w-12 shrink-0 items-center justify-end"
            :aria-checked="!track.muted"
            :aria-label="t(`instruments.${track.instrument}`)"
            @click="emit('update:muted', track.instrument, !track.muted)"
          >
            <span
              class="relative h-6 w-10 rounded-full transition-colors"
              :class="track.muted ? 'bg-neutral-700' : 'bg-accent-500'"
              aria-hidden="true"
            >
              <span
                class="absolute left-0 top-1 size-4 rounded-full bg-neutral-100 transition-transform"
                :class="track.muted ? 'translate-x-1' : 'translate-x-5'"
              />
            </span>
          </button>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="track.volume"
          :aria-label="t('grid.volume', { instrument: t(`instruments.${track.instrument}`) })"
          class="range range-lg mb-1 mt-2 w-full"
          :class="{ 'opacity-40': track.muted }"
          :style="{ '--v': `${track.volume * 100}%` }"
          @input="emit('update:volume', track.instrument, Number(($event.target as HTMLInputElement).value))"
        >
      </li>
    </ul>
  </div>
</template>
