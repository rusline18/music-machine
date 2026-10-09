import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/** Matches every step cell of the grid (the instrument is in the label). */
const STEP = /^.+ step \d+$/

/** Clear, the counts selector, chords and volumes live in advanced mode. */
async function advanced(page: Page) {
  await page.getByRole('button', { name: 'Advanced features' }).click()
}

test.describe('salsa beat machine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/salsa')
  })

  test('a click turns a step on and off', async ({ page }) => {
    const step = page.getByRole('button', { name: 'Clave step 2', exact: true })
    await expect(step).toHaveText('')
    await step.click()
    await expect(step).not.toHaveText('')
    await step.click()
    await expect(step).toHaveText('')
  })

  test('right-click picks the sound from a menu', async ({ page }) => {
    const step = page.getByRole('button', { name: 'Congas step 1', exact: true })
    await expect(step).toHaveText('')
    await step.click({ button: 'right' })
    const menu = page.getByRole('dialog', { name: 'Congas step 1' })
    await menu.getByRole('menuitemradio', { name: 'open' }).click()
    await expect(menu).toBeHidden()
    await expect(step).toHaveText('open')

    await step.click({ button: 'right' })
    await expect(menu.getByRole('menuitemradio', { name: 'open' })).toHaveAttribute('aria-checked', 'true')
    await menu.getByRole('menuitemradio', { name: 'Silence' }).click()
    await expect(step).toHaveText('')
  })

  test('clear empties every step but the counting voice', async ({ page }) => {
    await advanced(page)
    await page.getByRole('button', { name: 'Clear' }).click()
    const steps = page.getByRole('button', { name: STEP })
    await expect(steps.first()).toBeVisible()
    for (const step of await steps.all()) {
      const name = await step.getAttribute('aria-label')
      if (!name?.startsWith('Voice')) await expect(step).toHaveText('')
    }
  })

  test('count selector changes the loop length', async ({ page }) => {
    await advanced(page)
    // Each count is two cells ("1 &").
    const claveSteps = page.getByRole('button', { name: /^Clave step \d+$/ })
    await expect(claveSteps).toHaveCount(16)

    await page.getByRole('button', { name: '32', exact: true }).click()
    await expect(page.getByRole('button', { name: '32', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(claveSteps).toHaveCount(64)

    await page.getByRole('button', { name: '8', exact: true }).click()
    await expect(claveSteps).toHaveCount(16)
  })

  test('mute button toggles a track', async ({ page }) => {
    const mute = page.getByRole('button', { name: 'Mute Clave' })
    await expect(mute).toHaveAttribute('aria-pressed', 'false')
    await mute.click()
    await expect(mute).toHaveAttribute('aria-pressed', 'true')
    await expect(mute).toHaveText('off')
  })

  test('play and stop', async ({ page }) => {
    // One button that flips between the two.
    await page.getByRole('button', { name: '▶ Play' }).click()
    const stop = page.getByRole('button', { name: '■ Stop' })
    await expect(stop).toBeVisible()
    // The playhead lights the cells of the step being heard.
    await expect(page.locator('.step-cell.is-now').first()).toBeVisible()

    await stop.click()
    await expect(page.getByRole('button', { name: '▶ Play' })).toBeVisible()
    await expect(page.locator('.is-now')).toHaveCount(0)
  })

  test('tempo buttons: a click is 1 BPM, holding goes by 5', async ({ page }) => {
    const bpm = page.getByRole('group', { name: 'BPM' }).locator('output')
    const start = Number((await bpm.textContent())!.match(/\d+/)![0])
    await page.getByRole('button', { name: 'Faster' }).click()
    await expect(bpm).toContainText(String(start + 1))
    await page.getByRole('button', { name: 'Slower' }).click()
    await expect(bpm).toContainText(String(start))

    const slower = page.getByRole('button', { name: 'Slower' })
    await slower.hover()
    await page.mouse.down()
    await page.waitForTimeout(600)
    await page.mouse.up()
    const held = Number((await bpm.textContent())!.match(/\d+/)![0])
    // Repeats by 5 for as long as it's held; the click that ends it adds nothing.
    expect(held).toBeLessThanOrEqual(start - 5)
    expect((start - held) % 5).toBe(0)
  })

  test('keyboard: Space plays and stops, arrows change the tempo, digits switch instruments', async ({ page }) => {
    const bpm = page.getByRole('group', { name: 'BPM' }).locator('output')
    const start = Number((await bpm.textContent())!.match(/\d+/)![0])
    await page.locator('h1').click()
    await page.keyboard.press('ArrowRight')
    await expect(bpm).toContainText(String(start + 1))
    await page.keyboard.press('Shift+ArrowLeft')
    await expect(bpm).toContainText(String(start - 4))

    await page.keyboard.press('1')
    await expect(page.getByRole('button', { name: 'Mute Clave' })).toHaveAttribute('aria-pressed', 'true')

    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: '■ Stop' })).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: '▶ Play' })).toBeVisible()
  })

  test('a shared link opens the same pattern, and Reset undoes it', async ({ page, context, browser }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.getByRole('combobox', { name: 'Pattern' }).selectOption('salsa-chachacha-2-3')
    await page.getByRole('button', { name: 'Clave step 1', exact: true }).click()
    await page.getByRole('button', { name: 'Share' }).click()
    await expect(page.getByText('Link copied')).toBeVisible()
    const link = await page.evaluate(() => navigator.clipboard.readText())
    expect(link).toMatch(/\/salsa\?p=[\w-]+$/)

    // Someone else opens it: a fresh browser, nothing saved.
    const other = await (await browser.newContext()).newPage()
    await other.goto(link)
    await expect(other.getByRole('combobox', { name: 'Pattern' })).toHaveValue('salsa-chachacha-2-3')
    await expect(other.getByRole('button', { name: 'Clave step 1', exact: true })).not.toHaveText('')
    // The code is dropped from the address bar once loaded.
    await expect(other).toHaveURL(/\/salsa$/)

    await other.getByRole('button', { name: 'Reset' }).click()
    await expect(other.getByRole('button', { name: 'Clave step 1', exact: true })).toHaveText('')
  })

  test('edits survive a reload', async ({ page }) => {
    const step = page.getByRole('button', { name: 'Clave step 2', exact: true })
    await step.click()
    await expect(step).not.toHaveText('')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Clave step 2', exact: true })).not.toHaveText('')
  })
})

