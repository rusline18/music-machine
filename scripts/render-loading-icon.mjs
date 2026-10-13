// Writes the Telegram Mini App loading-screen icons from the app icon's
// shapes: BotFather takes an SVG holding a single <path>, so the ring's
// stroked arcs and the rounded Play triangle are traced as filled outlines
// and joined into one path, with no background (Telegram draws its own).
// Telegram's parser is stricter than a browser's, so the path uses only
// absolute M, L, C and Z (arcs become cubic Béziers).
//   node scripts/render-loading-icon.mjs
import { writeFile } from 'node:fs/promises'

const C = 256 // centre
const R = 180 // ring radius
const THIN = 24
const THICK = 36.8 // counts 1 and 5
const GAP = 10.3 // degrees between neighbouring counts, as in app-icon.svg
const PLAY = [[236.8, 214.4], [300.8, 256], [236.8, 297.6]]
const PLAY_ROUND = 5.6 // half the Play stroke width

const COLOURS = { light: '#110E0D', dark: '#F4C552' }

const n = (v) => +v.toFixed(2)
const rad = (deg) => (deg * Math.PI) / 180
const on = (cx, cy, r, deg) => [n(cx + r * Math.cos(rad(deg))), n(cy + r * Math.sin(rad(deg)))]

/** Cubic Béziers along a circle from one angle to another (screen degrees, clockwise when increasing). */
function arcTo(cx, cy, r, from, to) {
  const pieces = Math.ceil(Math.abs(to - from) / 90)
  const step = (to - from) / pieces
  const k = (4 / 3) * Math.tan(rad(step) / 4) * r
  let d = ''
  for (let i = 0; i < pieces; i++) {
    const a0 = from + i * step
    const a1 = a0 + step
    const [x0, y0] = [cx + r * Math.cos(rad(a0)), cy + r * Math.sin(rad(a0))]
    const [x1, y1] = [cx + r * Math.cos(rad(a1)), cy + r * Math.sin(rad(a1))]
    const c1 = [n(x0 - k * Math.sin(rad(a0))), n(y0 + k * Math.cos(rad(a0)))]
    const c2 = [n(x1 + k * Math.sin(rad(a1))), n(y1 - k * Math.cos(rad(a1)))]
    d += `C${c1} ${c2} ${on(cx, cy, r, a1)}`
  }
  return d
}

/** A stroked arc with round caps, as a closed filled outline. */
function arc(from, to, width) {
  const h = width / 2
  const [ex, ey] = on(C, C, R, to)
  const [sx, sy] = on(C, C, R, from)
  return `M${on(C, C, R + h, from)}`
    + arcTo(C, C, R + h, from, to)
    + arcTo(ex, ey, h, to, to + 180)
    + arcTo(C, C, R - h, to, from)
    + arcTo(sx, sy, h, from + 180, from + 360)
    + 'Z'
}

/** A triangle grown by r with rounded corners (a round-joined stroke). */
function roundedTriangle(points, r) {
  // Outward normal of an edge, as an angle; the points run clockwise on screen.
  const normal = ([ax, ay], [bx, by]) => (Math.atan2(-(bx - ax), by - ay) * 180) / Math.PI
  let d = ''
  points.forEach(([x, y], i) => {
    const prev = points[(i + points.length - 1) % points.length]
    const next = points[(i + 1) % points.length]
    const into = normal(prev, [x, y])
    let out = normal([x, y], next)
    while (out < into) out += 360
    d += `${i ? 'L' : 'M'}${on(x, y, r, into)}${arcTo(x, y, r, into, out)}`
  })
  return `${d}Z`
}

// Eight counts clockwise from the top; count 1 starts just right of 12 o'clock.
const counts = Array.from({ length: 8 }, (_, i) => {
  const from = -90 + i * 45 + GAP / 2
  return arc(from, from + 45 - GAP, i % 4 === 0 ? THICK : THIN)
})
// Coordinates separated by spaces only, the most widely parsed form.
const d = [...counts, roundedTriangle(PLAY, PLAY_ROUND)].join('').replaceAll(',', ' ')

for (const [mode, fill] of Object.entries(COLOURS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="${d}" fill="${fill}"/></svg>\n`
  await writeFile(new URL(`loading-icon-${mode}.svg`, import.meta.url), svg)
}
