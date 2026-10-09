<script setup lang="ts">
import type { Track } from '~/core/pattern'
import { countInBlock } from '~/core/pattern'

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
const cellHint = computed(() => props.stepNames.length > 1
  ? t('help.grid.cellSounds', { sounds: props.stepNames.map((name) => t(`steps.${name}`)).join(', ') })
  : t('help.grid.cell'))

/** What a cell shows: the step's name, or for a counting voice the number it says. */
function stepLabel(stepIndex: number): string {
  const name = props.track.steps[stepIndex]
  if (!name) return ''
  return name === 'count' ? String(countInBlock(stepIndex, props.stepsPerCount) + 1) : t(`steps.${name}`)
}

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
  // Android fires this after our own timer already opened the menu.
  if (!menuOpened) emit('step-menu', stepIndex)
  menuOpened = false
}

onBeforeUnmount(pressCancel)
</script>

<template>
  <div class="flex items-center gap-2 border-t border-neutral-800/60 py-1.5 sm:gap-3">
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
        :class="track.muted ? 'text-neutral-500' : 'text-neutral-200'"
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
      class="flex flex-1 gap-1"
      :class="{ 'opacity-50': track.muted }"
    >
      <button
        v-for="(stepIndex, i) in stepIndices"
        :key="stepIndex"
        type="button"
        class="step-cell h-11 min-w-0 flex-1 select-none overflow-hidden rounded-lg font-mono text-[10px] font-bold transition [-webkit-touch-callout:none] active:scale-90 sm:h-9"
        :class="[
          cellClass(stepIndex),
          { 'ml-1.5': i % stepsPerCount === 0 && i > 0 },
        ]"
        :data-step="stepIndex"
        :title="cellHint"
        :aria-label="t('grid.step', { instrument: instrumentName, n: stepIndex + 1 })"
        aria-haspopup="menu"
        @pointerdown="pressDown($event, stepIndex)"
        @pointermove="pressMove"
        @pointerup="pressCancel"
        @pointerleave="pressCancel"
        @pointercancel="pressCancel"
        @contextmenu.prevent="contextMenu(stepIndex)"
        @click="click(stepIndex)"
      >
        {{ stepLabel(stepIndex) }}
      </button>
    </div>

    <input
      v-if="advanced && showControls"
      type="range"
      min="0"
      max="1"
      step="0.05"
      :value="track.volume"
      :aria-label="t('grid.volume', { instrument: instrumentName })"
      class="w-20 shrink-0 accent-accent-500 max-sm:hidden"
      @input="emit('update:volume', Number(($event.target as HTMLInputElement).value))"
    >
    <span
      v-else-if="advanced"
      class="w-20 shrink-0 max-sm:hidden"
    />
  </div>
</template>
