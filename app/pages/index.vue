<script setup lang="ts">
import { prefetchSamples } from '~/core/audio/prefetch'
import { sampleUrls } from '~/core/resolve'
import type { Genre } from '~/genres'
import { genres } from '~/genres'

const { t, locale } = useI18n()

// A genre's sounds start downloading once its link is on screen and the
// browser is idle, or at once when it's pointed at or focused, so the genre
// page plays on the first tap.
const prefetch = (genre: Genre) => prefetchSamples(sampleUrls(genre, locale.value))
const links = useTemplateRef<{ $el: HTMLElement }[]>('links')
let observer: IntersectionObserver | undefined
onMounted(() => {
  if (!('IntersectionObserver' in window)) return
  const idle = window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 200))
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const genre = genres.find((g) => g.id === (entry.target as HTMLElement).dataset.genre)
      if (!entry.isIntersecting || !genre) continue
      observer?.unobserve(entry.target)
      idle(() => prefetch(genre))
    }
  })
  for (const link of links.value ?? []) observer.observe(link.$el)
})
onBeforeUnmount(() => observer?.disconnect())

useSeoMeta({
  title: () => t('app.name'),
  description: () => t('app.description'),
})

/** Accent per genre; spelled out in full so Tailwind keeps the classes. */
const ACCENTS: Record<string, string> = {
  salsa: 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
  bachata: 'border-sky-500/40 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20',
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-10 px-6 text-center">
    <div>
      <h1 class="text-4xl font-bold tracking-tight text-neutral-50 sm:text-5xl">
        {{ t('app.name') }}
      </h1>
      <p class="mt-4 text-neutral-400">
        {{ t('app.tagline') }}
      </p>
    </div>

    <div class="flex flex-col gap-4 sm:flex-row">
      <NuxtLinkLocale
        v-for="genre in genres"
        :key="genre.id"
        ref="links"
        :to="`/${genre.id}`"
        class="rounded-lg border px-8 py-4 text-lg font-semibold transition"
        :class="ACCENTS[genre.id]"
        :data-genre="genre.id"
        @pointerenter="prefetch(genre)"
        @focus="prefetch(genre)"
        @touchstart.passive="prefetch(genre)"
      >
        {{ t(`genres.${genre.id}.name`) }}
      </NuxtLinkLocale>
    </div>
  </main>
</template>
