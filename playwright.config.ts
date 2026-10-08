import { defineConfig, devices } from '@playwright/test'

const PORT = 3000

// https://playwright.dev/docs/test-configuration
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
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
