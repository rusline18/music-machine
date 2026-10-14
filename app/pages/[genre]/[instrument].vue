<script setup lang="ts">
import { findGenre } from '~/genres'
import { findInstrumentPage } from '~/genres/instrumentPages'

definePageMeta({
  validate: (route) => {
    const genre = findGenre(String(route.params.genre))
    return genre !== undefined && findInstrumentPage(genre, String(route.params.instrument)) !== undefined
  },
})

const route = useRoute()
const { t } = useI18n()
const genre = computed(() => findGenre(String(route.params.genre))!)
const instrument = computed(() => String(route.params.instrument))
const textKey = computed(() => `instrumentPages.${genre.value.id}.${instrument.value}`)

/** The page's text, a heading and paragraphs per section. */
const SECTIONS = ['about', 'strokes', 'dancer'] as const

// Picks the genre's accent color (main.css).
useHead({ htmlAttrs: { 'data-genre': () => genre.value.id } })

useSeoPage({
  title: () => t(`${textKey.value}.title`),
  description: () => t(`${textKey.value}.description`),
  image: () => genre.value.id,
})
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
    <NuxtLinkLocale
      :to="`/${genre.id}`"
      class="text-sm text-neutral-500 hover:text-neutral-300"
    >
      {{ $t('instrumentPage.back', { genre: $t(`genres.${genre.id}.name`) }) }}
    </NuxtLinkLocale>

    <div class="mt-3 flex items-center gap-4">
      <span
        class="instrument-icon flex size-16 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-neutral-100 [&_svg]:size-10"
        :data-instrument="instrument"
        aria-hidden="true"
      >
        <UiIcon :name="instrument" />
      </span>
      <h1 class="text-4xl font-extrabold tracking-tight text-neutral-50 sm:text-5xl">
        {{ $t(`instruments.${instrument}`) }}
      </h1>
    </div>
    <p class="mt-4 text-lg text-neutral-300">
      {{ $t(`${textKey}.description`) }}
    </p>

    <!-- Keyed so another instrument starts a fresh machine. -->
    <BeatInstrumentPlayer
      :key="`${genre.id}/${instrument}`"
      class="mt-8"
      :genre="genre"
      :instrument="instrument"
    />

    <article class="mt-10 space-y-8">
      <section
        v-for="section in SECTIONS"
        :key="section"
      >
        <h2 class="text-2xl font-bold text-neutral-100">
          {{ $t(`instrumentPage.sections.${section}`) }}
        </h2>
        <!-- A paragraph per line of the text. -->
        <p
          v-for="(paragraph, i) in $t(`${textKey}.${section}`).split('\n')"
          :key="i"
          class="mt-3 leading-relaxed text-neutral-300"
        >
          {{ paragraph }}
        </p>
      </section>
    </article>
  </main>
</template>
