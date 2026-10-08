<script setup lang="ts">
import FeedbackDialog from './components/FeedbackDialog.vue'

const { feedbackEnabled } = useRuntimeConfig().public
</script>

<template>
  <div class="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <footer v-if="feedbackEnabled" class="border-t border-neutral-900 px-6 py-6 text-center text-sm text-neutral-500">
      Something broken, or something missing?
      <FeedbackDialog />
    </footer>
  </div>
</template>
