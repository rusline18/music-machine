<script setup lang="ts">
import { isSpokenStep } from '~/core/resolve'

const props = defineProps<{
  /** Where it opens on screen: the pointer, or a cell's corner. Null: closed. */
  at: { x: number, y: number } | null
  title: string
  /** What the cell can be set to, in the instrument's order. */
  names: readonly string[]
  /** What's in the cell now (null: silence). */
  current: string | null
}>()

const emit = defineEmits<{
  /** A sound, or null for silence. */
  pick: [name: string | null]
  close: []
}>()

const { t } = useI18n()

const EDGE = 8

// The sound menu on a wider screen: a small list where the right-click
// landed, like a desktop context menu, rather than a modal across the
// page. A phone gets UiSheet instead (BeatGrid). Keys: 1–9 pick a sound,
// 0 (or Delete) silence, the arrows move, Esc closes. It's fixed to the
// screen and moved to the end of the page, like UiTooltip.
const menu = ref<HTMLElement>()
/** Where it sits once measured; see-through until then (not hidden: it takes focus), so it never flashes in the wrong place. */
const position = ref<{ top: number, left: number }>()
/** Focus goes back here when the menu closes from the keyboard. */
let returnTo: HTMLElement | null = null

const items = () => [...(menu.value?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])]

// Before the DOM updates, while the menu (and focus in it) is still there.
watch(() => props.at, (at, was) => {
  if (!at && was) close()
})

watch(() => props.at, async (at, was) => {
  if (!at) {
    position.value = undefined
    return
  }
  if (!was) returnTo = document.activeElement as HTMLElement | null
  position.value = undefined
  await nextTick()
  const rect = menu.value!.getBoundingClientRect()
  // Below and right of the pointer; flipped up where the screen runs out.
  const below = at.y + rect.height <= window.innerHeight - EDGE
  position.value = {
    top: Math.max(EDGE, below ? at.y : at.y - rect.height),
    left: Math.max(EDGE, Math.min(at.x, window.innerWidth - rect.width - EDGE)),
  }
  const list = items()
  const index = props.current ? props.names.indexOf(props.current) : props.names.length
  list[index >= 0 ? index : 0]?.focus({ preventScroll: true })
}, { flush: 'post' })

function close() {
  // Back to where focus was only if it's still in the menu: a click
  // elsewhere has already put it where the user wanted.
  if (menu.value?.contains(document.activeElement)) returnTo?.focus({ preventScroll: true })
  returnTo = null
}

function move(by: number) {
  const list = items()
  const index = list.indexOf(document.activeElement as HTMLElement)
  list[(index + by + list.length) % list.length]?.focus()
}

function onKey(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return
  const digit = Number(event.key)
  if (event.key.length === 1 && digit >= 1 && digit <= props.names.length) emit('pick', props.names[digit - 1]!)
  else if (event.key === '0' || event.key === 'Delete' || event.key === 'Backspace') emit('pick', null)
  else if (event.key === 'ArrowDown') move(1)
  else if (event.key === 'ArrowUp') move(-1)
  else if (event.key === 'Home') items()[0]?.focus()
  else if (event.key === 'End') items().at(-1)?.focus()
  else if (event.key === 'Escape' || event.key === 'Tab') emit('close')
  else return
  event.preventDefault()
  event.stopPropagation()
}

// The keys are caught for the whole window while it's open, ahead of the
// machine's own (useHotkeys: digits switch instruments), wherever focus is.
// A press anywhere else, a scroll or the window losing focus closes it.
function onOutside(event: Event) {
  if (!menu.value?.contains(event.target as Node)) emit('close')
}
const dismiss = () => emit('close')
function listen() {
  window.addEventListener('keydown', onKey, true)
  document.addEventListener('pointerdown', onOutside, true)
  window.addEventListener('scroll', onOutside, true)
  window.addEventListener('resize', dismiss)
  window.addEventListener('blur', dismiss)
}
function unlisten() {
  window.removeEventListener('keydown', onKey, true)
  document.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('scroll', onOutside, true)
  window.removeEventListener('resize', dismiss)
  window.removeEventListener('blur', dismiss)
}
watch(() => props.at !== null, (open) => (open ? listen() : unlisten()))
onBeforeUnmount(unlisten)

/** The swatch beside a sound: the cell's own colors, so it matches the grid. */
function swatchClass(name: string, index: number) {
  if (isSpokenStep(name)) return 'bg-neutral-700 text-neutral-100'
  return index === 0 ? 'bg-accent-500 text-neutral-950' : 'bg-accent-300 text-neutral-950'
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="at"
      ref="menu"
      role="menu"
      :aria-label="title"
      class="fixed z-40 w-56 rounded-2xl border border-neutral-700 bg-neutral-900 p-1.5 text-neutral-100 shadow-2xl"
      :class="{ 'opacity-0': !position }"
      :style="position ? { top: `${position.top}px`, left: `${position.left}px` } : { top: '0px', left: '0px' }"
    >
      <div
        class="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500"
        aria-hidden="true"
      >
        {{ title }}
      </div>
      <button
        v-for="(name, i) in names"
        :key="name"
        type="button"
        role="menuitemradio"
        tabindex="-1"
        class="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm focus:outline-none"
        :class="current === name ? 'bg-accent-500/20 font-semibold text-accent-300 hover:bg-accent-500/30 focus:bg-accent-500/30' : 'text-neutral-200 hover:bg-neutral-800 focus:bg-neutral-800'"
        :aria-checked="current === name"
        :aria-keyshortcuts="i < 9 ? String(i + 1) : undefined"
        @click="emit('pick', name)"
      >
        <span
          class="flex size-[22px] shrink-0 items-center justify-center rounded-md"
          :class="swatchClass(name, i)"
          aria-hidden="true"
        >
          <BeatStepGlyph :name="name" />
        </span>
        <span class="flex-1 font-mono">{{ t(`steps.${name}`) }}</span>
        <svg
          v-if="current === name"
          viewBox="0 0 16 16"
          class="size-4"
          aria-hidden="true"
        >
          <path
            d="M3 8.5 6.5 12 13 4.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <kbd
          v-else-if="i < 9"
          class="flex h-5 min-w-5 items-center justify-center rounded border border-neutral-700 px-1 font-mono text-[11px] text-neutral-500"
          aria-hidden="true"
        >{{ i + 1 }}</kbd>
      </button>
      <div
        class="mx-1 my-1.5 h-px bg-neutral-800"
        aria-hidden="true"
      />
      <button
        type="button"
        role="menuitemradio"
        tabindex="-1"
        class="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm focus:outline-none"
        :class="current ? 'text-neutral-300 hover:bg-neutral-800 focus:bg-neutral-800' : 'bg-neutral-800 font-semibold text-neutral-100'"
        :aria-checked="!current"
        aria-keyshortcuts="0"
        @click="emit('pick', null)"
      >
        <span
          class="size-[22px] shrink-0 rounded-md border border-dashed border-neutral-600"
          aria-hidden="true"
        />
        <span class="flex-1">{{ t('grid.silence') }}</span>
        <kbd
          class="flex h-5 min-w-5 items-center justify-center rounded border border-neutral-700 px-1 font-mono text-[11px] text-neutral-500"
          aria-hidden="true"
        >0</kbd>
      </button>
    </div>
  </Teleport>
</template>
