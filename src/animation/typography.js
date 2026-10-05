import { useRef } from 'react'
import { EASE, gsap, prefersReducedMotion, useGSAP } from './gsap.js'


const playedSections = new Set()

const typeDebug =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('type-debug')

function tlog(id, event) {
  if (typeDebug) {
    // eslint-disable-next-line no-console
    console.log(`[type-debug] ${id} ${event}`)
  }
}

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
  return gsap.timeline({ defaults: { ease: EASE }, paused: true })
}

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
}

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

export function useTypeReveal(build, id) {
  const scopeRef = useRef(null)
  const playedRef = useRef(false)
  const tlRef = useRef(null)
  useGSAP(() => {
    const scope = scopeRef.current
    if (!scope) return
    if (playedRef.current || playedSections.has(id)) {
      scope.classList.add('type-animated')
      if (playedSections.has(id)) tlog(id, 'SKIP-played')
      return
    }
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return
    scope.classList.add('type-animated')
    tlog(id, 'INIT')
    auditScope(id, scope, 'SETUP')
    const small = window.matchMedia('(max-width: 720px)').matches
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
