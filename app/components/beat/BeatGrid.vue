<script setup lang="ts">
import { CHORD_NAMES } from '~/core/harmony'
import { STEP_GLYPHS } from '~/icons'
import type { Pattern } from '~/core/pattern'
import { COUNTS_PER_BAR, COUNTS_PER_BLOCK, countInBlock, trackOf } from '~/core/pattern'

const props = defineProps<{
  pattern: Pattern
  /** What each step of an instrument can be set to. */
  stepNames: (instrument: string) => readonly string[]
  /** The bar (4 counts) playing now, or -1 when stopped; a phone follows it. */
  playingBar: number
  /** Advanced mode: chords, volumes and every track. */
  advanced: boolean
  /** Tracks left off the grid in simple mode (the voice has its own switch). */
  simpleHides?: readonly string[]
  /** The instrument playing on its own, if any. */
  solo?: string | null
}>()

const emit = defineEmits<{
  'toggle-step': [instrument: string, stepIndex: number]
  /** A sound picked from the menu, or null for silence. */
  'set-step': [instrument: string, stepIndex: number, name: string | null]
  'update:volume': [instrument: string, volume: number]
  'update:muted': [instrument: string, muted: boolean]
  'update:chord': [bar: number, chord: string]
  /** Hear one instrument on its own, or null for the whole band. */
  solo: [instrument: string | null]
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
const menuTrack = computed(() => trackOf(props.pattern, menu.value?.instrument))
function openMenu(instrument: string, stepIndex: number) {
  if (props.stepNames(instrument).length > 0) menu.value = { instrument, stepIndex }
}
function pick(name: string | null) {
  if (menu.value) emit('set-step', menu.value.instrument, menu.value.stepIndex, name)
  menu.value = null
}

// A phone has no hover and a long press is hard to find, so the sounds are
// laid out as a palette instead: a tap on an instrument with several sounds
// picks that row and works as before (a hit on or off); from then on a tap
// in the row puts in the sound chosen in the palette, or takes it out if
// it's already there.
/** The row the palette is for and the sound a tap puts in (null: silence), on a phone. */
const brush = ref<{ instrument: string, name: string | null } | null>(null)
const brushTrack = computed(() => trackOf(props.pattern, brush.value?.instrument))
watch(narrow, (isNarrow) => {
  if (!isNarrow) brush.value = null
})

function tap(instrument: string, stepIndex: number) {
  const names = props.stepNames(instrument)
  if (!narrow.value || names.length < 2) {
    emit('toggle-step', instrument, stepIndex)
    return
  }
  if (brush.value?.instrument !== instrument) {
    brush.value = { instrument, name: names[0]! }
    emit('toggle-step', instrument, stepIndex)
    return
  }
  const { name } = brush.value
  const current = brushTrack.value?.steps[stepIndex] ?? null
  emit('set-step', instrument, stepIndex, current === name ? null : name)
}

/** The sounds on the grid now, for the key over it: each mark once, in instrument order. */
const keySounds = computed(() => [...new Set(shownTracks.value.flatMap((track) =>
  props.stepNames(track.instrument).filter((name) => STEP_GLYPHS[name] && track.steps.includes(name))))])

/** The instrument whose sheet is open (phones). */
const sheet = ref<string | null>(null)
const sheetTrack = computed(() => trackOf(props.pattern, sheet.value))
/** Closing the sheet brings the whole band back. */
function closeSheet() {
  sheet.value = null
  if (props.solo) emit('solo', null)
}

/** Which 8-count block a section is in, from 1. On a phone the header numbers (5 6 7 8) show which half. */
const blockOf = (section: number) => Math.floor((section * countsPerSection.value) / COUNTS_PER_BLOCK) + 1

/** Bar indices (into pattern.chords) shown in a section, or none if the pattern has no chords. */
function barsIn(section: number): number[] {
  // A phone sets the chords from a chip above the grid (AdvancedPanel).
  if (!props.advanced || narrow.value || !props.pattern.chords?.length) return []
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
        class="min-h-11 min-w-11 rounded-xl bg-neutral-800 px-4 py-2 text-neutral-200 disabled:opacity-40"
        :aria-label="t('grid.previous')"
        :disabled="shownSections[0] === 0"
        @click="turnTo(shownSections[0]! - 1)"
      >
        ‹
      </button>
      <span class="text-sm text-neutral-400">{{ t('grid.page', { n: shownSections[0]! + 1, total: sectionCount }) }}</span>
      <button
        type="button"
        class="min-h-11 rounded-xl border px-3 text-sm transition"
        :class="follow ? 'border-accent-500/40 text-accent-400' : 'border-neutral-700 text-neutral-400'"
        :aria-pressed="follow"
        @click="follow = !follow"
      >
        {{ t('grid.follow') }}
      </button>
      <button
        type="button"
        class="min-h-11 min-w-11 rounded-xl bg-neutral-800 px-4 py-2 text-neutral-200 disabled:opacity-40"
        :aria-label="t('grid.next')"
        :disabled="shownSections[0] === sectionCount - 1"
        @click="turnTo(shownSections[0]! + 1)"
      >
        ›
      </button>
    </div>

    <!-- Always there on a phone, so the grid doesn't jump when it fills in. -->
    <div
      v-if="narrow"
      class="flex min-h-[4.75rem] flex-col justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-2"
    >
      <template v-if="brush && brushTrack">
        <div class="flex items-center gap-2 px-1 text-sm">
          <UiIcon
            :name="brush.instrument"
            class="!size-4"
          />
          <span class="font-semibold text-neutral-100">{{ t(`instruments.${brush.instrument}`) }}</span>
          <span class="text-neutral-400">{{ t('grid.brush.puts') }}</span>
          <button
            type="button"
            class="-my-2 ml-auto flex size-9 items-center justify-center rounded-lg text-lg text-neutral-400 hover:bg-neutral-800"
            :aria-label="t('grid.brush.close')"
            @click="brush = null"
          >
            ×
          </button>
        </div>
        <div
          class="grid grid-cols-3 gap-1.5"
          role="radiogroup"
          :aria-label="t('grid.brush.sounds', { instrument: t(`instruments.${brush.instrument}`) })"
        >
          <button
            v-for="name in [...stepNames(brush.instrument), null]"
            :key="name ?? 'silence'"
            type="button"
            role="radio"
            class="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1.5 text-sm transition"
            :class="brush.name === name
              ? 'bg-accent-500 font-semibold text-neutral-950'
              : name === null ? 'border border-neutral-700 text-neutral-300' : 'bg-neutral-800 text-neutral-200'"
            :aria-checked="brush.name === name"
            @click="brush.name = name"
          >
            <BeatStepGlyph
              v-if="name"
              :name="name"
              :class="brush.name === name ? '' : name === stepNames(brush.instrument)[0] ? 'text-accent-500' : 'text-accent-300'"
            />
            {{ name ? t(`steps.${name}`) : t('grid.silence') }}
          </button>
        </div>
      </template>
      <p
        v-else
        class="px-2 text-center text-sm text-neutral-500"
      >
        {{ t('grid.brush.hint') }}
      </p>
    </div>

    <!-- The key to the marks; a phone has the palette instead. -->
    <ul
      v-if="!narrow && keySounds.length"
      class="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-sm text-neutral-300"
      :aria-label="t('grid.key')"
    >
      <li
        v-for="name in keySounds"
        :key="name"
        class="inline-flex items-center gap-1.5"
      >
        <BeatStepGlyph
          :name="name"
          class="text-accent-300"
        />
        {{ t(`steps.${name}`) }}
      </li>
    </ul>

    <div
      v-for="section in shownSections"
      :key="section"
      class="touch-pan-y rounded-3xl border border-neutral-800 bg-neutral-900 p-3 sm:p-5"
      @pointerdown="swipeDown"
      @pointerup="swipeUp"
      @pointercancel="swipeStart = null"
    >
      <div class="flex items-center gap-2 pb-1 sm:gap-3">
        <span class="w-[4.5rem] shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500 sm:w-32">
          {{ t('grid.block', { n: blockOf(section) }) }}
        </span>
        <div class="flex min-w-0 flex-1 gap-1">
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
          class="w-36 shrink-0 max-sm:hidden"
        >
          <UiHint
            v-if="section === 0"
            :label="t('advanced.volume')"
            :text="t('advanced.volumeHelp')"
          />
        </span>
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
        <div class="flex min-w-0 flex-1 gap-1.5">
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
        <span class="w-36 shrink-0 max-sm:hidden" />
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
        :active="brush?.instrument === track.instrument"
        @toggle-step="(stepIndex: number) => tap(track.instrument, stepIndex)"
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
          class="min-h-11 rounded-xl px-3 py-2 font-mono text-sm transition"
          :class="menuTrack.steps[menu.stepIndex] === name ? 'bg-accent-500 text-neutral-900' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'"
          :aria-checked="menuTrack.steps[menu.stepIndex] === name"
          @click="pick(name)"
        >
          {{ t(`steps.${name}`) }}
        </button>
        <button
          type="button"
          role="menuitemradio"
          class="min-h-11 rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
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
      @close="closeSheet"
    >
      <div
        v-if="sheetTrack"
        class="space-y-4"
      >
        <div class="flex items-start gap-3">
          <span
            class="instrument-icon flex size-14 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-200 [&_svg]:size-8"
            :data-instrument="sheetTrack.instrument"
          >
            <UiIcon
              :name="sheetTrack.instrument"
              :accent="!sheetTrack.muted"
            />
          </span>
          <p class="text-sm leading-snug text-neutral-300">
            {{ t(`help.instruments.${sheetTrack.instrument}`) }}
          </p>
        </div>
        <button
          type="button"
          class="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition"
          :class="solo === sheetTrack.instrument ? 'bg-neutral-100 text-neutral-950' : 'bg-accent-500 text-neutral-950 hover:bg-accent-400'"
          :aria-pressed="solo === sheetTrack.instrument"
          @click="emit('solo', solo === sheetTrack.instrument ? null : sheetTrack.instrument)"
        >
          {{ solo === sheetTrack.instrument ? t('grid.listenAll') : t('grid.listenAlone') }}
        </button>
        <button
          type="button"
          role="switch"
          class="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-neutral-800 px-3 text-sm"
          :aria-checked="!sheetTrack.muted"
          @click="emit('update:muted', sheetTrack.instrument, !sheetTrack.muted)"
        >
          {{ t('grid.playing') }}
          <span
            class="relative h-6 w-10 shrink-0 rounded-full transition-colors"
            :class="sheetTrack.muted ? 'bg-neutral-700' : 'bg-accent-500'"
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
            class="range range-lg min-w-0 flex-1"
            :style="{ '--v': `${sheetTrack.volume * 100}%` }"
            @input="emit('update:volume', sheetTrack.instrument, Number(($event.target as HTMLInputElement).value))"
          >
        </label>
      </div>
    </UiSheet>
  </div>
</template>
