<script setup lang="ts">
useSeoMeta({
  title: 'Latin Beat Machine — Build Salsa & Bachata rhythms',
  description: 'An interactive Salsa & Bachata rhythm trainer. Build your own beat from real percussion, practice at your own tempo, and train your ear.',
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 px-6 text-center">
    <div>
      <h1 class="text-4xl font-bold tracking-tight text-neutral-50 sm:text-5xl">
        Latin Beat Machine
      </h1>
      <p class="mt-4 text-neutral-400">
        Build. Listen. Remove. Practice. Understand. Dance.
      </p>
    </div>

    <div class="flex flex-col gap-4 sm:flex-row">
      <NuxtLink
        to="/salsa"
        class="rounded-lg border border-amber-500/40 bg-amber-500/10 px-8 py-4 text-lg font-semibold text-amber-400 transition hover:bg-amber-500/20"
      >
        Salsa
      </NuxtLink>
      <NuxtLink
        to="/bachata"
        class="rounded-lg border border-sky-500/40 bg-sky-500/10 px-8 py-4 text-lg font-semibold text-sky-400 transition hover:bg-sky-500/20"
      >
        Bachata
      </NuxtLink>
    </div>
  </main>
</template>
