import ActionButton from './ActionButton.jsx'
import { profile, stats, contact } from '../data/content.js'

export default function Hero() {
  return (
    <section id="home" className="section hero">
      <div className="hero__content">
        <p className="hero__eyebrow">
          <span className="hero__status-dot" aria-hidden="true" />
          {contact.availability}
        </p>

        <h1 className="hero__title">{profile.name}.</h1>
        <p className="hero__role">{profile.role}</p>

        <div className="hero__actions">
          <ActionButton
            className="btn btn--primary"
            onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
          >
            View my projects
          </ActionButton>
          <ActionButton
            className="btn btn--ghost"
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
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
    </section>
  )
}
