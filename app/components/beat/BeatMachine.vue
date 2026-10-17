<script setup lang="ts">
import { prefetchSamples } from '~/core/audio/prefetch'
import { dragsItself, swipeDirection } from '~/core/gestures'
import { COUNTS_PER_BAR } from '~/core/pattern'
import { COUNTING_MODES, sampleUrls, stepNames } from '~/core/resolve'
import type { Genre } from '~/genres'
import { genres } from '~/genres'
import { findInstrumentPage } from '~/genres/instrumentPages'

const props = defineProps<{
  genre: Genre
}>()

const {
  pattern,
  selectedPresetId,
  selectPreset,
  reset,
  song,
  sectionFits,
  startSong,
  addSection,
  removeSection,
  shareCode,
  isPlaying,
  isLoading,
  loadProgress,
  failedSamples,
  activeStep,
  onBeat,
  solo,
  setSolo,
  play,
  stop,
  setCounts,
  setChord,
  setStep,
  switchStep,
  tempo,
  setTempo,
  nudgeTempo,
  setVolume,
  setMuted,
  hasVoice,
  countingMode,
  setCounting,
  randomize,
  clear,
  layers,
  startLayers,
  addLayer,
  endLayers,
} = useBeatMachine(props.genre, useI18n().locale)

const { advanced, setMode } = useUiMode()

const { t, locale } = useI18n()

// The other genre's sounds start downloading once its switch is pointed at
// or touched, so its page plays on the first tap.
const prefetchGenre = (other: Genre) => other.id !== props.genre.id && prefetchSamples(sampleUrls(other, locale.value))

const { tempoOptions, countingOptions } = useControlOptions()

/** The presets, plus the pattern from a link while that's what's loaded. */
const presetIds = computed(() => {
  const ids = props.genre.presets.map((preset) => preset.id)
  return ids.includes(selectedPresetId.value) ? ids : [...ids, selectedPresetId.value]
})
/** Simple mode leaves these off the grid: the voice has its own switch above it. */
const simpleHides = props.genre.instruments.filter((instrument) => props.genre.spoken[instrument])
/** The band, without the counting voice: the practice switches and the 1–9 keys. */
const bandTracks = computed(() => pattern.value.tracks.filter((track) => !simpleHides.includes(track.instrument)))

const { view: shownView, setView } = useBeatView()
const viewOptions = computed(() => (['practice', 'editor'] as const).map((value) => ({ value, label: t(`view.${value}`) })))

// On a phone a sideways swipe over the cards or the grid turns between the
// views, in the switch's order: left to the grid, right back to practice.
// The grid turns its own bars first (BeatGrid), so on the grid it's a swipe
// back from the first bar. touch-action: pan-y (with pinch zoom) keeps a
// sideways move from being the browser's.
const narrow = useNarrowScreen()
let viewSwipe: { x: number, y: number } | null = null
function viewSwipeDown(event: PointerEvent) {
  viewSwipe = narrow.value && event.isPrimary && !dragsItself(event.target) ? { x: event.clientX, y: event.clientY } : null
}
function viewSwipeUp(event: PointerEvent) {
  if (!viewSwipe) return
  const direction = swipeDirection(event.clientX - viewSwipe.x, event.clientY - viewSwipe.y)
  viewSwipe = null
  const next = direction < 0 ? 'editor' : direction > 0 ? 'practice' : null
  if (!next || next === shownView.value) return
  setView(next)
  hapticTick()
}

/** The phone's voice button: off → counts → counts with "and" → off. */
const nextCounting = () => setCounting(COUNTING_MODES[(COUNTING_MODES.indexOf(countingMode.value ?? 'off') + 1) % COUNTING_MODES.length]!)

const togglePlay = () => (isPlaying.value || isLoading.value ? stop() : play())
useWakeLock(() => isPlaying.value)
useClosingConfirmation(() => isPlaying.value)
useHotkeys({
  togglePlay,
  nudgeTempo,
  toggleInstrument: (index) => {
    const track = bandTracks.value[index]
    if (track) setMuted(track.instrument, !track.muted)
  },
})

/** The same array for an instrument every time (see stepNames), so rows aren't re-rendered for nothing. */
const stepNamesFor = (instrument: string) => stepNames(props.genre, instrument)
/** Whether the user already knows a long press opens the sheet (then the ⓘ's tip is left out). */
const holdHint = useHoldHint()
/** The sheet opened from the practice cards; `viaButton` when by its ⓘ, which then tips the long press. */
const practiceSheet = ref<{ instrument: string, viaButton: boolean } | null>(null)
const practiceTrack = computed(() => practiceSheet.value && pattern.value.tracks.find((track) => track.instrument === practiceSheet.value!.instrument))
function closePracticeSheet() {
  practiceSheet.value = null
  if (solo.value) setSolo(null)
}
const instrumentLink = (instrument: string) => (findInstrumentPage(props.genre, instrument) ? `/${props.genre.id}/${instrument}` : undefined)

