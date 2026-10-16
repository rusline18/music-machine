<script setup lang="ts">
import type { Track } from '~/core/pattern'

defineProps<{
  tracks: readonly Track[]
}>()

const emit = defineEmits<{
  'update:muted': [instrument: string, muted: boolean]
  /** The instrument's sheet: by its ⓘ button (`viaButton`) or a long press. */
  'open-instrument': [instrument: string, viaButton: boolean]
}>()

// A tap switches a card's instrument, a long press opens its sheet: as on
// the grid's icons, with the same "keep holding" hint (useHoldToOpen).
const press = useHoldToOpen<Track>({
  tap: (track) => emit('update:muted', track.instrument, !track.muted),
  open: (track) => emit('open-instrument', track.instrument, false),
})
const { holding, holdLabel } = press
</script>

<template>
  <!-- Practice on a phone: one big switch per instrument, for "take one
       out and listen"; a long press or the ⓘ opens the instrument's sheet. -->
  <ul class="grid grid-cols-2 gap-2">
    <li
      v-for="(track, index) in tracks"
      :key="track.instrument"
      class="relative"
    >
      <button
        type="button"
        role="switch"
        class="relative isolate flex min-h-16 w-full select-none items-center gap-2.5 overflow-hidden rounded-2xl border px-2.5 py-2 text-left transition [-webkit-touch-callout:none] active:scale-[0.98]"
        :class="track.muted ? 'border-neutral-800 bg-neutral-950 text-neutral-500' : 'border-accent-500/40 bg-accent-500/10 text-neutral-100'"
        :aria-checked="!track.muted"
        @pointerdown="press.down($event, track)"
        @pointermove="press.move"
        @pointerup="press.cancel"
        @pointerleave="press.cancel"
        @pointercancel="press.cancel"
        @contextmenu.prevent="press.contextMenu(track)"
        @click="press.click(track)"
      >
        <span
          class="instrument-icon"
          :class="track.muted ? 'text-neutral-600' : 'text-neutral-100'"
          :data-instrument="track.instrument"
        >
          <UiIcon
            :name="track.instrument"
            :accent="!track.muted"
          />
        </span>
        <span class="min-w-0 flex-1 hyphens-auto text-sm font-bold leading-tight">{{ $t(`instruments.${track.instrument}`) }}</span>
        <!-- The switch itself, drawn: a knob that slides right when on. -->
        <span
          class="relative h-6 w-9 shrink-0 rounded-full transition-colors"
          :class="track.muted ? 'bg-neutral-700' : 'bg-accent-500'"
          aria-hidden="true"
        >
          <span
            class="absolute left-0 top-1 size-4 rounded-full bg-neutral-100 transition-transform"
            :class="track.muted ? 'translate-x-1' : 'translate-x-4'"
          />
        </span>
        <!-- Fills from the bottom while held, behind the content. -->
        <span
          class="pointer-events-none absolute inset-0 -z-10 origin-bottom bg-neutral-100/20"
          :class="holding === track ? 'scale-y-100 transition-transform duration-[330ms] ease-linear motion-reduce:transition-none' : 'scale-y-0'"
          aria-hidden="true"
        />
      </button>
      <!-- Above the card, from its outer edge, so it stays on screen in
           either column. -->
      <span
        v-if="holdLabel === track"
        role="status"
        class="pointer-events-none absolute bottom-full z-20 mb-2.5 whitespace-nowrap rounded-xl bg-neutral-100 px-2.5 py-1.5 text-xs font-semibold text-neutral-950 shadow-xl before:absolute before:-bottom-1 before:size-2.5 before:rotate-45 before:bg-neutral-100"
        :class="index % 2 === 0 ? 'left-1 before:left-5' : 'right-1 before:right-5'"
      >{{ $t('grid.holdHint') }}</span>
      <!-- About the instrument: a badge on the card's corner, with a
             finger-sized hit area around it. -->
      <button
        type="button"
        class="absolute -right-2 -top-2 flex size-8 items-center justify-center"
        :aria-label="$t('practice.about', { instrument: $t(`instruments.${track.instrument}`) })"
        @click="emit('open-instrument', track.instrument, true)"
      >
        <span
          class="flex size-5 items-center justify-center rounded-full border border-neutral-600 bg-neutral-900 font-serif text-[11px] font-bold italic text-neutral-300"
          aria-hidden="true"
        >i</span>
      </button>
    </li>
  </ul>
</template>
