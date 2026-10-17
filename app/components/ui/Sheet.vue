<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()

const dialog = ref<HTMLDialogElement | null>(null)

// A native modal dialog: it keeps focus inside, closes on Esc and puts
// focus back where it was. On a phone it slides up from the bottom edge,
// in reach of the thumb; on wider screens it opens in the middle.
watch(() => props.open, (open) => {
  if (open && !dialog.value?.open) dialog.value?.showModal()
  else if (!open && dialog.value?.open) dialog.value.close()
}, { flush: 'post' })

/** A tap on the dimmed backdrop (the dialog element itself, outside the panel) closes it. */
function onClick(event: MouseEvent) {
  if (event.target === dialog.value) dialog.value?.close()
}

const narrow = useNarrowScreen()

// On a phone the sheet can be pulled down by its top (the handle and the
// title): it follows the finger, and closes if let go far enough down or
// flicked; otherwise it springs back. The rest of the sheet has sliders and
// lists of its own, so it doesn't drag.
/** Pulled down further than this, the sheet closes… */
const CLOSE_PX = 80
/** …or flicked down faster than this (px/ms). */
const FLICK_SPEED = 0.5
const SETTLE_MS = 150
let drag: { y: number, time: number, id: number } | null = null

function moveTo(dy: number, animate: boolean) {
  const style = dialog.value?.style
  if (!style) return
  style.transition = animate ? `transform ${SETTLE_MS}ms ease-out` : 'none'
  style.transform = dy ? `translateY(${dy}px)` : ''
}

// No pointer capture: a finger's events stay with what it touched anyway,
// and capturing would take the click away from the ✕.
function dragDown(event: PointerEvent) {
  if (narrow.value && event.isPrimary) drag = { y: event.clientY, time: event.timeStamp, id: event.pointerId }
}

function dragMove(event: PointerEvent) {
  if (drag?.id === event.pointerId) moveTo(Math.max(0, event.clientY - drag.y), false)
}

function dragUp(event: PointerEvent) {
  if (drag?.id !== event.pointerId) return
  const dy = Math.max(0, event.clientY - drag.y)
  const speed = dy / Math.max(1, event.timeStamp - drag.time)
  drag = null
  if (dy > CLOSE_PX || (dy > CLOSE_PX / 3 && speed > FLICK_SPEED)) {
    const panel = dialog.value
    moveTo(panel?.offsetHeight ?? 0, true)
    setTimeout(() => {
      panel?.close()
      moveTo(0, false)
    }, SETTLE_MS)
  } else {
    moveTo(0, true)
  }
}

function dragCancel() {
  drag = null
  moveTo(0, true)
}
</script>

<template>
  <dialog
    ref="dialog"
    class="sheet m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-neutral-800 bg-neutral-900 p-0 text-neutral-100 shadow-2xl backdrop:bg-black/60 max-sm:bottom-0 max-sm:top-auto max-sm:m-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-t-[1.75rem] max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0"
    :aria-label="title"
    @close="emit('close')"
    @click="onClick"
  >
    <div class="p-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:pt-2">
      <div
        class="max-sm:touch-none"
        @pointerdown="dragDown"
        @pointermove="dragMove"
        @pointerup="dragUp"
        @pointercancel="dragCancel"
      >
        <!-- The handle: a phone's sheet is pulled down by it to close. -->
        <div
          class="mx-auto mb-2 h-1 w-10 rounded-full bg-neutral-700 sm:hidden"
          aria-hidden="true"
        />
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="font-semibold">
            {{ title }}
          </h2>
          <button
            type="button"
            class="-m-2 flex size-11 items-center justify-center rounded text-neutral-400 hover:text-neutral-100"
            :aria-label="$t('controls.close')"
            @click="dialog?.close()"
          >
            ✕
          </button>
        </div>
      </div>
      <slot />
    </div>
  </dialog>
</template>
