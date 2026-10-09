<script setup lang="ts">
import { COUNT_OPTIONS, COUNTS_PER_BAR } from '~/core/pattern'
import { COUNTING_MODES, stepNames } from '~/core/resolve'
import { TEMPO_CHOICES } from '~/core/tempo'
import type { Genre } from '~/genres'

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
  feel,
  reverb,
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

const { t } = useI18n()
const countOptions = COUNT_OPTIONS.map((counts) => ({ value: counts, label: String(counts) }))
const countingOptions = computed(() => COUNTING_MODES.map((mode) => ({ value: mode, label: t(`controls.counting.${mode}`) })))
const tempoOptions = computed(() => TEMPO_CHOICES.map((choice) => ({ value: choice, label: t(`controls.tempo.${choice}`) })))

/** The presets, plus the pattern from a link while that's what's loaded. */
const presetIds = computed(() => {
  const ids = props.genre.presets.map((preset) => preset.id)
  return ids.includes(selectedPresetId.value) ? ids : [...ids, selectedPresetId.value]
})
/** Simple mode leaves these off the grid: the voice has its own switch above it. */
const simpleHides = props.genre.instruments.filter((instrument) => props.genre.spoken[instrument])
/** The band, without the counting voice: the practice switches and the 1–9 keys. */
const bandTracks = computed(() => pattern.value.tracks.filter((track) => !simpleHides.includes(track.instrument)))

const { view, setView } = useBeatView()
const viewOptions = computed(() => (['practice', 'editor'] as const).map((value) => ({ value, label: t(`view.${value}`) })))

const togglePlay = () => (isPlaying.value || isLoading.value ? stop() : play())
useWakeLock(() => isPlaying.value)
useHotkeys({
  togglePlay,
  nudgeTempo,
  toggleInstrument: (index) => {
    const track = bandTracks.value[index]
    if (track) setMuted(track.instrument, !track.muted)
  },
})

