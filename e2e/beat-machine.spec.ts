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

  test('simple mode: a click turns a step on and off', async ({ page }) => {
    const step = page.getByRole('button', { name: 'Clave step 2', exact: true })
    await expect(step).toHaveText('')
    await step.click()
    await expect(step).not.toHaveText('')
    await step.click()
    await expect(step).toHaveText('')
  })

  test('advanced mode: a click cycles through the sounds, then off', async ({ page }) => {
    await advanced(page)
    const step = page.getByRole('button', { name: 'Congas step 1', exact: true })
    await expect(step).toHaveText('')
    await step.click()
    await expect(step).not.toHaveText('')
    // One click per sound, then it wraps back to empty.
    for (let i = 0; i < 10 && (await step.textContent())?.trim(); i++) await step.click()
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
    const play = page.getByRole('button', { name: '▶ Play' })
    const stop = page.getByRole('button', { name: '■ Stop' })
    await expect(stop).toBeDisabled()

    await play.click()
    await expect(stop).toBeEnabled()
    await expect(play).toBeDisabled()

    await stop.click()
    await expect(play).toBeEnabled()
    await expect(stop).toBeDisabled()
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
