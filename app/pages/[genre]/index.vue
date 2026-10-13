<script setup lang="ts">
import { findGenre } from '~/genres'
import { instrumentsWithPages } from '~/genres/instrumentPages'

definePageMeta({
  validate: (route) => findGenre(String(route.params.genre)) !== undefined,
})

const route = useRoute()
const { t } = useI18n()
const genre = computed(() => findGenre(String(route.params.genre))!)
const withPages = computed(() => instrumentsWithPages(genre.value))

// Picks the genre's accent color (main.css).
useHead({ htmlAttrs: { 'data-genre': () => genre.value.id } })

useSeoPage({
  title: () => t(`genres.${genre.value.id}.title`),
  description: () => t(`genres.${genre.value.id}.description`),
  image: () => genre.value.id,
})
</script>

<template>
  <main class="genre-page mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
    <!-- Keyed so switching genres starts a fresh machine (own audio, own presets). -->
    <BeatMachine
      :key="genre.id"
      :genre="genre"
    />

    <!-- Plain links, so the instrument pages are found without opening a sheet. -->
    <nav
      v-if="withPages.length"
      class="mt-10 border-t border-neutral-800 pt-6"
      :aria-label="$t('instrumentPage.more')"
    >
      <h2 class="text-sm font-semibold uppercase tracking-[0.08em] text-neutral-400">
        {{ $t('instrumentPage.more') }}
      </h2>
      <ul class="mt-3 flex flex-wrap gap-2">
        <li
          v-for="instrument in withPages"
          :key="instrument"
        >
          <NuxtLinkLocale
            :to="`/${genre.id}/${instrument}`"
            class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
          >
            <UiIcon :name="instrument" />
            {{ $t(`instruments.${instrument}`) }}
          </NuxtLinkLocale>
        </li>
      </ul>
    </nav>
  </main>
</template>
