<script setup lang="ts">
defineProps<{
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

onBeforeUnmount(stopHold)
</script>

<template>
  <div
    class="flex items-center rounded-md border border-neutral-700"
    role="group"
    :aria-label="$t('controls.bpm')"
  >
    <button
      type="button"
      class="flex size-11 touch-none select-none items-center justify-center text-xl text-neutral-200 transition hover:bg-neutral-800 active:scale-90"
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
    <output class="w-16 text-center font-mono leading-tight text-neutral-100">
      <span class="block text-lg tabular-nums">{{ bpm }}</span>
      <span class="block text-[10px] uppercase tracking-wide text-neutral-500">{{ $t('controls.bpm') }}</span>
    </output>
    <button
      type="button"
      class="flex size-11 touch-none select-none items-center justify-center text-xl text-neutral-200 transition hover:bg-neutral-800 active:scale-90"
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
