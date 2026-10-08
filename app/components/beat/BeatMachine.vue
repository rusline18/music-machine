<script setup lang="ts">
import { stepNames } from '~/core/resolve'
import type { Genre } from '~/genres'

const props = defineProps<{
  genre: Genre
}>()

const {
  pattern,
  selectedPresetId,
  isPlaying,
  activeStep,
  feel,
  reverb,
  play,
  stop,
  setCounts,
  setChord,
  toggleStep,
  setVolume,
  setMuted,
  randomize,
  clear,
} = useBeatMachine(props.genre)

const presetIds = props.genre.presets.map((preset) => preset.id)
const stepNamesFor = (instrument: string) => stepNames(props.genre, instrument)
const percent = (value: number) => `${Math.round(value * 100)}%`
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <NuxtLinkLocale to="/" class="text-sm text-neutral-500 hover:text-neutral-300">
          {{ $t('nav.back') }}
        </NuxtLinkLocale>
        <h1 class="text-2xl font-bold text-neutral-50">
          {{ $t(`genres.${genre.id}.name`) }}
        </h1>
      </div>
      <BeatPresetSelector v-model="selectedPresetId" :preset-ids="presetIds" />
    </div>

    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <UiRangeControl
        v-model="pattern.bpm"
        :label="$t('controls.bpm')"
        :min="genre.bpmRange[0]"
        :max="genre.bpmRange[1]"
      />
      <BeatCountSelector :model-value="pattern.counts" @update:model-value="setCounts" />
      <BeatTransport :is-playing="isPlaying" @play="play" @stop="stop" />
    </div>

    <div class="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
      <UiRangeControl
        v-model="feel"
        :label="$t('controls.feel')"
        :hint="$t('controls.feelHint')"
        :min="0"
        :max="1"
        :step="0.05"
        :format="percent"
      />
      <UiRangeControl
        v-model="reverb"
        :label="$t('controls.reverb')"
        :hint="$t('controls.reverbHint')"
        :min="0"
        :max="1"
        :step="0.05"
        :format="percent"
      />
    </div>

    <BeatGrid
      :pattern="pattern"
      :step-names="stepNamesFor"
      :active-step="activeStep"
      @toggle-step="toggleStep"
      @update:volume="setVolume"
      @update:muted="setMuted"
      @update:chord="setChord"
    />

    <div class="mt-6 flex gap-3">
      <button
        type="button"
        class="rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
        @click="randomize"
      >
        {{ $t('controls.random') }}
      </button>
      <button
        type="button"
        class="rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
        @click="clear"
      >
        {{ $t('controls.clear') }}
      </button>
    </div>
  </div>
</template>
