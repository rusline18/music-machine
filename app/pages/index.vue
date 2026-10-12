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

// The genre opens behind a curtain of its color grown out of the card's
// arrow (plugins/curtain.client.ts; client only, hence the `?.`).
const { $curtain } = useNuxtApp()
const aim = (event: MouseEvent) => $curtain?.aim(event.currentTarget as HTMLElement)

useSeoPage({
  title: () => t('app.name'),
  description: () => t('app.description'),
  image: 'home',
})

/** Each genre's own color; spelled out in full so Tailwind keeps the classes. */
const ACCENTS: Record<string, string> = {
  salsa: 'bg-salsa-500 text-neutral-950 hover:bg-salsa-400',
  bachata: 'bg-bachata-500 text-neutral-950 hover:bg-bachata-400',
}

/** Son clave 3-2 over one 8-count block, two cells a count: the strip over the title. */
const CLAVE = [0, 3, 6, 10, 12]
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-4 py-20 sm:px-6">
    <div>
      <div
        class="mb-5 flex max-w-xs gap-1"
        aria-hidden="true"
      >
        <span
          v-for="(_, cell) in 16"
          :key="cell"
          class="h-2.5 flex-1 rounded-sm"
          :class="[
            cell === 0 ? 'bg-gold-400' : CLAVE.includes(cell) ? 'bg-salsa-500' : 'bg-neutral-800',
            { 'ml-1': cell % 2 === 0 && cell > 0 },
          ]"
        />
      </div>
      <h1 class="text-5xl font-extrabold leading-none tracking-tight text-neutral-50 sm:text-7xl">
        {{ t('app.name') }}
      </h1>
      <!-- A crescendo: each line a step bigger and brighter, up to the dance. -->
      <div class="mt-6 flex flex-col gap-1 tracking-tight">
        <p class="text-base font-medium text-neutral-500 sm:text-lg">
          {{ t('app.tagline.build') }}
        </p>
        <p class="text-lg font-semibold text-neutral-300 sm:text-[1.375rem] sm:leading-8">
          {{ t('app.tagline.practice') }}
        </p>
        <i18n-t
          keypath="app.tagline.dance"
          tag="p"
          class="text-xl font-extrabold text-neutral-50 sm:text-[1.75rem] sm:leading-9"
        >
          <template #dance>
            <span class="text-salsa-400">{{ t('app.tagline.danceWord') }}</span>
          </template>
        </i18n-t>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 sm:gap-4">
      <NuxtLinkLocale
        v-for="genre in genres"
        :key="genre.id"
        ref="links"
        :to="`/${genre.id}`"
        class="group flex items-center justify-between gap-4 rounded-[1.75rem] p-6 transition active:scale-[0.98] sm:min-h-44 sm:items-start"
        :class="ACCENTS[genre.id]"
        :data-genre="genre.id"
        @pointerenter="prefetch(genre)"
        @focus="prefetch(genre)"
        @touchstart.passive="prefetch(genre)"
        @click="aim"
      >
        <span class="text-4xl font-extrabold tracking-tight">{{ t(`genres.${genre.id}.name`) }}</span>
        <span
          class="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-neutral-100 transition group-hover:translate-x-1"
          data-curtain-target
          aria-hidden="true"
        >
          <svg
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
      </NuxtLinkLocale>
    </div>
  </main>
</template>
