import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

// Shared motion language for GSAP-driven UI. Core only — no ScrollTrigger,
// no Flip, no loops, no listeners here. All tweens use transforms/opacity.
export const EASE = 'power3.out'
export const INDICATOR_DURATION = 0.38
export const ENTRY_DURATION = 0.6

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export { gsap, useGSAP }
