import * as THREE from 'three'
import { createDepthMaterial, type DepthMaterial } from './depthMaterial'
import { glowOpacity, glowSize, panelSpans } from './doorLayout'
import { CORRIDOR_DOOR, DOOR512, corridorDoorCenter, inWindow, type Layer } from './schedule'
import { MARGIN } from './depthMaterial'

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

/**
 * Debug switches from the URL (`?3d&debug3d=noglow,nolight,nodepth,nopanels,nodust`), used to isolate layers
 * when checking for visual artifacts. They never change anything unless present.
 */
export type Debug = Set<string>

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
  // Gaussian-like falloff that reaches zero well inside the square, so no edge or corner ever shows.
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 62)
  for (let i = 0; i <= 8; i++) {
    const r = i / 8
    const a = Math.exp(-r * r * 4.5) * (1 - r)
    grad.addColorStop(r, `rgba(255,${Math.round(214 + 22 * (1 - r))},${Math.round(140 + 30 * (1 - r))},${a.toFixed(3)})`)
  }
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

/** The entrance: carved double doors (darwaza.jpg) as boxes with real thickness, hinged at their outer edges. */
class Doors {
  group = new THREE.Group()
  private hinges: THREE.Group[] = []
  private panels: THREE.Mesh[] = []
  private mats: THREE.Material[] = []
  private glow: THREE.Mesh
  private light = new THREE.PointLight('#ffc873', 0, 0, 0)
  private aspect: number

  constructor(
    assets: Assets,
    order: number,
    public fit: number,
    private debug: Debug,
  ) {
    const tex = assets.photos.darwaza
    const img = tex.image as { width: number; height: number }
    this.aspect = img.width / img.height
    const wood = new THREE.MeshStandardMaterial({ color: '#4a2412', roughness: 0.55, metalness: 0.25, transparent: true })
    const back = new THREE.MeshStandardMaterial({ color: '#2a1008', roughness: 0.7, metalness: 0.1, transparent: true })
    this.mats.push(wood, back)

    const spans = panelSpans(1)
    for (const side of [-1, 1]) {
      // Each panel shows only its own door from the photo, never the lit gap between them.
      const span = side < 0 ? spans.left : spans.right
      const half = tex.clone()
      half.repeat.set(span.u1 - span.u0, 1)
      half.offset.set(span.u0, 0)
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
    this.group.visible = false
  }

  layout(f: Frame) {
    const { w, h } = coverAt(this.fit, f.aspect, this.aspect)
    const thick = h * 0.045
    const spans = panelSpans(w)
    this.hinges.forEach((hinge, i) => {
      const side = i === 0 ? -1 : 1
      const width = (i === 0 ? spans.left : spans.right).width
      hinge.position.set((side * w) / 2, 0, -thick / 2)
      this.panels[i].position.set((-side * width) / 2, 0, 0)
      this.panels[i].scale.set(width, h, thick)
    })
    // The crack between the panels is centred on the photo's own gap.
    const gapCenter = (spans.left.width + (w - spans.right.width)) / 2 - w / 2
    this.glow.position.set(gapCenter, 0, -thick * 2)
    this.light.position.set(gapCenter, 0, -h * 0.4)
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
    const size = glowSize(v.w, v.h, light)
    this.glow.scale.set(size.w, size.h, 1)
    g.opacity = this.debug.has('noglow') ? 0 : glowOpacity(light, open) * opacity
    this.light.intensity = this.debug.has('nolight') ? 0 : light * 3
    for (const h of this.hinges) h.visible = !this.debug.has('nopanels')
  }
}

/**
 * Door 512: the corridor photo's own end door, rebuilt as two hinged leaves (door512.jpg) placed exactly
 * over it on the corridor plane. It is part of the corridor group, so it starts small at the far end and
 * grows as the camera walks down the corridor. Behind the leaves a "portal" shows room 1, and one gold
 * "512" plate covers the spot where the photo's text was.
 */
class Door512 {
  group = new THREE.Group()
  private hinges: THREE.Group[] = []
  private panels: THREE.Mesh[] = []
  private mats: THREE.Material[] = []
  private portal: THREE.Mesh
  private glow: THREE.Mesh
  private plate: THREE.Mesh
  /** Door size in plane units after the last layout (for the on-screen size check). */
  size = { w: 0, h: 0 }

