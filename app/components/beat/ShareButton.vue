<script setup lang="ts">
import { SHARE_PARAM } from '../../composables/useBeatMachine'

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
  try {
    await navigator.clipboard.writeText(link.value)
    status.value = 'copied'
    resetTimer = setTimeout(() => (status.value = 'idle'), 2500)
  }
  catch {
    // No clipboard (insecure origin, permission denied): show the link
    // for copying by hand.
    status.value = 'manual'
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
      class="rounded-md bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/30"
      title="Copy a link to this exact pattern — tempo, length, mutes and all"
      @click="share"
    >
      🔗 Share
    </button>
    <span v-if="status === 'copied'" class="text-sm text-neutral-400" role="status">Link copied</span>
    <input
      v-else-if="status === 'manual'"
      :value="link"
      readonly
      aria-label="Link to this pattern"
      class="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-300"
      @focus="selectAll"
    >
  </div>
</template>
