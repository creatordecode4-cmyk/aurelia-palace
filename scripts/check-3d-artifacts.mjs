// Visual regression check for the 3D door scenes.
//
//   npm run build && npm start          # in one terminal
//   npm run check:3d                    # in another (BASE_URL defaults to http://localhost:3000)
//
// For each door-opening moment, on a 360 px phone and a desktop viewport, it renders the frame twice
// (with and without the gold glow) and fails if:
//   • glow wash: the glow brightens the gap between the panels by more than GLOW_WASH_MAX (0–255 scale)
//   • streak:    a bright vertical band with almost no vertical detail (a stretched/blurred strip)
//                appears in the middle of the frame
// Screenshots are saved to .artifacts/3d-check/ for review.
// Needs Playwright's Chromium: `npx playwright install chromium` (once).
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.error('Missing playwright. Run: npm install && npx playwright install chromium')
  process.exit(1)
}

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = join(process.cwd(), '.artifacts', '3d-check')
const GLOW_WASH_MAX = 10
const STREAK_MIN_WIDTH = 0.015 // of frame width

const VIEWPORTS = [
  { name: 'phone', width: 360, height: 740 },
  { name: 'desktop', width: 1280, height: 720 },
]
// Timeline times (see the master timeline in components/Journey.tsx).
const MOMENTS = [
  { scene: 'darwaza', t: [3.2, 3.5, 3.9, 4.3] },
  { scene: 'door512', t: [14.1, 14.3, 14.6, 15.0] },
]

mkdirSync(OUT, { recursive: true })
// Headless Chromium has no GPU: allow SwiftShader and skip the site's GPU check with ?3d.
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })

async function openJourney(vp, debug) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 })
  await page.goto(`${BASE_URL}/?3d&debug3d=${debug}`)
  await page.waitForFunction(() => document.querySelector('.journey')?.classList.contains('is-3d'), null, { timeout: 60000 })
  const geo = await page.evaluate(() => ({
    pinEnd: document.querySelector('.pin-spacer').offsetHeight - innerHeight,
    duration: Number(document.querySelector('.journey').dataset.duration),
  }))
  return { page, ...geo }
}

async function shotAt(j, t) {
  await j.page.evaluate((y) => window.scrollTo(0, y), Math.round((t / j.duration) * j.pinEnd))
  await j.page.waitForTimeout(3000) // let the scrubbed timeline settle
  return j.page.screenshot()
}

// Decode a PNG in the page and return greyscale pixels of the central region (x 25–75 %, y 12–88 %).
async function luminance(page, png) {
  return page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d')
    g.drawImage(bmp, 0, 0)
    const x0 = Math.round(bmp.width * 0.25)
    const y0 = Math.round(bmp.height * 0.12)
    const w = Math.round(bmp.width * 0.5)
    const h = Math.round(bmp.height * 0.76)
    const d = g.getImageData(x0, y0, w, h).data
    const lum = new Array(w * h)
    for (let i = 0; i < w * h; i++) lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
    return { w, h, lum, full: bmp.width }
  }, png.toString('base64'))
}

function glowWash(a, b) {
  let sum = 0
  for (let i = 0; i < a.lum.length; i++) sum += Math.abs(a.lum[i] - b.lum[i])
  return sum / a.lum.length
}

// Longest run of columns that are brighter than typical but have almost no vertical detail.
function longestStreak({ w, h, lum, full }) {
  const L = new Array(w).fill(0)
  const V = new Array(w).fill(0)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      L[x] += lum[y * w + x]
      if (y > 0) V[x] += Math.abs(lum[y * w + x] - lum[(y - 1) * w + x])
    }
    L[x] /= h
    V[x] /= h - 1
  }
  const median = (arr) => [...arr].sort((p, q) => p - q)[Math.floor(arr.length / 2)]
  const mL = median(L)
  const mV = median(V)
  let best = 0
  let run = 0
  for (let x = 0; x < w; x++) {
    run = V[x] < mV * 0.35 && L[x] > mL * 1.1 ? run + 1 : 0
    best = Math.max(best, run)
  }
  return best / full
}

const failures = []
for (const vp of VIEWPORTS) {
  const lit = await openJourney(vp, 'nodust')
  const dark = await openJourney(vp, 'nodust,noglow')
  for (const { scene, t: times } of MOMENTS) {
    for (const t of times) {
      const [a, b] = [await shotAt(lit, t), await shotAt(dark, t)]
      writeFileSync(join(OUT, `${vp.name}-${scene}-t${t}.png`), a)
      const la = await luminance(lit.page, a)
      const lb = await luminance(lit.page, b)
      const wash = glowWash(la, lb)
      const streak = longestStreak(la)
      const ok = wash <= GLOW_WASH_MAX && streak < STREAK_MIN_WIDTH
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${vp.name.padEnd(7)} ${scene.padEnd(7)} t=${String(t).padEnd(4)} glow wash ${wash.toFixed(1).padStart(5)}  streak ${(streak * 100).toFixed(1)}%`)
      if (!ok) failures.push(`${vp.name} ${scene} t=${t}`)
    }
  }
  await lit.page.close()
  await dark.page.close()
}
await browser.close()

if (failures.length) {
  console.error(`\n${failures.length} frame(s) show a glow wash or stretched strip: ${failures.join(', ')}`)
  process.exit(1)
}
console.log(`\nNo door artifacts. Screenshots: ${OUT}`)
