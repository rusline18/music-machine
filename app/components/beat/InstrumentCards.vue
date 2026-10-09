<script setup lang="ts">
import type { Track } from '~/core/pattern'

defineProps<{
  tracks: readonly Track[]
}>()

const emit = defineEmits<{
  'update:muted': [instrument: string, muted: boolean]
}>()
</script>

<template>
  <!-- Practice on a phone: one big switch per instrument, for "take one
       out and listen". -->
  <ul class="grid grid-cols-2 gap-2">
    <li
      v-for="track in tracks"
      :key="track.instrument"
    >
      <button
        type="button"
        role="switch"
        class="flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition active:scale-[0.98]"
        :class="track.muted ? 'border-neutral-800 bg-neutral-950 text-neutral-500' : 'border-amber-500/40 bg-amber-500/10 text-neutral-100'"
        :aria-checked="!track.muted"
        @click="emit('update:muted', track.instrument, !track.muted)"
      >
        <span
          class="instrument-icon"
          :class="track.muted ? 'text-neutral-600' : 'text-amber-400'"
          :data-instrument="track.instrument"
        >
          <UiIcon :name="track.instrument" />
        </span>
        <span class="min-w-0 flex-1 break-words text-sm font-medium leading-tight">{{ $t(`instruments.${track.instrument}`) }}</span>
        <!-- The switch itself, drawn: a knob that slides right when on. -->
        <span
          class="relative h-6 w-10 shrink-0 rounded-full transition-colors"
          :class="track.muted ? 'bg-neutral-700' : 'bg-amber-500'"
          aria-hidden="true"
        >
          <span
            class="absolute top-1 size-4 rounded-full bg-neutral-100 transition-transform"
            :class="track.muted ? 'translate-x-1' : 'translate-x-5'"
          />
        </span>
      </button>
    </li>
  </ul>
</template>
