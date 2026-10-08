<script setup lang="ts">
import BeatGrid from '../components/beat/BeatGrid.vue'
import Transport from '../components/beat/Transport.vue'
import BpmControl from '../components/beat/BpmControl.vue'
import PatternSelector from '../components/beat/PatternSelector.vue'
import CountSelector from '../components/beat/CountSelector.vue'
import FeelControls from '../components/beat/FeelControls.vue'
import ShareButton from '../components/beat/ShareButton.vue'

useSeoMeta({
  title: 'Bachata Rhythm Trainer — Latin Beat Machine',
  description: 'Build a Bachata rhythm from güira, bongo, bass, requinto and segunda, then practice it at your own tempo.',
})

const machine = useBeatMachine('bachata')
</script>

<template>
  <main class="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <NuxtLink to="/" class="text-sm text-neutral-500 hover:text-neutral-300">← Back</NuxtLink>
        <h1 class="text-2xl font-bold text-neutral-50">Bachata</h1>
      </div>
      <PatternSelector
        :model-value="machine.selectedPatternId.value"
        :patterns="machine.patternOptions.value"
        @update:model-value="machine.selectPreset"
      />
    </div>

    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <BpmControl
        :model-value="machine.pattern.value.bpm"
        :min="machine.config.minBpm"
        :max="machine.config.maxBpm"
        @update:model-value="machine.setBpm"
      />
      <CountSelector
        :model-value="machine.pattern.value.counts"
        @update:model-value="machine.setCounts"
      />
      <Transport
        :is-playing="machine.isPlaying.value"
        :is-loading="machine.isLoading.value"
        :load-progress="machine.loadProgress.value"
        :failed-samples="machine.failedSamples.value"
        @play="machine.play"
        @stop="machine.stop"
      />
    </div>

    <FeelControls
      class="mb-6"
      :feel="machine.feel.value"
      :reverb="machine.reverb.value"
      @update:feel="machine.setFeel"
      @update:reverb="machine.setReverb"
    />

    <BeatGrid
      :pattern="machine.pattern.value"
      :step-names="machine.stepNamesFor"
      :active-step="machine.activeStep.value"
      :is-playing="machine.isPlaying.value"
      @toggle-step="machine.toggleStep"
      @update:volume="machine.updateVolume"
      @update:muted="machine.updateMuted"
      @update:chord="machine.setChord"
    />

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
        @click="machine.randomize"
      >
        🎲 Random
      </button>
      <button
        type="button"
        class="rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
        @click="machine.clear"
      >
        Clear
      </button>
      <button
        type="button"
        class="rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
        title="Throw away your changes and go back to the preset"
        @click="machine.reset"
      >
        Reset
      </button>
      <ShareButton :code="machine.shareCode.value" />
    </div>
  </main>
</template>
