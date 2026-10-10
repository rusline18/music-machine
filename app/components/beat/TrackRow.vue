<script setup lang="ts">
import type { Track } from '~/core/pattern'
import { countInBlock, switchStep } from '~/core/pattern'

const props = defineProps<{
  track: Track
  /** What a step can be set to; a long press on a cell offers them. */
  stepNames: string[]
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

// The hint under a cell, for the mouse: what's in it and what the two
// buttons do. A short delay, so sweeping across the grid doesn't flash one
// bubble after another; fixed to the screen like UiTooltip.
const HINT_DELAY_MS = 400
const hint = ref<{ stepIndex: number, top: number, left: number } | null>(null)
let hintTimer: ReturnType<typeof setTimeout> | undefined
function hintIn(event: PointerEvent, stepIndex: number) {
  if (event.pointerType !== 'mouse') return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
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

onBeforeUnmount(() => {
  pressCancel()
  hintOut()
})
</script>

<template>
  <div
    class="flex items-center gap-2 border-t border-neutral-800/60 py-1.5 transition-colors sm:gap-3"
    :class="{ '-mx-1.5 rounded-xl border-transparent bg-accent-500/10 px-1.5': active }"
  >
    <div class="flex w-[4.5rem] shrink-0 items-center gap-1 sm:w-32 sm:gap-2">
      <button
        v-if="showControls"
        type="button"
        class="min-h-11 rounded-lg px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition sm:min-h-0"
        :class="track.muted ? 'bg-neutral-700 text-neutral-400' : 'bg-accent-500/20 text-accent-400'"
        :aria-pressed="track.muted"
        :aria-label="t('grid.mute', { instrument: instrumentName })"
        @click="emit('update:muted', !track.muted)"
      >
        {{ track.muted ? t('grid.off') : t('grid.on') }}
      </button>
      <!-- A phone has no room for the name and no hover: the icon opens
           the instrument's sheet instead. -->
      <button
        v-if="showControls"
        type="button"
        class="instrument-icon flex size-11 items-center justify-center rounded-xl bg-neutral-800/70 hover:bg-neutral-700 sm:hidden"
        :class="[track.muted ? 'text-neutral-500' : 'text-neutral-200', { 'ring-2 ring-inset ring-accent-500': active }]"
        :aria-label="t('grid.settings', { instrument: instrumentName })"
        :data-instrument="track.instrument"
        @click="emit('open-instrument')"
      >
        <UiIcon
          :name="track.instrument"
          :accent="!track.muted"
        />
      </button>
      <UiControlLabel
        v-if="showControls"
        class="instrument-icon min-w-0 text-sm max-sm:hidden"
        :class="track.muted ? 'text-neutral-500' : 'text-neutral-200'"
        :label="instrumentName"
        :icon="track.instrument"
        :accent="!track.muted"
        :hint="t(`help.instruments.${track.instrument}`)"
        :data-instrument="track.instrument"
        compact
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
        @pointerdown="pressDown($event, stepIndex)"
        @pointermove="pressMove"
        @pointerup="pressCancel"
        @pointerenter="hintIn($event, stepIndex)"
        @pointerleave="pressCancel(); hintOut()"
        @pointercancel="pressCancel"
        @contextmenu.prevent="contextMenu(stepIndex)"
        @click="click(stepIndex)"
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
