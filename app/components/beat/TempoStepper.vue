<script setup lang="ts">
import { TAP_RESET_MS, addTap, tapTempo } from '~/core/gestures'

const props = defineProps<{
  bpm: number
}>()

const emit = defineEmits<{
  /** Change the tempo by this many BPM. */
  nudge: [delta: number]
}>()

/** Holding a button down this long starts repeating… */
const HOLD_DELAY_MS = 450
/** …this often… */
const REPEAT_MS = 120
/** …in steps this big. */
const HOLD_STEP = 5

let holdTimer: ReturnType<typeof setTimeout> | undefined
let repeatTimer: ReturnType<typeof setInterval> | undefined
/** Set once a press turned into a hold, so the click that ends it doesn't add 1 more. */
let held = false

function startHold(direction: 1 | -1) {
  stopHold()
  held = false
  holdTimer = setTimeout(() => {
    held = true
    emit('nudge', direction * HOLD_STEP)
    repeatTimer = setInterval(() => emit('nudge', direction * HOLD_STEP), REPEAT_MS)
  }, HOLD_DELAY_MS)
}

function stopHold() {
  clearTimeout(holdTimer)
  clearInterval(repeatTimer)
}

/** A tap, a click or Enter: one BPM. */
function click(direction: 1 | -1) {
  if (held) held = false
  else emit('nudge', direction)
}

// The number is a dial and a tap-tempo pad. Dragged up or down, it turns
// the tempo by 1 BPM every DIAL_PX, ticking in Telegram; tapped in time
// with the music (or Enter, Space), it takes the tempo of the taps from
// the third one on.
/** Moving further than this is a drag, not a tap. */
const DRAG_SLOP_PX = 6
/** One BPM per this many pixels. */
const DIAL_PX = 8
let dial: { y: number, applied: number } | null = null
/** Set once a press turned into a drag, so the click that ends it isn't a tap. */
let dragged = false

function dialDown(event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0) return
  dragged = false
  dial = { y: event.clientY, applied: 0 }
}

function dialMove(event: PointerEvent) {
  if (!dial) return
  const dy = dial.y - event.clientY
  if (!dragged && Math.abs(dy) < DRAG_SLOP_PX) return
  if (!dragged) {
    dragged = true
    // A drag ends the taps; the mouse keeps turning outside the number.
    taps.value = []
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
  }
  const steps = Math.trunc(dy / DIAL_PX)
  if (steps === dial.applied) return
  emit('nudge', steps - dial.applied)
  dial.applied = steps
  hapticTick()
}

function dialUp() {
  dial = null
}

/** The latest taps (ms), while they still count. */
const taps = shallowRef<number[]>([])
let tapsTimer: ReturnType<typeof setTimeout> | undefined

function tap(event: MouseEvent) {
  // Enter and Space (detail 0) are always taps.
  if (dragged && event.detail > 0) {
    dragged = false
    return
  }
  taps.value = addTap(taps.value, event.timeStamp)
  clearTimeout(tapsTimer)
  tapsTimer = setTimeout(() => (taps.value = []), TAP_RESET_MS)
  const tapped = tapTempo(taps.value)
  // Kept inside the genre's range on the way, like any other change.
  if (tapped !== null && tapped !== props.bpm) emit('nudge', tapped - props.bpm)
}

onBeforeUnmount(() => {
  stopHold()
  clearTimeout(tapsTimer)
})
</script>

<template>
  <div
    class="flex items-center justify-between gap-1 rounded-2xl bg-neutral-800 p-1 max-sm:flex-1"
    role="group"
    :aria-label="$t('controls.bpm')"
  >
    <button
      type="button"
      class="flex size-11 touch-none select-none items-center justify-center rounded-xl bg-neutral-700 text-xl text-neutral-100 transition hover:bg-neutral-600 active:scale-90"
      :aria-label="$t('controls.slower')"
      :title="$t('help.controls.stepper')"
      @pointerdown="startHold(-1)"
      @pointerup="stopHold"
      @pointerleave="stopHold"
      @pointercancel="stopHold"
      @contextmenu.prevent
      @click="click(-1)"
    >
      −
    </button>
    <button
      type="button"
      class="w-20 cursor-ns-resize touch-none select-none rounded-xl py-1 text-center font-mono leading-none text-neutral-100 transition [-webkit-touch-callout:none] active:bg-neutral-700"
      :aria-label="$t('controls.tapTempo', { bpm })"
      :title="$t('help.controls.tempoDial')"
      @pointerdown="dialDown"
      @pointermove="dialMove"
      @pointerup="dialUp"
      @pointercancel="dialUp"
      @contextmenu.prevent
      @click="tap"
    >
      <output class="block">
        <span class="block text-2xl font-bold tabular-nums">{{ bpm }}</span>
        <span class="mt-1 block text-[10px] uppercase tracking-[0.14em] text-neutral-400">{{ taps.length ? $t('controls.tapping') : $t('controls.bpm') }}</span>
      </output>
    </button>
    <button
      type="button"
      class="flex size-11 touch-none select-none items-center justify-center rounded-xl bg-neutral-700 text-xl text-neutral-100 transition hover:bg-neutral-600 active:scale-90"
      :aria-label="$t('controls.faster')"
      :title="$t('help.controls.stepper')"
      @pointerdown="startHold(1)"
      @pointerup="stopHold"
      @pointerleave="stopHold"
      @pointercancel="stopHold"
      @contextmenu.prevent
      @click="click(1)"
    >
      +
    </button>
  </div>
</template>
