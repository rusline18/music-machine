<script setup lang="ts">
import { SHARE_PARAM } from '~/composables/useBeatMachine'
import { sendLink } from '~/core/sendLink'

const props = defineProps<{
  /** Pattern code from useBeatMachine().shareCode. */
  code: string
}>()

/** 'copied' after a successful copy; 'manual' when the browser won't let us copy. */
const status = ref<'idle' | 'copied' | 'manual'>('idle')
const link = ref('')
let resetTimer: ReturnType<typeof setTimeout> | undefined

async function share() {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set(SHARE_PARAM, props.code)
  link.value = url.toString()

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
    <button
      type="button"
      class="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent-500/20 px-4 py-2 sm:min-h-0 text-sm font-medium text-accent-400 hover:bg-accent-500/30"
      :title="$t('help.controls.share')"
      @click="share"
    >
      <UiIcon name="share" />
      {{ $t('controls.share') }}
    </button>
    <span
      v-if="status === 'copied'"
      class="text-sm text-neutral-400"
      role="status"
    >{{ $t('controls.linkCopied') }}</span>
    <input
      v-else-if="status === 'manual'"
      :value="link"
      readonly
      :aria-label="$t('controls.link')"
      class="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-300"
      @focus="selectAll"
    >
  </div>
</template>
