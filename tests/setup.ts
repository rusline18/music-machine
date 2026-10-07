import { computed, onUnmounted, ref, watch } from 'vue'

// Composables rely on Nuxt auto-imports; plain Vitest doesn't have them.
Object.assign(globalThis, { computed, onUnmounted, ref, watch })
