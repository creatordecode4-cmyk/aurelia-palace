import * as THREE from 'three'
import { createDepthMaterial, type DepthMaterial } from './depthMaterial'

/*
 * The 3D journey. The camera sits near the origin looking down −z; each scene ("station") is a group
 * that moves toward the camera as you scroll, which is the same as the camera dollying forward.
 * All timings are in the units of the GSAP master timeline in Journey.tsx, so captions and 3D stay in sync.
 */

export const FOV = 45

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const inOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
const easeIn = (x: number) => x * x
const lerp = (a: number, b: number, x: number) => a + (b - a) * x

// Focal points (0–1 from top-left) for portrait phones, matching the 2D version.
const MOBILE_FOCUS: Record<string, number> = { room1: 0.6, room2: 0.42, room3: 0.7 }

export type Assets = {
  photos: Record<string, THREE.Texture>
  depth: Record<string, THREE.Texture>
  hasDepth: Set<string>
}

export type Frame = {
  t: number
  intro: number
  sway: THREE.Vector2
  aspect: number
  mobile: boolean
}

type Photo = { mesh: THREE.Mesh; mat: DepthMaterial; aspect: number; name: string; slice: number }

function makePhoto(assets: Assets, name: string, order: number, slice = 0): Photo {
  const map = assets.photos[name]
  const has = assets.hasDepth.has(name)
  const mat = createDepthMaterial(map, assets.depth[name], has)
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
  mesh.renderOrder = order
  mesh.frustumCulled = false
  const img = map.image as { width: number; height: number }
  return { mesh, mat, aspect: img.width / img.height, name, slice }
}

// Size of the view at distance d.
function viewAt(d: number, aspect: number) {
  const h = 2 * d * Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  return { w: h * aspect, h }
}

// Plane size that covers the view at distance d (object-fit: cover), with a little overscan.
function coverAt(d: number, viewAspect: number, imgAspect: number, overscan = 1.04) {
  const v = viewAt(d, viewAspect)
  const w = Math.max(v.w, v.h * imgAspect) * overscan
  return { w, h: w / imgAspect, view: v }
}

/** A station: one photo, or a photo split into depth slices at different z. */
class Station {
  group = new THREE.Group()
  photos: Photo[] = []
  constructor(
    assets: Assets,
    public name: string,
    order: number,
    public fit: number,
    layered = false,
  ) {
    const slices = layered && assets.hasDepth.has(name) ? [0, 0.45, 0.72] : [0]
    slices.forEach((s, i) => {
      const p = makePhoto(assets, name, order + i * 0.1, s)
      if (s > 0) {
        p.mat.uniforms.uSlice.value.set(s, 0.07)
        p.mat.uniforms.uStrength.value = 0.6
      }
      this.photos.push(p)
      this.group.add(p.mesh)
    })
    this.group.visible = false
  }

  /** Lays the photo out to cover the view at `fit`; slices sit closer and smaller so they line up at rest. */
  layout(f: Frame, overscan = 1.04) {
    const base = this.photos[0]
    const { w, h, view } = coverAt(this.fit, f.aspect, base.aspect, overscan)
    let ox = 0
    const focus = MOBILE_FOCUS[this.name]
    if (f.mobile && focus !== undefined) ox = THREE.MathUtils.clamp((0.5 - focus) * w, -(w - view.w) / 2, (w - view.w) / 2)
    for (const p of this.photos) {
      // A slice at depth band s sits (s × 22%) closer to the camera, scaled so it projects identically.
      const k = 1 - p.slice * 0.22
      p.mesh.position.set(ox * k, 0, this.fit * (1 - k))
      p.mesh.scale.set(w * k, h * k, 1)
    }
    return { w, h, ox }
  }

  set(opacity: number, dolly: number, sway: THREE.Vector2, focus?: [number, number]) {
    this.group.visible = opacity > 0.001
    for (const p of this.photos) {
      const u = p.mat.uniforms
      u.uOpacity.value = opacity
      u.uDolly.value = dolly
      u.uShift.value.copy(sway)
      if (focus) u.uFocus.value.set(focus[0], 1 - focus[1])
    }
  }
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,236,170,1)')
  grad.addColorStop(0.35, 'rgba(235,190,100,0.6)')
  grad.addColorStop(1, 'rgba(201,162,75,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function plaqueTexture(text: string) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 110
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 110)
  grad.addColorStop(0, '#e6c97f')
  grad.addColorStop(1, '#9c7629')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 110)
  g.strokeStyle = '#5a3d10'
  g.lineWidth = 4
  g.strokeRect(6, 6, 244, 98)
  g.fillStyle = '#1f050b'
  g.font = '600 64px "Cormorant Garamond", Georgia, serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, 128, 60)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Carved double doors as boxes with real thickness, hinged at their outer edges, with gold light behind. */
class Doors {
  group = new THREE.Group()
  private hinges: THREE.Group[] = []
  private panels: THREE.Mesh[] = []
  private mats: THREE.Material[] = []
  private glow: THREE.Mesh
  private light = new THREE.PointLight('#ffc873', 0, 0, 0)
  private plaque?: THREE.Mesh
  private aspect: number

