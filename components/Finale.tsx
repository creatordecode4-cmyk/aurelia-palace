'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, MOTION_OK } from '@/lib/gsap'
import { img } from '@/lib/content'

const SUITES = ['Palace Room', 'Ganga View Suite', 'Maharaja Suite 512'] as const

const toISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="flex items-center justify-between border-b border-cream/25 py-1.5">
        <button type="button" className="step-btn" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <output aria-live="polite" className="font-serif text-2xl tabular-nums">
          {value}
        </output>
        <button type="button" className="step-btn" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  )
}

export default function Finale() {
  const root = useRef<HTMLElement>(null)
  const [today, setToday] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [suite, setSuite] = useState<string>(SUITES[2])
  const [done, setDone] = useState(false)

  // Dates depend on the visitor's clock, so fill them in after hydration.
  useEffect(() => {
    const t = toISO(new Date())
    setToday(t)
    setCheckIn(addDays(t, 14))
    setCheckOut(addDays(t, 17))
  }, [])

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(el)
      gsap.fromTo(q('[data-bg]'), { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: true } })
      gsap.from(q('[data-rise]'), {
        autoAlpha: 0,
        y: 60,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 60%', once: true },
      })
    })
    return () => mm.revert()
  }, [])

  const nights = checkIn && checkOut ? Math.round((+new Date(checkOut) - +new Date(checkIn)) / 864e5) : 0
  const valid = nights > 0

  return (
    <section ref={root} id="book" aria-labelledby="book-title" className="relative z-10 overflow-hidden px-5 py-28 sm:px-10 sm:py-40">
      <img data-bg src={img('room2')} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-maroon-deep via-maroon-deep/80 to-maroon-deep/90" />

      <div className="relative mx-auto max-w-3xl text-center">
        <p data-rise className="eyebrow">IX · Finale</p>
        <h2 id="book-title" data-rise className="font-serif text-[clamp(2.8rem,8vw,6rem)] leading-none font-light">
          Book Your <em>Stay</em>
        </h2>
        <p data-rise className="mx-auto mt-5 max-w-md text-cream/75">
          Suite 512 is waiting, and so is the river. Choose your dates.
        </p>

        <form
          data-rise
          className="mt-12 grid gap-6 border border-gold/35 bg-maroon/70 p-6 text-left backdrop-blur-md sm:grid-cols-2 sm:p-10"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) setDone(true)
          }}
          onChange={() => setDone(false)}
        >
          <label className="field">
            <span className="field-label">Check-in</span>
            <input
              type="date"
              required
              value={checkIn}
              min={today}
              onChange={(e) => {
                setCheckIn(e.target.value)
                if (e.target.value && checkOut <= e.target.value) setCheckOut(addDays(e.target.value, 1))
              }}
              className="field-input"
            />
          </label>
          <label className="field">
            <span className="field-label">Check-out</span>
            <input
              type="date"
              required
              value={checkOut}
              min={checkIn ? addDays(checkIn, 1) : today}
              onChange={(e) => setCheckOut(e.target.value)}
              className="field-input"
            />
          </label>
          <Stepper label="Adults" value={adults} min={1} max={6} onChange={(v) => { setAdults(v); setDone(false) }} />
          <Stepper label="Children" value={children} min={0} max={4} onChange={(v) => { setChildren(v); setDone(false) }} />
          <label className="field sm:col-span-2">
            <span className="field-label">Suite</span>
            <select value={suite} onChange={(e) => setSuite(e.target.value)} className="field-input">
              {SUITES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-4 border-t border-gold/25 pt-6 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-cream/70">
              {valid ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : 'Choose your dates'} · {adults + children}{' '}
              {adults + children === 1 ? 'guest' : 'guests'}
            </p>
            <button type="submit" disabled={!valid} className="book-btn">
              Book Now
            </button>
          </div>

          {done && (
            <p role="status" className="border-l-2 border-gold bg-gold/10 px-4 py-3 text-sm text-cream/85 sm:col-span-2">
              Thank you. This is a concept design, so no booking or payment has been made.
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
