import { expect, test } from '@playwright/test'

test.describe('instrument page', () => {
  test('is linked from the instrument sheet, and back', async ({ page }) => {
    await page.goto('/salsa')
    await page.getByRole('button', { name: 'Mute Congas' }).click({ button: 'right' })
    await page.getByRole('dialog', { name: 'Congas' }).getByRole('link', { name: 'More about the instrument →' }).click()
    await expect(page).toHaveURL(/\/salsa\/congas$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Congas' })).toBeVisible()
    await expect(page).toHaveTitle(/Congas in salsa/)

    await page.getByRole('link', { name: '← Salsa' }).click()
    await expect(page).toHaveURL(/\/salsa$/)
  })

  test('the instrument\'s name on the grid opens its sheet', async ({ page }) => {
    await page.goto('/salsa')
    await page.getByRole('button', { name: 'Congas', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'Congas' })
    await sheet.getByRole('link', { name: 'More about the instrument →' }).click()
    await expect(page).toHaveURL(/\/salsa\/congas$/)
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

  test('plays each rhythm over the preset it belongs to', async ({ page }) => {
    await page.goto('/salsa/clave')
    // Son clave 3-2: 1, &2, 4 — 6, 7.
    await expect(page.getByRole('button', { name: 'Clave step 1', exact: true })).toHaveAttribute('data-sound', 'hit')
    await page.getByRole('button', { name: '2-3', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Clave step 1', exact: true })).not.toHaveAttribute('data-sound')
    await expect(page.getByRole('button', { name: 'Clave step 3', exact: true })).toHaveAttribute('data-sound', 'hit')

    await page.goto('/salsa/guiro')
    await page.getByRole('button', { name: 'Cha-cha-chá', exact: true }).click()
    await expect(page.getByText('120', { exact: true })).toBeVisible()
  })

  test('is in Russian too', async ({ page }) => {
    await page.goto('/ru/salsa/congas')
    await expect(page.getByRole('heading', { level: 1, name: 'Конги' })).toBeVisible()
  })

  test('has no page for other instruments', async ({ page }) => {
    for (const path of ['/salsa/voice', '/bachata/voice', '/salsa/guira', '/bachata/congas']) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(404)
    }
  })
})

test.describe('instrument page on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('is reached from the practice cards: the ⓘ opens the sheet, which tips the long press', async ({ page }) => {
    await page.goto('/salsa')
    const congas = page.getByRole('switch', { name: 'Congas' })
    await expect(congas).toHaveAttribute('aria-checked', 'true')

    await page.getByRole('button', { name: 'About the instrument: Congas' }).tap()
    const sheet = page.getByRole('dialog', { name: 'Congas' })
    await expect(sheet.getByText('Next time, just press and hold')).toBeVisible()
    await sheet.getByRole('link', { name: 'More about the instrument →' }).tap()
    await expect(page).toHaveURL(/\/salsa\/congas$/)
  })

  test('a long press on a card opens the sheet without switching the instrument', async ({ page }) => {
    await page.goto('/salsa')
    const congas = page.getByRole('switch', { name: 'Congas' })
    await congas.click({ button: 'right' })
    const sheet = page.getByRole('dialog', { name: 'Congas' })
    await expect(sheet.getByRole('link', { name: 'More about the instrument →' })).toBeVisible()
    await expect(sheet.getByText('Next time, just press and hold')).toBeHidden()
    await expect(congas).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('holding an instrument icon on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('says what is coming until the user has held one once', async ({ page }) => {
    await page.goto('/salsa')
    await page.getByRole('button', { name: 'Edit grid' }).tap()
    const icon = page.getByRole('button', { name: 'Mute Clave' })
    const hint = page.getByRole('status').filter({ hasText: 'Keep holding — the sheet opens' })
    const box = (await icon.boundingBox())!
    const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, button: 0, pointerType: 'touch' }

    await icon.dispatchEvent('pointerdown', at)
    await expect(hint).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Clave' })).toBeVisible()
    await expect(hint).toBeHidden()
    await icon.dispatchEvent('pointerup', at)
    await page.keyboard.press('Escape')

    // Learnt: the next hold opens the sheet without the hint.
    await icon.dispatchEvent('pointerdown', at)
    await expect(page.getByRole('dialog', { name: 'Clave' })).toBeVisible()
    await expect(hint).toHaveCount(0)
  })
})

test.describe('holding a practice card on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('hints like the grid icons, and once learnt the ⓘ stops tipping it', async ({ page }) => {
    await page.goto('/salsa')
    const card = page.getByRole('switch', { name: 'Congas' })
    const hint = page.getByRole('status').filter({ hasText: 'Keep holding — the sheet opens' })
    const box = (await card.boundingBox())!
    const at = { clientX: box.x + 30, clientY: box.y + box.height / 2, button: 0, pointerType: 'touch' }

    await card.dispatchEvent('pointerdown', at)
    await expect(hint).toBeVisible()
    const sheet = page.getByRole('dialog', { name: 'Congas' })
    await expect(sheet).toBeVisible()
    await card.dispatchEvent('pointerup', at)
    await expect(card).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'About the instrument: Congas' }).tap()
    await expect(sheet).toBeVisible()
    await expect(sheet.getByText('Next time, just press and hold')).toBeHidden()
  })
})