  constructor(
    assets: Assets,
    order: number,
    public fit: number,
    plaque?: string,
  ) {
    const tex = assets.photos.darwaza
    const img = tex.image as { width: number; height: number }
    this.aspect = img.width / img.height
    const wood = new THREE.MeshStandardMaterial({ color: '#4a2412', roughness: 0.55, metalness: 0.25, transparent: true })
    const back = new THREE.MeshStandardMaterial({ color: '#2a1008', roughness: 0.7, metalness: 0.1, transparent: true })
    this.mats.push(wood, back)

    for (const side of [-1, 1]) {
      const half = tex.clone()
      half.repeat.set(0.5, 1)
      half.offset.set(side < 0 ? 0 : 0.5, 0)
      half.needsUpdate = true
      const face = new THREE.MeshBasicMaterial({ map: half, transparent: true })
      this.mats.push(face)
      // Box faces: +x, −x, +y, −y, +z (front, carved photo), −z (back).
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [wood, wood, wood, wood, face, back])
      panel.renderOrder = order
      const hinge = new THREE.Group()
      hinge.add(panel)
      this.hinges.push(hinge)
      this.panels.push(panel)
      this.group.add(hinge)
    }

    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }),
    )
    this.glow.renderOrder = order - 0.5
    this.group.add(this.glow, this.light)

    if (plaque) {
      this.plaque = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: plaqueTexture(plaque), transparent: true }))
      this.plaque.renderOrder = order + 0.2
      this.group.add(this.plaque)
    }
    this.group.visible = false
  }

  layout(f: Frame) {
    const { w, h } = coverAt(this.fit, f.aspect, this.aspect)
    const thick = h * 0.045
    this.hinges.forEach((hinge, i) => {
      const side = i === 0 ? -1 : 1
      hinge.position.set((side * w) / 2, 0, -thick / 2)
      this.panels[i].position.set((-side * w) / 4, 0, 0)
      this.panels[i].scale.set(w / 2, h, thick)
    })
    this.glow.position.set(0, 0, -thick * 2)
    this.light.position.set(0, 0, -h * 0.4)
    if (this.plaque) {
      const pw = viewAt(this.fit, f.aspect).w * (f.mobile ? 0.34 : 0.14)
      this.plaque.scale.set(pw, pw * 0.43, 1)
      this.plaque.position.set(0, h * 0.3, 0.02)
    }
    return { w, h }
  }

  /** open: 0 closed → 1 fully swung in. light: 0–1 gold glow between the doors. */
  set(open: number, light: number, opacity: number, f: Frame) {
    this.group.visible = opacity > 0.001
    const angle = open * 1.85
    // Positive rotation swings the left panel's free edge away from the camera (inward); mirrored on the right.
    this.hinges[0].rotation.y = angle
    this.hinges[1].rotation.y = -angle
    for (const m of this.mats) m.opacity = opacity
    const g = this.glow.material as THREE.MeshBasicMaterial
    const v = viewAt(this.fit, f.aspect)
    this.glow.scale.set(v.w * (0.1 + 0.9 * light), v.h * 1.1, 1)
    g.opacity = light * opacity
    this.light.intensity = light * 3
    if (this.plaque) (this.plaque.material as THREE.MeshBasicMaterial).opacity = opacity * (1 - ramp(open, 0, 0.08))
  }
}

