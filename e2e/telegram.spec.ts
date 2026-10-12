import { expect, test, type Page } from '@playwright/test'

const SDK = 'https://telegram.org/js/telegram-web-app.js'

/** Stands in for Telegram's SDK: records what the site asks of it, and lets the test press Back. */
const FAKE_SDK = `
window.telegramCalls = []
const record = (name) => () => { window.telegramCalls.push(name) }
let onBack = () => {}
window.Telegram = { WebApp: {
  platform: 'android',
  isVersionAtLeast: () => true,
  ready: record('ready'),
  expand: record('expand'),
  disableVerticalSwipes: record('disableVerticalSwipes'),
  setHeaderColor: (color) => window.telegramCalls.push('header ' + color),
  setBackgroundColor: (color) => window.telegramCalls.push('background ' + color),
  setBottomBarColor: (color) => window.telegramCalls.push('bottomBar ' + color),
  BackButton: {
    isVisible: false,
    show() { this.isVisible = true },
    hide() { this.isVisible = false },
    onClick(callback) { onBack = callback },
  },
} }
window.pressTelegramBack = () => onBack()
`

async function fakeTelegram(page: Page) {
  const requested: string[] = []
  await page.route(SDK, (route) => {
    requested.push(route.request().url())
    return route.fulfill({ contentType: 'text/javascript', body: FAKE_SDK })
  })
  return requested
}

function backButtonVisible(page: Page) {
  return page.evaluate(() => (window as unknown as { Telegram: { WebApp: { BackButton: { isVisible: boolean } } } })
    .Telegram.WebApp.BackButton.isVisible)
}

test('ordinary visitors don\'t load the Telegram SDK', async ({ page }) => {
  const requested = await fakeTelegram(page)
  await page.goto('/salsa')
  await expect(page.getByRole('heading', { name: 'Salsa' })).toBeVisible()
  expect(requested).toEqual([])
})

test('opened as a Telegram Mini App', async ({ page }) => {
  const requested = await fakeTelegram(page)
  await page.goto('/salsa#tgWebAppData=query_id%3D1&tgWebAppVersion=8.0&tgWebAppPlatform=android')
  await expect(page.getByRole('heading', { name: 'Salsa' })).toBeVisible()
  expect(requested).toHaveLength(1)

  await expect.poll(() => page.evaluate(() => (window as unknown as { telegramCalls: string[] }).telegramCalls))
    .toEqual(expect.arrayContaining(['ready', 'expand', 'disableVerticalSwipes', 'header #110E0D']))
  await expect.poll(() => backButtonVisible(page)).toBe(true)

  // Telegram's Back button leads home, where it hides.
  await page.evaluate(() => (window as unknown as { pressTelegramBack: () => void }).pressTelegramBack())
  await expect(page).toHaveURL('/')
  await expect.poll(() => backButtonVisible(page)).toBe(false)
})

test('Telegram Web may show the site in a frame, no one else', async ({ request }) => {
  const policy = (await request.get('/')).headers()['content-security-policy']
  expect(policy).toContain('frame-ancestors \'self\' https://web.telegram.org')
})
