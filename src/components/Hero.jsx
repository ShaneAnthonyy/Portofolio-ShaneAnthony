import ActionButton from './ActionButton.jsx'
import { profile, stats, contact } from '../data/content.js'
import { typeTimelines, useTypeReveal } from '../animation/typography.js'
import { scrollToSection } from '../animation/scrollTo.js'

export default function Hero({ onDiveAgain }) {
  const typeRef = useTypeReveal(typeTimelines.hero, 'hero')
  return (
    <section id="home" className="section hero" ref={typeRef}>
      <div className="hero__content">
        <p className="hero__eyebrow">
          <span className="hero__status-dot" aria-hidden="true" />
          {contact.availability}
        </p>

        <h1 className="hero__title">{profile.name.split(' ').map((word) => (
          <span key={word} className="hero__title-word">{word}</span>
        ))}{'.'}</h1>
        <p className="hero__role">{profile.role}</p>

        <div className="hero__actions">
          <ActionButton
            className="btn btn--primary"
            onClick={() => scrollToSection('projects')}
          >
            View my projects
          </ActionButton>
          <ActionButton
            className="btn btn--ghost"
            onClick={() => scrollToSection('contact')}
          >
            Contact me
          </ActionButton>
          <ActionButton
            as="a"
            href={profile.cvUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn--ghost"
          >
            My CV
          </ActionButton>
        </div>

        <dl className="hero__stats">
          {stats.map((stat) => (
            <div key={stat.label} className="hero__stat">
              <dt className="hero__stat-label">{stat.label}</dt>
              <dd className="hero__stat-value">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <p className="hero__meta">{profile.location} · {contact.responseTime}</p>
      </div>

      {onDiveAgain && (
        <button
          type="button"
          className="hero__replay"
          aria-label="Dive again to the aquarium"
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
