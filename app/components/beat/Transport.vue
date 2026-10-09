<script setup lang="ts">
const props = defineProps<{
  isPlaying: boolean
  /** Play was pressed and is waiting for samples. */
  isLoading?: boolean
  /** 0–1 share of samples downloaded; drawn as a bar on Play until complete. */
  loadProgress?: number
  /** Samples that failed to load on the last Play. */
  failedSamples?: number
  bpm: number
}>()

const emit = defineEmits<{
  play: []
  stop: []
  /** Change the tempo by this many BPM. */
  nudge: [delta: number]
}>()

const progress = computed(() => props.loadProgress ?? 1)
const percent = computed(() => Math.round(progress.value * 100))
/** Stop also cancels a Play that's still loading. */
const running = computed(() => props.isPlaying || props.isLoading)

const silentModeHint = useSilentModeHint(() => props.isPlaying)
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-2">
      <!-- One big button that flips between Play and Stop, so it's always
           in the same place under the thumb. -->
      <button
        type="button"
        class="play-button relative min-h-11 flex-1 overflow-hidden rounded-md px-5 py-2 font-semibold transition sm:flex-none"
        :class="running ? 'bg-neutral-700 text-neutral-100 hover:bg-neutral-600' : 'bg-accent-500 text-neutral-900 hover:bg-accent-400'"
        :aria-busy="isLoading"
        @click="running ? emit('stop') : emit('play')"
      >
        <span
          v-if="isLoading"
          class="tabular-nums"
        >{{ $t('controls.loading', { percent }) }}</span>
        <span v-else-if="isPlaying">{{ $t('controls.stop') }}</span>
        <span v-else>{{ $t('controls.play') }}</span>
        <span
          v-if="progress < 1"
          role="progressbar"
          :aria-label="$t('controls.downloaded')"
          :aria-valuenow="percent"
          aria-valuemin="0"
          aria-valuemax="100"
          class="absolute inset-x-0 bottom-0 h-1 bg-neutral-900/20"
        >
          <span
            class="block h-full bg-neutral-900/60 transition-[width]"
            :style="{ width: `${percent}%` }"
          />
        </span>
      </button>
      <BeatTempoStepper
        :bpm="bpm"
        @nudge="(delta) => emit('nudge', delta)"
      />
    </div>
    <p
      v-if="failedSamples"
      role="status"
      class="text-xs text-red-400"
      :title="$t('controls.failedHint')"
    >
      {{ $t('controls.failed', { count: failedSamples }) }}
    </p>
    <p
      v-if="silentModeHint.shown"
      role="status"
      class="flex items-start gap-2 text-xs text-neutral-400"
    >
      <span class="flex-1">{{ $t('controls.silentMode') }}</span>
      <button
        type="button"
        class="-m-2 shrink-0 p-2 text-neutral-500 hover:text-neutral-300"
        :aria-label="$t('controls.dismiss')"
        @click="silentModeHint.dismiss"
      >
        ✕
      </button>
    </p>
  </div>
</template>
