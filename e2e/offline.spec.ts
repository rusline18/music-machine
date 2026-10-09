import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'allow' })

test('works offline once visited', async ({ page, context }) => {
  await page.goto('/salsa')
  // Wait until the worker is in charge and has fetched every genre's
  // sounds: the cache has bachata's and stops growing.
  await page.evaluate(() => navigator.serviceWorker.ready)
  const cachedAudio = () => page.evaluate(async () => {
    const audio = (await caches.keys()).find((key) => key.startsWith('audio-'))
    return audio ? (await (await caches.open(audio)).keys()).map((request) => request.url) : []
  })
  let before: string[] = []
  await expect.poll(async () => {
    const now = await cachedAudio()
    const settled = now.length === before.length && now.some((url) => url.includes('/audio/bachata/'))
    before = now
    return settled
  }, { timeout: 20_000, intervals: [1000] }).toBe(true)

  await context.setOffline(true)
  await page.goto('/bachata')
  await expect(page.getByRole('heading', { name: 'Bachata' })).toBeVisible()
  await page.getByRole('button', { name: '▶ Play' }).click()
  await expect(page.getByRole('button', { name: '■ Stop' })).toBeVisible()
  await expect(page.getByText('Sounds that didn\'t load')).toHaveCount(0)

  await page.goto('/ru/salsa')
  await expect(page.getByRole('heading', { name: 'Сальса' })).toBeVisible()
})
