<script setup lang="ts">
import { CHORD_NAMES } from '~/core/harmony'
import type { Pattern } from '~/core/pattern'
import { COUNTS_PER_BAR, COUNTS_PER_BLOCK, countInBlock } from '~/core/pattern'

const props = defineProps<{
  pattern: Pattern
  /** What each step of an instrument can be set to. */
  stepNames: (instrument: string) => string[]
  /** The bar (4 counts) playing now, or -1 when stopped; a phone follows it. */
  playingBar: number
  /** Advanced mode: chords, volumes and every track. */
  advanced: boolean
  /** Tracks left off the grid in simple mode (the voice has its own switch). */
  simpleHides?: readonly string[]
}>()

const emit = defineEmits<{
  'toggle-step': [instrument: string, stepIndex: number]
  /** A sound picked from the menu, or null for silence. */
  'set-step': [instrument: string, stepIndex: number, name: string | null]
  'update:volume': [instrument: string, volume: number]
  'update:muted': [instrument: string, muted: boolean]
  'update:chord': [bar: number, chord: string]
}>()

const { t } = useI18n()

const shownTracks = computed(() => props.advanced
  ? props.pattern.tracks
  : props.pattern.tracks.filter((track) => !props.simpleHides?.includes(track.instrument)))

const narrow = useNarrowScreen()

// The grid is drawn one 8-count block at a time, matching how dancers
// phrase the music. A phone shows one bar (4 counts) at a time instead,
// so the cells stay big enough to tap, and follows the music while playing.
const countsPerSection = computed(() => (narrow.value ? COUNTS_PER_BAR : COUNTS_PER_BLOCK))
const stepsPerSection = computed(() => countsPerSection.value * props.pattern.stepsPerCount)
const sectionCount = computed(() => Math.ceil(props.pattern.counts / countsPerSection.value))
/** The section a phone shows. */
const page = ref(0)
const shownSections = computed(() => (narrow.value
  ? [Math.min(page.value, sectionCount.value - 1)]
  : Array.from({ length: sectionCount.value }, (_, i) => i)))

/** A phone turns to the bar that's playing, unless switched off (or the user turned the page). */
const follow = ref(true)
watch(() => props.playingBar, (bar) => {
  if (narrow.value && follow.value && bar >= 0) page.value = bar
})

function turnTo(section: number) {
  page.value = Math.max(0, Math.min(sectionCount.value - 1, section))
  // Turning back to the playing bar would undo the user's choice at once.
  if (props.playingBar >= 0) follow.value = false
}

// A sideways swipe on a phone turns the page. touch-action: pan-y on the
// section leaves vertical scrolling to the browser.
const SWIPE_PX = 50
let swipeStart: { x: number, y: number } | null = null
function swipeDown(event: PointerEvent) {
  swipeStart = narrow.value ? { x: event.clientX, y: event.clientY } : null
}
function swipeUp(event: PointerEvent) {
  if (!swipeStart) return
  const dx = event.clientX - swipeStart.x
  const dy = event.clientY - swipeStart.y
  swipeStart = null
  if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > 1.5 * Math.abs(dy)) turnTo(shownSections.value[0]! + (dx < 0 ? 1 : -1))
}

/** The cell whose sound menu is open. */
const menu = ref<{ instrument: string, stepIndex: number } | null>(null)
const menuTrack = computed(() => props.pattern.tracks.find((track) => track.instrument === menu.value?.instrument))
function openMenu(instrument: string, stepIndex: number) {
  if (props.stepNames(instrument).length > 0) menu.value = { instrument, stepIndex }
}
function pick(name: string | null) {
  if (menu.value) emit('set-step', menu.value.instrument, menu.value.stepIndex, name)
  menu.value = null
}

/** The instrument whose sheet is open (phones). */
const sheet = ref<string | null>(null)
const sheetTrack = computed(() => props.pattern.tracks.find((track) => track.instrument === sheet.value))

