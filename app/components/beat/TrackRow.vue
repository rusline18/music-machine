<script setup lang="ts">
import type { Track } from '~/core/pattern'
import { countInBlock, switchStep } from '~/core/pattern'

const props = defineProps<{
  track: Track
  /** What a step can be set to; a long press on a cell offers them. */
  stepNames: readonly string[]
  /** First step shown in this row (rows are 8-count blocks). */
  start: number
  length: number
  stepsPerCount: number
  /** Mute and volume are per track, so only the first block shows them. */
  showControls: boolean
  /** Advanced mode: volume slider. */
  advanced: boolean
  /** On a phone: the row the sound palette is for (BeatGrid). */
  active?: boolean
}>()

const emit = defineEmits<{
  /** A tap: a hit on or off. */
  'toggle-step': [stepIndex: number]
  /** A long press or right-click: choose the sound. */
  'step-menu': [stepIndex: number]
  'update:volume': [volume: number]
  'update:muted': [muted: boolean]
  /** On a phone: the instrument's sheet (description, switch, volume). */
  'open-instrument': []
}>()

const { t } = useI18n()

const stepIndices = computed(() => Array.from({ length: props.length }, (_, i) => props.start + i))
const instrumentName = computed(() => t(`instruments.${props.track.instrument}`))
const isSpoken = (name: string | null | undefined) => name === 'count' || name === 'and'

/** For a counting voice, what a cell shows: the number it says, or "&". */
function spokenLabel(stepIndex: number): string {
  const name = props.track.steps[stepIndex]
  if (name === 'count') return String(countInBlock(stepIndex, props.stepsPerCount) + 1)
  return name === 'and' ? t('grid.and') : ''
}

// The cells' pointer events are handled once for the row rather than on
// every cell (eight listeners each, a few hundred cells): the cell is found
// from the event's target.
function cellAt(event: Event): HTMLElement | null {
  return (event.target as Element | null)?.closest<HTMLElement>('[data-step]') ?? null
}
const stepOf = (cell: HTMLElement) => Number(cell.dataset.step)

/** The cell under the mouse or finger, so moving within it isn't a new arrival. */
let hovered: HTMLElement | null = null
function cellOver(event: PointerEvent) {
  const cell = cellAt(event)
  if (cell === hovered) return
  // Leaving a cell (for the next one, or the gap between them).
  pressCancel()
  hintOut()
  hovered = cell
  if (cell) hintIn(event, cell)
}
function rowLeave() {
  hovered = null
  pressCancel()
  hintOut()
}
function cellDown(event: PointerEvent) {
  const cell = cellAt(event)
  if (cell) pressDown(event, stepOf(cell))
}
function cellClick(event: MouseEvent) {
  const cell = cellAt(event)
  if (cell) click(stepOf(cell))
}
function cellMenu(event: MouseEvent) {
  const cell = cellAt(event)
  if (!cell) return
  event.preventDefault()
  contextMenu(stepOf(cell))
}

// The hint under a cell, for the mouse: what's in it and what the two
// buttons do. A short delay, so sweeping across the grid doesn't flash one
// bubble after another; fixed to the screen like UiTooltip.
const HINT_DELAY_MS = 400
const hint = ref<{ stepIndex: number, top: number, left: number } | null>(null)
let hintTimer: ReturnType<typeof setTimeout> | undefined
function hintIn(event: PointerEvent, cell: HTMLElement) {
  if (event.pointerType !== 'mouse') return
  const stepIndex = stepOf(cell)
  const rect = cell.getBoundingClientRect()
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => {
    hint.value = { stepIndex, top: rect.bottom + 8, left: rect.left + rect.width / 2 }
  }, HINT_DELAY_MS)
}
function hintOut() {
  clearTimeout(hintTimer)
  hint.value = null
}
const hintStep = computed(() => (hint.value ? props.track.steps[hint.value.stepIndex] ?? null : null))
/** What a click on the hinted cell does: takes the sound out, or puts one in. */
const hintClick = computed(() => {
  if (hintStep.value) return t('grid.hint.remove')
  const added = switchStep(null, props.track.steps, props.stepNames)
  return added ? t('grid.hint.add', { sound: t(`steps.${added}`) }) : ''
})

/**
 * A cell's colors: the instrument's main sound in the genre's color, its
 * other sounds (open, slap…) lighter, the counting voice neutral.
 */
function cellClass(stepIndex: number): string {
  const name = props.track.steps[stepIndex]
  if (!name) return 'bg-neutral-800 text-neutral-600 hover:bg-neutral-700'
  if (name === 'count' || name === 'and') return 'bg-neutral-700 text-neutral-100'
  return name === props.stepNames[0] ? 'bg-accent-500 text-neutral-950' : 'bg-accent-300 text-neutral-950'
}

