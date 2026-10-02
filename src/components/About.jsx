import { useState } from 'react'
import { about, contact, profile } from '../data/content.js'
import { ABOUT_FISH } from '../data/fauna.js'
import AmbientFish from './AmbientFish.jsx'
import { typeTimelines, useTypeReveal } from '../animation/typography.js'
import { choreographyBuilders, useSectionChoreography } from '../animation/sectionChoreography.js'

const CALLOUTS = [
  { n: '01', title: 'Frontend', lines: ['React', 'JavaScript', 'CSS'] },
  { n: '02', title: 'UI / UX', lines: ['Figma', 'Interface systems'] },
  { n: '03', title: 'AI', lines: ['Machine Learning', 'Natural Language Processing'] },
  {
    n: '04',
    title: 'Education',
    lines: ['BINUS University', 'Computer Science — AI', 'GPA 3.48 / 4.00'],
  },
  { n: '05', title: 'Current status', lines: [contact.availability] },
]

const DIVE_LOG = [
  { node: 'SMAKN Anglo Lippo Cikarang', meta: 'Natural Science · 2021 — 2024' },
  { node: 'BINUS University', meta: 'Computer Science — AI · 2024 — Present' },
  { node: 'Next dive', meta: contact.availability, live: true },
]

export default function About() {
  const [notesOpen, setNotesOpen] = useState(false)
  const typeRef = useTypeReveal(typeTimelines.about, 'about')
  const choreoRef = useSectionChoreography(choreographyBuilders.about, 'choreo-about')

  return (
    <section id="about" className="section about" ref={typeRef}>
      <AmbientFish sectionId="about" defs={ABOUT_FISH} mode="ambient" speed={0.14} />
      <div className="section__layout section__layout--specimen">
        <aside className="section__rail">
          <p className="section__eyebrow">— 08 cm · Specimen study</p>
          <h2 className="section__title">Field Notes</h2>
          <p className="section__sub">
            Software Developer crafting clean interfaces and usable experiences through real projects.
          </p>
          <p className="about-rail__fig">Plate I — collector&apos;s notes</p>
        </aside>

        <div className="section__body" ref={choreoRef}>
          <div className="specimen">
            <div className="specimen__plate">
              <figure className="specimen__porthole">
                <img src="/photo.png" alt={profile.name} className="specimen__photo" />
                <figcaption className="specimen__figcap">fig. 01 — field portrait</figcaption>
              </figure>

              <div className="specimen__identity">
                <p className="specimen__specimen-no">Specimen 01</p>
                <h3 className="specimen__name">{profile.name}</h3>
                <p className="specimen__descriptor">
                  {profile.role}
                </p>
                <p className="specimen__caption">
                  Computer Science student focused on building interactive digital
                  experiences across frontend, UI systems, and applied AI.
                </p>
                <button
                  type="button"
                  className="specimen__notes-toggle"
                  aria-expanded={notesOpen}
                  aria-controls="field-notes"
                  onClick={() => setNotesOpen((v) => !v)}
                >
                  {notesOpen ? 'Close field notes' : 'Read field notes'}
                </button>
                <div
                  id="field-notes"
                  role="region"
                  aria-label="Field notes"
                  hidden={!notesOpen}
                  className="specimen__notes"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setNotesOpen(false)
                  }}
                >
                  <p>{about.summary}</p>
                  <p className="specimen__notes-langs">
                    Languages —{' '}
                    {about.languages.map((lang) => `${lang.name} (${lang.level})`).join(' · ')}
                  </p>
                </div>
              </div>

              <ul className="specimen__callouts" aria-label="Specimen annotations">
                {CALLOUTS.map((callout) => (
                  <li key={callout.n} className="specimen__callout">
                    <span className="specimen__callout-no" aria-hidden="true">
                      {callout.n}
                    </span>
                    <span className="specimen__callout-body">
                      <span className="specimen__callout-title">{callout.title}</span>
                      {callout.lines.map((line) => (
                        <span key={line} className="specimen__callout-line">
                          {line}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="specimen__divelog">
              <p className="specimen__divelog-label">Dive log</p>
              <ol className="specimen__divelog-track">
                {DIVE_LOG.map((entry) => (
                  <li
                    key={entry.node}
                    className={`specimen__divelog-stop${entry.live ? ' is-live' : ''}`}
                  >
                    <span className="specimen__divelog-dot" aria-hidden="true" />
                    <span className="specimen__divelog-node">{entry.node}</span>
                    <span className="specimen__divelog-meta">{entry.meta}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
