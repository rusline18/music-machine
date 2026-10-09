<script setup lang="ts">
defineProps<{
  presetIds: string[]
}>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <select
    v-model="model"
    :aria-label="$t('controls.preset')"
    class="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
  >
    <option
      v-for="id in presetIds"
      :key="id"
      :value="id"
    >
      {{ $t(`presets.${id}`) }}
    </option>
  </select>
</template>
