import { useEffect, useRef, useState } from 'react'
import { profile } from '../data/content.js'
import { FOOTER_FISH } from '../data/fauna.js'
import CategoryCard from './CategoryCard.jsx'
import AmbientFish from './AmbientFish.jsx'

import { typeTimelines, useTypeReveal } from '../animation/typography.js'
import { choreographyBuilders, useSectionChoreography } from '../animation/sectionChoreography.js'

export default function Footer({ hidden = false }) {
  const year = new Date().getFullYear()
  const footRef = useRef(null)
  const typeRef = useTypeReveal(typeTimelines.footer, 'footer')
  // Meta lines only (eyebrow/title/line owned by typography).
  const choreoRef = useSectionChoreography(choreographyBuilders.footer, 'choreo-footer')
  // Bed emergence: stepped opacity from footer visibility. One observer,
  // no scroll listener, no rAF — same family as the reveal system.
  const [bed, setBed] = useState(0)

  useEffect(() => {
    const el = footRef.current
    if (!el || !('IntersectionObserver' in window)) {
      setBed(1)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        const r = entry.intersectionRatio
        setBed(r >= 0.75 ? 1 : r >= 0.5 ? 0.7 : r >= 0.25 ? 0.4 : r > 0 ? 0.15 : 0)
        if (r >= 1) obs.disconnect()
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '0px 0px -8% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <footer
      id="footer"
      className="footer"
      ref={(el) => {
        footRef.current = el
        typeRef.current = el
      }}
      inert={hidden ? '' : undefined}
      aria-hidden={hidden || undefined}
      style={{ visibility: hidden ? 'hidden' : 'visible' }}
    >
      <div className="footer-floor" aria-hidden="true" style={{ opacity: bed }} />
      {!hidden && (
        <AmbientFish sectionId="footer" defs={FOOTER_FISH} mode="hover" speed={0.1} trimTo={3} />
      )}
      <CategoryCard>
      <div className="footer__inner" ref={choreoRef}>
        <div className="footer__close">
          <p className="footer__eyebrow">Final depth · 42 cm</p>
          <p className="footer__title">End of the Dive</p>
          <p className="footer__line">Thank you for exploring.</p>
        </div>
        <p>
          {profile.name} · {profile.location}
        </p>
        <p>&copy; {year}. Designed & Built by Shane Anthony.</p>
      </div>
      </CategoryCard>
    </footer>
  )
}