const root = useTemplateRef('root')
const motion = useMotion()
useBeatEffects(root, onBeat, {
  stepsPerCount: () => pattern.value.stepsPerCount,
  bpm: () => pattern.value.bpm,
  animate: () => motion.enabled.value,
})
/** Changes once a bar rather than every step, so the grid isn't re-rendered while playing. */
const playingBar = computed(() => (activeStep.value < 0 ? -1 : Math.floor(activeStep.value / (COUNTS_PER_BAR * pattern.value.stepsPerCount))))
</script>

<template>
  <!-- A column so the practice bar can sit last on a phone (stuck to the
       bottom) and above the grid on wider screens (stuck to the top). -->
  <div
    ref="root"
    class="flex flex-col"
  >
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="flex flex-wrap items-center gap-4">
          <NuxtLinkLocale
            to="/"
            class="genre-back text-sm text-neutral-500 hover:text-neutral-300"
          >
            {{ $t('nav.back') }}
          </NuxtLinkLocale>
          <!-- The other genres, one tap away; each in its own color (data-genre).
               Going to one slides the pill over and the page across
               (plugins/genre-slide.client.ts, the names in main.css). -->
          <nav
            class="genre-switch flex gap-1 rounded-full bg-neutral-900 p-1"
            :aria-label="$t('nav.genres')"
          >
            <NuxtLinkLocale
              v-for="other in genres"
              :key="other.id"
              :to="`/${other.id}`"
              class="relative isolate rounded-full px-4 py-1.5 text-sm transition"
              :class="other.id === genre.id ? 'font-bold text-neutral-950' : 'font-semibold text-neutral-400 hover:text-accent-400'"
              :data-genre="other.id"
              :aria-current="other.id === genre.id ? 'page' : undefined"
              @pointerenter="prefetchGenre(other)"
              @focus="prefetchGenre(other)"
              @touchstart.passive="prefetchGenre(other)"
            >
              <span
                v-if="other.id === genre.id"
                class="genre-pill absolute inset-0 -z-10 rounded-full bg-accent-500"
                aria-hidden="true"
              />
              <span
                class="genre-label block"
                :style="{ viewTransitionName: `genre-label-${other.id}` }"
              >{{ $t(`genres.${other.id}.name`) }}</span>
            </NuxtLinkLocale>
          </nav>
        </div>
        <h1 class="genre-title mt-2 text-4xl font-extrabold tracking-tight text-neutral-50 sm:text-6xl">
          {{ $t(`genres.${genre.id}.name`) }}
        </h1>
      </div>
      <div class="flex max-w-sm flex-col gap-1.5 sm:items-end">
        <BeatPresetSelector
          :model-value="selectedPresetId"
          :preset-ids="presetIds"
          @update:model-value="selectPreset"
        />
        <p class="text-sm text-neutral-400 sm:text-right">
          {{ $t(`help.presets.${selectedPresetId}`) }}
        </p>
      </div>
    </div>

    <UiSegmentedControl
      class="mb-6 sm:hidden"
      :label="$t('view.label')"
      :hint="$t('help.controls.view')"
      :options="viewOptions"
      :model-value="shownView"
      @update:model-value="(next) => next && setView(next)"
    />

    <UiSegmentedControl
      v-if="!advanced"
      class="mb-6"
      :label="$t('controls.speed')"
      icon="tempo"
      :hint="$t('help.controls.speed')"
      :options="tempoOptions"
      :model-value="tempo"
      @update:model-value="(choice) => choice && setTempo(choice)"
    />

    <!-- Everything for playing in one strip: Play, tempo, the counting
         voice and the count. -->
    <BeatPracticeBar class="max-sm:order-last sm:mb-6">
      <div class="flex items-center gap-3 sm:gap-6">
        <BeatTransport
          class="max-sm:flex-1"
          :is-playing="isPlaying"
          :is-loading="isLoading"
          :load-progress="loadProgress"
          :failed-samples="failedSamples"
          :bpm="pattern.bpm"
          @play="play"
          @stop="stop"
          @nudge="nudgeTempo"
        />
        <template v-if="hasVoice">
          <!-- A phone has room for one button: each tap moves to the next way of counting. -->
          <button
            type="button"
            class="flex size-[3.25rem] shrink-0 flex-col items-center justify-center rounded-2xl transition sm:hidden"
            :class="countingMode === 'off' ? 'border border-neutral-700 text-neutral-400' : 'bg-neutral-100 text-neutral-950'"
            :aria-label="`${$t('controls.voice')}: ${$t(`controls.counting.${countingMode}`)}`"
            :title="$t('help.controls.voice')"
            @click="nextCounting"
          >
            <UiIcon name="voice" />
            <span
              class="font-mono text-[9px] font-bold leading-none"
              aria-hidden="true"
            >{{ $t(`controls.counting.${countingMode}`) }}</span>
          </button>
          <UiSegmentedControl
            class="max-sm:hidden"
            :label="$t('controls.voice')"
            icon="voice"
            :hint="$t('help.controls.voice')"
            :options="countingOptions"
            :model-value="countingMode"
            @update:model-value="(mode) => mode && setCounting(mode)"
          />
        </template>
      </div>
    </BeatPracticeBar>

    <!-- The grid, with the song builder and the layer guide beside it on a
         wide screen and after it on a phone (what's practised comes first). -->
    <div class="flex flex-col gap-6 max-sm:mb-6 lg:flex-row lg:items-start">
      <div
        class="flex min-w-0 flex-1 flex-col gap-6 max-sm:touch-pan-y max-sm:touch-pinch-zoom"
        @pointerdown="viewSwipeDown"
        @pointerup="viewSwipeUp"
        @pointercancel="viewSwipe = null"
      >
        <!-- Practice view on a phone. Shown and hidden with CSS, so the server
             renders the right one and nothing jumps after loading. -->
        <BeatInstrumentCards
          :class="shownView === 'practice' ? 'sm:hidden' : 'hidden'"
          :tracks="bandTracks"
          @update:muted="setMuted"
          @open-instrument="(instrument, viaButton) => practiceSheet = { instrument, viaButton }"
        />
        <BeatInstrumentSheet
          :track="practiceTrack"
          :solo="solo"
          :link="practiceSheet ? instrumentLink(practiceSheet.instrument) : undefined"
          :tip="practiceSheet?.viaButton && !holdHint.learnt.value ? $t('practice.longPressTip') : undefined"
          @close="closePracticeSheet"
          @solo="setSolo"
          @update:muted="setMuted"
          @update:volume="setVolume"
        />

        <div :class="{ 'max-sm:hidden': shownView !== 'editor' }">
          <BeatAdvancedPanel
            v-if="advanced"
            class="mb-6"
            :counts="pattern.counts"
            :chords="pattern.chords"
            @set-counts="setCounts"
            @set-chord="setChord"
            @randomize="randomize"
            @clear="clear"
          />

          <BeatGrid
            :pattern="pattern"
            :step-names="stepNamesFor"
            :playing-bar="playingBar"
            :advanced="advanced"
            :simple-hides="simpleHides"
            :solo="solo"
            :instrument-link="instrumentLink"
            @solo="setSolo"
            @toggle-step="switchStep"
            @set-step="setStep"
            @update:volume="setVolume"
            @update:muted="setMuted"
            @update:chord="setChord"
          />
        </div>
      </div>

      <aside class="flex flex-col gap-6 lg:w-80 lg:shrink-0">
        <BeatSongBuilder
          :genre="genre"
          :song="song"
          :fits="sectionFits"
          @start="startSong"
          @add="addSection"
          @remove="removeSection"
        />
        <BeatLayerGuide
          :layers="layers"
          @start="startLayers"
          @add="addLayer"
          @end="endLayers"
        />
      </aside>
    </div>

    <!-- One row of page actions; what the switches do is in their titles. -->
    <div class="flex flex-wrap items-center gap-3 max-sm:order-1 max-sm:mb-6 sm:mt-6">
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
        :title="$t('help.controls.reset')"
        @click="reset"
      >
        <UiIcon name="reset" />
        {{ $t('controls.reset') }}
      </button>
      <BeatShareButton
        :code="shareCode"
        :genre="genre.id"
      />
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
        :aria-pressed="advanced"
        :title="advanced ? $t('help.controls.simpleMode') : $t('help.controls.advancedMode')"
        @click="setMode(advanced ? 'simple' : 'advanced')"
      >
        <UiIcon name="advanced" />
        {{ advanced ? $t('controls.simpleMode') : $t('controls.advancedMode') }}
      </button>
      <button
        type="button"
        role="switch"
        class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
        :aria-checked="!motion.switchedOff.value"
        :title="$t('help.controls.animation')"
        @click="motion.setSwitchedOff(!motion.switchedOff.value)"
      >
        {{ motion.switchedOff.value ? $t('controls.animationOff') : $t('controls.animationOn') }}
      </button>
      <!-- Only where there's a keyboard and a mouse. -->
      <p class="hidden text-xs text-neutral-500 lg:ml-auto [@media(hover:hover)_and_(pointer:fine)]:block">
        {{ $t('help.hotkeys') }}
      </p>
    </div>
  </div>
</template>
