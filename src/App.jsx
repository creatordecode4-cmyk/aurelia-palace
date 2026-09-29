import { useEffect, useRef, useState } from 'react'
import { CHAPTERS, NAV, ROOM_TYPES, SUITE, SUITE_FACTS, img } from './data.js'

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v))

// Progress (0 → 1) of a tall element scrolling through the viewport.
function useScrollProgress(ref) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const travel = rect.height - window.innerHeight
      setProgress(travel > 0 ? clamp(-rect.top / travel) : 0)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ref])
  return progress
}

// Adds `is-visible` once an element scrolls into view.
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.18 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

function Header() {
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`header ${solid ? 'is-solid' : ''} ${open ? 'is-open' : ''}`}>
      <a href="#top" className="brand" onClick={() => setOpen(false)}>
        <span className="brand-mark">A</span>
        <span className="brand-name">Aurelia Palace</span>
      </a>
      <nav className="nav" aria-label="Primary">
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} onClick={() => setOpen(false)}>
            {n.label}
          </a>
        ))}
      </nav>
      <button
        className="menu-btn"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
      </button>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero" id="top">
      <img className="hero-img" src={img('bahar')} alt="Aurelia Palace lit at dusk above the ghats of Varanasi" />
      <div className="hero-shade" />
      <div className="hero-content">
        <p className="eyebrow">Est. 1887 · On the ghats of Varanasi</p>
        <h1>
          Aurelia <em>Palace</em>
        </h1>
        <p className="hero-sub">A heritage palace on the Ganga, where every evening ends in lamplight.</p>
        <div className="hero-actions">
          <a href="#arrival" className="btn btn-gold">Begin the arrival</a>
          <a href="#reserve" className="btn btn-ghost">Reserve a stay</a>
        </div>
      </div>
      <a href="#arrival" className="scroll-cue" aria-label="Scroll to the arrival">
        <span />
      </a>
    </section>
  )
}

// The carved doors part as you scroll, revealing the lobby behind them.
function Doors() {
  const ref = useRef(null)
  const p = useScrollProgress(ref)
  const open = clamp((p - 0.15) / 0.6)
  const eased = 1 - Math.pow(1 - open, 3)

  return (
    <section className="doors" id="arrival" ref={ref}>
      <div className="doors-stage">
        <img
          className="doors-behind"
          src={img('lobby')}
          alt=""
          style={{ transform: `scale(${1.25 - eased * 0.25})` }}
        />
        <div className="door door-left" style={{ transform: `translateX(${-eased * 100}%)` }}>
          <img src={img('darwaza')} alt="" />
        </div>
        <div className="door door-right" style={{ transform: `translateX(${eased * 100}%)` }}>
          <img src={img('darwaza')} alt="The carved rosewood doors of the palace" />
        </div>
        <div className="doors-caption" style={{ opacity: 1 - clamp(open * 2.2) }}>
          <p className="eyebrow">I · The Doors</p>
          <h2>Fourteen feet of carved rosewood</h2>
          <p>Scroll to step inside</p>
        </div>
      </div>
    </section>
  )
}

function Chapter({ chapter, flip }) {
  const ref = useRef(null)
  const p = useScrollProgress(ref)
  return (
    <section className={`chapter ${flip ? 'is-flip' : ''}`} id={chapter.id} ref={ref}>
      <div className="chapter-stage">
        <img
          className="chapter-img"
          src={img(chapter.image)}
          alt={chapter.title}
          loading="lazy"
          style={{ transform: `scale(${1.12 - p * 0.12}) translateY(${(p - 0.5) * -3}%)` }}
        />
        <div className="chapter-shade" />
        <article className="chapter-card reveal">
          <p className="eyebrow">
            {chapter.step} · {chapter.kicker}
          </p>
          <h2>{chapter.title}</h2>
          <p>{chapter.text}</p>
        </article>
      </div>
    </section>
  )
}

