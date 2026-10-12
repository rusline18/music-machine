import { expect, test, type Page } from '@playwright/test'

const SDK = 'https://telegram.org/js/telegram-web-app.js'

/** Stands in for Telegram's SDK: records what the site asks of it, and lets the test press Back. */
const FAKE_SDK = `
window.telegramCalls = []
const record = (name) => () => { window.telegramCalls.push(name) }
let onBack = () => {}
window.Telegram = { WebApp: {
  platform: 'android',
  initDataUnsafe: { start_param: window.fakeStartParam },
  openTelegramLink: (url) => window.telegramCalls.push('open ' + url),
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

/** The bot the e2e server is configured with (playwright.config.ts). */
const BOT = 'latinbeat_test_bot'
const LAUNCH = '#tgWebAppData=query_id%3D1&tgWebAppVersion=8.0&tgWebAppPlatform=android'

/** The t.me link the page asked Telegram to open, if any. */
function openedLink(page: Page) {
  return page.evaluate(() => (window as unknown as { telegramCalls: string[] }).telegramCalls
    .find((call) => call.startsWith('open '))?.slice('open '.length))
}

async function fakeTelegram(page: Page, startParam?: string) {
  if (startParam) {
    await page.addInitScript((param) => {
      (window as unknown as { fakeStartParam: string }).fakeStartParam = param
    }, startParam)
  }
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

test('a t.me link with a genre opens that genre', async ({ page }) => {
  await fakeTelegram(page, 'bachata')
  await page.goto(`/${LAUNCH}`)
  await expect(page).toHaveURL('/bachata')
  await expect(page.getByRole('heading', { name: 'Bachata' })).toBeVisible()
})

test('Share in Telegram sends a t.me link that opens the same pattern in the Mini App', async ({ page, browser }) => {
  await fakeTelegram(page)
  await page.goto(`/salsa${LAUNCH}`)
  await page.getByRole('combobox', { name: 'Pattern' }).selectOption('salsa-chachacha-2-3')
  await page.getByRole('button', { name: 'Clave step 1', exact: true }).click()
  await page.getByRole('button', { name: 'Share' }).click()

  await expect.poll(() => openedLink(page)).toMatch(/^https:\/\/t\.me\/share\/url\?url=/)
  const shared = new URL((await openedLink(page))!)
  const link = new URL(shared.searchParams.get('url')!)
  expect(link.origin + link.pathname).toBe(`https://t.me/${BOT}`)
  const startParam = link.searchParams.get('startapp')!
  expect(startParam).toMatch(/^salsa_[\w-]+$/)
  expect(shared.searchParams.get('text')).toContain('Latin Beat Machine')

  // A friend taps it: Telegram opens the Mini App with that start parameter.
  const other = await (await browser.newContext()).newPage()
  await fakeTelegram(other, startParam)
  await other.goto(`/${LAUNCH}`)
  await expect(other).toHaveURL('/salsa')
  await expect(other.getByRole('combobox', { name: 'Pattern' })).toHaveValue('salsa-chachacha-2-3')
  await expect(other.getByRole('button', { name: 'Clave step 1', exact: true })).toHaveAttribute('data-sound')
})
