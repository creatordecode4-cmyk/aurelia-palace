# Aurelia Palace

A cinematic, pinned-scroll website for **Aurelia Palace**, a fictional heritage hotel on the ghats of Varanasi.
It's a concept design project, so there is no real booking, backend or payment.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · GSAP ScrollTrigger · Lenis

## The journey

One pinned stage driven by a single scrubbed GSAP timeline (`components/Journey.tsx`):

1. **Hero:** `bahar.jpg` slowly zooms in, with the title *AURELIA PALACE · Varanasi* and "Scroll to enter"
2. **Darwaza:** `darwaza.jpg` splits into two panels that slide apart, with gold light between them
3. **Entry:** the camera pushes into `lobby.jpg`
4. **Reception → Key:** `reception.jpg`, then a macro zoom on `key.jpg` with "Your key to a different world"
5. **Corridor:** push down `corridor.jpg` until door 512 fills the frame and opens
6. **Room tour:** `room1`, `room2` and `room3` pan in one by one, each with a heading and description
7. **Restaurant:** `restaurant.jpg` with dish highlights and timings

After the pin come **About** ("Since 1998" count-up, self-drawing facility icons, `spa.jpg` parallax) and the
**Book Your Stay** finale (dates, guests, suite, Book Now; UI only).

Also: a loading screen with real % progress, gold dust particles (canvas), film grain, and a scene counter.

## Performance & accessibility

- Only `transform` and `opacity` are animated; images are preloaded and decoded before the journey starts.
- `gsap.matchMedia` gives phones (≤767px) smaller camera moves, fewer particles and static grain.
- Portrait phones use per-image focal points so the subject stays centred.
- `prefers-reduced-motion: reduce` turns off Lenis, pinning and particles; every scene becomes a plain stacked section.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build && npm start
```

Copy (rooms, dishes, timings, stats) lives in `lib/content.ts`. Photos are in `public/images/`.

## Deploy

Import the repo in Vercel; the framework preset is detected automatically. Metadata, the OG/Twitter image
(`app/opengraph-image.jpg`) and the favicon (`app/icon.svg`) are served by Next's file conventions, and
`metadataBase` uses Vercel's production URL.

---

Concept design project. Aurelia Palace is a fictional hotel.
