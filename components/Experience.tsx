'use client'

import { useCallback, useEffect, useState } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import Preloader from './Preloader'
import GoldDust from './GoldDust'
import Grain from './Grain'
import Journey from './Journey'
import About from './About'
import Finale from './Finale'

export default function Experience() {
  const [ready, setReady] = useState(false)
  const [lenis, setLenis] = useState<Lenis | null>(null)

  // Lenis drives the scroll; ScrollTrigger reads it every frame through the GSAP ticker.
  useEffect(() => {
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const instance = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 })
    instance.stop()
    instance.on('scroll', ScrollTrigger.update)
    const raf = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    setLenis(instance)
    return () => {
      gsap.ticker.remove(raf)
      instance.destroy()
    }
  }, [])

  const onLoaded = useCallback(() => {
    setReady(true)
    ScrollTrigger.refresh()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('is-loading', !ready)
    if (ready) lenis?.start()
  }, [ready, lenis])

  return (
    <>
      {!ready && <Preloader onDone={onLoaded} />}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-4 sm:px-10 sm:py-6">
        <a href="#top" className="pointer-events-auto flex items-center gap-3" aria-label="Aurelia Palace, back to top">
          <span className="grid size-9 place-items-center rounded-full border border-gold/70 font-serif text-lg text-gold">
            A
          </span>
          <span className="font-serif text-lg tracking-[0.12em] text-cream">Aurelia Palace</span>
        </a>
        <span className="hidden text-[0.62rem] tracking-[0.35em] text-cream/60 uppercase sm:block">Varanasi · Est. 1998</span>
      </header>
      <main id="top">
        <Journey ready={ready} />
        <About />
        <Finale />
      </main>
      <footer className="relative z-10 border-t border-gold/20 bg-maroon-deep px-4 py-10 text-center">
        <p className="font-serif text-lg text-cream/80">Aurelia Palace</p>
        <p className="mt-2 text-xs tracking-[0.15em] text-cream/55">
          Concept design project. Aurelia Palace is a fictional hotel.
        </p>
      </footer>
      <GoldDust />
      <Grain />
    </>
  )
}
