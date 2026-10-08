<script setup lang="ts">
defineProps<{
  /** The guide's progress, or null when it isn't running. */
  layers: { readonly order: readonly string[], readonly added: number } | null
}>()

const emit = defineEmits<{
  start: []
  add: []
  /** `addRest`: bring in every instrument the guide hadn't reached. */
  end: [addRest: boolean]
}>()
</script>

<template>
  <div class="rounded-lg border border-neutral-800 p-4">
    <div
      v-if="!layers"
      class="flex flex-wrap items-center gap-3"
    >
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-700"
        @click="emit('start')"
      >
        <UiIcon name="layers" />
        {{ $t('layers.start') }}
      </button>
      <p class="text-sm text-neutral-400">
        {{ $t('layers.intro') }}
      </p>
    </div>

    <div
      v-else
      class="space-y-3"
    >
      <div class="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
        {{ $t('layers.playing') }}
        <span
          v-for="instrument in layers.order.slice(0, layers.added)"
          :key="instrument"
          class="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-300"
        >
          <UiIcon :name="instrument" />
          {{ $t(`instruments.${instrument}`) }}
        </span>
      </div>

      <p class="text-sm text-neutral-200">
        <span class="font-semibold">{{ $t(`instruments.${layers.order[layers.added - 1]}`) }}:</span>
        {{ $t(`help.instruments.${layers.order[layers.added - 1]}`) }}
      </p>

      <div class="flex flex-wrap items-center gap-3">
        <template v-if="layers.added < layers.order.length">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-amber-400"
            @click="emit('add')"
          >
            <UiIcon :name="layers.order[layers.added]!" />
            {{ $t('layers.add', { instrument: $t(`instruments.${layers.order[layers.added]}`) }) }}
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200"
            @click="emit('end', true)"
          >
            {{ $t('layers.addAll') }}
          </button>
        </template>
        <template v-else>
          <p class="text-sm text-neutral-300">
            {{ $t('layers.done') }}
          </p>
          <button
            type="button"
            class="rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
            @click="emit('end', false)"
          >
            {{ $t('layers.close') }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
