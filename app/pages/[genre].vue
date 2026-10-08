<script setup lang="ts">
import { findGenre } from '~/genres'

definePageMeta({
  validate: (route) => findGenre(String(route.params.genre)) !== undefined,
})

const route = useRoute()
const { t } = useI18n()
const genre = computed(() => findGenre(String(route.params.genre))!)

useSeoMeta({
  title: () => t(`genres.${genre.value.id}.title`),
  description: () => t(`genres.${genre.value.id}.description`),
})
</script>

<template>
  <main class="mx-auto max-w-4xl px-6 py-10">
    <!-- Keyed so switching genres starts a fresh machine (own audio, own presets). -->
    <BeatMachine :key="genre.id" :genre="genre" />
  </main>
</template>
