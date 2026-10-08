<script setup lang="ts">
const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
</script>

<template>
  <nav :aria-label="t('nav.language')" class="flex gap-1 text-xs font-semibold uppercase tracking-wide">
    <NuxtLink
      v-for="option in locales"
      :key="option.code"
      :to="switchLocalePath(option.code)"
      :lang="option.code"
      :title="option.name"
      class="rounded px-2 py-1 transition"
      :class="option.code === locale ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'"
      :aria-current="option.code === locale ? 'true' : undefined"
    >
      {{ option.code }}
    </NuxtLink>
  </nav>
</template>
