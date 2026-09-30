'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { ALL_IMAGES } from '@/lib/content'

const MIN_SHOW_MS = 1200

function loadImage(src: string) {
  return new Promise<void>((resolve) => {
    const im = new Image()
    im.decoding = 'async'
    im.onload = im.onerror = () => resolve()
    im.src = src
    // decode() keeps the first scroll frames from stalling on image decoding.
    if (im.decode) im.decode().then(() => resolve(), () => resolve())
  })
}

export default function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const shown = { v: 0 }
    const start = performance.now()
    let loaded = 0
    let cancelled = false
    const total = ALL_IMAGES.length + 1 // +1 for web fonts

    // Ease the counter toward the real progress so it never jumps.
    const toward = (target: number) =>
      gsap.to(shown, {
        v: target,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: () => setPct(Math.round(shown.v)),
      })

    const tick = () => {
      loaded += 1
      toward((loaded / total) * 100)
    }

    Promise.all([...ALL_IMAGES.map((src) => loadImage(src).then(tick)), document.fonts.ready.then(tick)]).then(
      () => {
        const wait = Math.max(0, MIN_SHOW_MS - (performance.now() - start))
        gsap.delayedCall(wait / 1000 + 0.6, () => {
          if (cancelled || !root.current) return
          setPct(100)
          gsap
            .timeline({ onComplete: onDone })
            .to(root.current.querySelector('[data-inner]'), { autoAlpha: 0, y: -30, duration: 0.6, ease: 'power2.in' })
            .to(root.current, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=0.1')
        })
      },
    )
    return () => {
      cancelled = true
      gsap.killTweensOf(shown)
    }
  }, [onDone])

  return (
    <div
      ref={root}
      role="progressbar"
      aria-label="Loading Aurelia Palace"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="fixed inset-0 z-[100] grid place-items-center bg-maroon-deep"
    >
      <div data-inner className="flex w-[min(80vw,22rem)] flex-col items-center text-center">
        <span className="mb-8 grid size-14 place-items-center rounded-full border border-gold/70 font-serif text-2xl text-gold">
          A
        </span>
        <span className="font-serif text-7xl font-light tabular-nums text-cream sm:text-8xl">
          {pct}
          <span className="text-3xl text-gold">%</span>
        </span>
        <div className="mt-6 h-px w-full bg-cream/15">
          <div className="h-full origin-left bg-gold" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <p className="mt-5 text-[0.65rem] tracking-[0.4em] text-gold uppercase">Aurelia Palace · Varanasi</p>
      </div>
    </div>
  )
}
