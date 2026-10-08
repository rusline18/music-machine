<script setup lang="ts">
const { t } = useI18n()
const head = useLocaleHead()

useHead(() => ({
  htmlAttrs: head.value.htmlAttrs,
  link: head.value.link,
  meta: head.value.meta,
  titleTemplate: (title) => (title && title !== t('app.name') ? `${title} — ${t('app.name')}` : t('app.name')),
}))
</script>

<template>
  <div class="relative min-h-screen">
    <LanguageSwitcher class="absolute right-4 top-4" />
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
