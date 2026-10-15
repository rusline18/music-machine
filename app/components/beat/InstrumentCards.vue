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

// A long press on a card opens the instrument's sheet, as on the grid's
// icons; a tap still switches it. Same timing as the grid.
const LONG_PRESS_MS = 450
const PRESS_SLOP_PX = 10
let pressTimer: ReturnType<typeof setTimeout> | undefined
let pressStart: { x: number, y: number } | null = null
/** Set when a press opened the sheet, so the click that ends it doesn't also switch. */
let sheetOpened = false

function pressDown(event: PointerEvent, instrument: string) {
  if (event.button !== 0) return
  sheetOpened = false
  pressStart = { x: event.clientX, y: event.clientY }
  clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    pressStart = null
    sheetOpened = true
    emit('open-instrument', instrument, false)
  }, LONG_PRESS_MS)
}
function pressMove(event: PointerEvent) {
  if (pressStart && Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > PRESS_SLOP_PX) pressCancel()
}
function pressCancel() {
  clearTimeout(pressTimer)
  pressStart = null
}
function click(track: Track) {
  if (sheetOpened) sheetOpened = false
  else emit('update:muted', track.instrument, !track.muted)
}
function contextMenu(instrument: string) {
  pressCancel()
  if (!sheetOpened) emit('open-instrument', instrument, false)
  sheetOpened = false
}
onBeforeUnmount(pressCancel)
</script>

<template>
  <!-- Practice on a phone: one big switch per instrument, for "take one
       out and listen"; a long press or the ⓘ opens the instrument's sheet. -->
  <ul class="grid grid-cols-2 gap-2">
    <li
      v-for="track in tracks"
      :key="track.instrument"
      class="relative"
    >
      <button
        type="button"
        role="switch"
        class="flex min-h-16 w-full select-none items-center gap-2.5 rounded-2xl border px-2.5 py-2 text-left transition [-webkit-touch-callout:none] active:scale-[0.98]"
        :class="track.muted ? 'border-neutral-800 bg-neutral-950 text-neutral-500' : 'border-accent-500/40 bg-accent-500/10 text-neutral-100'"
        :aria-checked="!track.muted"
        @pointerdown="pressDown($event, track.instrument)"
        @pointermove="pressMove"
        @pointerup="pressCancel"
        @pointerleave="pressCancel"
        @pointercancel="pressCancel"
        @contextmenu.prevent="contextMenu(track.instrument)"
        @click="click(track)"
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
      </button>
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
