'use client'

import { useEffect, useRef } from 'react'

type Mote = { x: number; y: number; r: number; vy: number; sway: number; phase: number; tw: number }

// Floating gold dust drawn on one canvas. Uses a pre-rendered glow sprite so each frame is just drawImage calls.
export default function GoldDust() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sprite = document.createElement('canvas')
    sprite.width = sprite.height = 32
    const s = sprite.getContext('2d')!
    const g = s.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255, 234, 170, 1)')
    g.addColorStop(0.25, 'rgba(230, 190, 100, 0.55)')
    g.addColorStop(1, 'rgba(201, 162, 75, 0)')
    s.fillStyle = g
    s.fillRect(0, 0, 32, 32)

    let w = 0
    let h = 0
    let motes: Mote[] = []
    const spawn = (y?: number): Mote => ({
      x: Math.random() * w,
      y: y ?? Math.random() * h,
      r: 1.5 + Math.random() * 4.5,
      vy: 6 + Math.random() * 16,
      sway: 6 + Math.random() * 18,
      phase: Math.random() * Math.PI * 2,
      tw: 0.6 + Math.random() * 1.8,
    })

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = w < 768 ? 26 : 64
      motes = Array.from({ length: count }, () => spawn())
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, w, h)
      const t = now / 1000
      for (const m of motes) {
        m.y -= m.vy * dt
        if (m.y < -10) Object.assign(m, spawn(h + 10))
        const x = m.x + Math.sin(t * 0.6 + m.phase) * m.sway
        ctx.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * m.tw + m.phase))
        const d = m.r * 2
        ctx.drawImage(sprite, x - m.r, m.y - m.r, d, d)
      }
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      cancelAnimationFrame(raf)
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : start())
    document.addEventListener('visibilitychange', onVisibility)
    start()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-40 size-full" />
}
