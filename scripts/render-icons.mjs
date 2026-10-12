// Renders scripts/app-icon.svg to the PNG icons the web app manifest and
// iOS use, and to favicon.ico, with the Playwright Chromium the e2e tests
// already need:
//   node scripts/render-icons.mjs
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const SIZES = { 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 }
const FAVICON_SIZES = [16, 32, 48]

/** An .ico holding PNG images, which every current browser reads. */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(pngs.length, 4)
  let offset = header.length
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i
    header.writeUInt8(size, entry)
    header.writeUInt8(size, entry + 1)
    header.writeUInt16LE(1, entry + 4) // colour planes
    header.writeUInt16LE(32, entry + 6) // bits per pixel
    header.writeUInt32LE(data.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...pngs.map(({ data }) => data)])
}

const svg = await readFile(new URL('app-icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const page = await browser.newPage()

async function render(size) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  return page.screenshot()
}

for (const [name, size] of Object.entries(SIZES)) {
  await writeFile(new URL(`../public/${name}`, import.meta.url), await render(size))
}
const favicons = []
for (const size of FAVICON_SIZES) favicons.push({ size, data: await render(size) })
await writeFile(new URL('../public/favicon.ico', import.meta.url), ico(favicons))
await browser.close()
