import { gsap } from './gsap.js'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin.js'


gsap.registerPlugin(ScrollToPlugin)

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
  gsap.to(window, {
    duration: 0.9,
    overwrite: 'auto',
    scrollTo: {
      y: `#${targetId}`,
      offsetY: 72,
      autoKill: true,
    },
    ease: 'power3.inOut',
    onComplete: done,
    onInterrupt: done,
  })
}