// A long press opens the sound menu. iOS doesn't fire contextmenu on touch,
// hence the timer; elsewhere contextmenu (right-click, the menu key,
// Android's long press) opens it too.
const LONG_PRESS_MS = 450
/** Moving further than this is a scroll or a swipe, not a press. */
const PRESS_SLOP_PX = 10
let pressTimer: ReturnType<typeof setTimeout> | undefined
let pressStart: { x: number, y: number } | null = null
/** Set when a press opened the menu, so the click that ends it doesn't also toggle. */
let menuOpened = false

function pressDown(event: PointerEvent, stepIndex: number) {
  hintOut()
  if (event.button !== 0) return
  menuOpened = false
  pressStart = { x: event.clientX, y: event.clientY }
  clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    pressStart = null
    menuOpened = true
    emit('step-menu', stepIndex)
  }, LONG_PRESS_MS)
}

function pressMove(event: PointerEvent) {
  if (pressStart && Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > PRESS_SLOP_PX) pressCancel()
}

function pressCancel() {
  clearTimeout(pressTimer)
  pressStart = null
}

function click(stepIndex: number) {
  if (menuOpened) menuOpened = false
  else emit('toggle-step', stepIndex)
}

function contextMenu(stepIndex: number) {
  pressCancel()
  hintOut()
  // Android fires this after our own timer already opened the menu.
  if (!menuOpened) emit('step-menu', stepIndex)
  menuOpened = false
}

// The icon is the track's switch: a tap mutes it, a long press (or
// right-click, the menu key) opens the instrument's sheet. Same timing as
// the cells' long press.
let iconTimer: ReturnType<typeof setTimeout> | undefined
let iconStart: { x: number, y: number } | null = null
/** Set when a press opened the sheet, so the click that ends it doesn't also mute. */
let sheetOpened = false

function iconDown(event: PointerEvent) {
  if (event.button !== 0) return
  sheetOpened = false
  iconStart = { x: event.clientX, y: event.clientY }
  clearTimeout(iconTimer)
  iconTimer = setTimeout(() => {
    iconStart = null
    sheetOpened = true
    emit('open-instrument')
  }, LONG_PRESS_MS)
}

function iconMove(event: PointerEvent) {
  if (iconStart && Math.hypot(event.clientX - iconStart.x, event.clientY - iconStart.y) > PRESS_SLOP_PX) iconCancel()
}

function iconCancel() {
  clearTimeout(iconTimer)
  iconStart = null
}

function iconClick() {
  if (sheetOpened) sheetOpened = false
  else emit('update:muted', !props.track.muted)
}

function iconMenu() {
  iconCancel()
  if (!sheetOpened) emit('open-instrument')
  sheetOpened = false
}

onBeforeUnmount(() => {
  pressCancel()
  hintOut()
  iconCancel()
})
</script>

