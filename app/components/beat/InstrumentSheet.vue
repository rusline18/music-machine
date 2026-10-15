<script setup lang="ts">
import type { Track } from '~/core/pattern'

const props = defineProps<{
  /** The instrument's track; null when the sheet is closed. */
  track: Track | null | undefined
  /** The instrument playing on its own, if any. */
  solo?: string | null
  /** The address of the instrument's own page, if it has one. */
  link?: string
  /** A line at the bottom, e.g. how to open the sheet faster next time. */
  tip?: string
}>()

const emit = defineEmits<{
  close: []
  solo: [instrument: string | null]
  'update:muted': [instrument: string, muted: boolean]
  'update:volume': [instrument: string, volume: number]
}>()

const { t } = useI18n()
const instrument = computed(() => props.track?.instrument)
</script>

<template>
  <UiSheet
    :open="!!track"
    :title="instrument ? t(`instruments.${instrument}`) : ''"
    @close="emit('close')"
  >
    <div
      v-if="track"
      class="space-y-4"
    >
      <div class="flex items-start gap-3">
        <span
          class="instrument-icon flex size-14 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-200 [&_svg]:size-8"
          :data-instrument="track.instrument"
        >
          <UiIcon
            :name="track.instrument"
            :accent="!track.muted"
          />
        </span>
        <div class="space-y-2">
          <p class="text-sm leading-snug text-neutral-300">
            {{ t(`help.instruments.${track.instrument}`) }}
          </p>
          <NuxtLinkLocale
            v-if="link"
            :to="link"
            class="inline-block text-sm font-semibold text-accent-400 hover:text-accent-300"
          >
            {{ t('instrumentPage.open') }}
          </NuxtLinkLocale>
        </div>
      </div>
      <button
        type="button"
        class="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition"
        :class="solo === track.instrument ? 'bg-neutral-100 text-neutral-950' : 'bg-accent-500 text-neutral-950 hover:bg-accent-400'"
        :aria-pressed="solo === track.instrument"
        @click="emit('solo', solo === track.instrument ? null : track.instrument)"
      >
        {{ solo === track.instrument ? t('grid.listenAll') : t('grid.listenAlone') }}
      </button>
      <button
        type="button"
        role="switch"
        class="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-neutral-800 px-3 text-sm"
        :aria-checked="!track.muted"
        @click="emit('update:muted', track.instrument, !track.muted)"
      >
        {{ t('grid.playing') }}
        <span
          class="relative h-6 w-10 shrink-0 rounded-full transition-colors"
          :class="track.muted ? 'bg-neutral-700' : 'bg-accent-500'"
          aria-hidden="true"
        >
          <span
            class="absolute left-0 top-1 size-4 rounded-full bg-neutral-100 transition-transform"
            :class="track.muted ? 'translate-x-1' : 'translate-x-5'"
          />
        </span>
      </button>
      <label class="flex items-center gap-3 text-sm text-neutral-300">
        {{ t('grid.volumeLabel') }}
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="track.volume"
          class="range range-lg min-w-0 flex-1"
          :style="{ '--v': `${track.volume * 100}%` }"
          @input="emit('update:volume', track.instrument, Number(($event.target as HTMLInputElement).value))"
        >
      </label>
      <p
        v-if="tip"
        class="flex items-start gap-2 rounded-xl bg-neutral-950/60 px-3 py-2 text-xs leading-snug text-neutral-400"
      >
        <span aria-hidden="true">💡</span>
        {{ tip }}
      </p>
    </div>
  </UiSheet>
</template>
