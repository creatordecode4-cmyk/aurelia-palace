import * as THREE from 'three'

export type DepthManifest = { images: Set<string>; small: Set<string> }

// Which photos have a depth map in public/depth (written by scripts/depth-manifest.mjs).
export async function loadDepthManifest(): Promise<DepthManifest> {
  try {
    const res = await fetch('/depth/manifest.json', { cache: 'no-cache' })
    if (!res.ok) throw new Error(String(res.status))
    const { images, small } = (await res.json()) as { images?: string[]; small?: string[] }
    return { images: new Set(images ?? []), small: new Set(small ?? []) }
  } catch {
    return { images: new Set(), small: new Set() }
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image()
    im.onload = () => resolve(im)
    im.onerror = reject
    im.src = src
  })
}

/**
 * Loads a depth map and prepares it for the displacement shader:
 * downscaled (low-res on mobile), smoothed, and dilated so near objects keep a
 * clean silhouette instead of dragging the background with them.
 */
export async function loadDepthTexture(name: string, width: number, small: boolean): Promise<THREE.Texture> {
  const im = await loadImage(`/depth/${name}-depth${small ? '-sm' : ''}.png`)
  const w = width
  const h = Math.max(1, Math.round((im.height / im.width) * width))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(im, 0, 0, w, h)

  const src = ctx.getImageData(0, 0, w, h)
  let a = new Float32Array(w * h)
  for (let i = 0; i < a.length; i++) a[i] = src.data[i * 4] / 255

  // Two passes of a 3×3 max filter (dilation), then two of a 3×3 box blur.
  const pass = (from: Float32Array, op: 'max' | 'blur') => {
    const to = new Float32Array(from.length)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let acc = 0
        let n = 0
        for (let dy = -1; dy <= 1; dy++) {
          const yy = Math.min(h - 1, Math.max(0, y + dy))
          for (let dx = -1; dx <= 1; dx++) {
            const xx = Math.min(w - 1, Math.max(0, x + dx))
            const v = from[yy * w + xx]
            if (op === 'max') acc = Math.max(acc, v)
            else acc += v
            n++
          }
        }
        to[y * w + x] = op === 'max' ? acc : acc / n
      }
    }
    return to
  }
  a = pass(pass(a, 'max'), 'max')
  a = pass(pass(a, 'blur'), 'blur')

  const out = ctx.createImageData(w, h)
  for (let i = 0; i < a.length; i++) {
    const v = Math.round(a[i] * 255)
    out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = v
    out.data[i * 4 + 3] = 255
  }
  ctx.putImageData(out, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

// Used when a photo has no depth map: flat mid-grey, so the shader displaces nothing.
export function flatDepthTexture() {
  const tex = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1)
  tex.needsUpdate = true
  return tex
}
