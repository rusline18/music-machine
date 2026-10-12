<script setup lang="ts">
// Only inside Telegram, where the Mini App can go on the phone's home
// screen: one tap then opens the trainer, without finding the bot first.
const { available, add } = useHomeScreen()
</script>

<template>
  <button
    v-if="available"
    type="button"
    class="inline-flex min-h-11 items-center gap-2 self-center rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
    @click="add"
  >
    <svg
      class="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    ><path d="M7 2h10v20H7zM12 8v8M8 12h8" /></svg>
    {{ $t('app.addToHomeScreen') }}
  </button>
</template>
