import { gsap } from './gsap.js'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin.js'


gsap.registerPlugin(ScrollToPlugin)

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
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.scrollIntoView()
    return
  }
  const root = document.documentElement
  const prev = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  const done = () => {
    root.style.scrollBehavior = prev
  }
  nlog('SCROLL START target=', targetId)
  gsap.to(window, {
    duration: 0.9,
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
