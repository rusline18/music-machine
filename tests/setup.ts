import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

// Composables rely on Nuxt auto-imports; plain Vitest doesn't have them.
Object.assign(globalThis, { computed, onMounted, onUnmounted, ref, watch })
