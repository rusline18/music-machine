// Writes the Telegram Mini App loading-screen icons from the app icon's
// shapes: BotFather takes an SVG holding a single <path>, so the ring's
// stroked arcs and the rounded Play triangle are traced as filled outlines
// and joined into one path, with no background (Telegram draws its own):
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
const at = (r, deg) => {
  const a = (deg * Math.PI) / 180
  return [n(C + r * Math.cos(a)), n(C + r * Math.sin(a))]
}

/** A stroked arc with round caps, as a closed filled outline. */
function arc(from, to, width) {
  const h = width / 2
  const [o0, o1, i1, i0] = [at(R + h, from), at(R + h, to), at(R - h, to), at(R - h, from)]
  return `M${o0}A${R + h} ${R + h} 0 0 1 ${o1}A${h} ${h} 0 0 1 ${i1}`
    + `A${R - h} ${R - h} 0 0 0 ${i0}A${h} ${h} 0 0 1 ${o0}Z`
}

/** A triangle grown by r with rounded corners (a round-joined stroke). */
function roundedTriangle(points, r) {
  let d = ''
  points.forEach(([x, y], i) => {
    const [px, py] = points[(i + points.length - 1) % points.length]
    const [nx, ny] = points[(i + 1) % points.length]
    // Outward normals of the edges into and out of this corner (clockwise on screen).
    const normal = (ax, ay, bx, by) => {
      const len = Math.hypot(bx - ax, by - ay)
      return [(by - ay) / len, -(bx - ax) / len]
    }
    const [inX, inY] = normal(px, py, x, y)
    const [outX, outY] = normal(x, y, nx, ny)
    const start = [n(x + inX * r), n(y + inY * r)]
    const end = [n(x + outX * r), n(y + outY * r)]
    d += `${i ? 'L' : 'M'}${start}A${r} ${r} 0 0 1 ${end}`
  })
  return `${d}Z`
}

// Eight counts clockwise from the top; count 1 starts just right of 12 o'clock.
const counts = Array.from({ length: 8 }, (_, i) => {
  const from = -90 + i * 45 + GAP / 2
  return arc(from, from + 45 - GAP, i % 4 === 0 ? THICK : THIN)
})
const d = [...counts, roundedTriangle(PLAY, PLAY_ROUND)].join('')

for (const [mode, fill] of Object.entries(COLOURS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">`
    + `<path fill="${fill}" d="${d}"/></svg>\n`
  await writeFile(new URL(`loading-icon-${mode}.svg`, import.meta.url), svg)
}
