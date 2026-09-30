'use client'

// Mouse (desktop) and gyroscope (phones) as one smoothed "sway" value in [-1, 1] on each axis.

export type Sway = { x: number; y: number }

type OrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export const hasGyro = () => typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches

/** iOS Safari only delivers orientation after a permission prompt started by a tap. */
export const gyroNeedsPermission = () =>
  hasGyro() && typeof (DeviceOrientationEvent as OrientationWithPermission).requestPermission === 'function'

export async function requestGyroPermission() {
  const req = (DeviceOrientationEvent as OrientationWithPermission).requestPermission
  if (!req) return true
  try {
    return (await req()) === 'granted'
  } catch {
    return false
  }
}

export function trackPointer(target: Sway) {
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    target.x = (e.clientX / window.innerWidth) * 2 - 1
    target.y = (e.clientY / window.innerHeight) * 2 - 1
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  return () => window.removeEventListener('pointermove', onMove)
}

export function trackGyro(target: Sway) {
  let base: { b: number; g: number } | null = null
  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return
    // Swap axes in landscape so "left/right" always means screen left/right.
    const angle = (screen.orientation?.angle ?? 0) % 180 !== 0
    let lr = angle ? e.beta : e.gamma
    let fb = angle ? e.gamma : e.beta
    if ((screen.orientation?.angle ?? 0) === 90) lr = -lr
    if ((screen.orientation?.angle ?? 0) === 270) fb = -fb
    if (!base) base = { b: fb, g: lr }
    // Re-centre slowly, so however the phone is held becomes neutral.
    base.b += (fb - base.b) * 0.01
    base.g += (lr - base.g) * 0.01
    target.x = Math.max(-1, Math.min(1, (lr - base.g) / 20))
    target.y = Math.max(-1, Math.min(1, (fb - base.b) / 20))
  }
  window.addEventListener('deviceorientation', onOrient)
  return () => {
    window.removeEventListener('deviceorientation', onOrient)
    target.x = target.y = 0
  }
}
