/*
 * Pure geometry for the 3D doors, kept free of three.js/DOM so it can be unit-tested
 * (tests/doors.test.ts) and reused by the visual check.
 */

/**
 * Horizontal span (0–1) of the lit gap already painted between the two doors in darwaza.jpg,
 * measured from column brightness. Panel textures must stay outside it; otherwise half of that
 * lobby view sticks to each panel's inner edge and swings with it.
 */
export const DARWAZA_SLIT: readonly [number, number] = [0.466, 0.557]

export type PanelSpan = { u0: number; u1: number; width: number }

/**
 * Texture span and width of each panel for a door of total width `w`. Panels keep the photo's own
 * proportions (no stretching), so the closed doors stand slightly ajar exactly as in the photo.
 */
export function panelSpans(w: number): { left: PanelSpan; right: PanelSpan } {
  const [a, b] = DARWAZA_SLIT
  return {
    left: { u0: 0, u1: a, width: a * w },
    right: { u0: b, u1: 1, width: (1 - b) * w },
  }
}

/**
 * Size of the gold glow behind the doors: always round (never a vertical strip), sized from the
 * smaller side of the view so it stays soft on portrait phones.
 */
export function glowSize(viewW: number, viewH: number, light: number) {
  const d = Math.min(viewW, viewH) * (1.1 + 0.5 * light)
  return { w: d, h: d }
}

/** Peak glow brightness. It fades as soon as the doors start opening, so the room behind is never washed out. */
export const GLOW_MAX = 0.45

export function glowOpacity(light: number, open: number) {
  const fade = 1 - smooth(0.05, 0.45, open)
  return GLOW_MAX * light * fade
}

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
