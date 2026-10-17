<script setup lang="ts">
import { COUNTS_PER_BAR, trackOf } from '~/core/pattern'
import { stepNames } from '~/core/resolve'
import type { Genre } from '~/genres'
import type { InstrumentMix } from '~/genres/instrumentPages'
import { INSTRUMENT_MIXES, instrumentPatterns, mixMutes } from '~/genres/instrumentPages'

const props = defineProps<{
  genre: Genre
  instrument: string
}>()

const { t, locale } = useI18n()

/** On its own or with the whole band. */
const mix = ref<InstrumentMix>('solo')

// The machine's presets are the instrument's rhythms, each over the band
// and starting out on its own; nothing is saved, so the genre page keeps
// its own pattern.
const variants = instrumentPatterns(props.genre, props.instrument)
for (const variant of variants) {
  for (const [instrument, muted] of mixMutes(props.genre, props.instrument, variant, mix.value)) trackOf(variant, instrument)!.muted = muted
}
const {
  pattern,
  selectedPresetId,
  selectPreset,
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
} = useBeatMachine({ ...props.genre, presets: variants }, locale, { persist: false })

const textKey = `instrumentPages.${props.genre.id}.${props.instrument}`

function applyMix() {
  for (const [instrument, muted] of mixMutes(props.genre, props.instrument, pattern.value, mix.value)) setMuted(instrument, muted)
}

function setMix(next: InstrumentMix) {
  mix.value = next
  applyMix()
}

/** Loading a variant brings back its switches: the mix chosen is put back over them. */
function selectVariant(id: string) {
  selectPreset(id)
  applyMix()
}

const variantOptions = computed(() => variants.map(({ id }) => ({ value: id, label: t(`${textKey}.variants.${id}.name`) })))
const mixOptions = computed(() => INSTRUMENT_MIXES.map((value) => ({ value, label: t(`instrumentPage.mix.${value}`) })))
const { tempoOptions, countingOptions } = useControlOptions()

/** Only the instrument's own row is on the grid. */
const hidden = props.genre.instruments.filter((instrument) => instrument !== props.instrument)
const stepNamesFor = (instrument: string) => stepNames(props.genre, instrument)

const togglePlay = () => (isPlaying.value || isLoading.value ? stop() : play())
useWakeLock(() => isPlaying.value)
useHotkeys({ togglePlay, nudgeTempo, toggleInstrument: () => {}, toggleSolo: () => {} })

const root = useTemplateRef('root')
const motion = useMotion()
useBeatEffects(root, onBeat, {
  stepsPerCount: () => pattern.value.stepsPerCount,
  bpm: () => pattern.value.bpm,
  animate: () => motion.enabled.value,
})
const playingBar = computed(() => (activeStep.value < 0 ? -1 : Math.floor(activeStep.value / (COUNTS_PER_BAR * pattern.value.stepsPerCount))))
</script>

<template>
  <section
    ref="root"
    class="flex flex-col gap-5 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-6"
    :aria-label="$t('instrumentPage.player')"
  >
    <UiSegmentedControl
      v-if="variants.length > 1"
      :label="$t('instrumentPage.variant')"
      :options="variantOptions"
      :model-value="selectedPresetId"
      @update:model-value="(id) => id && selectVariant(id)"
    />
    <p class="-mt-2 text-sm text-neutral-400">
      {{ $t(`${textKey}.variants.${selectedPresetId}.description`) }}
    </p>

    <div class="flex flex-wrap gap-4">
      <UiSegmentedControl
        :label="$t('instrumentPage.mix.label')"
        :hint="$t('instrumentPage.mix.hint')"
        :options="mixOptions"
        :model-value="mix"
        @update:model-value="(next) => next && setMix(next)"
      />
      <UiSegmentedControl
        :label="$t('controls.speed')"
        icon="tempo"
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

    <BeatGrid
      :pattern="pattern"
      :step-names="stepNamesFor"
      :playing-bar="playingBar"
      :advanced="false"
      :simple-hides="hidden"
      :solo="solo"
      @solo="setSolo"
      @toggle-step="switchStep"
      @set-step="setStep"
      @update:volume="setVolume"
      @update:muted="setMuted"
    />
  </section>
</template>
