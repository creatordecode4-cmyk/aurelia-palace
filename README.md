# Aurelia Palace

A cinematic, pinned-scroll website for **Aurelia Palace**, a fictional heritage hotel on the ghats of Varanasi.
It's a concept design project, so there is no real booking, backend or payment.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · GSAP ScrollTrigger · Lenis · three.js / React Three Fiber

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

## 3D layer (WebGL)

When the browser has a real GPU, a React Three Fiber canvas (`components/three/`) takes over drawing the journey;
the DOM keeps only the text, still animated by the same GSAP timeline.

- **Depth parallax:** each photo is drawn with a depth-aware shader. With the mouse or phone tilt, near
  things move more than far ones, and scroll push-ins magnify near pixels more. Samples come from an inset window
  of the photo, so edges never stretch.
- **3D space:** scenes are planes at real distances and the camera dollies forward. The lobby and corridor are split
  into depth slices on separate planes at different z.
- **Doors:** the darwaza and door 512 are boxes with thickness that swing open on hinges, with gold light behind them.
- **Gold dust:** 3D points that stream past the camera.
- **Tilt:** gyroscope on phones. Android is on by default; iOS shows an "Enable tilt 3D" button and stays off
  unless permission is granted.
- **Fallback:** the 2D version stays on screen until the canvas has rendered, and returns if WebGL is missing, the
  browser would use software rendering, the context is lost or anything throws. `prefers-reduced-motion` never
  loads 3D. Add `?2d` to the URL to force 2D, or `?3d` to skip the GPU check.

### Depth maps

Depth maps live in `public/depth/`, one per journey photo (all except `spa.jpg`, which keeps its plain
scroll parallax in the About section):

- `<photo>-depth.png`: greyscale, white = near, 512 px wide (desktop)
- `<photo>-depth-sm.png`: the same at 256 px, loaded on phones (optional; falls back to the full map)

The current maps are Depth Anything V2 outputs. `public/depth/manifest.json` is rebuilt automatically before
`dev` and `build`, so a photo gets depth as soon as its PNG is there. On load, maps are smoothed and dilated so near
objects keep clean edges.

To regenerate them with Depth Anything V2 (small) on your machine:

```bash
npm install --no-save @huggingface/transformers
npm run depth            # all photos, or: npm run depth -- lobby corridor
```

If the 3D ever looks inside-out, the maps are inverted (black = near); invert them.

## Performance & accessibility

- Only `transform` and `opacity` are animated; images are preloaded and decoded before the journey starts.
- `gsap.matchMedia` gives phones (≤767px) smaller camera moves, fewer particles and static grain.
- Portrait phones use per-image focal points so the subject stays centred.
- `prefers-reduced-motion: reduce` turns off Lenis, pinning, particles and 3D; every scene becomes a plain stacked section.
- 3D on phones: low-res depth (256px files, 192px in the shader), capped and adaptive device pixel ratio, no mipmaps, fewer dust points. Textures
  are uploaded to the GPU up front, and the canvas stops rendering once the journey is scrolled past.

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
