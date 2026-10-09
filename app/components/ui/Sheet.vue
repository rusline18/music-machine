<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()

const dialog = ref<HTMLDialogElement | null>(null)

// A native modal dialog: it keeps focus inside, closes on Esc and puts
// focus back where it was. On a phone it slides up from the bottom edge,
// in reach of the thumb; on wider screens it opens in the middle.
watch(() => props.open, (open) => {
  if (open && !dialog.value?.open) dialog.value?.showModal()
  else if (!open && dialog.value?.open) dialog.value.close()
}, { flush: 'post' })

/** A tap on the dimmed backdrop (the dialog element itself, outside the panel) closes it. */
function onClick(event: MouseEvent) {
  if (event.target === dialog.value) dialog.value?.close()
}
</script>

<template>
  <dialog
    ref="dialog"
    class="sheet m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-neutral-700 bg-neutral-900 p-0 text-neutral-100 shadow-2xl backdrop:bg-black/60 max-sm:bottom-0 max-sm:top-auto max-sm:m-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0"
    :aria-label="title"
    @close="emit('close')"
    @click="onClick"
  >
    <div class="p-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="font-semibold">
          {{ title }}
        </h2>
        <button
          type="button"
          class="-m-2 flex size-11 items-center justify-center rounded text-neutral-400 hover:text-neutral-100"
          :aria-label="$t('controls.close')"
          @click="dialog?.close()"
        >
          ✕
        </button>
      </div>
      <slot />
    </div>
  </dialog>
</template>
