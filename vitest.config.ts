import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Nuxt's alias for code shared by the app and the server.
    alias: { '#shared': fileURLToPath(new URL('./shared', import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
})
