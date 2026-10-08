<script setup lang="ts">
import { CHORD_NAMES } from '~/core/harmony'
import type { Pattern } from '~/core/pattern'
import { COUNTS_PER_BAR, COUNTS_PER_BLOCK, countInBlock } from '~/core/pattern'

const props = defineProps<{
  pattern: Pattern
  /** What each step of an instrument can be set to. */
  stepNames: (instrument: string) => string[]
  /** The step sounding now, or -1 when stopped. */
  activeStep: number
  /** Advanced mode: chords, volumes and every track. */
  advanced: boolean
  /** Tracks left off the grid in simple mode (the voice has its own switch). */
  simpleHides?: readonly string[]
}>()

const emit = defineEmits<{
  'toggle-step': [instrument: string, stepIndex: number]
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

watch(() => props.activeStep, (step) => {
  if (narrow.value && step >= 0) page.value = Math.floor(step / stepsPerSection.value)
})

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

function isActiveCount(section: number, cellIndex: number): boolean {
  if (props.activeStep < 0) return false
  const { stepsPerCount } = props.pattern
  const countStart = section * stepsPerSection.value + cellIndex - (cellIndex % stepsPerCount)
  return props.activeStep >= countStart && props.activeStep < countStart + stepsPerCount
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="narrow && sectionCount > 1"
      class="flex items-center justify-between gap-2"
    >
      <button
        type="button"
        class="rounded-md bg-neutral-800 px-4 py-2 text-neutral-200 disabled:opacity-40"
        :aria-label="t('grid.previous')"
        :disabled="shownSections[0] === 0"
        @click="page = shownSections[0]! - 1"
      >
        ‹
      </button>
      <span class="text-sm text-neutral-400">{{ t('grid.page', { n: shownSections[0]! + 1, total: sectionCount }) }}</span>
      <button
        type="button"
        class="rounded-md bg-neutral-800 px-4 py-2 text-neutral-200 disabled:opacity-40"
        :aria-label="t('grid.next')"
        :disabled="shownSections[0] === sectionCount - 1"
        @click="page = shownSections[0]! + 1"
      >
        ›
      </button>
    </div>

    <div
      v-for="section in shownSections"
      :key="section"
      class="rounded-lg border border-neutral-800 bg-neutral-950 p-3 sm:p-4"
    >
      <div class="flex items-center gap-2 pb-1 sm:gap-3">
        <span class="w-[4.5rem] shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500 sm:w-32">
          {{ t('grid.block', { n: blockOf(section) }) }}
        </span>
        <div class="flex flex-1 gap-1">
          <span
            v-for="cell in stepsPerSection"
            :key="cell"
            class="flex-1 text-center font-mono text-xs"
            :class="[
              (cell - 1) % pattern.stepsPerCount === 0 ? 'text-neutral-300' : 'text-neutral-600',
              {
                'ml-1.5': (cell - 1) % pattern.stepsPerCount === 0 && cell > 1,
                'text-amber-400': isActiveCount(section, cell - 1),
              },
            ]"
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
        :active-step="activeStep"
        :start="section * stepsPerSection"
        :length="stepsPerSection"
        :steps-per-count="pattern.stepsPerCount"
        :show-controls="narrow || section === 0"
        :advanced="advanced"
        @toggle-step="(stepIndex: number) => emit('toggle-step', track.instrument, stepIndex)"
        @update:volume="(volume: number) => emit('update:volume', track.instrument, volume)"
        @update:muted="(muted: boolean) => emit('update:muted', track.instrument, muted)"
      />
    </div>
  </div>
</template>
