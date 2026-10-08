<script setup lang="ts">
import { safeExternalUrl } from '~/core/links'

// Both links are off until configured (see README): feedback with
// NUXT_PUBLIC_FEEDBACK_ENABLED, donations with NUXT_PUBLIC_DONATE_URL. The
// donation page lives with a payment service; the app only links to it and
// never sees any payment details.
const { donateUrl: configuredDonateUrl, feedbackEnabled } = useRuntimeConfig().public
const donateUrl = safeExternalUrl(configuredDonateUrl)
</script>

<template>
  <footer
    v-if="donateUrl || feedbackEnabled"
    class="flex flex-col items-center gap-2 px-6 pb-8 text-sm text-neutral-500"
  >
    <p v-if="feedbackEnabled">
      {{ $t('feedback.prompt') }}
      <FeedbackDialog />
    </p>
    <a
      v-if="donateUrl"
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
