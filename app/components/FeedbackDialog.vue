<script setup lang="ts">
import { FEEDBACK_KIND_LABELS, FEEDBACK_KINDS, FEEDBACK_LIMITS } from '#shared/feedback'
import type { FeedbackKind } from '#shared/feedback'

const route = useRoute()
const dialog = ref<HTMLDialogElement | null>(null)

const kind = ref<FeedbackKind | null>(null)
const message = ref('')
const email = ref('')
/** Honeypot: hidden from people, so only bots fill it in. */
const website = ref('')

type Status = { state: 'idle' } | { state: 'sending' } | { state: 'sent' } | { state: 'error', message: string }
const status = ref<Status>({ state: 'idle' })

function open() {
  if (status.value.state === 'sent') status.value = { state: 'idle' }
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

/** A click on the backdrop lands on the <dialog> itself, not on its content. */
function onDialogClick(event: MouseEvent) {
  if (event.target === dialog.value) close()
}

function errorMessage(err: unknown): string {
  const statusCode = (err as { statusCode?: number }).statusCode
  if (statusCode === 404 || statusCode === 405) return 'Feedback isn\'t switched on for this site yet.'
  if (statusCode === 429) return 'Too much feedback at once — please try again in a few minutes.'
  const serverMessage = (err as { data?: { statusMessage?: string } }).data?.statusMessage
  if (statusCode === 400 && serverMessage) return `Please check the form: ${serverMessage}.`
  return 'Couldn\'t send it — please check your connection and try again.'
}

async function submit() {
  if (!kind.value || status.value.state === 'sending') return
  status.value = { state: 'sending' }
  try {
    await $fetch('/api/feedback', {
      method: 'POST',
      body: {
        kind: kind.value,
        message: message.value,
        email: email.value || undefined,
        page: route.path,
        userAgent: navigator.userAgent,
        website: website.value || undefined,
      },
    })
    status.value = { state: 'sent' }
    kind.value = null
    message.value = ''
    email.value = ''
  } catch (err) {
    status.value = { state: 'error', message: errorMessage(err) }
  }
}
</script>

<template>
  <button
    type="button"
    class="text-amber-400 underline-offset-4 hover:underline"
    @click="open"
  >
    Send feedback
  </button>

  <dialog
    ref="dialog"
    aria-labelledby="feedback-title"
    class="w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-neutral-800 bg-neutral-900 p-0 text-left text-neutral-100 backdrop:bg-black/70"
    @click="onDialogClick"
  >
    <div
      v-if="status.state === 'sent'"
      class="space-y-4 p-6"
    >
      <h2
        id="feedback-title"
        class="text-lg font-semibold"
      >
        Thank you!
      </h2>
      <p class="text-sm text-neutral-400">
        Your feedback has been sent. It really helps decide what to fix and build next.
      </p>
      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-amber-400"
          @click="close"
        >
          Close
        </button>
      </div>
    </div>

    <form
      v-else
      class="space-y-4 p-6"
      @submit.prevent="submit"
    >
      <h2
        id="feedback-title"
        class="text-lg font-semibold"
      >
        Feedback
      </h2>

      <fieldset class="space-y-2">
        <legend class="mb-2 text-sm text-neutral-400">
          What is it about?
        </legend>
        <label
          v-for="option in FEEDBACK_KINDS"
          :key="option"
          class="flex items-center gap-2 text-sm"
        >
          <input
            v-model="kind"
            type="radio"
            name="kind"
            :value="option"
            required
            class="accent-amber-500"
          >
          {{ FEEDBACK_KIND_LABELS[option] }}
        </label>
      </fieldset>

      <label class="block space-y-1">
        <span class="text-sm text-neutral-400">Tell us more</span>
        <textarea
          v-model="message"
          required
          rows="5"
          :minlength="FEEDBACK_LIMITS.messageMin"
          :maxlength="FEEDBACK_LIMITS.messageMax"
          placeholder="What happened, what you expected, or what you'd like to see"
          class="block w-full resize-y rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600"
        />
        <span class="block text-right text-xs text-neutral-600">{{ message.length }} / {{ FEEDBACK_LIMITS.messageMax }}</span>
      </label>

      <label class="block space-y-1">
        <span class="text-sm text-neutral-400">Email <span class="text-neutral-600">(optional, if you'd like a reply)</span></span>
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          :maxlength="FEEDBACK_LIMITS.emailMax"
          class="block w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
        >
      </label>

      <!-- Honeypot: off-screen and skipped by keyboard and screen readers. -->
      <div
        class="absolute -left-[9999px] h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label>Website <input
          v-model="website"
          type="text"
          name="website"
          tabindex="-1"
          autocomplete="off"
        ></label>
      </div>

      <p class="text-xs text-neutral-500">
        Along with your message we send the page you're on and your browser version — nothing else.
      </p>

      <p
        v-if="status.state === 'error'"
        role="alert"
        class="text-sm text-red-400"
      >
        {{ status.message }}
      </p>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md bg-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-600"
          @click="close"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-amber-400 disabled:opacity-50"
          :disabled="status.state === 'sending'"
        >
          {{ status.state === 'sending' ? 'Sending…' : 'Send' }}
        </button>
      </div>
    </form>
  </dialog>
</template>
