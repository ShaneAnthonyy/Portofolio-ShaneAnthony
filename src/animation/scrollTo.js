import { gsap } from './gsap.js'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin.js'

// Phase 11H: production programmatic navigation transport. ScrollToPlugin
// only — no ScrollSmoother, no ScrollTrigger, no wrapper, no wheel handling.
// Native wheel/trackpad scrolling is untouched; only explicit nav clicks
// route through here.

gsap.registerPlugin(ScrollToPlugin)

// Reuses the existing ?nav-debug=1 gate. Silent in production.
const navDebug =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('nav-debug')

function nlog(...args) {
  if (navDebug) {
    // eslint-disable-next-line no-console
    console.log('[NAV]', ...args)
  }
}

export function scrollToSection(targetId) {
  const target = document.getElementById(targetId)
  if (!target) return
  // Reduced motion: immediate native scroll, no tween. The stylesheet
  // already forces scroll-behavior: auto under prefers-reduced-motion.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.scrollIntoView()
    return
  }
  // Per-tween scrollBehavior scoping: the index.css `html { scroll-behavior:
  // smooth }` rule fights ScrollToPlugin's per-tick writes, so neutralize it
  // inline for the tween's lifetime only. Restored on complete AND interrupt
  // (autoKill), so the document is never left inconsistent. The stylesheet
  // rule itself is untouched.
  const root = document.documentElement
  const prev = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  const done = () => {
    root.style.scrollBehavior = prev
  }
  nlog('SCROLL START target=', targetId)
  gsap.to(window, {
    duration: 0.9,
    // Newest click wins: kill any in-flight nav tween on the same target so
    // rapid clicks never double-write scrollTop. Killed tween callbacks are
    // suppressed; the winner re-asserts/restores scrollBehavior itself.
    overwrite: 'auto',
    scrollTo: {
      y: `#${targetId}`,
      offsetY: 72,
      autoKill: true,
    },
    ease: 'power3.inOut',
    onComplete: () => {
      done()
      nlog('SCROLL COMPLETE target=', targetId, 'scrollY=', Math.round(window.scrollY))
    },
    onInterrupt: () => {
      done()
      nlog('SCROLL INTERRUPTED target=', targetId, 'scrollY=', Math.round(window.scrollY))
    },
  })
}
