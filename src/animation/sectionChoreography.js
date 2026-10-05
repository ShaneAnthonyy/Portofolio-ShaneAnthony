import { useRef } from 'react'
import { EASE, gsap, prefersReducedMotion, useGSAP } from './gsap.js'


const playedChoreo = new Set()

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
      clearProps: 'opacity,transform',
    },
    at
  )
  return tl
}

function timeline() {
  return gsap.timeline({ defaults: { ease: EASE }, paused: true })
}

export const choreographyBuilders = {
  about(q, tl, s) {
    return tl
  },
  skills(q, tl, s) {
    rise(tl, q('.depth-map__head'), { y: 8, d: 0.4, at: 0, s })
    rise(tl, q('.depth-zone__desc'), { y: 8, d: 0.4, at: 0.12, stagger: 0.08, s })
    rise(tl, q('.depth-zone__skill'), { y: 8, d: 0.4, at: 0.24, stagger: 0.04, s })
    return tl
  },
  certificates(q, tl, s) {
    rise(tl, q('.cabinet-record'), { y: 10, d: 0.5, at: 0, stagger: 0.08, s })
    return tl
  },
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
  footer(q, tl, s) {
    rise(tl, q(':scope > p'), { y: 8, d: 0.5, at: 0.28, stagger: 0.08, s: s * 1.25 })
    return tl
  },
  separator(q, tl, s) {
    rise(tl, q('.depth-gap__line'), { y: 0, d: 0.5, at: 0, stagger: 0.06, s })
    rise(tl, q('.depth-gap__label'), { y: 4, d: 0.4, at: 0.12, s })
    return tl
  },
}

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