<template>
  <div
    class="flex items-center gap-2 border-t border-neutral-800/60 py-1.5 transition-colors sm:gap-3"
    :class="{ '-mx-1.5 rounded-xl border-transparent bg-accent-500/10 px-1.5': active }"
  >
    <div class="flex w-11 shrink-0 items-center gap-2 sm:w-32">
      <!-- The icon is the switch, so a phone needs no room for an on/off
           button or the name; a long press opens the instrument's sheet. -->
      <button
        v-if="showControls"
        type="button"
        class="instrument-icon relative flex size-11 shrink-0 select-none items-center justify-center rounded-xl border transition [-webkit-touch-callout:none] sm:size-9 sm:rounded-lg"
        :class="[
          track.muted
            ? 'border-neutral-700 bg-neutral-900 text-neutral-500 hover:bg-neutral-800 [&>svg:first-child]:opacity-60'
            : 'border-accent-500/70 bg-accent-500/25 text-neutral-100 hover:bg-accent-500/35',
          { 'ring-2 ring-accent-500': active },
        ]"
        :aria-pressed="track.muted"
        :aria-label="t('grid.mute', { instrument: instrumentName })"
        :title="t('grid.muteHint')"
        :data-instrument="track.instrument"
        @pointerdown="iconDown"
        @pointermove="iconMove"
        @pointerup="iconCancel"
        @pointerleave="iconCancel"
        @pointercancel="iconCancel"
        @contextmenu.prevent="iconMenu"
        @click="iconClick"
      >
        <UiIcon
          :name="track.instrument"
          :accent="!track.muted"
        />
        <svg
          v-if="track.muted"
          viewBox="0 0 44 44"
          class="pointer-events-none absolute inset-0 size-full"
          aria-hidden="true"
        >
          <!-- Corner to corner, across the tile rather than the drawing, so
               it doesn't read as part of an icon (the clave's sticks). -->
          <path
            d="M7 37 37 7"
            class="stroke-neutral-950"
            stroke-width="5"
            stroke-linecap="round"
          />
          <path
            d="M7 37 37 7"
            class="stroke-neutral-300"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <UiControlLabel
        v-if="showControls"
        class="min-w-0 text-sm max-sm:hidden"
        :class="track.muted ? 'text-neutral-500' : 'text-neutral-200'"
        :label="instrumentName"
        :hint="t(`help.instruments.${track.instrument}`)"
      />
      <UiControlLabel
        v-else
        class="instrument-icon min-w-0 truncate text-sm text-neutral-500"
        :label="instrumentName"
        :icon="track.instrument"
        :accent="false"
        :data-instrument="track.instrument"
        compact
      />
    </div>

    <div
      class="flex min-w-0 flex-1 gap-1"
      :class="{ 'opacity-50': track.muted }"
      @pointerdown="cellDown"
      @pointermove="pressMove"
      @pointerup="pressCancel"
      @pointercancel="pressCancel"
      @pointerover="cellOver"
      @pointerleave="rowLeave"
      @contextmenu="cellMenu"
      @click="cellClick"
    >
      <button
        v-for="(stepIndex, i) in stepIndices"
        :key="stepIndex"
        type="button"
        class="step-cell flex h-11 min-w-0 flex-1 select-none items-center justify-center overflow-hidden rounded-lg font-mono text-[10px] font-bold transition [-webkit-touch-callout:none] active:scale-90 sm:h-9"
        :class="[
          cellClass(stepIndex),
          { 'ml-1.5': i % stepsPerCount === 0 && i > 0 },
        ]"
        :data-step="stepIndex"
        :data-sound="track.steps[stepIndex] ?? undefined"
        :aria-label="t('grid.step', { instrument: instrumentName, n: stepIndex + 1 })"
        aria-haspopup="menu"
      >
        <template v-if="isSpoken(track.steps[stepIndex])">
          {{ spokenLabel(stepIndex) }}
        </template>
        <!-- A cell is too narrow for the word, even on a desktop: the
             mark, with the word in the hint, the key and the palette. -->
        <BeatStepGlyph
          v-else-if="track.steps[stepIndex]"
          :name="track.steps[stepIndex]!"
        />
      </button>
    </div>

    <div
      v-if="hint"
      role="tooltip"
      class="pointer-events-none fixed z-30 -translate-x-1/2 rounded-xl bg-neutral-100 px-3 py-2 text-neutral-950 shadow-lg"
      :style="{ top: `${hint.top}px`, left: `${hint.left}px` }"
    >
      <strong class="block whitespace-nowrap text-sm font-bold">
        {{ instrumentName }} · {{ hintStep ? t(`steps.${hintStep}`) : t('grid.silence').toLowerCase() }}
      </strong>
      <span class="mt-1.5 flex items-center gap-3 whitespace-nowrap text-xs text-neutral-700">
        <span
          v-if="hintClick"
          class="inline-flex items-center gap-1"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-4"
            aria-hidden="true"
          >
            <path
              d="M7 8a5 5 0 0 1 5-5v6H7z"
              class="fill-accent-500"
            />
            <path
              d="M7 8a5 5 0 0 1 10 0v8a5 5 0 0 1-10 0zM12 3v6M7 9h10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
          </svg>
          {{ hintClick }}
        </span>
        <span
          v-if="stepNames.length > 1"
          class="inline-flex items-center gap-1"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-4"
            aria-hidden="true"
          >
            <path
              d="M17 8a5 5 0 0 0 -5-5v6h5z"
              class="fill-accent-500"
            />
            <path
              d="M7 8a5 5 0 0 1 10 0v8a5 5 0 0 1-10 0zM12 3v6M7 9h10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
          </svg>
          {{ t('grid.hint.choose') }}
        </span>
      </span>
    </div>

    <div
      v-if="advanced && showControls"
      class="flex w-36 shrink-0 items-center gap-2.5 max-sm:hidden"
    >
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="track.volume"
        :aria-label="t('grid.volume', { instrument: instrumentName })"
        class="range min-w-0 flex-1"
        :class="{ 'opacity-40': track.muted }"
        :style="{ '--v': `${track.volume * 100}%` }"
        @input="emit('update:volume', Number(($event.target as HTMLInputElement).value))"
      >
      <span
        class="w-7 text-right font-mono text-xs tabular-nums text-neutral-400"
        aria-hidden="true"
      >{{ Math.round(track.volume * 100) }}</span>
    </div>
    <span
      v-else-if="advanced"
      class="w-36 shrink-0 max-sm:hidden"
    />
  </div>
</template>
