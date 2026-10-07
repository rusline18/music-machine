<script setup lang="ts">
defineProps<{
  patterns: Array<{ id: string; name: string }>
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <select
    class="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
    :value="modelValue"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option v-for="pattern in patterns" :key="pattern.id" :value="pattern.id">
      {{ pattern.name }}
    </option>
  </select>
</template>
