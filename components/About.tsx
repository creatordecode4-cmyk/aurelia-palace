'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap, MOBILE, MOTION_OK } from '@/lib/gsap'
import { STATS, img } from '@/lib/content'

// Line icons drawn with pathLength=1 so GSAP can "draw" any of them with strokeDashoffset 1 → 0.
const FACILITIES = [
  {
    name: 'Lotus Spa',
    text: 'Ayurvedic rituals and a marigold pool.',
    paths: ['M24 38c-8 0-14-6-14-14 6 0 11 3 14 8 3-5 8-8 14-8 0 8-6 14-14 14z', 'M24 32c-4-4-5-10-0-18 5 8 4 14 0 18z', 'M8 42h32'],
  },
  {
    name: 'Heated Pool',
    text: 'A courtyard pool open until midnight.',
    paths: ['M6 30c4-3 8-3 12 0s8 3 12 0 8-3 12 0', 'M6 38c4-3 8-3 12 0s8 3 12 0 8-3 12 0', 'M16 26V10a4 4 0 0 1 8 0', 'M30 26V10'],
  },
  {
    name: 'Restaurant',
    text: 'Royal Awadhi and Kashi kitchens.',
    paths: ['M14 6v14a4 4 0 0 0 8 0V6', 'M18 6v36', 'M34 42V6c-5 3-6 10-6 16h6'],
  },
  {
    name: 'Room Service',
    text: 'Silver-cloche dining, day and night.',
    paths: ['M8 34a16 16 0 0 1 32 0z', 'M4 38h40', 'M24 18v-4', 'M20 14h8'],
  },
  {
    name: 'Ganga-view Suites',
    text: 'Every suite opens onto the river.',
    paths: ['M10 42V20a14 14 0 0 1 28 0v22z', 'M14 34c3-2 6-2 10 0s7 2 10 0', 'M24 26a5 5 0 1 0 0-.01'],
  },
  {
    name: 'Airport Pickup',
    text: 'Chauffeured from Varanasi airport.',
    paths: ['M4 28l16-4 10-16h4l-4 14 10-2 4-6h3l-2 9 2 9h-3l-4-6-10-2 4 14h-4L20 22 4 20z'],
  },
] as const

export default function About() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const q = gsap.utils.selector(el)
    const mm = gsap.matchMedia()
    mm.add({ motion: MOTION_OK, mobile: MOBILE }, (ctx) => {
      const { motion, mobile } = ctx.conditions as { motion: boolean; mobile: boolean }
      if (!motion) return

      // Count-ups: "Since 1998" and the stats.
      q<HTMLElement>('[data-count]').forEach((node) => {
        const target = Number(node.dataset.count)
        const from = target > 1000 ? 1900 : 0
        const obj = { v: from }
        node.textContent = String(from)
        gsap.to(obj, {
          v: target,
          duration: target > 1000 ? 2.4 : 1.8,
          ease: 'power3.out',
          onUpdate: () => (node.textContent = String(Math.round(obj.v))),
          scrollTrigger: { trigger: node, start: 'top 85%', once: true },
        })
      })

      gsap.from(q('[data-reveal]'), {
        autoAlpha: 0,
        y: 50,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 70%', once: true },
      })

      // Facilities: cards rise, then each icon draws itself.
      const cards = q<HTMLElement>('[data-facility]')
      gsap.set(q('[data-facility] path'), { strokeDasharray: 1, strokeDashoffset: 1 })
      gsap.from(cards, {
        autoAlpha: 0,
        y: 40,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: q('[data-facilities]')[0], start: 'top 80%', once: true },
        onStart: () => {
          gsap.to(q('[data-facility] path'), { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.08, delay: 0.3 })
        },
      })

      // Spa image: slow parallax inside its frame.
      gsap.fromTo(
        q('[data-spa]'),
        { yPercent: mobile ? -6 : -12 },
        {
          yPercent: mobile ? 6 : 12,
          ease: 'none',
          scrollTrigger: { trigger: q('[data-spa-frame]')[0], start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
    })
    return () => mm.revert()
  }, [])

  return (
    <section ref={root} aria-labelledby="about-title" className="relative z-10 bg-maroon px-5 py-24 sm:px-10 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-end gap-10 md:grid-cols-[1.1fr_1fr] md:gap-16">
          <div>
            <p data-reveal className="eyebrow">VIII · About the Palace</p>
            <h2 id="about-title" data-reveal className="font-serif text-[clamp(2.6rem,7vw,5.5rem)] leading-none font-light">
              Since <span data-count="1998" className="text-gold tabular-nums">1998</span>
            </h2>
            <p data-reveal className="mt-6 max-w-xl text-base leading-relaxed text-cream/80 sm:text-lg">
              A nineteenth-century haveli on the ghats, restored stone by stone and opened as Aurelia Palace in 1998.
              Three generations of one family still keep the lamps lit, the brass polished and the river in view.
            </p>
          </div>
          <dl data-reveal className="grid grid-cols-3 gap-4 border-t border-gold/30 pt-6">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="font-serif text-[clamp(2rem,5vw,3.2rem)] leading-none text-gold-light">
                  <span data-count={s.value} className="tabular-nums">
                    {s.value}
                  </span>
                  {s.suffix}
                </dt>
                <dd className="mt-2 text-[0.62rem] leading-snug tracking-[0.22em] text-cream/65 uppercase">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ul data-facilities className="mt-20 grid grid-cols-2 gap-px overflow-hidden border border-gold/25 bg-gold/25 md:grid-cols-3">
          {FACILITIES.map((f) => (
            <li key={f.name} data-facility className="group bg-maroon p-5 transition-colors duration-500 hover:bg-maroon-soft sm:p-8">
              <svg viewBox="0 0 48 48" className="size-10 text-gold sm:size-12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {f.paths.map((d) => (
                  <path key={d} d={d} pathLength={1} />
                ))}
              </svg>
              <h3 className="mt-4 font-serif text-xl sm:text-2xl">{f.name}</h3>
              <p className="mt-1 text-sm text-cream/65">{f.text}</p>
            </li>
          ))}
        </ul>

        <figure data-spa-frame className="relative mt-20 aspect-[4/5] overflow-hidden sm:aspect-[16/8]">
          <img data-spa src={img('spa')} alt="The Lotus Spa pool with floating diyas and marigolds" loading="lazy" className="absolute inset-0 h-[124%] -top-[12%] w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-maroon-deep/85 via-transparent to-transparent" />
          <figcaption className="absolute inset-x-0 bottom-0 p-6 text-center sm:p-10 sm:text-left">
            <p className="eyebrow">The Lotus Spa</p>
            <p className="font-serif text-[clamp(1.6rem,3.6vw,2.8rem)] leading-tight">
              A pool of <em>marigolds and lamplight</em>
            </p>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