export function buildWorld(assets: Assets) {
  const root = new THREE.Group()
  root.add(new THREE.AmbientLight('#ffe2b8', 1.3))

  // Render order follows the DOM stacking of the 2D version.
  const lobby = new Station(assets, 'lobby', 1, 7, true)
  const doors = new Doors(assets, 2, 6)
  const hero = new Station(assets, 'bahar', 3, 5)
  const reception = new Station(assets, 'reception', 4, 5.6)
  const key = new Station(assets, 'key', 5, 5)
  const corridor = new Station(assets, 'corridor', 6, 5, true)
  const room1 = new Station(assets, 'room1', 7, 6.5)
  const door512 = new Doors(assets, 8, 5, '512')
  const room2 = new Station(assets, 'room2', 9, 5.6)
  const room3 = new Station(assets, 'room3', 10, 5.6)
  const restaurant = new Station(assets, 'restaurant', 11, 6)
  for (const s of [lobby, doors, hero, reception, key, corridor, room1, door512, room2, room3, restaurant]) root.add(s.group)

  const sway = new THREE.Vector2()

  /** Moves the group along the camera ray through a target point on its photo (a true push-in toward it). */
  const pushToward = (s: Station, f: Frame, target: [number, number], amount: number) => {
    const { w, h, ox } = s.layout(f)
    const tx = (target[0] - 0.5) * w + ox
    const ty = (0.5 - target[1]) * h
    s.group.position.set(-amount * tx, -amount * ty, -s.fit * (1 - amount))
  }

  // Horizontal camera pan between rooms, with a slight turn so the rooms feel like spaces, not slides.
  const pan = (s: Station, f: Frame, enter: number, exit: number, z: number) => {
    s.layout(f, 1.14)
    const vw = viewAt(-z, f.aspect).w
    s.group.position.set(vw * (1 - inOut(enter)) - vw * 0.3 * inOut(exit), 0, z)
    s.group.rotation.y = -0.32 * (1 - inOut(enter)) + 0.22 * inOut(exit)
  }

  function update(f: Frame) {
    const { t, mobile } = f
    const k = mobile ? 0.75 : 1
    sway.copy(f.sway).multiplyScalar(mobile ? 0.014 : 0.018)

    // 1 · Hero: push toward the palace; slow settle after the preloader.
    hero.layout(f)
    hero.group.position.set(0, 0, lerp(-5, -3.1, inOut(ramp(t, 0, 2)) * k))
    hero.group.scale.setScalar(1 + 0.15 * (1 - f.intro))
    hero.set(1 - ramp(t, 1.2, 2.0), 0.3 * ramp(t, 0, 2), sway)

    // 2 · Doors: approach, gold light, swing open on hinges, then walk through the frame.
    doors.layout(f)
    const through = easeIn(ramp(t, 4.6, 5.6))
    doors.group.position.z = lerp(-6, -5, easeOut(ramp(t, 1, 2.8))) + through * 10
    doors.set(inOut(ramp(t, 3.1, 4.8)), ramp(t, 2.8, 3.5) * (1 - ramp(t, 4.1, 5)), t < 5.6 ? 1 : 0, f)

    // 3 · Lobby (depth slices): revealed behind the doors, then the camera walks in.
    lobby.layout(f)
    lobby.group.position.z = lerp(-7, -6, inOut(ramp(t, 2.9, 4.8))) + 2 * k * inOut(ramp(t, 4.8, 7.4))
    lobby.set(t >= 1 && t < 7.4 ? 1 : 0, 0.25 * ramp(t, 4.8, 7.4), sway)

    // 4 · Reception, then a macro push onto the key.
    reception.layout(f)
    reception.group.position.z = lerp(-5.6, -4.4, ramp(t, 6.5, 9.4))
    reception.set(t < 9.5 ? ramp(t, 6.5, 7.3) : 0, 0.2 * ramp(t, 6.5, 9.4), sway)

    const keyTarget: [number, number] = [0.56, 0.7]
    pushToward(key, f, keyTarget, (mobile ? 0.36 : 0.5) * inOut(ramp(t, 8.6, 11)))
    key.set(t < 11.7 ? ramp(t, 8.6, 9.3) : 0, 0.35 * ramp(t, 8.6, 11), sway, keyTarget)

    // 5 · Corridor (depth slices): push down the gallery; door 512 grows out of the dark and opens.
    const corridorTarget: [number, number] = [0.5, 0.58]
    pushToward(corridor, f, corridorTarget, (mobile ? 0.42 : 0.55) * easeIn(ramp(t, 10.9, 13.6)))
    corridor.set(t < 14 ? ramp(t, 10.8, 11.5) : 0, 0.3 * ramp(t, 10.9, 13.6), sway, corridorTarget)

    door512.layout(f)
    const through512 = easeIn(ramp(t, 15, 15.8))
    door512.group.position.z = lerp(-12, -5, easeOut(ramp(t, 12.6, 13.8))) + through512 * 9
    door512.set(inOut(ramp(t, 14, 15.4)), ramp(t, 13.8, 14.3) * (1 - ramp(t, 14.9, 15.5)), t < 15.8 ? ramp(t, 12.6, 13.1) : 0, f)

    // 6 · Room tour.
    const r1z = lerp(-6.5, -5, inOut(ramp(t, 13.9, 16.6)))
    pan(room1, f, 1, ramp(t, 16.6, 17.9), r1z)
    room1.set(t >= 13.8 && t < 18.1 ? 1 : 0, 0.2 * ramp(t, 13.9, 16.6), sway)

    pan(room2, f, ramp(t, 16.6, 17.9), ramp(t, 19, 20.3), lerp(-5.6, -5, ramp(t, 16.6, 19)))
    room2.set(t >= 16.6 && t < 20.4 ? 1 : 0, 0.15 * ramp(t, 16.6, 19), sway)

    pan(room3, f, ramp(t, 19, 20.3), 0, lerp(-5.6, -5, ramp(t, 19, 21.4)))
    room3.set(t >= 19 && t < 22.5 ? 1 : 0, 0.15 * ramp(t, 19, 21.4), sway)

    // 7 · Restaurant.
    restaurant.layout(f)
    restaurant.group.position.z = lerp(-6, -4.6, ramp(t, 21.4, 24.4))
    restaurant.set(ramp(t, 21.4, 22.3), 0.2 * ramp(t, 21.4, 24.4), sway)
  }

  /** Forward distance travelled so far; drives the dust so it streams past the camera. */
  const travel = (t: number) => t * 1.1

  return { root, update, travel }
}
