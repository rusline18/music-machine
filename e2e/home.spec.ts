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
  expect(html).toContain('aria-label="Clave step 1"')
})

test('Russian is served under /ru', async ({ page }) => {
  await page.goto('/ru/salsa')
  await expect(page.getByRole('heading', { name: 'Сальса' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Клаве, шаг 1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '▶ Играть' })).toBeVisible()
})

test('every sample request succeeds', async ({ page }) => {
  const failed: string[] = []
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`)
  })
  await page.goto('/salsa')
  await page.getByRole('button', { name: '▶ Play' }).click()
  await expect(page.getByRole('button', { name: '■ Stop' })).toBeEnabled()
  await page.goto('/ru/bachata')
  await page.getByRole('button', { name: '▶ Играть' }).click()
  await expect(page.getByRole('button', { name: '■ Стоп' })).toBeEnabled()
  expect(failed).toEqual([])
})