/** Which 8-count block a section is in, from 1. On a phone the header numbers (5 6 7 8) show which half. */
const blockOf = (section: number) => Math.floor((section * countsPerSection.value) / COUNTS_PER_BLOCK) + 1

/** Bar indices (into pattern.chords) shown in a section, or none if the pattern has no chords. */
function barsIn(section: number): number[] {
  if (!props.advanced || !props.pattern.chords?.length) return []
  const bars = countsPerSection.value / COUNTS_PER_BAR
  return Array.from({ length: bars }, (_, i) => section * bars + i)
}

/** "1", "&", "2", "&"… — the count on the beat, "&" halfway through it. */
function cellLabel(section: number, cellIndex: number): string {
  const { stepsPerCount } = props.pattern
  const position = cellIndex % stepsPerCount
  if (position === 0) return String(countInBlock(section * stepsPerSection.value + cellIndex, stepsPerCount) + 1)
  return position * 2 === stepsPerCount ? t('grid.and') : ''
}

/** The count a header cell sits on, from the pattern's start; the playhead lights it up. */
const countOf = (section: number, cellIndex: number) => Math.floor((section * stepsPerSection.value + cellIndex) / props.pattern.stepsPerCount)
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="narrow && sectionCount > 1"
      class="flex items-center justify-between gap-2"
    >
      <button
        type="button"
        class="min-h-11 min-w-11 rounded-md bg-neutral-800 px-4 py-2 text-neutral-200 disabled:opacity-40"
        :aria-label="t('grid.previous')"
        :disabled="shownSections[0] === 0"
        @click="turnTo(shownSections[0]! - 1)"
      >
        ‹
      </button>
      <span class="text-sm text-neutral-400">{{ t('grid.page', { n: shownSections[0]! + 1, total: sectionCount }) }}</span>
      <button
        type="button"
        class="min-h-11 rounded-md border px-3 text-sm transition"
        :class="follow ? 'border-amber-500/40 text-amber-400' : 'border-neutral-700 text-neutral-400'"
        :aria-pressed="follow"
        @click="follow = !follow"
      >
        {{ t('grid.follow') }}
      </button>
      <button
        type="button"
        class="min-h-11 min-w-11 rounded-md bg-neutral-800 px-4 py-2 text-neutral-200 disabled:opacity-40"
        :aria-label="t('grid.next')"
        :disabled="shownSections[0] === sectionCount - 1"
        @click="turnTo(shownSections[0]! + 1)"
      >
        ›
      </button>
    </div>

    <div
      v-for="section in shownSections"
      :key="section"
      class="touch-pan-y rounded-lg border border-neutral-800 bg-neutral-950 p-3 sm:p-4"
      @pointerdown="swipeDown"
      @pointerup="swipeUp"
      @pointercancel="swipeStart = null"
    >
      <div class="flex items-center gap-2 pb-1 sm:gap-3">
        <span class="w-[4.5rem] shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500 sm:w-32">
          {{ t('grid.block', { n: blockOf(section) }) }}
        </span>
        <div class="flex flex-1 gap-1">
          <span
            v-for="cell in stepsPerSection"
            :key="cell"
            class="count-label flex-1 text-center font-mono text-xs"
            :class="[
              (cell - 1) % pattern.stepsPerCount === 0 ? 'text-neutral-300' : 'text-neutral-600',
              { 'ml-1.5': (cell - 1) % pattern.stepsPerCount === 0 && cell > 1 },
            ]"
            :data-count="countOf(section, cell - 1)"
          >
            {{ cellLabel(section, cell - 1) }}
          </span>
        </div>
        <span
          v-if="advanced"
          class="w-20 shrink-0 max-sm:hidden"
        />
      </div>

      <div
        v-if="barsIn(section).length"
        class="flex items-center gap-2 pb-1 sm:gap-3"
      >
        <UiControlLabel
          class="w-[4.5rem] shrink-0 text-xs text-neutral-500 sm:w-32"
          :label="t('grid.chords')"
          icon="chords"
          :hint="t('help.controls.chords')"
          compact
        />
        <div class="flex flex-1 gap-1.5">
          <select
            v-for="bar in barsIn(section)"
            :key="bar"
            :value="pattern.chords![bar]"
            :aria-label="t('grid.chordForBar', { n: bar + 1 })"
            class="min-w-0 flex-1 rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
            @change="emit('update:chord', bar, ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="chord in CHORD_NAMES"
              :key="chord"
              :value="chord"
            >
              {{ chord }}
            </option>
          </select>
        </div>
        <span class="w-20 shrink-0 max-sm:hidden" />
      </div>

      <BeatTrackRow
        v-for="track in shownTracks"
        :key="track.instrument"
        :track="track"
        :step-names="stepNames(track.instrument)"
        :start="section * stepsPerSection"
        :length="stepsPerSection"
        :steps-per-count="pattern.stepsPerCount"
        :show-controls="narrow || section === 0"
        :advanced="advanced"
        @toggle-step="(stepIndex: number) => emit('toggle-step', track.instrument, stepIndex)"
        @step-menu="(stepIndex: number) => openMenu(track.instrument, stepIndex)"
        @open-instrument="sheet = track.instrument"
        @update:volume="(volume: number) => emit('update:volume', track.instrument, volume)"
        @update:muted="(muted: boolean) => emit('update:muted', track.instrument, muted)"
      />
    </div>

    <UiSheet
      :open="menu !== null"
      :title="menu ? t('grid.step', { instrument: t(`instruments.${menu.instrument}`), n: menu.stepIndex + 1 }) : ''"
      @close="menu = null"
    >
      <div
        v-if="menu && menuTrack"
        class="grid grid-cols-2 gap-2"
        role="menu"
      >
        <button
          v-for="name in stepNames(menu.instrument)"
          :key="name"
          type="button"
          role="menuitemradio"
          class="min-h-11 rounded-md px-3 py-2 font-mono text-sm transition"
          :class="menuTrack.steps[menu.stepIndex] === name ? 'bg-amber-500 text-neutral-900' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'"
          :aria-checked="menuTrack.steps[menu.stepIndex] === name"
          @click="pick(name)"
        >
          {{ t(`steps.${name}`) }}
        </button>
        <button
          type="button"
          role="menuitemradio"
          class="min-h-11 rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
          :aria-checked="!menuTrack.steps[menu.stepIndex]"
          @click="pick(null)"
        >
          {{ t('grid.silence') }}
        </button>
      </div>
    </UiSheet>

    <UiSheet
      :open="sheet !== null"
      :title="sheet ? t(`instruments.${sheet}`) : ''"
      @close="sheet = null"
    >
      <div
        v-if="sheetTrack"
        class="space-y-4"
      >
        <p class="text-sm text-neutral-400">
          {{ t(`help.instruments.${sheetTrack.instrument}`) }}
        </p>
        <button
          type="button"
          role="switch"
          class="flex min-h-11 w-full items-center justify-between gap-3 rounded-md bg-neutral-800 px-3 text-sm"
          :aria-checked="!sheetTrack.muted"
          @click="emit('update:muted', sheetTrack.instrument, !sheetTrack.muted)"
        >
          {{ t('grid.playing') }}
          <span
            class="relative h-6 w-10 shrink-0 rounded-full transition-colors"
            :class="sheetTrack.muted ? 'bg-neutral-700' : 'bg-amber-500'"
            aria-hidden="true"
          >
            <span
              class="absolute left-0 top-1 size-4 rounded-full bg-neutral-100 transition-transform"
              :class="sheetTrack.muted ? 'translate-x-1' : 'translate-x-5'"
            />
          </span>
        </button>
        <label class="flex items-center gap-3 text-sm text-neutral-300">
          {{ t('grid.volumeLabel') }}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="sheetTrack.volume"
            class="h-11 flex-1 accent-amber-500"
            @input="emit('update:volume', sheetTrack.instrument, Number(($event.target as HTMLInputElement).value))"
          >
        </label>
      </div>
    </UiSheet>
  </div>
</template>
