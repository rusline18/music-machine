<script setup lang="ts">
import { SHARE_CODE_PARAM, SHARE_PARAM } from '~/composables/usePatternStorage'
import { sendLink } from '~/core/sendLink'
import { packPattern } from '~/core/compactPattern'
import { decodePattern } from '~/core/share'
import { miniAppLink, startParam, telegramShareUrl } from '~/core/telegram'
import { findGenre } from '~/genres'

const props = defineProps<{
  /** Pattern code from useBeatMachine().shareCode. */
  code: string
  genre: string
}>()

const { t } = useI18n()
const telegramBot = useRuntimeConfig().public.telegramBot

/** 'copied' after a successful copy; 'manual' when the browser won't let us copy. */
const status = ref<'idle' | 'copied' | 'manual'>('idle')
const link = ref('')
let resetTimer: ReturnType<typeof setTimeout> | undefined

/**
 * The pattern packed by packPattern (core/compactPattern.ts), worked out
 * as it changes: a share sheet or a copy has to follow the tap, and
 * packing waits for the browser. Null where the browser can't compress:
 * links then carry the longer share.ts code.
 */
let packing: { code: string, packed: Promise<string | null> } | null = null
function packed(code: string) {
  if (packing?.code !== code) {
    const genre = findGenre(props.genre)
    const pattern = genre && decodePattern(code, genre)
    packing = { code, packed: pattern ? packPattern(pattern, genre) : Promise.resolve(null) }
  }
  return packing.packed
}
watch(() => props.code, (code) => import.meta.client && packed(code), { immediate: true })

/** A link that opens the pattern in the bot's Mini App, if it fits in one (core/telegram.ts). */
function miniAppPatternLink(pattern: string | undefined) {
  const param = pattern && startParam(props.genre, pattern)
  return param ? miniAppLink(telegramBot, param) : null
}

async function share() {
  // Ready by now, unless the tap came right after an edit.
  const pattern = await packed(props.code) ?? undefined
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  if (pattern) url.searchParams.set(SHARE_PARAM, pattern)
  else url.searchParams.set(SHARE_CODE_PARAM, props.code)
  link.value = url.toString()

  // Inside Telegram: its own chat picker, with a link that opens the
  // pattern right in the Mini App (or the site, if the pattern's too long).
  const webApp = telegramWebApp()
  if (webApp && telegramBot) {
    webApp.openTelegramLink(telegramShareUrl(miniAppPatternLink(pattern) ?? link.value, t('controls.shareText')))
    return
  }

  clearTimeout(resetTimer)
  const touch = window.matchMedia('(pointer: coarse)').matches
  const result = await sendLink(link.value, navigator, touch)
  if (result === 'copied') {
    status.value = 'copied'
    resetTimer = setTimeout(() => (status.value = 'idle'), 2500)
  } else if (result === 'manual') {
    status.value = 'manual'
  } else {
    status.value = 'idle'
  }
}

function selectAll(event: FocusEvent) {
  (event.target as HTMLInputElement).select()
}

onUnmounted(() => clearTimeout(resetTimer))
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- On a copy the button fills with the genre's color and the link
         turns into a check (main.css, .share-button). -->
    <button
      type="button"
      class="share-button inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent-500/20 px-4 py-2 sm:min-h-0 text-sm font-medium text-accent-400 hover:bg-accent-500/30"
      :class="{ 'is-copied': status === 'copied' }"
      :title="$t('help.controls.share')"
      @click="share"
    >
      <span class="relative size-5 shrink-0">
        <UiIcon
          name="share"
          class="share-link absolute inset-0"
        />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.25"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          class="share-check absolute inset-0 size-5"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <!-- Both labels share one cell, so the button keeps the width of the longer one. -->
      <span class="grid">
        <span class="share-label [grid-area:1/1]">{{ $t('controls.share') }}</span>
        <span
          class="share-label-copied [grid-area:1/1]"
          aria-hidden="true"
        >{{ $t('controls.copied') }}</span>
      </span>
    </button>
    <span
      class="sr-only"
      role="status"
    >{{ status === 'copied' ? $t('controls.linkCopied') : '' }}</span>
    <input
      v-if="status === 'manual'"
      :value="link"
      readonly
      :aria-label="$t('controls.link')"
      class="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-300"
      @focus="selectAll"
    >
  </div>
</template>
