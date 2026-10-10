<script setup lang="ts">
import { CHORD_NAMES } from '~/core/harmony'
import { COUNT_OPTIONS, COUNTS_PER_BLOCK } from '~/core/pattern'

const props = defineProps<{
  /** The loop length now. */
  counts: number
  /** One chord per bar, if the genre has chords. */
  chords?: readonly string[]
}>()

const emit = defineEmits<{
  'set-counts': [counts: number]
  'set-chord': [bar: number, chord: string]
  randomize: []
  clear: []
}>()

const { t } = useI18n()

/** Each loop length with how many 8-count blocks it is, for the little block diagrams. */
const loops = COUNT_OPTIONS.map((counts) => ({ counts, blocks: Math.ceil(counts / COUNTS_PER_BLOCK) }))

/** The chords on the phone's chip: the first few, so it stays one short line. */
const chordSummary = computed(() => {
  const chords = props.chords ?? []
  return chords.slice(0, 3).join(' · ') + (chords.length > 3 ? ' …' : '')
})

/** The phone's sheet that's open. */
const sheet = ref<'loop' | 'chords' | null>(null)

const chip = 'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-700 bg-neutral-900 px-4 text-sm text-neutral-200 transition hover:bg-neutral-800'
</script>

<template>
  <div>
    <!-- Wider screens: one card, a section per kind of setting, each with a "?". -->
    <div
      class="flex flex-wrap items-stretch rounded-3xl border border-neutral-800 bg-neutral-900 max-sm:hidden"
      role="group"
      :aria-label="t('controls.advancedMode')"
    >
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
        <UiHint
          :label="t('advanced.loop')"
          :title="t('advanced.loopTitle')"
          :text="t('help.controls.counts')"
        >
          <span class="mt-2.5 flex flex-col gap-1.5">
            <span
              v-for="loop in loops"
              :key="loop.counts"
              class="flex items-center gap-2.5"
            >
              <span
                class="w-6 font-mono font-bold"
                :class="loop.counts === counts ? 'text-accent-400' : 'text-neutral-300'"
              >{{ loop.counts }}</span>
              <span class="flex gap-0.5">
                <span
                  v-for="block in loop.blocks"
                  :key="block"
                  class="h-2.5 w-6 rounded-sm"
                  :class="loop.counts === counts ? 'bg-accent-500' : 'bg-neutral-600'"
                />
              </span>
            </span>
            <span class="text-neutral-400">{{ t('advanced.blocks') }}</span>
          </span>
        </UiHint>
        <div
          class="flex gap-1 rounded-xl bg-neutral-950 p-1"
          role="group"
          :aria-label="t('advanced.loopTitle')"
        >
          <button
            v-for="loop in loops"
            :key="loop.counts"
            type="button"
            class="h-9 min-w-[3.25rem] rounded-lg px-3 font-mono text-sm transition"
            :class="loop.counts === counts ? 'bg-accent-500 font-bold text-neutral-950' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'"
            :aria-pressed="loop.counts === counts"
            @click="emit('set-counts', loop.counts)"
          >
            {{ loop.counts }}
          </button>
        </div>
        <span class="text-sm text-neutral-500">{{ t('advanced.counts') }}</span>
      </div>

      <div class="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2 border-l border-neutral-800 px-6 py-4">
        <UiHint
          :label="t('advanced.grid')"
          :text="t('advanced.gridHelp')"
        />
        <div class="flex gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-800 px-4 text-sm text-neutral-200 transition hover:bg-neutral-700"
            @click="emit('randomize')"
          >
            <UiIcon name="random" />
            {{ t('controls.random') }}
          </button>
          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-800 px-4 text-sm text-neutral-200 transition hover:bg-neutral-700"
            @click="emit('clear')"
          >
            <UiIcon name="clear" />
            {{ t('controls.clear') }}
          </button>
        </div>
      </div>
    </div>

    <!-- A phone: a row of chips; the settings with choices open a sheet that explains them. -->
    <div
      class="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden"
      role="group"
      :aria-label="t('controls.advancedMode')"
    >
      <button
        type="button"
        :class="chip"
        aria-haspopup="dialog"
        @click="sheet = 'loop'"
      >
        {{ t('advanced.loop') }}
        <b class="font-mono text-neutral-50">{{ counts }}</b>
      </button>
      <button
        v-if="chords?.length"
        type="button"
        :class="chip"
        aria-haspopup="dialog"
        @click="sheet = 'chords'"
      >
        {{ t('grid.chords') }}
        <b class="font-mono text-neutral-50">{{ chordSummary }}</b>
      </button>
      <button
        type="button"
        :class="chip"
        @click="emit('randomize')"
      >
        <UiIcon name="random" />
        {{ t('controls.random') }}
      </button>
      <button
        type="button"
        :class="chip"
        @click="emit('clear')"
      >
        <UiIcon name="clear" />
        {{ t('controls.clear') }}
      </button>
    </div>

    <UiSheet
      :open="sheet === 'loop'"
      :title="t('advanced.loopTitle')"
      @close="sheet = null"
    >
      <p class="mb-4 text-sm text-neutral-400">
        {{ t('help.controls.counts') }}
      </p>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="loop in loops"
          :key="loop.counts"
          type="button"
          class="flex min-h-16 flex-col items-start justify-center gap-2 rounded-2xl border bg-neutral-950 px-4 py-2 transition"
          :class="loop.counts === counts ? 'border-accent-500' : 'border-neutral-700'"
          :aria-pressed="loop.counts === counts"
          @click="emit('set-counts', loop.counts)"
        >
          <span
            class="font-mono text-xl font-bold"
            :class="loop.counts === counts ? 'text-accent-400' : 'text-neutral-100'"
          >{{ loop.counts }}</span>
          <span
            class="flex gap-0.5"
            aria-hidden="true"
          >
            <span
              v-for="block in loop.blocks"
              :key="block"
              class="h-2 w-5 rounded-sm"
              :class="loop.counts === counts ? 'bg-accent-500' : 'bg-neutral-600'"
            />
          </span>
        </button>
      </div>
      <p class="mt-3 text-xs text-neutral-500">
        {{ t('advanced.blocks') }}
      </p>
    </UiSheet>

    <UiSheet
      v-if="chords?.length"
      :open="sheet === 'chords'"
      :title="t('grid.chords')"
      @close="sheet = null"
    >
      <p class="mb-4 text-sm text-neutral-400">
        {{ t('help.controls.chords') }}
      </p>
      <div class="grid grid-cols-2 gap-3">
        <label
          v-for="(chord, bar) in chords"
          :key="bar"
          class="flex flex-col gap-1 text-xs text-neutral-500"
        >
          {{ t('advanced.bar', { n: bar + 1 }) }}
          <select
            :value="chord"
            class="min-h-11 rounded-xl bg-neutral-800 px-3 font-mono text-sm text-neutral-100"
            @change="emit('set-chord', bar, ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="name in CHORD_NAMES"
              :key="name"
              :value="name"
            >
              {{ name }}
            </option>
          </select>
        </label>
      </div>
    </UiSheet>
  </div>
</template>
