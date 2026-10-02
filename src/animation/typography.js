import { useRef } from 'react'
import { EASE, gsap, prefersReducedMotion, useGSAP } from './gsap.js'

// Shared typography-motion layer (Phase 11B). Whole blocks and existing
// line-spans only — no SplitText, no DOM splitting, so screen-reader
// structure is untouched. Opacity/transform tweens only.

// Module-level played registry: survives component remount (Suspense swap,
// shouldDive flip, StrictMode), so a title that already played can NEVER
// rebuild its hidden state and replay. Marked at PLAY, never reset.
const playedSections = new Set()

// DEV-only lifecycle trace (?type-debug=1). Query-gated, zero prod impact.
const typeDebug =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('type-debug')

function tlog(id, event) {
  if (typeDebug) {
    // eslint-disable-next-line no-console
    console.log(`[type-debug] ${id} ${event}`)
  }
}

// Compact rise helper: s scales durations (mobile) and distances.
function rise(tl, targets, { y = 10, d = 0.5, at = 0, stagger = 0, s = 1 } = {}) {
  if (!targets || (Array.isArray(targets) && targets.length === 0)) return tl
  tl.fromTo(
    targets,
    { opacity: 0, y: y * s },
    { opacity: 1, y: 0, duration: d * s, ease: EASE, stagger: stagger * s, overwrite: 'auto' },
    at
  )
  return tl
}

function timeline() {
  // Built paused: fromTo immediateRender establishes the hidden initial
  // state at setup (pre-paint, pre-trigger), and the hook plays it on
  // entry. Nothing is ever visible-then-hidden-then-visible.
  return gsap.timeline({ defaults: { ease: EASE }, paused: true })
}

// Per-section builders: (q, tl, s) => tl. q is gsap.utils.selector(scope).
export const typeTimelines = {
  hero(q, tl, s) {
    rise(tl, q('.hero__eyebrow'), { y: 8, d: 0.4, at: 0, s })
    rise(tl, q('.hero__title-word'), { y: 18, d: 0.6, at: 0.08, stagger: 0.08, s })
    rise(tl, q('.hero__role'), { y: 10, d: 0.5, at: 0.3, s })
    rise(tl, q('.hero__actions .btn'), { y: 10, d: 0.45, at: 0.42, stagger: 0.06, s })
    rise(tl, q('.hero__stat'), { y: 8, d: 0.45, at: 0.58, stagger: 0.06, s })
    rise(tl, q('.hero__meta'), { y: 8, d: 0.4, at: 0.68, s })
    return tl
  },
  about(q, tl, s) {
    rise(tl, q('.section__rail .section__eyebrow'), { y: 8, d: 0.4, at: 0, s })
    rise(tl, q('.section__rail .section__title'), { y: 18, d: 0.6, at: 0.09, s })
    rise(tl, q('.section__rail .section__sub'), { y: 10, d: 0.5, at: 0.2, s })
    rise(tl, q('.about-rail__fig'), { y: 8, d: 0.4, at: 0.28, s })
    rise(tl, q('.specimen__specimen-no'), { y: 8, d: 0.4, at: 0.36, s })
    rise(tl, q('.specimen__name'), { y: 18, d: 0.6, at: 0.44, s })
    rise(tl, q('.specimen__descriptor'), { y: 10, d: 0.5, at: 0.54, s })
    rise(tl, q('.specimen__caption'), { y: 10, d: 0.5, at: 0.62, s })
    rise(tl, q('.specimen__callouts'), { y: 10, d: 0.5, at: 0.7, s })
    return tl
  },
  skills(q, tl, s) {
    rise(tl, q('.section__rail .section__eyebrow'), { y: 8, d: 0.4, at: 0, s })
    rise(tl, q('.skills-rail__l1'), { y: 18, d: 0.6, at: 0.08, s })
    rise(tl, q('.skills-rail__l2'), { y: 18, d: 0.6, at: 0.15, s })
    rise(tl, q('.section__rail .section__sub'), { y: 10, d: 0.5, at: 0.26, s })
    rise(tl, q('.section__meta'), { y: 8, d: 0.4, at: 0.34, s })
    rise(tl, q('.depth-zone__label'), { y: 8, d: 0.4, at: 0.44, stagger: 0.08, s })
    return tl
  },
  projects(q, tl, s) {
    rise(tl, q('.section__rail .section__eyebrow'), { y: 8, d: 0.4, at: 0, s })
    rise(tl, q('.projects__registry'), { y: 8, d: 0.4, at: 0.08, s })
    rise(tl, q('.section__rail .section__title'), { y: 18, d: 0.6, at: 0.14, s })
    rise(tl, q('.section__rail .section__sub'), { y: 10, d: 0.5, at: 0.26, s })
    rise(tl, q('.projects__count'), { y: 8, d: 0.4, at: 0.34, s })
    return tl
  },
  certificates(q, tl, s) {
    rise(tl, q('.section__rail .section__eyebrow'), { y: 8, d: 0.4, at: 0, s })
    rise(tl, q('.section__rail .section__title'), { y: 18, d: 0.6, at: 0.09, s })
    rise(tl, q('.section__rail .section__sub'), { y: 10, d: 0.5, at: 0.2, s })
    rise(tl, q('.cabinet__count'), { y: 8, d: 0.4, at: 0.28, s })
    return tl
  },
  contact(q, tl, s) {
    rise(tl, q('.section__rail .section__eyebrow'), { y: 8, d: 0.4, at: 0, s })
    rise(tl, q('.contact-rail__l1'), { y: 18, d: 0.6, at: 0.08, s })
    rise(tl, q('.contact-rail__l2'), { y: 18, d: 0.6, at: 0.15, s })
    rise(tl, q('.section__rail .section__sub'), { y: 10, d: 0.5, at: 0.26, s })
    return tl
  },
  footer(q, tl, s) {
    const slow = s * 1.25
    rise(tl, q('.footer__eyebrow'), { y: 8, d: 0.5, at: 0, s: slow })
    rise(tl, q('.footer__title'), { y: 14, d: 0.65, at: 0.12, s: slow })
    rise(tl, q('.footer__line'), { y: 8, d: 0.5, at: 0.28, s: slow })
    return tl
  },
  // Per-entry reveal driven by the EXISTING visibleMap state (no observer).
  entry(q, tl, s) {
    rise(tl, q('.archive-specimen__marker'), { y: 8, d: 0.4, at: 0, s })
    rise(tl, q('.archive-specimen__title'), { y: 14, d: 0.5, at: 0.08, s })
    rise(tl, q('.archive-specimen__desc'), { y: 10, d: 0.45, at: 0.16, s })
    rise(tl, q('.archive-specimen__tags'), { y: 8, d: 0.4, at: 0.24, s })
    rise(tl, q('.archive-specimen__actions'), { y: 8, d: 0.4, at: 0.3, s })
    return tl
  },
}

