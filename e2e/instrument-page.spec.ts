import { expect, test } from '@playwright/test'

test.describe('instrument page', () => {
  test('is linked from its genre and back', async ({ page }) => {
    await page.goto('/salsa')
    await page.getByRole('navigation', { name: 'About the instruments' }).getByRole('link', { name: 'Congas' }).click()
    await expect(page).toHaveURL(/\/salsa\/congas$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Congas' })).toBeVisible()
    await expect(page).toHaveTitle(/Congas in salsa/)

    await page.getByRole('link', { name: '← Salsa' }).click()
    await expect(page).toHaveURL(/\/salsa$/)
  })

  test('shows only the instrument on the grid, and switches its rhythm', async ({ page }) => {
    await page.goto('/salsa/congas')
    const steps = page.getByRole('button', { name: /^.+ step \d+$/ })
    await expect(steps.first()).toBeVisible()
    for (const step of await steps.all()) await expect(step).toHaveAttribute('aria-label', /^Congas step/)

    const first = page.getByRole('button', { name: 'Congas step 1', exact: true })
    await expect(first).toHaveAttribute('data-sound', 'heel')
    await page.getByRole('button', { name: 'Open', exact: true }).click()
    await expect(first).not.toHaveAttribute('data-sound')
    await expect(page.getByRole('button', { name: 'Congas step 7', exact: true })).toHaveAttribute('data-sound', 'open')
  })

  test('plays and stops', async ({ page }) => {
    await page.goto('/salsa/congas')
    await page.getByRole('button', { name: '▶ Play' }).click()
    await expect(page.getByRole('button', { name: '■ Stop' })).toBeVisible()
    await page.getByRole('button', { name: 'With the band' }).click()
    await page.getByRole('button', { name: '■ Stop' }).click()
    await expect(page.getByRole('button', { name: '▶ Play' })).toBeVisible()
  })

  test('is in Russian too', async ({ page }) => {
    await page.goto('/ru/salsa/congas')
    await expect(page.getByRole('heading', { level: 1, name: 'Конги' })).toBeVisible()
  })

  test('has no page for other instruments', async ({ page }) => {
    for (const path of ['/salsa/voice', '/salsa/piano', '/bachata/congas']) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(404)
    }
  })
})
