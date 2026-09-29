'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, MOBILE, MOTION_OK } from '@/lib/gsap'
import { DISHES, ROOMS, SCENES, TIMINGS, img } from '@/lib/content'

// Full-bleed photo. Every layer is a plain <img> so GSAP only ever animates transform/opacity.
// On portrait phones only a narrow slice of each photo is visible; these keep the subject in it.
const MOBILE_FOCUS: Record<string, string> = {
  room1: '60% 50%',
  room2: '42% 50%',
  room3: '70% 50%',
}

function Photo({ name, alt = '', className = '', eager = false }: { name: string; alt?: string; className?: string; eager?: boolean }) {
  return (
    <img
      style={MOBILE_FOCUS[name] ? ({ '--focus': MOBILE_FOCUS[name] } as React.CSSProperties) : undefined}
      src={img(name)}
      alt={alt}
      draggable={false}
      decoding="async"
      fetchPriority={eager ? 'high' : 'auto'}
      className={`photo ${className}`}
    />
  )
}

function Caption({ id, kicker, title, children, align = 'left' }: {
  id: string
  kicker: string
  title: React.ReactNode
  children?: React.ReactNode
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <div data-cap={id} className={`caption caption--${align}`}>
      <p className="eyebrow">{kicker}</p>
      <h2 className="font-serif text-[clamp(2rem,5.2vw,4.2rem)] leading-[1.05] font-normal">{title}</h2>
      {children}
    </div>
  )
}

// Two halves of darwaza.jpg that slide apart, with a slit of gold light between them.
function Doors({ id, plaque }: { id: string; plaque?: string }) {
  return (
    <>
      <div data-light={id} className="door-light" />
      <div data-door={`${id}-l`} className="door door--left">
        <Photo name="darwaza" />
      </div>
      <div data-door={`${id}-r`} className="door door--right">
        <Photo name="darwaza" alt="Carved rosewood palace doors" />
      </div>
      {plaque && (
        <div data-plaque={id} className="plaque">
          {plaque}
        </div>
      )}
    </>
  )
}

function RoomCaption({ index }: { index: number }) {
  const r = ROOMS[index]
  return (
    <Caption id={`room${index + 1}`} kicker={`VI · ${r.kicker}`} title={r.title} align={index === 1 ? 'right' : 'left'}>
      {r.lines.map((line) => (
        <p key={line} className="caption-text">
          {line}
        </p>
      ))}
    </Caption>
  )
}

