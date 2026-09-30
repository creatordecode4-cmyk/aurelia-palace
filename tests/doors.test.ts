// Guards against the "blurred cream strip between the opening doors" regression.
// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DARWAZA_SLIT, GLOW_MAX, glowOpacity, glowSize, panelSpans } from '../components/three/doorLayout.ts'
import { MARGIN, MAX_SHIFT } from '../components/three/depthMaterial.ts'

test('door panels never include the lit gap painted into darwaza.jpg', () => {
  const { left, right } = panelSpans(1)
  const [a, b] = DARWAZA_SLIT
  assert.ok(left.u0 === 0 && left.u1 <= a, 'left panel ends before the slit')
  assert.ok(right.u0 >= b && right.u1 === 1, 'right panel starts after the slit')
})

test('panels keep the photo proportions (no horizontal stretch)', () => {
  for (const w of [1, 3.7, 12]) {
    const { left, right } = panelSpans(w)
    assert.ok(Math.abs(left.width - (left.u1 - left.u0) * w) < 1e-9)
    assert.ok(Math.abs(right.width - (right.u1 - right.u0) * w) < 1e-9)
    assert.ok(left.width + right.width < w, 'a real crack stays between the panels')
  }
})

test('the glow is always round, on portrait phones and wide desktops alike', () => {
  for (const [vw, vh] of [[1.9, 4.1], [7.4, 4.1], [4, 4]]) {
    for (const light of [0, 0.05, 0.3, 1]) {
      const { w, h } = glowSize(vw, vh, light)
      assert.ok(w / h > 0.8 && w / h < 1.25, `glow ${w.toFixed(2)}×${h.toFixed(2)} at light ${light} is strip-shaped`)
    }
  }
})

test('the glow fades as the doors open, so the room behind is never washed out', () => {
  assert.ok(glowOpacity(1, 0) <= GLOW_MAX)
  assert.ok(GLOW_MAX <= 0.25, 'a warm tint, not a wash')
  assert.equal(glowOpacity(1, 0.3), 0)
  assert.equal(glowOpacity(1, 1), 0)
  let prev = Infinity
  for (let open = 0; open <= 1; open += 0.05) {
    const o = glowOpacity(1, open)
    assert.ok(o <= prev + 1e-12, 'glow never brightens while opening')
    prev = o
  }
})

test('depth parallax can never sample past the photo edge', () => {
  assert.ok(MAX_SHIFT < MARGIN, `MAX_SHIFT ${MAX_SHIFT} must stay below MARGIN ${MARGIN}`)
})
