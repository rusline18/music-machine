<script setup lang="ts">
import BeatGrid from '../components/beat/BeatGrid.vue'
import Transport from '../components/beat/Transport.vue'
import BpmControl from '../components/beat/BpmControl.vue'
import PatternSelector from '../components/beat/PatternSelector.vue'

useSeoMeta({
  title: 'Bachata Rhythm Trainer — Latin Beat Machine',
  description: 'Build a Bachata rhythm from güira, bongo, bass, requinto and segunda, then practice it at your own tempo.',
})

const machine = useBeatMachine('bachata')
</script>

<template>
  <main class="mx-auto max-w-4xl px-6 py-10">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <NuxtLink to="/" class="text-sm text-neutral-500 hover:text-neutral-300">← Back</NuxtLink>
        <h1 class="text-2xl font-bold text-neutral-50">Bachata</h1>
      </div>
      <PatternSelector v-model="machine.selectedPatternId.value" :patterns="machine.presets" />
    </div>

    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <BpmControl
        :model-value="machine.pattern.value.bpm"
        :min="90"
        :max="160"
        @update:model-value="machine.setBpm"
      />
      <Transport
        :is-playing="machine.isPlaying.value"
        @play="machine.play"
        @stop="machine.stop"
      />
    </div>

    <BeatGrid
      :pattern="machine.pattern.value"
      :samples="machine.config.samples"
      :active-step="machine.activeStep.value"
      @toggle-step="machine.toggleStep"
      @update:volume="machine.updateVolume"
      @update:muted="machine.updateMuted"
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
