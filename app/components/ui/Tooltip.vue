<script setup lang="ts">
defineProps<{
  /** What the thing in the slot is or does, in a sentence or two. */
  text: string
  /** A bold heading above the text. */
  title?: string
}>()

/** Matches w-64 / max-w-[80vw] on the bubble. */
const BUBBLE_WIDTH = 256
const EDGE = 8

const id = useId()
const root = ref<HTMLElement>()
/** Where the bubble sits on screen while open. */
const position = ref<{ top: number, left: number }>()

// title="" never shows on touch screens, so the bubble opens on mouse hover, on
// keyboard focus and on tap, and closes on Esc, a tap anywhere else or a
// scroll. Hover is mouse-only: phones fire a fake mouse leave after a tap.
// It's fixed to the screen so a scrolling grid doesn't clip it.
function show() {
  const rect = root.value!.getBoundingClientRect()
  const width = Math.min(BUBBLE_WIDTH, window.innerWidth * 0.8)
  position.value = {
    top: rect.bottom + EDGE,
    left: Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE)),
  }
}

function hide() {
  position.value = undefined
}

function closeOnOutside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) hide()
}

watch(position, (open, wasOpen) => {
  if (open && !wasOpen) {
    document.addEventListener('pointerdown', closeOnOutside)
    window.addEventListener('scroll', hide, { capture: true, passive: true })
  } else if (!open) {
    document.removeEventListener('pointerdown', closeOnOutside)
    window.removeEventListener('scroll', hide, { capture: true })
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeOnOutside)
  window.removeEventListener('scroll', hide, { capture: true })
})
</script>

<template>
  <span
    ref="root"
    class="inline-flex"
    @pointerenter="(event: PointerEvent) => event.pointerType === 'mouse' && show()"
    @pointerleave="(event: PointerEvent) => event.pointerType === 'mouse' && hide()"
  >
    <button
      type="button"
      class="inline-flex cursor-help items-center gap-1.5 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
      :aria-describedby="id"
      @click="show"
      @focus="show"
      @blur="hide"
      @keydown.esc="hide"
    >
      <slot />
    </button>
    <span
      v-show="position"
      :id="id"
      role="tooltip"
      class="fixed z-30 w-64 max-w-[80vw] rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-xs font-normal normal-case leading-snug tracking-normal text-neutral-200 shadow-lg"
      :style="position && { top: `${position.top}px`, left: `${position.left}px` }"
    >
      <strong
        v-if="title"
        class="mb-1 block text-sm font-bold text-neutral-50"
      >{{ title }}</strong>
      {{ text }}
      <!-- Extra content under the text, e.g. a little diagram. -->
      <slot name="details" />
    </span>
  </span>
</template>
