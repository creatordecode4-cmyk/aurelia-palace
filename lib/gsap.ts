'use client'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
  // Mobile URL bars resize the viewport while scrolling; don't re-layout pinned scenes for that.
  ScrollTrigger.config({ ignoreMobileResize: true })
}

export const MOTION_OK = '(prefers-reduced-motion: no-preference)'
export const MOBILE = '(max-width: 767px)'

export { gsap, ScrollTrigger }
