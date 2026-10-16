<script setup lang="ts">
import type { Track } from '~/core/pattern'
import { countInBlock, switchStep } from '~/core/pattern'
import { AND_STEP, COUNT_STEP, isSpokenStep, stepNamesAt } from '~/core/resolve'

const props = defineProps<{
  track: Track
  /** What a step can be set to; a long press on a cell offers them. */
  stepNames: readonly string[]
  /** First step shown in this row (rows are 8-count blocks). */
  start: number
  length: number
  stepsPerCount: number
  /** The switch is per track, so only the first block shows it. */
  showControls: boolean
  /** A phone's volume mode (BeatGrid): a slider across the row instead of the cells. */
  volumeMode?: boolean
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
  /** The instrument's sheet (description, switch, volume). */
  'open-instrument': []
}>()

const { t } = useI18n()

const stepIndices = computed(() => Array.from({ length: props.length }, (_, i) => props.start + i))
const instrumentName = computed(() => t(`instruments.${props.track.instrument}`))

/** For a counting voice, what a cell shows: the number it says, or "&". */
function spokenLabel(stepIndex: number): string {
  const name = props.track.steps[stepIndex]
  if (name === COUNT_STEP) return String(countInBlock(stepIndex, props.stepsPerCount) + 1)
  return name === AND_STEP ? t('grid.and') : ''
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
  cellPress.cancel()
  hintOut()
  hovered = cell
  if (cell) hintIn(event, cell)
}
function rowLeave() {
  hovered = null
  cellPress.cancel()
  hintOut()
}
function cellDown(event: PointerEvent) {
  hintOut()
  const cell = cellAt(event)
  if (cell) cellPress.down(event, stepOf(cell))
}
function cellClick(event: MouseEvent) {
  const cell = cellAt(event)
  if (cell) cellPress.click(stepOf(cell))
}
function cellMenu(event: MouseEvent) {
  const cell = cellAt(event)
  if (!cell) return
  event.preventDefault()
  hintOut()
  cellPress.contextMenu(stepOf(cell))
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
/** What the hinted cell can be set to (a counting voice has one sound per cell). */
const hintNames = computed(() => (hint.value ? stepNamesAt(props.stepNames, hint.value.stepIndex, props.stepsPerCount) : props.stepNames))
/** What a click on the hinted cell does: takes the sound out, or puts one in. */
const hintClick = computed(() => {
  if (hintStep.value) return t('grid.hint.remove')
  const added = switchStep(null, props.track.steps, hintNames.value)
  return added ? t('grid.hint.add', { sound: t(`steps.${added}`) }) : ''
})

/**
 * A cell's colors: the instrument's main sound in the genre's color, its
 * other sounds (open, slap…) lighter, the counting voice neutral.
 */
function cellClass(stepIndex: number): string {
  const name = props.track.steps[stepIndex]
  if (!name) return 'bg-neutral-800 text-neutral-600 hover:bg-neutral-700'
  if (isSpokenStep(name)) return 'bg-neutral-700 text-neutral-100'
  return name === props.stepNames[0] ? 'bg-accent-500 text-neutral-950' : 'bg-accent-300 text-neutral-950'
}

// A tap puts a hit in or takes it out; a long press (or right-click)
// opens the sound menu.
const cellPress = useLongPress<number>({
  tap: (stepIndex) => emit('toggle-step', stepIndex),
  longPress: (stepIndex) => emit('step-menu', stepIndex),
})

// The icon is the track's switch: a tap mutes it, a long press (or
// right-click, the menu key) opens the instrument's sheet, with the
// "keep holding" hint until that's been done once.
const iconPress = useHoldToOpen<string>({
  tap: () => emit('update:muted', !props.track.muted),
  open: () => emit('open-instrument'),
})
const { holding, holdLabel } = iconPress

onBeforeUnmount(hintOut)
</script>

<template>
  <div
    class="flex items-center gap-2 border-t border-neutral-800/60 py-1.5 transition-colors sm:gap-3"
    :class="{ '-mx-1.5 rounded-xl border-transparent bg-accent-500/10 px-1.5': active }"
  >
    <div class="relative flex w-11 shrink-0 items-center gap-2 sm:w-32">
      <!-- The icon is the switch, so a phone needs no room for an on/off
           button or the name; a long press opens the instrument's sheet. -->
      <button
        v-if="showControls"
        type="button"
        class="instrument-icon relative isolate flex size-11 shrink-0 select-none items-center justify-center overflow-hidden rounded-xl border transition [-webkit-touch-callout:none] sm:size-9 sm:rounded-lg"
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
        @pointerdown="iconPress.down($event, track.instrument)"
        @pointermove="iconPress.move"
        @pointerup="iconPress.cancel"
        @pointerleave="iconPress.cancel"
        @pointercancel="iconPress.cancel"
        @contextmenu.prevent="iconPress.contextMenu(track.instrument)"
        @click="iconPress.click(track.instrument)"
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
        <!-- Fills from the bottom while held, behind the drawing. -->
        <span
          class="pointer-events-none absolute inset-0 -z-10 origin-bottom bg-neutral-100/30"
          :class="holding ? 'scale-y-100 transition-transform duration-[450ms] ease-linear motion-reduce:transition-none' : 'scale-y-0'"
          aria-hidden="true"
        />
      </button>
      <span
        v-if="holdLabel"
        role="status"
        class="pointer-events-none absolute left-full top-1/2 z-20 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-xl bg-neutral-100 px-2.5 py-1.5 text-xs font-semibold text-neutral-950 shadow-xl before:absolute before:-left-1 before:top-1/2 before:size-2.5 before:-translate-y-1/2 before:rotate-45 before:bg-neutral-100"
      >{{ t('grid.holdHint') }}</span>
      <!-- Wider screens have room for the name: it opens the instrument's
           sheet, the visible way to what a long press on the icon does. -->
      <button
        v-if="showControls"
        type="button"
        class="-ml-1.5 flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-1 text-left text-sm transition hover:bg-neutral-800 max-sm:hidden"
        :class="track.muted ? 'text-neutral-500' : 'text-neutral-200'"
        :title="t('grid.aboutInstrument')"
        @click="emit('open-instrument')"
      >
        <span class="leading-tight">{{ instrumentName }}</span>
        <span
          class="text-neutral-500"
          aria-hidden="true"
        >›</span>
      </button>
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

    <label
      v-if="volumeMode"
      class="flex min-w-0 flex-1 items-center gap-3"
    >
      <span class="flex min-w-0 flex-1 flex-col">
        <span
          class="truncate text-xs"
          :class="track.muted ? 'text-neutral-500' : 'text-neutral-300'"
        >{{ instrumentName }}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="track.volume"
          :aria-label="t('grid.volume', { instrument: instrumentName })"
          class="range range-lg w-full"
          :class="{ 'opacity-40': track.muted }"
          :style="{ '--v': `${track.volume * 100}%` }"
          @input="emit('update:volume', Number(($event.target as HTMLInputElement).value))"
        >
      </span>
      <span
        class="w-8 text-right font-mono text-sm tabular-nums"
        :class="track.muted ? 'text-neutral-500' : 'text-neutral-300'"
        aria-hidden="true"
      >{{ Math.round(track.volume * 100) }}</span>
    </label>
    <div
      v-else
      class="flex min-w-0 flex-1 gap-1"
      :class="{ 'opacity-50': track.muted }"
      @pointerdown="cellDown"
      @pointermove="cellPress.move"
      @pointerup="cellPress.cancel"
      @pointercancel="cellPress.cancel"
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
        <template v-if="isSpokenStep(track.steps[stepIndex])">
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
          v-if="hintNames.length > 1"
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
  </div>
</template>
