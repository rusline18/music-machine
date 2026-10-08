import { expect, test } from '@playwright/test'

/** Matches every step cell of the grid (instruments are in the label). */
const STEP = /^\S+ step \d+$/

test.describe('salsa beat machine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/salsa')
  })

  test('clicking a step cycles it on and off', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear' }).click()
    const step = page.getByRole('button', { name: 'clave step 2', exact: true })
    await expect(step).toHaveText('')

    await step.click()
    await expect(step).not.toHaveText('')

    // Keep clicking until it wraps back to empty (one click per sample name).
    for (let i = 0; i < 10 && (await step.textContent())?.trim(); i++) await step.click()
    await expect(step).toHaveText('')
  })

  test('clear empties every step', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear' }).click()
    const steps = page.getByRole('button', { name: STEP })
    await expect(steps.first()).toBeVisible()
    for (const step of await steps.all()) await expect(step).toHaveText('')
  })

  test('count selector changes the loop length', async ({ page }) => {
    // Each count is two cells ("1 &").
    const claveSteps = page.getByRole('button', { name: /^clave step \d+$/ })

    await page.getByRole('button', { name: '32', exact: true }).click()
    await expect(page.getByRole('button', { name: '32', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(claveSteps).toHaveCount(64)

    await page.getByRole('button', { name: '8', exact: true }).click()
    await expect(claveSteps).toHaveCount(16)
  })

  test('mute button toggles a track', async ({ page }) => {
    await page.getByRole('button', { name: 'Mute clave' }).click()
    await expect(page.getByRole('button', { name: 'Unmute clave' })).toHaveText('off')
  })

  test('play and stop', async ({ page }) => {
    const play = page.getByRole('button', { name: '▶ Play' })
    const stop = page.getByRole('button', { name: '■ Stop' })
    await expect(stop).toBeDisabled()

    await play.click()
    await expect(play).toBeDisabled()
    await expect(stop).toBeEnabled()

    await stop.click()
    await expect(play).toBeEnabled()
    await expect(stop).toBeDisabled()
  })
})

test('bachata shows chord selectors', async ({ page }) => {
  await page.goto('/bachata')
  const chord = page.getByRole('combobox', { name: 'Chord for bar 1' })
  await expect(chord).toBeVisible()
  await chord.selectOption('Dm')
  await expect(chord).toHaveValue('Dm')
})