/** Worked out once: a fresh array on each render would re-render every row. */
const namesByInstrument = new Map(props.genre.instruments.map((instrument) => [instrument, stepNames(props.genre, instrument)]))
const stepNamesFor = (instrument: string) => namesByInstrument.get(instrument) ?? []
const percent = (value: number) => `${Math.round(value * 100)}%`

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
        <NuxtLinkLocale
          to="/"
          class="text-sm text-neutral-500 hover:text-neutral-300"
        >
          {{ $t('nav.back') }}
        </NuxtLinkLocale>
        <h1 class="text-2xl font-bold text-neutral-50">
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
      :options="viewOptions"
      :model-value="view"
      @update:model-value="(next) => next && setView(next)"
    />

    <div
      v-if="!advanced || hasVoice"
      class="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3"
    >
      <UiSegmentedControl
        v-if="!advanced"
        :label="$t('controls.speed')"
        icon="tempo"
        :hint="$t('help.controls.speed')"
        :options="tempoOptions"
        :model-value="tempo"
        @update:model-value="(choice) => choice && setTempo(choice)"
      />
      <UiSegmentedControl
        v-if="hasVoice"
        :label="$t('controls.voice')"
        icon="voice"
        :hint="$t('help.controls.voice')"
        :options="countingOptions"
        :model-value="countingMode"
        @update:model-value="(mode) => mode && setCounting(mode)"
      />
    </div>

    <BeatPracticeBar class="max-sm:order-last sm:mb-6">
      <BeatTransport
        :is-playing="isPlaying"
        :is-loading="isLoading"
        :load-progress="loadProgress"
        :failed-samples="failedSamples"
        :bpm="pattern.bpm"
        @play="play"
        @stop="stop"
        @nudge="nudgeTempo"
      />
    </BeatPracticeBar>

    <!-- On a phone the guide and the buttons below go after the cards or
         the grid (order-1), so what's practised is on the first screen. -->
    <BeatSongBuilder
      class="mb-6 max-sm:order-1"
      :genre="genre"
      :song="song"
      :fits="sectionFits"
      @start="startSong"
      @add="addSection"
      @remove="removeSection"
    />

    <BeatLayerGuide
      class="mb-6 max-sm:order-1"
      :layers="layers"
      @start="startLayers"
      @add="addLayer"
      @end="endLayers"
    />

    <!-- Practice view on a phone. Shown and hidden with CSS, so the server
         renders the right one and nothing jumps after loading. -->
    <BeatInstrumentCards
      :class="view === 'practice' ? 'mb-6 sm:hidden' : 'hidden'"
      :tracks="bandTracks"
      @update:muted="setMuted"
    />

    <div
      class="max-sm:mb-6"
      :class="{ 'max-sm:hidden': view === 'practice' }"
    >
      <div
        v-if="advanced"
        class="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-neutral-800 p-4"
      >
        <UiSegmentedControl
          :label="$t('controls.counts')"
          icon="counts"
          :hint="$t('help.controls.counts')"
          :options="countOptions"
          :model-value="pattern.counts"
          @update:model-value="(counts) => counts && setCounts(counts)"
        />
        <UiRangeControl
          v-model="feel"
          :label="$t('controls.feel')"
          icon="feel"
          :hint="$t('help.controls.feel')"
          :min="0"
          :max="1"
          :step="0.05"
          :format="percent"
        />
        <UiRangeControl
          v-model="reverb"
          :label="$t('controls.reverb')"
          icon="reverb"
          :hint="$t('help.controls.reverb')"
          :min="0"
          :max="1"
          :step="0.05"
          :format="percent"
        />
        <div class="flex gap-3">
          <button
            type="button"
            class="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 sm:min-h-0"
            :title="$t('help.controls.random')"
            @click="randomize"
          >
            <UiIcon name="random" />
            {{ $t('controls.random') }}
          </button>
          <button
            type="button"
            class="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 sm:min-h-0"
            :title="$t('help.controls.clear')"
            @click="clear"
          >
            <UiIcon name="clear" />
            {{ $t('controls.clear') }}
          </button>
        </div>
      </div>

      <BeatGrid
        :pattern="pattern"
        :step-names="stepNamesFor"
        :playing-bar="playingBar"
        :advanced="advanced"
        :simple-hides="simpleHides"
        @toggle-step="switchStep"
        @set-step="setStep"
        @update:volume="setVolume"
        @update:muted="setMuted"
        @update:chord="setChord"
      />
    </div>

    <div class="flex flex-wrap items-center gap-3 max-sm:order-1 sm:mt-6">
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 sm:min-h-0"
        :title="$t('help.controls.reset')"
        @click="reset"
      >
        <UiIcon name="reset" />
        {{ $t('controls.reset') }}
      </button>
      <BeatShareButton :code="shareCode" />
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3 max-sm:order-1 max-sm:mb-6">
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 sm:min-h-0"
        :aria-pressed="advanced"
        @click="setMode(advanced ? 'simple' : 'advanced')"
      >
        <UiIcon name="advanced" />
        {{ advanced ? $t('controls.simpleMode') : $t('controls.advancedMode') }}
      </button>
      <p class="text-sm text-neutral-500">
        {{ advanced ? $t('help.controls.simpleMode') : $t('help.controls.advancedMode') }}
      </p>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3 max-sm:order-1 max-sm:mb-6">
      <button
        type="button"
        role="switch"
        class="inline-flex min-h-11 items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 sm:min-h-0"
        :aria-checked="!motion.switchedOff.value"
        @click="motion.setSwitchedOff(!motion.switchedOff.value)"
      >
        {{ motion.switchedOff.value ? $t('controls.animationOff') : $t('controls.animationOn') }}
      </button>
      <p class="text-sm text-neutral-500">
        {{ $t('help.controls.animation') }}
      </p>
    </div>

    <!-- Only where there's a keyboard and a mouse. -->
    <p class="mt-4 hidden text-xs text-neutral-500 [@media(hover:hover)_and_(pointer:fine)]:block">
      {{ $t('help.hotkeys') }}
    </p>
  </div>
</template>
