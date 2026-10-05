import { useLayoutEffect, useRef } from 'react'

export default function useScrollReveal({ threshold = 0.15, rootMargin = '0px 0px -8% 0px', enabled = true } = {}) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !enabled) {
      if (el) el.classList.remove('about-rv', 'is-visible')
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return
    el.classList.add('about-rv')
    void el.offsetHeight
    el.style.willChange = 'opacity, transform'
    const onEnd = (event) => {
      if (event.target !== el) return
      el.style.willChange = ''
      el.removeEventListener('transitionend', onEnd)
    }
    el.addEventListener('transitionend', onEnd)
    let raf = 0
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        obs.disconnect()
        raf = requestAnimationFrame(() => el.classList.add('is-visible'))
      },
      { threshold, rootMargin }
    )
    obs.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      obs.disconnect()
      el.removeEventListener('transitionend', onEnd)
    }
  }, [threshold, rootMargin, enabled])

  return ref
}
