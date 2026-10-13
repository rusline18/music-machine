import { computed, onBeforeUnmount, onMounted, readonly, ref, toRaw, watch } from 'vue'

// Composables rely on Nuxt auto-imports; plain Vitest doesn't have them.
// The router ones are stand-ins: a page with no query, nowhere to navigate.
const useRoute = () => ({ query: {} })
const useRouter = () => ({ replace: () => Promise.resolve() })
// Not inside Telegram: nothing goes to its cloud.
const inTelegram = () => false
Object.assign(globalThis, { computed, onBeforeUnmount, onMounted, readonly, ref, toRaw, watch, useRoute, useRouter, inTelegram })