export default function Journey({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null)
  const [scene, setScene] = useState(0)

  // Build the pinned master timeline. Re-built automatically by matchMedia on breakpoint changes.
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const q = gsap.utils.selector(el)
    const $ = (sel: string) => q(sel)[0] as HTMLElement
    const cap = (id: string) => $(`[data-cap="${id}"]`)
    const layer = (id: string) => $(`[data-layer="${id}"]`)
    const photo = (id: string) => $(`[data-layer="${id}"] .photo`)

    const mm = gsap.matchMedia()
    mm.add({ motion: MOTION_OK, mobile: MOBILE }, (ctx) => {
      const { motion, mobile } = ctx.conditions as { motion: boolean; mobile: boolean }
      if (!motion) return

      // Mobile gets smaller camera moves: less to composite, subject stays centred.
      const k = mobile ? 0.6 : 1
      const zoom = (amount: number) => 1 + amount * k

      const capIn = { autoAlpha: 0, y: 40 }
      const capShow = { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      const capOut = { autoAlpha: 0, y: -40, duration: 0.5, ease: 'power2.in' }
      const show = (tl: gsap.core.Timeline, id: string, at: number, hold: number) =>
        tl.fromTo(cap(id), capIn, capShow, at).to(cap(id), capOut, at + hold)

      // Everything above the lobby starts hidden; the timeline reveals it.
      gsap.set(
        ['reception', 'key', 'corridor', 'room1', 'door512', 'room2', 'room3', 'restaurant'].map(layer),
        { autoAlpha: 0 },
      )
      gsap.set(q('[data-cap]:not([data-cap="hero"])'), { autoAlpha: 0 })
      gsap.set(q('[data-dish], [data-time]'), { autoAlpha: 0, y: 20 })

      const tl = gsap.timeline({ defaults: { ease: 'none' } })

      // 1 · HERO — slow push toward the palace, title lifts away, doors take over.
      tl.addLabel('hero', 0)
        .fromTo(photo('hero'), { scale: 1 }, { scale: zoom(0.45), duration: 2 }, 0)
        .to(cap('hero'), { autoAlpha: 0, y: -80, duration: 0.9, ease: 'power1.in' }, 0.2)
        .fromTo(layer('doors'), { scale: zoom(0.3) }, { scale: 1, duration: 2 }, 1)
        .to(layer('hero'), { autoAlpha: 0, duration: 0.8 }, 1.2)

      // 2 · DARWAZA — gold light cracks through, the doors part.
      tl.addLabel('darwaza', 1.9)
      show(tl, 'darwaza', 1.9, 0.9)
        .fromTo($('[data-light="main"]'), { scaleX: 0, autoAlpha: 0 }, { scaleX: 1, autoAlpha: 1, duration: 0.7, ease: 'power1.in' }, 2.8)
        .to($('[data-door="main-l"]'), { xPercent: -101, duration: 1.7, ease: 'power2.inOut' }, 3.1)
        .to($('[data-door="main-r"]'), { xPercent: 101, duration: 1.7, ease: 'power2.inOut' }, 3.1)
        .fromTo(photo('lobby'), { scale: zoom(0.35) }, { scale: zoom(0.1), duration: 2 }, 2.9)
        .to($('[data-light="main"]'), { autoAlpha: 0, duration: 0.9 }, 4.1)

      // 3 · ENTRY — the camera walks into the lobby.
      tl.addLabel('lobby', 4.6)
        .to(photo('lobby'), { scale: zoom(0.5), duration: 2.4 }, 4.8)
      show(tl, 'lobby', 4.9, 1.4)

      // 4 · RECEPTION → KEY — cross-fade to the desk, then a macro push onto the key.
      tl.addLabel('reception', 6.6)
        .to(layer('reception'), { autoAlpha: 1, duration: 0.8 }, 6.5)
        .fromTo(photo('reception'), { scale: zoom(0.3) }, { scale: 1, duration: 2.2 }, 6.5)
      show(tl, 'reception', 7.1, 1.3)
      tl.addLabel('key', 8.7)
        .to(layer('key'), { autoAlpha: 1, duration: 0.7 }, 8.6)
        .fromTo(photo('key'), { scale: 1 }, { scale: zoom(0.9), duration: 2.4 }, 8.6)
      show(tl, 'key', 9.2, 1.5)

      // 5 · CORRIDOR — push down the gallery until door 512 fills the frame and opens.
      tl.addLabel('corridor', 10.9)
        .to(layer('corridor'), { autoAlpha: 1, duration: 0.7 }, 10.8)
        .fromTo(photo('corridor'), { scale: 1 }, { scale: zoom(1.4), duration: 2.6, ease: 'power1.in' }, 10.9)
      show(tl, 'corridor', 11.3, 1.2)
      tl.fromTo(layer('door512'), { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 1.2, ease: 'power2.out' }, 12.6)
        .set(layer('room1'), { autoAlpha: 1 }, 13.8)
        .fromTo($('[data-light="512"]'), { scaleX: 0, autoAlpha: 0 }, { scaleX: 1, autoAlpha: 1, duration: 0.5 }, 13.8)
        .to($('[data-plaque="512"]'), { autoAlpha: 0, duration: 0.3 }, 13.9)
        .to($('[data-door="512-l"]'), { xPercent: -101, duration: 1.4, ease: 'power2.inOut' }, 14)
        .to($('[data-door="512-r"]'), { xPercent: 101, duration: 1.4, ease: 'power2.inOut' }, 14)
        .to($('[data-light="512"]'), { autoAlpha: 0, duration: 0.6 }, 14.9)
        .fromTo(photo('room1'), { scale: zoom(0.3) }, { scale: 1, duration: 2 }, 13.9)

      // 6 · ROOM TOUR — each room pans in over the last.
      tl.addLabel('rooms', 14.9)
      show(tl, 'room1', 15, 1.5)
      tl.fromTo(layer('room2'), { autoAlpha: 1, xPercent: 100 }, { xPercent: 0, duration: 1.3, ease: 'power2.inOut' }, 16.6)
        .to(layer('room1'), { xPercent: -30, duration: 1.3, ease: 'power2.inOut' }, 16.6)
        .fromTo(photo('room2'), { scale: zoom(0.2) }, { scale: 1, duration: 2.2 }, 16.6)
      show(tl, 'room2', 17.4, 1.5)
      tl.fromTo(layer('room3'), { autoAlpha: 1, xPercent: 100 }, { xPercent: 0, duration: 1.3, ease: 'power2.inOut' }, 19)
        .to(layer('room2'), { xPercent: -30, duration: 1.3, ease: 'power2.inOut' }, 19)
        .fromTo(photo('room3'), { scale: zoom(0.2) }, { scale: 1, duration: 2.2 }, 19)
      show(tl, 'room3', 19.8, 1.5)

      // 7 · RESTAURANT — candlelit fade, dishes and timings arrive.
      tl.addLabel('restaurant', 21.5)
        .to(layer('restaurant'), { autoAlpha: 1, duration: 0.9 }, 21.4)
        .fromTo(photo('restaurant'), { scale: zoom(0.35) }, { scale: 1, duration: 3 }, 21.4)
        .fromTo(cap('restaurant'), capIn, capShow, 22)
        .to(q('[data-dish]'), { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.2, ease: 'power2.out' }, 22.3)
        .to(q('[data-time]'), { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.12, ease: 'power2.out' }, 22.9)
        .to({}, { duration: 1 }) // hold before unpinning

      const labels = SCENES.map((s) => tl.labels[s.at])
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: () => `+=${tl.duration() * window.innerHeight * (mobile ? 0.45 : 0.55)}`,
        pin: true,
        scrub: mobile ? 0.6 : 1,
        animation: tl,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          gsap.set($('[data-progress]'), { scaleX: self.progress })
          const t = tl.time()
          let i = 0
          while (i + 1 < labels.length && t >= labels[i + 1] - 0.2) i++
          setScene(i)
        },
      })
      return () => st.kill()
    })
    return () => mm.revert()
  }, [])

  // Intro once the preloader lifts: the palace settles and the title rises in.
  useLayoutEffect(() => {
    if (!ready || !root.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const q = gsap.utils.selector(root.current)
    const ctx = gsap.context(() => {
      gsap.from(q('[data-kb]'), { scale: 1.15, duration: 4, ease: 'power2.out' })
      gsap.from(q('[data-hero-line]'), { autoAlpha: 0, y: 50, duration: 1.4, stagger: 0.18, ease: 'expo.out', delay: 0.2 })
    })
    return () => ctx.revert()
  }, [ready])

  return (
    <section ref={root} aria-label="Journey through Aurelia Palace" className="journey">
      <div className="stage">
        <div data-layer="lobby" className="layer" style={{ order: 3 }}>
          <Photo name="lobby" alt="The grand lobby with chandeliers and a marigold urli" />
          <Caption id="lobby" kicker="III · Entry" title={<>The Grand <em>Lobby</em></>}>
            <p className="caption-text">Chandeliers, Makrana marble and a thousand diyas. The river light follows you inside.</p>
          </Caption>
        </div>

        <div data-layer="doors" className="layer" style={{ order: 2 }}>
          <Doors id="main" />
          <Caption id="darwaza" kicker="II · Darwaza" title={<>Fourteen feet of <em>carved rosewood</em></>} align="center">
            <p className="caption-text">Keep scrolling. The doors are opening for you.</p>
          </Caption>
        </div>

        <div data-layer="hero" className="layer" style={{ order: 1 }}>
          <div data-kb className="absolute inset-0">
            <Photo name="bahar" alt="Aurelia Palace lit at dusk above the ghats of Varanasi" eager />
          </div>
          <div className="hero-shade" />
          <div data-cap="hero" className="hero-copy">
            <p data-hero-line className="eyebrow">A heritage palace on the Ganga</p>
            <h1 data-hero-line className="font-serif text-[clamp(3rem,12vw,9.5rem)] leading-[0.9] font-light tracking-[0.06em]">
              AURELIA
              <br />
              PALACE
            </h1>
            <p data-hero-line className="mt-5 font-serif text-[clamp(1.4rem,3vw,2.2rem)] text-gold-light italic">Varanasi</p>
            <p data-hero-line className="scroll-hint">
              <span>Scroll to enter</span>
              <i aria-hidden />
            </p>
          </div>
        </div>

        <div data-layer="reception" className="layer" style={{ order: 4 }}>
          <Photo name="reception" alt="Reception desk beneath a gilded arch" />
          <Caption id="reception" kicker="IV · Reception" title={<>A welcome, <em>not a check-in</em></>} align="right">
            <p className="caption-text">Saffron sherbet, a jasmine garland, and no paperwork at all.</p>
          </Caption>
        </div>

        <div data-layer="key" className="layer layer--key" style={{ order: 5 }}>
          <Photo name="key" alt="Brass room key 512 with a maroon silk tassel" />
          <Caption id="key" kicker="IV · Your Key" title={<>Your key to a <em>different world</em></>} align="center" />
        </div>

        <div data-layer="corridor" className="layer layer--corridor" style={{ order: 6 }}>
          <Photo name="corridor" alt="Lantern-lit corridor with a red carpet leading to a carved door" />
          <Caption id="corridor" kicker="V · The Long Gallery" title={<>The way to <em>Suite 512</em></>}>
            <p className="caption-text">Lanterns every few paces, velvet drapes, and a single door at the end.</p>
          </Caption>
        </div>

        <div data-layer="room1" className="layer" style={{ order: 8 }}>
          <Photo name="room1" alt={ROOMS[0].title} />
          <RoomCaption index={0} />
        </div>

        <div data-layer="door512" className="layer layer--door512" style={{ order: 7 }}>
          <Doors id="512" plaque="512" />
        </div>

        <div data-layer="room2" className="layer" style={{ order: 9 }}>
          <Photo name="room2" alt={ROOMS[1].title} />
          <RoomCaption index={1} />
        </div>

        <div data-layer="room3" className="layer" style={{ order: 10 }}>
          <Photo name="room3" alt={ROOMS[2].title} />
          <RoomCaption index={2} />
        </div>

        <div data-layer="restaurant" className="layer" style={{ order: 11 }}>
          <Photo name="restaurant" alt="Candlelit restaurant with arches open to the Ganga" />
          <Caption id="restaurant" kicker="VII · Kashi Darbar" title={<>Candlelight <em>over the Ganga</em></>}>
            <ul className="mt-5 space-y-2">
              {DISHES.map((d) => (
                <li key={d.name} data-dish className="dish">
                  <span className="font-serif text-xl text-cream sm:text-2xl">{d.name}</span>
                  <span className="text-sm text-cream/60">{d.note}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {TIMINGS.map(([meal, hours]) => (
                <div key={meal} data-time>
                  <dt className="text-[0.62rem] tracking-[0.3em] text-gold uppercase">{meal}</dt>
                  <dd className="text-sm text-cream/80">{hours}</dd>
                </div>
              ))}
            </dl>
          </Caption>
        </div>

        <div className="vignette" aria-hidden />

        <div className="hud" aria-hidden>
          <span className="tabular-nums text-gold">{String(scene + 1).padStart(2, '0')}</span>
          <span className="text-cream/40">/ {String(SCENES.length).padStart(2, '0')}</span>
          <span className="ml-3 hidden sm:inline">{SCENES[scene].name}</span>
          <span className="hud-bar">
            <span data-progress />
          </span>
        </div>
      </div>
    </section>
  )
}
