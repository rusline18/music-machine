<script setup lang="ts">
const props = defineProps<{
  modelValue: number
  min?: number
  max?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const min = props.min ?? 60
const max = props.max ?? 160

function onInput(event: Event) {
  emit('update:modelValue', Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="text-sm font-medium text-neutral-400">BPM</span>
    <input
      type="range"
      :min="min"
      :max="max"
      :value="modelValue"
      class="w-48 accent-amber-500"
      @input="onInput"
    >
    <span class="w-10 text-right font-mono text-sm text-neutral-200">{{ modelValue }}</span>
  </div>
</template>
