import { EASE, INDICATOR_DURATION, gsap } from './gsap.js'

// Measures the active link inside the links container and moves the shared
// underline indicator to it. Discrete calls only (activeId / phase / resize)
// — never per scroll frame. Falls back to instant set when animate=false.
export function syncIndicator(container, { animate = true } = {}) {
  if (!container || container.offsetWidth === 0) return false
  const active = container.querySelector('.navbar__link.is-active')
  const bar = container.querySelector('.navbar__indicator')
  if (!active || !bar) return false
  // Bar is CSS-hidden in detached/docking phases and on mobile; the
  // per-link ::after (or pill) owns the active state there instead.
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

// One-time settling entrance after the dive unlocks the portfolio.
// The header container animates opacity ONLY — detached/docking phases
// center it via CSS translateX(-50%), which a leftover inline transform
// would permanently override. Toggle animates opacity ONLY — its transform
// is owned by theme docking. clearProps returns every element to authored
// CSS the moment its tween completes.
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

// Tiny settle on the newly active label. Color stays in CSS; the inline
// transform is cleared after so the CSS hover lift keeps working.
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
