import type { Page } from '@playwright/test'

/**
 * Opens `url` and waits until Nuxt has hydrated the page. `goto` returns on
 * the load event, but hydration waits for the translations, fetched after
 * it: until then the page is the server's HTML, and a click or a pick in a
 * <select> lands in the bare DOM where the app never sees it. On a loaded
 * machine that window is long enough for a test to fall into.
 */
export async function gotoHydrated(page: Page, url: string) {
  await page.goto(url)
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as { __vue_app__?: { $nuxt?: { isHydrating?: boolean } } } | null)?.__vue_app__
    return app?.$nuxt?.isHydrating === false
  })
}