// Setup-time ownership audit (?type-debug=1): proves no CSS animation is
// running on the title before GSAP plays. Query-gated, zero prod impact.
function auditScope(id, scope, phase) {
  if (!typeDebug) return
  let cssAnims = []
  try {
    cssAnims = (scope.getAnimations({ subtree: true }) || [])
      .filter((a) => typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation)
      .map((a) => a.animationName)
  } catch {
    cssAnims = ['unavailable']
  }
  const title = scope.querySelector('h1, h2, h3')
  const cs = title ? window.getComputedStyle(title) : null
  // eslint-disable-next-line no-console
  console.log(
    `[type-debug] ${id} ${phase} owner=GSAP typeAnimated=${scope.classList.contains('type-animated')} ` +
      `cssAnims=[${cssAnims.join(',')}] opacity=${cs ? cs.opacity : 'n/a'} transform=${cs ? cs.transform : 'n/a'}`
  )
}

// One-shot section reveal. Ownership (type-animated + hidden initial state)
// is established at setup, BEFORE first paint — the observer only decides
// WHEN TO PLAY, never when to take ownership. The authored CSS remains the
// fallback for reduced motion / no-IO (early return, class never added).
export function useTypeReveal(build, id) {
  const scopeRef = useRef(null)
  const playedRef = useRef(false)
  const tlRef = useRef(null)
  useGSAP(() => {
    const scope = scopeRef.current
    if (!scope) return
    if (playedRef.current || playedSections.has(id)) {
      // Completed remount: suppress CSS entrances, leave authored visible
      // state alone — no build, no animation, no replay.
      scope.classList.add('type-animated')
      if (playedSections.has(id)) tlog(id, 'SKIP-played')
      return
    }
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return
    scope.classList.add('type-animated')
    tlog(id, 'INIT')
    auditScope(id, scope, 'SETUP')
    const small = window.matchMedia('(max-width: 720px)').matches
    // Pre-build paused: hidden state lands before first paint / long before
    // the trigger fires, so the reveal plays exactly once with no flash.
    tlRef.current = build(gsap.utils.selector(scope), timeline(), small ? 0.7 : 1)
    tlRef.current.eventCallback('onComplete', () => tlog(id, 'COMPLETE'))
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || playedRef.current) return
        obs.disconnect()
        playedRef.current = true
        playedSections.add(id)
        tlog(id, 'ENTER-VIEW')
        tlog(id, 'PLAY')
        auditScope(id, scope, 'PLAY')
        tlRef.current?.play()
      },
      // Near-viewport band: fires as the rail/title first becomes visible,
      // never waits for mid-viewport. Short footers must be reachable.
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    )
    obs.observe(scope)
    return () => {
      tlog(id, 'CLEANUP')
      obs.disconnect()
      tlRef.current?.kill()
      tlRef.current = null
    }
  }, [])
  return scopeRef
}

// State-driven variant for ArchiveEntry: trigger is the existing `visible`
// prop (which is already viewport-timed), so no observer is added.
export function useVisibleTypeReveal(active, build, id) {
  const scopeRef = useRef(null)
  const playedRef = useRef(false)
  const tlRef = useRef(null)
  useGSAP(
    () => {
      const scope = scopeRef.current
      if (!scope) return
      if (playedRef.current || playedSections.has(id)) {
        scope.classList.add('type-animated')
        if (playedSections.has(id)) tlog(id, 'SKIP-played')
        return
      }
      if (prefersReducedMotion()) return
      scope.classList.add('type-animated')
      tlog(id, 'INIT')
      auditScope(id, scope, 'SETUP')
      // (Re)build paused so the hidden state is exact; context revert kills
      // the stale instance on each run. Play only on the active flip.
      tlRef.current?.kill()
      const small = window.matchMedia('(max-width: 720px)').matches
      tlRef.current = build(gsap.utils.selector(scope), timeline(), small ? 0.7 : 1)
      tlRef.current.eventCallback('onComplete', () => tlog(id, 'COMPLETE'))
      if (!active) return
      playedRef.current = true
      playedSections.add(id)
      tlog(id, 'PLAY')
      auditScope(id, scope, 'PLAY')
      tlRef.current.play()
      return () => {
        tlog(id, 'CLEANUP')
        tlRef.current?.kill()
        tlRef.current = null
      }
    },
    [active]
  )
  return scopeRef
}
