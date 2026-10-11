import { profile } from '../data/content.js'
import { typeTimelines, useTypeReveal } from '../animation/typography.js'
import HeroAquarium from './HeroAquarium.jsx'

export default function Hero({ onDiveAgain, aquariumEnabled = false, aquariumPreview = false, aquariumReady = false, performanceMode = 'normal', onAquariumVisibilityChange }) {
  const typeRef = useTypeReveal(typeTimelines.hero, 'hero')
  return (
    <section id="home" className={`section hero${aquariumEnabled || aquariumPreview ? ' hero--aquarium' : ''}`} ref={typeRef}>
      <div className="hero-arrival-water" aria-hidden="true">
        <HeroAquarium
          enabled={aquariumEnabled}
          preview={aquariumPreview}
          sceneReady={aquariumReady}
          performanceMode={performanceMode}
          onVisibilityChange={onAquariumVisibilityChange}
        />
      </div>
      <div className="hero__content">
        <h1 className="hero__title">{profile.name}.</h1>
        <p className="hero__role">{profile.role}</p>
      </div>

      {onDiveAgain && (
        <button
          type="button"
          className="hero__replay"
          aria-label="Dive again"
          onClick={onDiveAgain}
        >
          <svg className="hero__replay-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 13V3M4.5 6.5 8 3l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hero__replay-label">DIVE AGAIN</span>
        </button>
      )}
    </section>
  )
}
