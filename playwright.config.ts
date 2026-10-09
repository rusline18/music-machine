import { defineConfig, devices } from '@playwright/test'

const PORT = 3000

// https://playwright.dev/docs/test-configuration
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // On CI: annotations in the PR plus an HTML report uploaded as an artifact.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    // The offline worker would cache pages between steps of a test; the
    // offline test (e2e/offline.spec.ts) switches it back on.
    serviceWorkers: 'block',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Tests run against the production build, so SSR output is what's checked.
  // Locally an already running `npm run dev` on the same port is reused.
  webServer: {
    command: 'npm run build && node .output/server/index.mjs',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
