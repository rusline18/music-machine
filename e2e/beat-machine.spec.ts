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
    await expect(step).not.toHaveAttribute('data-sound')
    await step.click()
    await expect(step).toHaveAttribute('data-sound')
    await step.click()
    await expect(step).not.toHaveAttribute('data-sound')
  })

  test('right-click picks the sound from a menu', async ({ page }) => {
    const step = page.getByRole('button', { name: 'Bongos step 8', exact: true })
    await expect(step).not.toHaveAttribute('data-sound')
    await step.click({ button: 'right' })
    const menu = page.getByRole('dialog', { name: 'Bongos step 8' })
    await menu.getByRole('menuitemradio', { name: 'slap' }).click()
    await expect(menu).toBeHidden()
    await expect(step).toHaveAttribute('data-sound', 'slap')

    await step.click({ button: 'right' })
    await expect(menu.getByRole('menuitemradio', { name: 'slap' })).toHaveAttribute('aria-checked', 'true')
    await menu.getByRole('menuitemradio', { name: 'Silence' }).click()
    await expect(step).not.toHaveAttribute('data-sound')
  })

  test('clear empties every step but the counting voice', async ({ page }) => {
    await advanced(page)
    await page.getByRole('button', { name: 'Clear' }).click()
    const steps = page.getByRole('button', { name: STEP })
    await expect(steps.first()).toBeVisible()
    for (const step of await steps.all()) {
      const name = await step.getAttribute('aria-label')
      if (!name?.startsWith('Voice')) await expect(step).not.toHaveAttribute('data-sound')
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
    await expect(other.getByRole('button', { name: 'Clave step 1', exact: true })).toHaveAttribute('data-sound')
    // The code is dropped from the address bar once loaded.
    await expect(other).toHaveURL(/\/salsa$/)

    await other.getByRole('button', { name: 'Reset' }).click()
    await expect(other.getByRole('button', { name: 'Clave step 1', exact: true })).not.toHaveAttribute('data-sound')
  })

  test('a song is built from sections; ones that do not fit are greyed out with the reason', async ({ page }) => {
    await page.getByRole('button', { name: 'Build a song from sections' }).click()
    await expect(page.getByRole('combobox', { name: 'Pattern' })).toHaveValue('song')
    const add = page.getByRole('combobox', { name: 'Add a section' })
    await expect(add.getByRole('option', { name: 'Verse in 2-3 clave (other clave: son 2-3)' })).toBeDisabled()

    await add.selectOption('salsa-montuno-3-2')
    const parts = page.getByRole('list', { name: 'Sections of the song' })
    await expect(parts.getByRole('listitem')).toHaveText([/1\. Verse/, /2\. Montuno/])
    await advanced(page)
    await expect(page.getByRole('button', { name: '16', exact: true })).toHaveAttribute('aria-pressed', 'true')

    // The song comes back after a reload, sections and all.
    await page.reload()
    await expect(parts.getByRole('listitem')).toHaveCount(2)

    await page.getByRole('button', { name: 'Remove section 1: Verse — the basic groove' }).click()
    await expect(parts.getByRole('listitem')).toHaveText([/1\. Montuno/])
  })

  test('edits survive a reload', async ({ page }) => {
    const step = page.getByRole('button', { name: 'Clave step 2', exact: true })
    await step.click()
    await expect(step).toHaveAttribute('data-sound')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Clave step 2', exact: true })).toHaveAttribute('data-sound')
  })
})

test('each genre has its accent color', async ({ page }) => {
  await page.goto('/salsa')
  await expect(page.locator('html')).toHaveAttribute('data-genre', 'salsa')
  await page.goto('/bachata')
  await expect(page.locator('html')).toHaveAttribute('data-genre', 'bachata')
})

test('animation can be switched off, and stays off', async ({ page }) => {
  await page.goto('/salsa')
  const animation = page.getByRole('switch', { name: 'Animation: on' })
  await animation.click()
  await expect(page.getByRole('switch', { name: 'Animation: off' })).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('html')).toHaveClass(/no-motion/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/no-motion/)
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

  test('Share opens the system share menu', async ({ page }) => {
    // Headless Chromium has no share sheet: stand one in that records the call.
    await page.addInitScript(() => {
      Object.assign(navigator, {
        share: (data: ShareData) => {
          (window as unknown as { shared: ShareData }).shared = data
          return Promise.resolve()
        },
      })
    })
    await page.goto('/salsa')
    await page.getByRole('button', { name: 'Share' }).tap()
    await expect.poll(() => page.evaluate(() => (window as unknown as { shared?: ShareData }).shared?.url)).toMatch(/\/salsa\?p=[\w-]+$/)
    await expect(page.getByText('Link copied')).toBeHidden()
  })

  test('the palette sets what a tap in the row puts in', async ({ page }) => {
    await page.goto('/salsa')
    await page.getByRole('button', { name: 'Edit grid' }).tap()
    await expect(page.getByText('Tap a cell: the instrument\'s sounds show up here')).toBeVisible()
    const step = page.getByRole('button', { name: 'Congas step 2', exact: true })
    // The first tap works as always (a hit on or off) and picks the row.
    await step.tap()
    const sounds = page.getByRole('radiogroup', { name: 'Congas sounds' })
    await sounds.getByRole('radio', { name: 'Silence' }).tap()
    await step.tap()
    await expect(step).not.toHaveAttribute('data-sound')
    await sounds.getByRole('radio', { name: 'slap' }).tap()
    await step.tap()
    await expect(step).toHaveAttribute('data-sound', 'slap')
    await step.tap()
    await expect(step).not.toHaveAttribute('data-sound')
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
    await expect(step).toHaveAttribute('data-sound', 'slap')
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

  test('advanced mode: the loop chip opens a sheet, the mixer is a third view, an instrument plays alone', async ({ page }) => {
    await page.goto('/salsa')
    await advanced(page)
    await page.getByRole('button', { name: 'Edit grid' }).tap()

    await page.getByRole('button', { name: 'Loop 8' }).tap()
    await page.getByRole('dialog', { name: 'Loop length' }).getByRole('button', { name: '16', exact: true }).tap()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Loop 16' })).toBeVisible()

    await page.getByRole('button', { name: 'Congas: sound and volume' }).tap()
    const alone = page.getByRole('dialog', { name: 'Congas' }).getByRole('button', { name: '▶ Listen alone' })
    await alone.tap()
    await expect(page.getByRole('button', { name: '■ Whole band' })).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Mixer' }).tap()
    const clave = page.getByRole('switch', { name: 'Clave' })
    await clave.tap()
    await expect(clave).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByRole('slider', { name: 'Clave volume' })).toBeVisible()
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
