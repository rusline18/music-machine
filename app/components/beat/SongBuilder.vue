<script setup lang="ts">
import type { SectionFit } from '~/core/song'
import { MAX_SONG_COUNTS, songBpm, TEMPO_SPREAD } from '~/core/song'
import type { Genre } from '~/genres'

const props = defineProps<{
  genre: Genre
  /** The song's sections (preset ids), or null when a single preset is loaded. */
  song: readonly string[] | null
  /** For each preset: whether it can be added now, or why not. */
  fits: ReadonlyMap<string, SectionFit>
}>()

const emit = defineEmits<{
  start: []
  add: [id: string]
  remove: [index: number]
}>()

const { t } = useI18n()

const bpmOf = (id: string) => props.genre.presets.find((preset) => preset.id === id)?.bpm
const full = computed(() => [...props.fits.values()].every((fit) => fit === 'full'))

/** Why a section can't be added, in words; empty when it can. */
function reason(id: string): string {
  switch (props.fits.get(id)) {
    case 'clave': return t('song.why.clave', { clave: t(`song.clave.${props.genre.clave![id]}`) })
    case 'tempo': return t('song.why.tempo', { bpm: bpmOf(id) })
    case 'full': return t('song.why.full')
    default: return ''
  }
}

const options = computed(() => props.genre.presets.map((preset) => {
  const why = reason(preset.id)
  return { id: preset.id, label: why ? `${t(`presets.${preset.id}`)} (${why})` : t(`presets.${preset.id}`), disabled: why !== '' }
}))

/** The `<select>` is only a menu: it goes back to its prompt after each pick. */
const picked = ref('')
function add() {
  if (picked.value) emit('add', picked.value)
  picked.value = ''
}

const fill = computed(() => props.genre.transitionFill?.instrument)
</script>

<template>
  <div class="rounded-3xl border border-neutral-800 bg-neutral-900 p-5">
    <div
      v-if="!song"
      class="flex flex-wrap items-center gap-3"
    >
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-700"
        @click="emit('start')"
      >
        <UiIcon name="song" />
        {{ $t('song.start') }}
      </button>
      <p class="text-sm text-neutral-400">
        {{ $t('song.intro', { max: MAX_SONG_COUNTS }) }}
      </p>
    </div>

    <div
      v-else
      class="space-y-3"
    >
      <ol
        class="flex flex-wrap items-center gap-2 text-sm"
        :aria-label="$t('song.parts')"
      >
        <li
          v-for="(id, index) in song"
          :key="index"
          class="inline-flex items-center gap-2"
        >
          <span
            class="inline-flex items-center gap-1 rounded-full bg-accent-500/15 py-1 pl-3 text-accent-300"
            :class="song.length > 1 ? 'pr-1' : 'pr-3'"
          >
            {{ index + 1 }}. {{ $t(`presets.${id}`) }}
            <button
              v-if="song.length > 1"
              type="button"
              class="inline-flex size-7 items-center justify-center rounded-full hover:bg-accent-500/25"
              :aria-label="$t('song.remove', { n: index + 1, name: $t(`presets.${id}`) })"
              :title="$t('song.remove', { n: index + 1, name: $t(`presets.${id}`) })"
              @click="emit('remove', index)"
            >
              ×
            </button>
          </span>
          <span
            v-if="index < song.length - 1"
            aria-hidden="true"
            class="text-neutral-500"
          >→</span>
        </li>
      </ol>

      <select
        v-model="picked"
        :aria-label="$t('song.add')"
        :disabled="full"
        class="max-w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
        @change="add"
      >
        <option
          value=""
          disabled
        >
          {{ full ? $t('song.full', { max: MAX_SONG_COUNTS }) : `+ ${$t('song.add')}` }}
        </option>
        <option
          v-for="option in options"
          :key="option.id"
          :value="option.id"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>

      <ul class="list-disc space-y-1 pl-5 text-sm text-neutral-400">
        <li>{{ $t(genre.clave ? 'song.rules' : 'song.rulesTempo', { bpm: songBpm(genre, song), spread: TEMPO_SPREAD }) }}</li>
        <li v-if="fill">
          {{ $t('song.fill', { instrument: $t(`instruments.${fill}`) }) }}
        </li>
        <li>{{ $t('song.edits') }}</li>
      </ul>
    </div>
  </div>
</template>
