<script setup lang="ts">
import BeatGrid from '../components/beat/BeatGrid.vue'
import Transport from '../components/beat/Transport.vue'
import BpmControl from '../components/beat/BpmControl.vue'
import PatternSelector from '../components/beat/PatternSelector.vue'
import CountSelector from '../components/beat/CountSelector.vue'
import FeelControls from '../components/beat/FeelControls.vue'

useSeoMeta({
  title: 'Salsa Rhythm Trainer — Latin Beat Machine',
  description: 'Build a Salsa rhythm from clave, congas, bongos, timbales, cowbell, maracas and güiro, then practice it at your own tempo.',
})

const machine = useBeatMachine('salsa')
</script>

<template>
  <main class="mx-auto max-w-4xl px-6 py-10">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <NuxtLink to="/" class="text-sm text-neutral-500 hover:text-neutral-300">← Back</NuxtLink>
        <h1 class="text-2xl font-bold text-neutral-50">Salsa</h1>
      </div>
      <PatternSelector v-model="machine.selectedPatternId.value" :patterns="machine.presets" />
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

    <div class="mt-6 flex gap-3">
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
    </div>
  </main>
</template>