test('bachata starts at 8 counts and shows chord selectors in advanced mode', async ({ page }) => {
  await page.goto('/bachata')
  await advanced(page)
  await expect(page.getByRole('button', { name: '8', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const chord = page.getByRole('combobox', { name: 'Chord for bar 1' })
  await expect(chord).toHaveValue('Am')
  await expect(page.getByRole('combobox', { name: 'Chord for bar 2' })).toHaveValue('E')
  await chord.selectOption('Dm')
  await expect(chord).toHaveValue('Dm')
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('practice shows a switch per instrument, the grid is one tap away', async ({ page }) => {
    await page.goto('/salsa')
    const clave = page.getByRole('switch', { name: 'Clave' })
    await expect(clave).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('button', { name: 'Clave step 1', exact: true })).toBeHidden()

    await clave.tap()
    await expect(clave).toHaveAttribute('aria-checked', 'false')

    await page.getByRole('button', { name: 'Edit grid' }).tap()
    await expect(page.getByRole('button', { name: 'Clave step 1', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mute Clave' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('a long press on a cell opens the sound menu', async ({ page }) => {
    await page.goto('/salsa')
    await page.getByRole('button', { name: 'Edit grid' }).tap()
    const step = page.getByRole('button', { name: 'Congas step 1', exact: true })
    const box = (await step.boundingBox())!
    const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, button: 0, pointerType: 'touch', isPrimary: true }
    await step.dispatchEvent('pointerdown', at)
    await page.waitForTimeout(600)
    await step.dispatchEvent('pointerup', at)
    await page.getByRole('dialog', { name: 'Congas step 1' }).getByRole('menuitemradio', { name: 'slap' }).tap()
    await expect(step).toHaveText('slap')
  })

  test('a swipe turns the bar; the icon opens the instrument sheet', async ({ page }) => {
    await page.goto('/salsa')
    await page.getByRole('button', { name: 'Edit grid' }).tap()
    await expect(page.getByText('Bar 1 of 2')).toBeVisible()
    const section = page.locator('.touch-pan-y').first()
    const box = (await section.boundingBox())!
    const y = box.y + 20
    await section.dispatchEvent('pointerdown', { clientX: box.x + box.width - 20, clientY: y, button: 0, pointerType: 'touch' })
    await section.dispatchEvent('pointerup', { clientX: box.x + 20, clientY: y, button: 0, pointerType: 'touch' })
    await expect(page.getByText('Bar 2 of 2')).toBeVisible()

    await page.getByRole('button', { name: 'Clave: sound and volume' }).tap()
    const sheet = page.getByRole('dialog', { name: 'Clave' })
    const playing = sheet.getByRole('switch', { name: 'Playing' })
    await expect(playing).toHaveAttribute('aria-checked', 'true')
    await playing.tap()
    await expect(playing).toHaveAttribute('aria-checked', 'false')
    await expect(sheet.getByRole('slider', { name: 'Volume' })).toBeVisible()
  })

  test('Play stays on screen at the bottom', async ({ page }) => {
    await page.goto('/salsa')
    const play = page.getByRole('button', { name: '▶ Play' })
    await page.mouse.wheel(0, 2000)
    await expect(play).toBeInViewport()
    const box = (await play.boundingBox())!
    expect(box.y).toBeGreaterThan(844 / 2)
    expect(box.height).toBeGreaterThanOrEqual(44)
  })
})
