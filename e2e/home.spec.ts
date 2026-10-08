import { expect, test } from '@playwright/test'

test('home page links to both genres', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Latin Beat Machine' })).toBeVisible()

  await page.getByRole('link', { name: 'Salsa' }).click()
  await expect(page).toHaveURL('/salsa')
  await expect(page.getByRole('heading', { name: 'Salsa' })).toBeVisible()

  await page.getByRole('link', { name: '← Back' }).click()
  await page.getByRole('link', { name: 'Bachata' }).click()
  await expect(page).toHaveURL('/bachata')
  await expect(page.getByRole('heading', { name: 'Bachata' })).toBeVisible()
})

test('pages are rendered on the server', async ({ request }) => {
  const html = await (await request.get('/salsa')).text()
  expect(html).toContain('<title>Salsa Rhythm Trainer — Latin Beat Machine</title>')
  expect(html).toContain('aria-label="clave step 1"')
})
