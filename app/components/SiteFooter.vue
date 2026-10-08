<script setup lang="ts">
import { safeExternalUrl } from '~/core/links'

// The donation page lives with a payment service; the app only links to it
// and never sees any payment details. Hidden until a link is configured
// (NUXT_PUBLIC_DONATE_URL, see README).
const donateUrl = safeExternalUrl(useRuntimeConfig().public.donateUrl)
</script>

<template>
  <footer
    v-if="donateUrl"
    class="flex justify-center px-6 pb-8"
  >
    <a
      :href="donateUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-neutral-500 transition hover:text-rose-300"
      :title="$t('footer.supportHint')"
    >
      <UiIcon name="heart" />
      {{ $t('footer.support') }}
    </a>
  </footer>
</template>
