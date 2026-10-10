import { expect, test } from '@playwright/test'

// The curtain only plays with motion on (plugins/curtain.client.ts).
test.use({ reducedMotion: 'no-preference' })

test('a genre opens behind a curtain, and the curtain clears both ways', async ({ page }) => {
  // Settled: the page is hydrated, so the click is the app's, not a full page load.
  await page.goto('/', { waitUntil: 'networkidle' })
  const curtain = page.locator('.genre-curtain')

  await page.getByRole('link', { name: 'Bachata' }).click()
  await expect(curtain).toBeVisible()
  await expect(page).toHaveURL('/bachata')
  await expect(curtain).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Bachata' })).toBeVisible()

  await page.getByRole('link', { name: '← Back' }).click()
  await expect(curtain).toBeVisible()
  await expect(page).toHaveURL('/')
  await expect(curtain).toBeHidden()
  await expect(page.getByRole('link', { name: 'Salsa' })).toBeVisible()
})

test('the genre switch slides across to the other genre and back, without the curtain', async ({ page }) => {
  await page.goto('/bachata', { waitUntil: 'networkidle' })
  // Counts the slides (plugins/genre-slide.client.ts) as they start.
  await page.evaluate(() => {
    const start = document.startViewTransition.bind(document)
    Object.assign(window, { slides: 0 })
    document.startViewTransition = (update) => {
      (window as unknown as { slides: number }).slides++
      return start(update)
    }
  })
  const curtain = page.locator('.genre-curtain')
  const genres = page.getByRole('navigation', { name: 'Genres' })

  await genres.getByRole('link', { name: 'Salsa' }).click()
  await expect(page).toHaveURL('/salsa')
  await expect(page.getByRole('heading', { name: 'Salsa' })).toBeVisible()
  await expect(genres.getByRole('link', { name: 'Salsa' })).toHaveAttribute('aria-current', 'page')

  await genres.getByRole('link', { name: 'Bachata' }).click()
  await expect(page).toHaveURL('/bachata')
  await expect(page.getByRole('heading', { name: 'Bachata' })).toBeVisible()

  expect(await page.evaluate(() => (window as unknown as { slides: number }).slides)).toBe(2)
  await expect(curtain).toBeHidden()
})
