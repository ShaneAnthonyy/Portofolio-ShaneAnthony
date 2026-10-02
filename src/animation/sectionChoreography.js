import { useRef } from 'react'
import { EASE, gsap, prefersReducedMotion, useGSAP } from './gsap.js'

// Phase 11C: shared section-choreography layer. Restrained entrance motion
// for body content ONLY — titles/rails stay owned by typography.js, navbar
// stays owned by navbar.js, fish/bubbles/WebGL keep their own systems.
// Opacity/transform tweens only, played once, cleared to authored CSS.
//
// Ownership (disjoint selectors, no fights):
// - typography.js: .section__rail *, hero *, .specimen__{specimen-no,name,
//   descriptor,caption}, .specimen__callouts, .skills-rail__l*, .depth-zone__label,
//   .archive-specimen__{marker,title,desc,tags,actions}, footer eyebrow/title/line
// - choreography (here): porthole/toggle/divelog, depth-map head/desc/skills,
//   archive visual+kicker, cabinet records, contact console/form, footer meta,
//   depth-gap separator lines + labels (11D handoffs)
// - CSS: base state, layout, hover/focus micro-interactions, reduced-motion
// - .section__layout itself is never tweened here (App.jsx .reveal owns it)

// Module-level played registry: survives remounts (Suspense swap,
// StrictMode), so a played section can NEVER rebuild hidden state + replay.
const playedChoreo = new Set()

// Compact rise helper: s scales durations/distances (mobile).
function rise(tl, targets, { y = 10, d = 0.5, at = 0, stagger = 0, s = 1 } = {}) {
  if (!targets || (Array.isArray(targets) && targets.length === 0)) return tl
  tl.fromTo(
    targets,
    { opacity: 0, y: y * s },
    {
      opacity: 1,
      y: 0,
      duration: d * s,
      ease: EASE,
      stagger: stagger * s,
      overwrite: 'auto',
      // Return to authored CSS so CSS hover lifts keep working.
      clearProps: 'opacity,transform',
    },
    at
  )
  return tl
}

function timeline() {
  // Built paused: hidden state lands at setup, hook plays on entry.
  return gsap.timeline({ defaults: { ease: EASE }, paused: true })
}

