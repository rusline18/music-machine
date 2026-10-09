// Renders scripts/app-icon.svg to the PNG icons the web app manifest and
// iOS use, with the Playwright Chromium the e2e tests already need:
//   node scripts/render-icons.mjs
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const SIZES = { 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 }

const svg = await readFile(new URL('app-icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const page = await browser.newPage()
for (const [name, size] of Object.entries(SIZES)) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname })
}
await browser.close()
