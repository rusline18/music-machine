// Renders the link-preview images (Open Graph / Twitter cards, 1200×630)
// shown when the site is shared in Telegram, WhatsApp, VK, X and so on,
// with the Playwright Chromium the e2e tests already need:
//   node scripts/render-og.mjs
// One image per page and language: public/og/<locale>-<page>.png.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')
const locales = {
  en: JSON.parse(await read('../i18n/locales/en.json')),
  ru: JSON.parse(await read('../i18n/locales/ru.json')),
}

// Same palette as tailwind.config.ts.
const COLORS = {
  bg: '#110E0D',
  muted: '#8A7E74',
  text: '#CFC4BA',
  bright: '#FBF7F2',
  off: '#29221F',
  gold: '#F4C552',
  salsa: '#FF6A3D',
  bachata: '#2FC6B4',
}

/** Son clave 3-2 over 16 cells (as on the home page); bachata's 4-beat pulse. */
const STRIPS = {
  salsa: [0, 3, 6, 10, 12],
  bachata: [0, 4, 8, 12],
}

async function fontFace(family, file) {
  const data = await readFile(new URL(`../node_modules/@fontsource-variable/${file}`, import.meta.url))
  return `@font-face{font-family:'${family}';font-weight:100 900;src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2')}`
}
const fonts = (await Promise.all([
  fontFace('Onest', 'onest/files/onest-latin-wght-normal.woff2'),
  fontFace('Onest', 'onest/files/onest-cyrillic-wght-normal.woff2'),
  fontFace('Onest', 'onest/files/onest-latin-ext-wght-normal.woff2'),
])).join('')

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

function strip(genre) {
  return Array.from({ length: 16 }, (_, cell) => {
    const color = cell === 0 ? COLORS.gold : STRIPS[genre].includes(cell) ? COLORS[genre] : COLORS.off
    return `<span style="background:${color};margin-left:${cell % 2 === 0 && cell > 0 ? 8 : 0}px"></span>`
  }).join('')
}

function chips(t, highlight) {
  return ['salsa', 'bachata'].map((id) => {
    const on = !highlight || highlight === id
    return `<span class="chip" style="background:${on ? COLORS[id] : COLORS.off};color:${on ? COLORS.bg : COLORS.muted}">${escape(t.genres[id].name)}</span>`
  }).join('')
}

/** `genre` is undefined for the home page. */
function html(t, genre) {
  const accent = COLORS[genre ?? 'salsa']
  const title = genre ? t.genres[genre].title : t.app.name
  const lines = genre
    ? [t.genres[genre].description]
    : [t.app.tagline.build, t.app.tagline.practice, t.app.tagline.dance.replace('{dance}', t.app.tagline.danceWord)]
  return `<!doctype html><meta charset="utf-8"><style>
    ${fonts}
    *{box-sizing:border-box;margin:0}
    body{width:1200px;height:630px;background:${COLORS.bg};font-family:Onest,sans-serif;color:${COLORS.bright};
      padding:72px 80px;display:flex;flex-direction:column;position:relative;overflow:hidden}
    .glow{position:absolute;right:-220px;top:-260px;width:760px;height:760px;border-radius:50%;
      background:radial-gradient(circle,${accent}55 0%,${accent}00 65%)}
    .strip{display:flex;gap:6px;width:440px;margin-bottom:40px}
    .strip span{flex:1;height:18px;border-radius:4px}
    h1{font-size:${genre ? 84 : 104}px;font-weight:800;line-height:1;letter-spacing:-0.035em;max-width:1000px}
    .lines{margin-top:36px;display:flex;flex-direction:column;gap:8px;max-width:960px}
    .lines p{font-size:34px;font-weight:600;letter-spacing:-0.01em;color:${COLORS.text};line-height:1.25}
    .lines p:last-child{color:${COLORS.bright};font-weight:800}
    .lines.desc p{font-size:30px;font-weight:500;color:${COLORS.text};line-height:1.35}
    .foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between}
    .chips{display:flex;gap:14px}
    .chip{font-size:30px;font-weight:800;padding:12px 28px;border-radius:999px;letter-spacing:-0.01em}
    .name{font-size:28px;font-weight:700;color:${COLORS.muted}}
  </style>
  <div class="glow"></div>
  <div class="strip">${strip(genre ?? 'salsa')}</div>
  <h1>${escape(title)}</h1>
  <div class="lines${genre ? ' desc' : ''}">${lines.map((l) => `<p>${escape(l)}</p>`).join('')}</div>
  <div class="foot"><div class="chips">${chips(t, genre)}</div>${genre ? `<span class="name">${escape(t.app.name)}</span>` : ''}</div>`
}

await mkdir(new URL('../public/og/', import.meta.url), { recursive: true })
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
for (const [code, t] of Object.entries(locales)) {
  for (const genre of [undefined, 'salsa', 'bachata']) {
    await page.setContent(html(t, genre))
    await page.evaluate(() => document.fonts.ready)
    await writeFile(new URL(`../public/og/${code}-${genre ?? 'home'}.png`, import.meta.url), await page.screenshot())
  }
}
await browser.close()