// Per-section builders: (q, tl, s) => tl. q is gsap.utils.selector(scope).
// Small y (6-12px), short staggers, no scale/blur, no per-child excess.
export const choreographyBuilders = {
  // About body only (rail + identity/callouts owned by typography).
  about(q, tl, s) {
    rise(tl, q('.specimen__porthole'), { y: 10, d: 0.5, at: 0, s })
    rise(tl, q('.specimen__notes-toggle'), { y: 8, d: 0.4, at: 0.12, s })
    rise(tl, q('.specimen__divelog-label'), { y: 8, d: 0.4, at: 0.2, s })
    rise(tl, q('.specimen__divelog-stop'), { y: 8, d: 0.4, at: 0.28, stagger: 0.08, s })
    return tl
  },
  // Skills supporting UI only (.depth-zone__label owned by typography,
  // fish owned by the rAF drift system — never tweened here).
  skills(q, tl, s) {
    rise(tl, q('.depth-map__head'), { y: 8, d: 0.4, at: 0, s })
    rise(tl, q('.depth-zone__desc'), { y: 8, d: 0.4, at: 0.12, stagger: 0.08, s })
    rise(tl, q('.depth-zone__skill'), { y: 8, d: 0.4, at: 0.24, stagger: 0.04, s })
    return tl
  },
  // Certificates: whole-record rise implies the index/title/issuer/meta/link
  // order — no per-child GSAP, archival not flashy.
  certificates(q, tl, s) {
    rise(tl, q('.cabinet-record'), { y: 10, d: 0.5, at: 0, stagger: 0.08, s })
    return tl
  },
  // Contact console order. Parents (.contact__info/.contact__form) are NOT
  // tweened — only leaves, so panel dimensions never change.
  contact(q, tl, s) {
    rise(tl, q('.contact__console-head'), { y: 8, d: 0.4, at: 0, s })
    rise(tl, q('.contact__availability'), { y: 8, d: 0.4, at: 0.1, s })
    rise(tl, q('.contact__response'), { y: 8, d: 0.4, at: 0.18, s })
    rise(tl, q('.contact__details .contact__item'), { y: 8, d: 0.4, at: 0.26, stagger: 0.07, s })
    rise(tl, q('.contact__transmission'), { y: 8, d: 0.4, at: 0.34, s })
    rise(tl, q('.contact__form .field'), { y: 8, d: 0.4, at: 0.42, stagger: 0.07, s })
    rise(tl, q('.contact__actions'), { y: 8, d: 0.4, at: 0.54, s })
    return tl
  },
  // Footer meta lines only (eyebrow/title/line owned by typography,
  // footer fish hover-only, floor opacity owned by its own observer).
  footer(q, tl, s) {
    rise(tl, q(':scope > p'), { y: 8, d: 0.5, at: 0.28, stagger: 0.08, s: s * 1.25 })
    return tl
  },
  // Project supporting visual only (marker/title/desc/tags/actions owned by
  // the typography entry timeline). Driven by the existing visible prop.
  projectVisual(q, tl, s) {
    rise(tl, q('.archive-specimen__kicker'), { y: 8, d: 0.4, at: 0, s })
    rise(tl, q('.archive-visual'), { y: 10, d: 0.5, at: 0.08, s })
    return tl
  },
  // Phase 11D: depth-gap separators only (lines + label). Arrival-only handoff
  // between sections — opacity/transform, no height/padding/layout change.
  // Authored label opacity is 0.8; clearProps restores it after the rise.
  separator(q, tl, s) {
    rise(tl, q('.depth-gap__line'), { y: 0, d: 0.5, at: 0, stagger: 0.06, s })
    rise(tl, q('.depth-gap__label'), { y: 4, d: 0.4, at: 0.12, s })
    return tl
  },
}

// One-shot body reveal. Authored CSS remains the fallback for reduced motion
// / no-IO (early return, nothing hidden, nothing built).
export function useSectionChoreography(build, id) {
  const scopeRef = useRef(null)
  const playedRef = useRef(false)
  const tlRef = useRef(null)
  useGSAP(() => {
    const scope = scopeRef.current
    if (!scope) return
    if (playedRef.current || playedChoreo.has(id)) return
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return
    const small = window.matchMedia('(max-width: 720px)').matches
    tlRef.current = build(gsap.utils.selector(scope), timeline(), small ? 0.7 : 1)
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || playedRef.current) return
        obs.disconnect()
        playedRef.current = true
        playedChoreo.add(id)
        tlRef.current?.play()
      },
      // Meaningful entry band, never waits for viewport center.
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    )
    obs.observe(scope)
    return () => {
      obs.disconnect()
      tlRef.current?.kill()
      tlRef.current = null
    }
  }, [])
  return scopeRef
}

// State-driven variant: trigger is the existing `visible` prop (already
// viewport-timed), so no observer is added.
export function useVisibleChoreography(active, build, id) {
  const scopeRef = useRef(null)
  const playedRef = useRef(false)
  const tlRef = useRef(null)
  useGSAP(
    () => {
      const scope = scopeRef.current
      if (!scope) return
      if (playedRef.current || playedChoreo.has(id)) return
      if (prefersReducedMotion()) return
      tlRef.current?.kill()
      const small = window.matchMedia('(max-width: 720px)').matches
      tlRef.current = build(gsap.utils.selector(scope), timeline(), small ? 0.7 : 1)
      if (!active) return
      playedRef.current = true
      playedChoreo.add(id)
      tlRef.current.play()
      return () => {
        tlRef.current?.kill()
        tlRef.current = null
      }
    },
    [active]
  )
  return scopeRef
}