  constructor(
    assets: Assets,
    order: number,
    private debug: Debug,
  ) {
    const tex = assets.photos.door512
    const wood = new THREE.MeshStandardMaterial({ color: '#3a1a0c', roughness: 0.6, metalness: 0.2, transparent: true })
    this.mats.push(wood)
    for (const side of [-1, 1]) {
      const leaf = tex.clone()
      leaf.repeat.set(0.5, 1)
      leaf.offset.set(side < 0 ? 0 : 0.5, 0)
      leaf.needsUpdate = true
      const face = new THREE.MeshBasicMaterial({ map: leaf, transparent: true })
      this.mats.push(face)
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [wood, wood, wood, wood, face, wood])
      panel.renderOrder = order + 0.4
      const hinge = new THREE.Group()
      hinge.add(panel)
      this.hinges.push(hinge)
      this.panels.push(panel)
      this.group.add(hinge)
    }

    // Room 1, cropped to the doorway's proportions around the bed, seen through the open door.
    const room = assets.photos.room1.clone()
    const roomImg = room.image as { width: number; height: number }
    const doorAspect = ((CORRIDOR_DOOR.u1 - CORRIDOR_DOOR.u0) * 1672) / ((CORRIDOR_DOOR.v1 - CORRIDOR_DOOR.v0) * 941)
    const cropW = doorAspect / (roomImg.width / roomImg.height)
    room.repeat.set(cropW, 1)
    room.offset.set(Math.min(1 - cropW, Math.max(0, 0.58 - cropW / 2)), 0)
    room.needsUpdate = true
    const portalMat = new THREE.MeshBasicMaterial({ map: room, transparent: true, depthTest: false, depthWrite: false })
    this.mats.push(portalMat)
    this.portal = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), portalMat)
    this.portal.renderOrder = order + 0.3

    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }),
    )
    this.glow.renderOrder = order + 0.35

    const plateMat = new THREE.MeshBasicMaterial({ map: plaqueTexture('512'), transparent: true })
    this.mats.push(plateMat)
    this.plate = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), plateMat)
    this.plate.renderOrder = order + 0.45
    this.group.add(this.portal, this.glow, this.plate)
    this.group.visible = false
  }

  /** Places the door over the corridor photo's door, given the corridor base plane size (w × h). */
  layout(w: number, h: number) {
    // Photo UV → plane coordinates (the photo material samples an inset window of width 1 − 2·MARGIN).
    const px = (u: number) => ((u - MARGIN) / (1 - 2 * MARGIN) - 0.5) * w
    const py = (v: number) => (0.5 - (v - MARGIN) / (1 - 2 * MARGIN)) * h
    const x0 = px(CORRIDOR_DOOR.u0)
    const x1 = px(CORRIDOR_DOOR.u1)
    const yTop = py(CORRIDOR_DOOR.v0)
    const yBot = py(CORRIDOR_DOOR.v1)
    const dw = x1 - x0
    const dh = yTop - yBot
    const cy = (yTop + yBot) / 2
    const thick = dh * 0.04
    this.size = { w: dw, h: dh }
    this.hinges.forEach((hinge, i) => {
      const side = i === 0 ? -1 : 1
      hinge.position.set(side < 0 ? x0 : x1, cy, thick / 2 + 0.002)
      this.panels[i].position.set((-side * dw) / 4, 0, 0)
      this.panels[i].scale.set(dw / 2, dh, thick)
    })
    this.portal.position.set((x0 + x1) / 2, cy, 0.001)
    this.portal.scale.set(dw, dh, 1)
    this.glow.position.set((x0 + x1) / 2, cy, 0.0015)
    const pw = dw * 0.3
    this.plate.scale.set(pw, pw * 0.43, 1)
    this.plate.position.set(x0 + CORRIDOR_DOOR.plate.x * dw, yTop - CORRIDOR_DOOR.plate.y * dh, thick + 0.004)
  }

  set(open: number, light: number, opacity: number) {
    this.group.visible = opacity > 0.001
    const angle = open * 1.85
    this.hinges[0].rotation.y = angle
    this.hinges[1].rotation.y = -angle
    for (const m of this.mats) m.opacity = opacity
    // The plate rides on the seam, so it fades as soon as the leaves part.
    ;(this.plate.material as THREE.MeshBasicMaterial).opacity = opacity * (1 - ramp(open, 0, 0.08))
    const size = glowSize(this.size.w, this.size.h, light)
    this.glow.scale.set(size.w, size.h, 1)
    ;(this.glow.material as THREE.MeshBasicMaterial).opacity = this.debug.has('noglow') ? 0 : glowOpacity(light, open) * opacity
    for (const h of this.hinges) h.visible = !this.debug.has('nopanels')
  }
}

