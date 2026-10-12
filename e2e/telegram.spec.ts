import { expect, test, type Page } from '@playwright/test'

const SDK = 'https://telegram.org/js/telegram-web-app.js'

/** Stands in for Telegram's SDK: records what the site asks of it, and lets the test press Back. */
const FAKE_SDK = `
window.telegramCalls = []
const record = (name) => () => { window.telegramCalls.push(name) }
let onBack = () => {}
const homeScreenAdded = []
window.Telegram = { WebApp: {
  platform: 'android',
  initDataUnsafe: {
    start_param: window.fakeStartParam,
    user: window.fakeLanguage ? { language_code: window.fakeLanguage } : undefined,
  },
  openTelegramLink: (url) => window.telegramCalls.push('open ' + url),
  enableClosingConfirmation: record('confirm close on'),
  checkHomeScreenStatus: (callback) => setTimeout(() => callback(window.fakeHomeScreen ?? 'unsupported')),
  addToHomeScreen: () => {
    window.telegramCalls.push('add to home screen')
    for (const handler of homeScreenAdded) handler()
  },
  onEvent: (event, handler) => { if (event === 'homeScreenAdded') homeScreenAdded.push(handler) },
  offEvent: () => {},
  disableClosingConfirmation: record('confirm close off'),
  CloudStorage: {
    getItem: (key, callback) => setTimeout(() => callback(null, window.fakeCloud[key] ?? '')),
    setItem: (key, value, callback) => {
      window.fakeCloud[key] = value
      window.telegramCalls.push('cloud set ' + key)
      setTimeout(() => callback?.(null, true))
    },
    removeItem: (key, callback) => {
      delete window.fakeCloud[key]
      window.telegramCalls.push('cloud remove ' + key)
      setTimeout(() => callback?.(null, true))
    },
  },
  HapticFeedback: {
    impactOccurred: (style) => window.telegramCalls.push('impact ' + style),
    selectionChanged: record('selection'),
  },
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

/** Telegram's SDK, stood in for; `startParam` and `language` are what Telegram would pass. */
async function fakeTelegram(page: Page, startParam?: string, language?: string, cloud: Record<string, string> = {}) {
  await page.addInitScript(([param, code, stored]) => {
    Object.assign(window, { fakeStartParam: param, fakeLanguage: code, fakeCloud: stored })
  }, [startParam, language, cloud] as const)
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

test('controls answer with a vibration in Telegram', async ({ page }) => {
  await fakeTelegram(page)
  await page.goto(`/salsa${LAUNCH}`)
  const haptics = () => page.evaluate(() => (window as unknown as { telegramCalls: string[] }).telegramCalls
    .filter((call) => call.startsWith('impact') || call === 'selection'))

  await page.getByRole('button', { name: 'Clave step 2', exact: true }).click()
  await expect.poll(haptics).toEqual(['impact light'])
  await page.getByRole('button', { name: '▶ Play' }).click()
  await expect.poll(haptics).toEqual(['impact light', 'impact medium'])
  await page.getByRole('combobox', { name: 'Pattern' }).selectOption('salsa-chachacha-2-3')
  await expect.poll(haptics).toEqual(['impact light', 'impact medium', 'selection'])
})

test('the first launch takes Telegram\'s language; the switcher still wins after that', async ({ page }) => {
  await fakeTelegram(page, undefined, 'ru')
  await page.goto(`/${LAUNCH}`)
  // (Switching keeps Telegram's launch hash, which its SDK reads.)
  await expect(page).toHaveURL(/\/ru(#|$)/)
  await expect(page.getByRole('link', { name: 'Сальса' })).toBeVisible()

  await page.getByRole('link', { name: 'en', exact: true }).click()
  await expect(page).toHaveURL(/:3000\/(#|$)/)
  await page.goto(`/${LAUNCH}`)
  await expect(page.getByRole('link', { name: 'Salsa' })).toBeVisible()
  await expect(page).toHaveURL(/:3000\/(#|$)/)
})

test('a genre link opens in Telegram\'s language', async ({ page }) => {
  await fakeTelegram(page, 'bachata', 'ru-RU')
  await page.goto(`/${LAUNCH}`)
  await expect(page).toHaveURL('/ru/bachata')
  await expect(page.getByRole('heading', { name: 'Бачата' })).toBeVisible()
})

test('in Telegram an edited pattern is kept in the user\'s cloud and opens on another device', async ({ page, browser }) => {
  await fakeTelegram(page)
  await page.goto(`/salsa${LAUNCH}`)
  await page.getByRole('combobox', { name: 'Pattern' }).selectOption('salsa-chachacha-2-3')
  await page.getByRole('button', { name: 'Clave step 1', exact: true }).click()
  const cloud = () => page.evaluate(() => (window as unknown as { fakeCloud: Record<string, string> }).fakeCloud)
  await expect.poll(async () => Object.keys(await cloud())).toEqual(['pattern-salsa'])

  // The same Telegram account on another device: nothing saved locally there.
  const other = await (await browser.newContext()).newPage()
  await fakeTelegram(other, undefined, undefined, await cloud())
  await other.goto(`/salsa${LAUNCH}`)
  await expect(other.getByRole('combobox', { name: 'Pattern' })).toHaveValue('salsa-chachacha-2-3')
  await expect(other.getByRole('button', { name: 'Clave step 1', exact: true })).toHaveAttribute('data-sound')

  // Back to the untouched preset: it leaves the cloud too.
  await other.getByRole('button', { name: 'Reset' }).click()
  await expect.poll(() => other.evaluate(() => (window as unknown as { fakeCloud: Record<string, string> }).fakeCloud))
    .toEqual({})
})

test('in Telegram, closing asks first while the beat plays', async ({ page }) => {
  await fakeTelegram(page)
  await page.goto(`/salsa${LAUNCH}`)
  const confirmations = () => page.evaluate(() => (window as unknown as { telegramCalls: string[] }).telegramCalls
    .filter((call) => call.startsWith('confirm close')))

  await page.getByRole('button', { name: '▶ Play' }).click()
  await expect.poll(confirmations).toEqual(['confirm close on'])
  await page.getByRole('button', { name: '■ Stop' }).click()
  await expect.poll(confirmations).toEqual(['confirm close on', 'confirm close off'])
})

test('in Telegram the home page offers a home screen shortcut until there is one', async ({ page }) => {
  await page.addInitScript(() => Object.assign(window, { fakeHomeScreen: 'missed' }))
  await fakeTelegram(page)
  await page.goto(`/${LAUNCH}`)
  const button = page.getByRole('button', { name: 'Add to home screen' })
  await button.click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { telegramCalls: string[] }).telegramCalls))
    .toContain('add to home screen')
  await expect(button).toBeHidden()
})

test('the home screen button is only there when Telegram can add one', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Salsa' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add to home screen' })).toHaveCount(0)

  await page.addInitScript(() => Object.assign(window, { fakeHomeScreen: 'added' }))
  await fakeTelegram(page)
  await page.goto(`/${LAUNCH}`)
  await expect(page.getByRole('link', { name: 'Salsa' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add to home screen' })).toHaveCount(0)
})