function Suite() {
  const [active, setActive] = useState(0)
  const current = SUITE[active]
  return (
    <section className="suite" id="suite">
      <div className="section-head reveal">
        <p className="eyebrow">VI · Your Suite</p>
        <h2>
          The Maharaja Suite <em>512</em>
        </h2>
        <p>Three rooms, one river view, and a balcony built for sunrise.</p>
      </div>

      <div className="suite-viewer reveal">
        {SUITE.map((s, i) => (
          <img
            key={s.image}
            src={img(s.image)}
            alt={s.label}
            loading="lazy"
            className={i === active ? 'is-active' : ''}
          />
        ))}
        <div className="suite-caption">
          <h3>{current.label}</h3>
          <p>{current.text}</p>
        </div>
      </div>

      <div className="suite-tabs" role="tablist" aria-label="Suite rooms">
        {SUITE.map((s, i) => (
          <button
            key={s.image}
            role="tab"
            aria-selected={i === active}
            className={i === active ? 'is-active' : ''}
            onClick={() => setActive(i)}
          >
            <img src={img(s.image)} alt="" loading="lazy" />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      <dl className="facts reveal">
        {SUITE_FACTS.map(([value, label]) => (
          <div key={label}>
            <dt>{value}</dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Feature({ id, image, step, kicker, title, text, details, flip }) {
  return (
    <section className={`feature ${flip ? 'is-flip' : ''}`} id={id}>
      <div className="feature-media reveal">
        <img src={img(image)} alt={title} loading="lazy" />
      </div>
      <div className="feature-body reveal">
        <p className="eyebrow">
          {step} · {kicker}
        </p>
        <h2>{title}</h2>
        <p>{text}</p>
        <ul>
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const inr = (n) => '₹' + n.toLocaleString('en-IN')
const isoDate = (d) => d.toISOString().slice(0, 10)

function Reserve() {
  const today = new Date()
  const [form, setForm] = useState({
    name: '',
    email: '',
    checkIn: isoDate(new Date(today.getTime() + 7 * 864e5)),
    checkOut: isoDate(new Date(today.getTime() + 10 * 864e5)),
    guests: '2',
    room: 'ganga',
  })
  const [sent, setSent] = useState(false)

  const set = (k) => (e) => {
    setSent(false)
    setForm((f) => ({ ...f, [k]: e.target.value }))
  }
  const nights = Math.max(0, Math.round((new Date(form.checkOut) - new Date(form.checkIn)) / 864e5))
  const room = ROOM_TYPES.find((r) => r.value === form.room)
  const total = nights * room.price
  const valid = nights > 0 && form.name.trim() && /\S+@\S+\.\S+/.test(form.email)

  return (
    <section className="reserve" id="reserve">
      <img className="reserve-bg" src={img('bahar')} alt="" loading="lazy" />
      <div className="reserve-shade" />
      <div className="reserve-inner">
        <div className="section-head reveal">
          <p className="eyebrow">IX · Reserve</p>
          <h2>
            Your key is <em>waiting</em>
          </h2>
          <p>Send a stay request and our concierge will confirm within the hour.</p>
        </div>

        <form
          className="reserve-form reveal"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) setSent(true)
          }}
        >
          <label>
            Full name
            <input value={form.name} onChange={set('name')} placeholder="Your name" required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
          </label>
          <label>
            Check-in
            <input type="date" value={form.checkIn} min={isoDate(today)} onChange={set('checkIn')} required />
          </label>
          <label>
            Check-out
            <input type="date" value={form.checkOut} min={form.checkIn} onChange={set('checkOut')} required />
          </label>
          <label>
            Guests
            <select value={form.guests} onChange={set('guests')}>
              {['1', '2', '3', '4'].map((g) => (
                <option key={g} value={g}>
                  {g} {g === '1' ? 'guest' : 'guests'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Room
            <select value={form.room} onChange={set('room')}>
              {ROOM_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} · {inr(r.price)}/night
                </option>
              ))}
            </select>
          </label>

          <div className="reserve-summary">
            <span>
              {nights} {nights === 1 ? 'night' : 'nights'} · {room.label}
            </span>
            <strong>{nights > 0 ? inr(total) : '—'}</strong>
          </div>

          <button type="submit" className="btn btn-gold" disabled={!valid}>
            Request this stay
          </button>

          {sent && (
            <p className="reserve-sent" role="status">
              Thank you, {form.name.split(' ')[0]}. Your request for {nights} {nights === 1 ? 'night' : 'nights'} in
              the {room.label} has been noted. The concierge will write to {form.email}.
            </p>
          )}
        </form>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="brand">
        <span className="brand-mark">A</span>
        <span className="brand-name">Aurelia Palace</span>
      </div>
      <p>Dashashwamedh Ghat, Varanasi, Uttar Pradesh</p>
      <p className="footer-small">© {new Date().getFullYear()} Aurelia Palace. All rights reserved.</p>
    </footer>
  )
}

export default function App() {
  useReveal()
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Doors />
        {CHAPTERS.map((c, i) => (
          <Chapter key={c.id} chapter={c} flip={i % 2 === 1} />
        ))}
        <Suite />
        <Feature
          id="dining"
          image="restaurant"
          step="VII"
          kicker="Dining"
          title="Candlelight over the Ganga"
          text="Our restaurant opens onto the river through tall arches. Menus follow the old royal kitchens of Awadh and Kashi, cooked slowly and served on silver."
          details={['Dinner from 7 pm, as the evening aarti begins', 'Private balcony tables for two', 'A tasting menu of nine courses']}
        />
        <Feature
          id="spa"
          image="spa"
          step="VIII"
          kicker="The Lotus Spa"
          title="A pool of marigolds and lamplight"
          text="A marble pool scattered with marigold petals and floating diyas. Treatments draw on Ayurvedic tradition, with oils blended fresh each morning."
          details={['Abhyanga and Shirodhara rituals', 'Private hammam for couples', 'Open 6 am – 10 pm']}
          flip
        />
        <Reserve />
      </main>
      <Footer />
    </>
  )
}