export type WorldStats = {
  /** Layers currently rendered. */
  visible: string[]
  /** Door 512: how far open (0–1) and what fraction of the screen height it fills. */
  door512: { open: number; screenHeight: number }
}

export function buildWorld(assets: Assets, debug: Debug = new Set()) {
  const root = new THREE.Group()
  root.add(new THREE.AmbientLight('#ffe2b8', 1.3))

  // Render order follows the DOM stacking of the 2D version.
  const lobby = new Station(assets, 'lobby', 1, 7, true)
  const doors = new Doors(assets, 2, 6, debug)
  const hero = new Station(assets, 'bahar', 3, 5)
  const reception = new Station(assets, 'reception', 4, 5.6)
  const key = new Station(assets, 'key', 5, 5)
  const corridor = new Station(assets, 'corridor', 6, 5, true)
  // The door is the farthest thing in the corridor (depth ≈ 0): pin the parallax there, so the painted
  // door frame never slides out from under the 3D door.
  for (const p of corridor.photos) p.mat.uniforms.uFocusDepth.value = 0
  const door512 = new Door512(assets, 6, debug)
  corridor.group.add(door512.group)
  const room1 = new Station(assets, 'room1', 7, 6.5)
  const room2 = new Station(assets, 'room2', 9, 5.6)
  const room3 = new Station(assets, 'room3', 10, 5.6)
  const restaurant = new Station(assets, 'restaurant', 11, 6)
  const layers: Record<Layer, { group: THREE.Group }> = { hero, doors, lobby, reception, key, corridor, room1, room2, room3, restaurant }
  for (const s of Object.values(layers)) root.add(s.group)
  const stats: WorldStats = { visible: [], door512: { open: 0, screenHeight: 0 } }
  // Opacity for a layer, forced to 0 outside its scene window.
  const within = (layer: Layer, t: number, opacity: number) => (inWindow(layer, t) ? opacity : 0)

  const sway = new THREE.Vector2()

  /** Moves the group along the camera ray through a target point on its photo (a true push-in toward it). */
  const pushToward = (s: Station, f: Frame, target: [number, number], amount: number) => {
    const { w, h, ox } = s.layout(f)
    const tx = (target[0] - 0.5) * w + ox
    const ty = (0.5 - target[1]) * h
    s.group.position.set(-amount * tx, -amount * ty, -s.fit * (1 - amount))
    return { w, h }
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
    hero.set(within('hero', t, 1 - ramp(t, 1.2, 2.0)), 0.3 * ramp(t, 0, 2), sway)

    // 2 · Doors: approach, gold light, swing open on hinges, then walk through the frame.
    doors.layout(f)
    const through = easeIn(ramp(t, 4.6, 5.6))
    doors.group.position.z = lerp(-6, -5, easeOut(ramp(t, 1, 2.8))) + through * 10
    doors.set(inOut(ramp(t, 3.1, 4.8)), ramp(t, 2.8, 3.5) * (1 - ramp(t, 4.1, 5)), within('doors', t, 1), f)

    // 3 · Lobby (depth slices): revealed behind the doors, then the camera walks in.
    lobby.layout(f)
    lobby.group.position.z = lerp(-7, -6, inOut(ramp(t, 2.9, 4.8))) + 2 * k * inOut(ramp(t, 4.8, 7.4))
    lobby.set(within('lobby', t, 1), 0.25 * ramp(t, 4.8, 7.4), sway)

    // 4 · Reception, then a macro push onto the key.
    reception.layout(f)
    reception.group.position.z = lerp(-5.6, -4.4, ramp(t, 6.5, 9.4))
    reception.set(within('reception', t, ramp(t, 6.5, 7.3)), 0.2 * ramp(t, 6.5, 9.4), sway)

    const keyTarget: [number, number] = [0.56, 0.7]
    pushToward(key, f, keyTarget, (mobile ? 0.36 : 0.5) * inOut(ramp(t, 8.6, 11)))
    key.set(within('key', t, ramp(t, 8.6, 9.3)), 0.35 * ramp(t, 8.6, 11), sway, keyTarget)

    // 5 · Corridor (depth slices): a slow walk toward door 512, which is small at first and grows;
    //     it opens only near the end of the scene, then the camera goes through into room 1.
    const target = corridorDoorCenter()
    const push =
      DOOR512.pushApproach * inOut(ramp(t, ...DOOR512.approach)) +
      (DOOR512.pushThrough - DOOR512.pushApproach) * easeIn(ramp(t, ...DOOR512.through))
    const plane = pushToward(corridor, f, target, push)
    const corridorOpacity = within('corridor', t, ramp(t, 10.8, 11.5))
    corridor.set(corridorOpacity, 0.3 * ramp(t, ...DOOR512.approach), sway, target)
    door512.layout(plane.w, plane.h)
    const open512 = inOut(ramp(t, ...DOOR512.open))
    door512.set(open512, ramp(t, ...DOOR512.light), corridorOpacity)
    stats.door512.open = open512
    stats.door512.screenHeight = door512.size.h / viewAt(-corridor.group.position.z, f.aspect).h

    // 6 · Room tour: room 1 fades in as the camera passes through the doorway.
    const r1z = lerp(-6.5, -5, inOut(ramp(t, 14.8, 16.6)))
    pan(room1, f, 1, ramp(t, 16.6, 17.9), r1z)
    room1.set(within('room1', t, ramp(t, 14.8, 15.3)), 0.2 * ramp(t, 14.8, 16.6), sway)

    pan(room2, f, ramp(t, 16.6, 17.9), ramp(t, 19, 20.3), lerp(-5.6, -5, ramp(t, 16.6, 19)))
    room2.set(within('room2', t, 1), 0.15 * ramp(t, 16.6, 19), sway)

    pan(room3, f, ramp(t, 19, 20.3), 0, lerp(-5.6, -5, ramp(t, 19, 21.4)))
    room3.set(within('room3', t, 1), 0.15 * ramp(t, 19, 21.4), sway)

    // 7 · Restaurant.
    restaurant.layout(f)
    restaurant.group.position.z = lerp(-6, -4.6, ramp(t, 21.4, 24.4))
    restaurant.set(within('restaurant', t, ramp(t, 21.4, 22.3)), 0.2 * ramp(t, 21.4, 24.4), sway)

    stats.visible = (Object.keys(layers) as Layer[]).filter((name) => layers[name].group.visible)
    if (door512.group.visible && corridor.group.visible) stats.visible.push('door512')
    return stats
  }

  /** Forward distance travelled so far; drives the dust so it streams past the camera. */
  const travel = (t: number) => t * 1.1

  return { root, update, travel }
}
