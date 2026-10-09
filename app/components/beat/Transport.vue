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
    <div class="flex items-center gap-4">
      <!-- One big round button that flips between Play and Stop, so it's
           always in the same place under the thumb. The only loud button on
           the page: the halo says it's playing. -->
      <button
        type="button"
        class="play-button relative flex size-16 shrink-0 items-center justify-center rounded-full bg-accent-500 text-neutral-950 transition hover:bg-accent-400 active:scale-95"
        :aria-busy="isLoading"
        @click="running ? emit('stop') : emit('play')"
      >
        <!-- The halo: a ring in the genre's color, pulsed on every count by
             useBeatEffects (brighter on 1 and 5). -->
        <span
          class="play-halo pointer-events-none absolute -inset-1.5 rounded-full opacity-0 ring-[6px] ring-accent-500/40"
          aria-hidden="true"
        />
        <span class="sr-only">{{ isLoading ? $t('controls.loading', { percent }) : isPlaying ? $t('controls.stop') : $t('controls.play') }}</span>
        <span
          v-if="isLoading"
          class="font-mono text-sm font-bold tabular-nums"
          aria-hidden="true"
        >{{ percent }}%</span>
        <svg
          v-else
          class="size-6"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect
            v-if="isPlaying"
            x="5"
            y="5"
            width="14"
            height="14"
            rx="2.5"
          />
          <path
            v-else
            d="M7 4.5v15l13-7.5z"
          />
        </svg>
        <!-- Download progress, drawn as a ring around the button. -->
        <svg
          v-if="progress < 1"
          role="progressbar"
          :aria-label="$t('controls.downloaded')"
          :aria-valuenow="percent"
          aria-valuemin="0"
          aria-valuemax="100"
          class="absolute -inset-1.5 -rotate-90"
          viewBox="0 0 76 76"
        >
          <circle
            cx="38"
            cy="38"
            r="36"
            fill="none"
            stroke-width="3"
            class="stroke-neutral-800"
          />
          <circle
            cx="38"
            cy="38"
            r="36"
            fill="none"
            stroke-width="3"
            stroke-linecap="round"
            pathLength="100"
            :stroke-dasharray="`${percent} 100`"
            class="stroke-accent-400 transition-[stroke-dasharray]"
          />
        </svg>
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
