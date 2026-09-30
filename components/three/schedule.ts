/*
 * When each 3D layer may be on screen, in GSAP master-timeline time (see components/Journey.tsx).
 * Kept free of three.js/DOM so tests/schedule.test.ts can check that nothing shows outside its scene.
 * A layer is hidden (`visible = false`) whenever `t` is outside its window.
 */

export type Window = readonly [start: number, end: number]

export const WINDOWS = {
  hero: [0, 2],
  /** Entrance doors (darwaza.jpg) and their glow: gone once the camera has walked through them. */
  doors: [1, 5.6],
  lobby: [1, 7.4],
  reception: [6.5, 9.5],
  key: [8.6, 11.7],
  /** Corridor photo, and door 512 which sits on the corridor's own end door. */
  corridor: [10.8, 15.4],
  room1: [14.8, 18.1],
  room2: [16.6, 20.4],
  room3: [19, 22.5],
  restaurant: [21.4, Infinity],
} as const satisfies Record<string, Window>

export type Layer = keyof typeof WINDOWS

export const inWindow = (layer: Layer, t: number) => t >= WINDOWS[layer][0] && t < WINDOWS[layer][1]

/**
 * Door 512 inside the corridor scene: a long slow walk while the door is still small, it opens in the
 * last part of the scene, then the camera goes through the doorway and room 1 fades in.
 */
export const DOOR512 = {
  /** Slow push down the corridor; the door grows from far away. */
  approach: [10.9, 13.4],
  /** Warm light appears in the crack just before opening. */
  light: [13.1, 13.5],
  /** Leaves swing open on their hinges. */
  open: [13.4, 14.4],
  /** Camera passes through the doorway. */
  through: [14.2, 15.3],
  /** Push amount (0 = rest, 1 = at the photo plane) at the end of the approach and after passing through. */
  pushApproach: 0.5,
  pushThrough: 0.8,
} as const

/**
 * The end door in corridor.jpg, in photo UV (0–1 from the top-left), measured from the image.
 * Its baked "$12" text was removed; the code's gold plate sits at `plate`.
 */
export const CORRIDOR_DOOR = {
  u0: 773 / 1672,
  u1: 900 / 1672,
  v0: 447 / 941,
  v1: 653 / 941,
  /** Plate position within the door (0–1 from the door's top-left). */
  plate: { x: 0.49, y: 0.25 },
} as const

/** Door centre in photo UV; the corridor push aims here so the door stays centred as it grows. */
export const corridorDoorCenter = (): [number, number] => [
  (CORRIDOR_DOOR.u0 + CORRIDOR_DOOR.u1) / 2,
  (CORRIDOR_DOOR.v0 + CORRIDOR_DOOR.v1) / 2,
]

/**
 * Fraction of the screen height the door fills for a given push, when the corridor photo covers the
 * view by height (true on phones and on 16:9 screens). `margin`/`overscan` match the photo material.
 */
export function doorScreenHeight(push: number, margin = 0.03, overscan = 1.04) {
  const doorOfPlane = (CORRIDOR_DOOR.v1 - CORRIDOR_DOOR.v0) / (1 - 2 * margin)
  return (doorOfPlane * overscan) / (1 - push)
}
