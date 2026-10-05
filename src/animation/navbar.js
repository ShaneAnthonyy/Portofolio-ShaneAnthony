import { EASE, INDICATOR_DURATION, gsap } from './gsap.js'

export function syncIndicator(container, { animate = true } = {}) {
  if (!container || container.offsetWidth === 0) return false
  const active = container.querySelector('.navbar__link.is-active')
  const bar = container.querySelector('.navbar__indicator')
  if (!active || !bar) return false
  if (typeof window !== 'undefined' && window.getComputedStyle(bar).display === 'none') return false
  const x = active.offsetLeft
  const width = active.offsetWidth
  if (width === 0) return false
  if (animate) {
    gsap.to(bar, { x, width, duration: INDICATOR_DURATION, ease: EASE, overwrite: 'auto' })
  } else {
    gsap.set(bar, { x, width })
  }
  return true
}

export function playNavEntry({ header, logo, links, toggle, items }) {
  const tl = gsap.timeline({ defaults: { ease: EASE } })
  tl.fromTo(header, { opacity: 0 }, { opacity: 1, duration: 0.5, clearProps: 'opacity' }, 0)
  if (logo)
    tl.fromTo(
      logo,
      { opacity: 0, y: -4 },
      { opacity: 1, y: 0, duration: 0.45, clearProps: 'opacity,transform' },
      0.08
    )
  if (items?.length) {
    tl.fromTo(
      items,
      { opacity: 0, y: -4 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, clearProps: 'opacity,transform' },
      0.16
    )
  } else if (links) {
    tl.fromTo(
      links,
      { opacity: 0, y: -4 },
      { opacity: 1, y: 0, duration: 0.45, clearProps: 'opacity,transform' },
      0.16
    )
  }
  if (toggle)
    tl.fromTo(toggle, { opacity: 0 }, { opacity: 1, duration: 0.4, clearProps: 'opacity' }, 0.28)
  return tl
}

export function nudgeActiveLabel(el) {
  if (!el) return
  gsap.fromTo(
    el,
    { y: 0 },
    {
      y: -1,
      duration: 0.18,
      ease: EASE,
      yoyo: true,
      repeat: 1,
      overwrite: 'auto',
      clearProps: 'transform',
    }
  )
}
