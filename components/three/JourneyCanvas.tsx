'use client'

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { img } from '@/lib/content'
import type { Sway } from '@/lib/tilt'
import { buildWorld, FOV, type Assets } from './world'
import { createDust } from './dust'
import { flatDepthTexture, loadDepthManifest, loadDepthTexture } from './depth'

const PHOTOS = ['bahar', 'darwaza', 'lobby', 'reception', 'key', 'corridor', 'room1', 'room2', 'room3', 'restaurant']

export type JourneyCanvasProps = {
  time: React.RefObject<() => number>
  intro: React.RefObject<number>
  sway: React.RefObject<Sway>
  active: boolean
  mobile: boolean
  onReady: () => void
  onFail: () => void
}

async function loadAssets(mobile: boolean, gl: THREE.WebGLRenderer): Promise<Assets> {
  const loader = new THREE.TextureLoader()
  const maxAniso = gl.capabilities.getMaxAnisotropy()
  const photos: Record<string, THREE.Texture> = {}
  await Promise.all(
    PHOTOS.map(async (name) => {
      const tex = await loader.loadAsync(img(name))
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = Math.min(4, maxAniso)
      // Phones show photos near 1:1, so skip mipmaps and save a third of the GPU memory.
      if (mobile) {
        tex.generateMipmaps = false
        tex.minFilter = THREE.LinearFilter
      }
      photos[name] = tex
    }),
  )
  const hasDepth = await loadDepthManifest()
  const flat = flatDepthTexture()
  const depth: Record<string, THREE.Texture> = {}
  await Promise.all(
    PHOTOS.map(async (name) => {
      if (!hasDepth.has(name)) return void (depth[name] = flat)
      try {
        // Low-res depth on phones: cheaper to prepare and to sample, and the smoothing hides it.
        depth[name] = await loadDepthTexture(name, mobile ? 192 : 512)
      } catch {
        hasDepth.delete(name)
        depth[name] = flat
      }
    }),
  )
  return { photos, depth, hasDepth }
}

function World({ time, intro, sway, mobile, onReady, onFail }: Omit<JourneyCanvasProps, 'active'>) {
  const { gl, size, setDpr, viewport } = useThree()
  const [world, setWorld] = useState<ReturnType<typeof buildWorld> | null>(null)
  const dust = useMemo(() => createDust(mobile ? 160 : 420), [mobile])
  const smooth = useRef(new THREE.Vector2())
  const target = useRef(new THREE.Vector2())
  const frame = useRef({ t: 0, intro: 1, sway: new THREE.Vector2(), aspect: 1, mobile })
  const perf = useRef({ n: 0, sum: 0, dpr: 0, readyFrames: -1 })

  useEffect(() => {
    let alive = true
    loadAssets(mobile, gl)
      .then((assets) => {
        if (!alive) return
        const w = buildWorld(assets)
        // Upload every texture now, so nothing stalls the first time a scene scrolls in.
        Object.values(assets.photos).forEach((t) => gl.initTexture(t))
        Object.values(assets.depth).forEach((t) => gl.initTexture(t))
        setWorld(w)
        perf.current.readyFrames = 0
      })
      .catch(onFail)
    return () => {
      alive = false
    }
  }, [gl, mobile, onFail])

  useFrame((state, delta) => {
    if (!world) return
    const f = frame.current
    const s = sway.current ?? { x: 0, y: 0 }
    smooth.current.lerp(target.current.set(s.x, s.y), 1 - Math.pow(0.001, delta))
    f.t = time.current?.() ?? 0
    f.intro = intro.current ?? 1
    f.sway.set(smooth.current.x, -smooth.current.y)
    f.aspect = size.width / size.height
    f.mobile = mobile

    // Camera sway: a small real offset, so near and far things separate.
    const cam = state.camera
    cam.position.set(smooth.current.x * (mobile ? 0.1 : 0.16), -smooth.current.y * (mobile ? 0.07 : 0.1), 0)
    cam.lookAt(0, 0, -10)

    world.update(f)
    dust.mat.uniforms.uTime.value = state.clock.elapsedTime
    dust.mat.uniforms.uTravel.value = world.travel(f.t)
    dust.mat.uniforms.uPixelRatio.value = viewport.dpr

    // Let two frames render before swapping out the 2D photos.
    const p = perf.current
    if (p.readyFrames >= 0 && ++p.readyFrames === 3) onReady()

    // Adaptive resolution: step down once if frames are consistently slow.
    p.n++
    p.sum += delta
    if (p.n === 90) {
      const avg = p.sum / p.n
      if (avg > 1 / 45 && viewport.dpr > 1) setDpr(Math.max(1, viewport.dpr * 0.8))
      p.n = 0
      p.sum = 0
    }
  })

  return (
    <>
      {world && <primitive object={world.root} />}
      <primitive object={dust.points} />
    </>
  )
}

class Boundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function JourneyCanvas({ active, mobile, onFail, ...rest }: JourneyCanvasProps) {
  const maxDpr = mobile ? 1.5 : 2
  return (
    <Boundary onFail={onFail}>
      <Canvas
        className="journey-canvas"
        flat
        dpr={[1, maxDpr]}
        frameloop={active ? 'always' : 'never'}
        camera={{ fov: FOV, near: 0.1, far: 60, position: [0, 0, 0] }}
        gl={{ antialias: !mobile, alpha: false, powerPreference: 'high-performance', stencil: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#1f050b')
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            onFail()
          })
        }}
      >
        <World mobile={mobile} onFail={onFail} {...rest} />
      </Canvas>
    </Boundary>
  )
}
