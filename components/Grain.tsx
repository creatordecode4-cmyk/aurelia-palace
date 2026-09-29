// Static film grain from an SVG noise filter; animated only on larger screens (see .grain in globals.css).
export default function Grain() {
  return <div aria-hidden className="grain pointer-events-none fixed -inset-[50%] z-50" />
}
