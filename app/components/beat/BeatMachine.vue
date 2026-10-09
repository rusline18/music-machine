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
  toggleStep,
  switchStep,
  tempo,
  setTempo,
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
/** Worked out once: a fresh array on each render would re-render every row. */
const namesByInstrument = new Map(props.genre.instruments.map((instrument) => [instrument, stepNames(props.genre, instrument)]))
const stepNamesFor = (instrument: string) => namesByInstrument.get(instrument) ?? []
const percent = (value: number) => `${Math.round(value * 100)}%`

const root = useTemplateRef('root')
useBeatEffects(root, onBeat, () => pattern.value.stepsPerCount)
/** Changes once a bar rather than every step, so the grid isn't re-rendered while playing. */
const playingBar = computed(() => (activeStep.value < 0 ? -1 : Math.floor(activeStep.value / (COUNTS_PER_BAR * pattern.value.stepsPerCount))))

/** A cell click: on/off in simple mode, cycling through the sounds in advanced. */
function clickStep(instrument: string, stepIndex: number) {
  if (advanced.value) toggleStep(instrument, stepIndex)
  else switchStep(instrument, stepIndex)
}
</script>

<template>
  <div ref="root">
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

    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <UiRangeControl
        v-if="advanced"
        v-model="pattern.bpm"
        :label="$t('controls.bpm')"
        icon="tempo"
        :hint="$t('help.controls.bpm')"
        :min="genre.bpmRange[0]"
        :max="genre.bpmRange[1]"
      />
      <UiSegmentedControl
        v-else
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
      <BeatTransport
        :is-playing="isPlaying"
        :is-loading="isLoading"
        :load-progress="loadProgress"
        :failed-samples="failedSamples"
        @play="play"
        @stop="stop"
      />
    </div>

    <BeatLayerGuide
      class="mb-6"
      :layers="layers"
      @start="startLayers"
      @add="addLayer"
      @end="endLayers"
    />

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
          class="inline-flex items-center gap-1.5 rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
          :title="$t('help.controls.random')"
          @click="randomize"
        >
          <UiIcon name="random" />
          {{ $t('controls.random') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
          :title="$t('help.controls.clear')"
          @click="clear"
        >
          <UiIcon name="clear" />
          {{ $t('controls.clear') }}
        </button>
      </div>
    </div>

    <BeatCountDisplay class="mb-4" />

    <BeatGrid
      :pattern="pattern"
      :step-names="stepNamesFor"
      :playing-bar="playingBar"
      :advanced="advanced"
      :simple-hides="simpleHides"
      @toggle-step="clickStep"
      @update:volume="setVolume"
      @update:muted="setMuted"
      @update:chord="setChord"
    />

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
        :title="$t('help.controls.reset')"
        @click="reset"
      >
        <UiIcon name="reset" />
        {{ $t('controls.reset') }}
      </button>
      <BeatShareButton :code="shareCode" />
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
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
  </div>
</template>
