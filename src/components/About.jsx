import { useState } from 'react'
import { about, contact, profile } from '../data/content.js'
import { ABOUT_FISH } from '../data/fauna.js'
import AmbientFish from './AmbientFish.jsx'
import { scrollToSection } from '../animation/scrollTo.js'
import useScrollReveal from '../hooks/useScrollReveal.js'
import { typeTimelines, useTypeReveal } from '../animation/typography.js'
import { choreographyBuilders, useSectionChoreography } from '../animation/sectionChoreography.js'

const TOOLKIT = [
  { title: 'Frontend', lines: ['React', 'JavaScript', 'CSS'] },
  { title: 'UI-UX', lines: ['Figma', 'Interface systems'] },
  { title: 'AI', lines: ['Machine Learning', 'Natural Language Processing'] },
]

function ToolkitIcon({ kind }) {
  const paths = {
    frontend: <path d="M8 6 3 12l5 6M16 6l5 6-5 6" />,
    uiux: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M4 12h16M12 4v16" />
      </>
    ),
    ai: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 5V3M12 21v-2M5 12H3M21 12h-2M6.3 6.3 5 5M19 19l-1.3-1.3M17.7 6.3 19 5M5 19l1.3-1.3" />
      </>
    ),
  }
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  )
}

export default function About({ unlocked = true }) {
  const [notesOpen, setNotesOpen] = useState(false)
  const typeRef = useTypeReveal(typeTimelines.about, 'about')
  const choreoRef = useSectionChoreography(choreographyBuilders.about, 'choreo-about')
  const headRef = useScrollReveal({ enabled: unlocked })
  const identityRef = useScrollReveal({ enabled: unlocked })
  const introRef = useScrollReveal({ enabled: unlocked })
  const toolkitRef = useScrollReveal({ enabled: unlocked })
  const eduRef = useScrollReveal({ enabled: unlocked })

  const gpaNote = about.education?.[1]?.note ?? ''
  const gpaMatch = gpaNote.match(/([\d.]+)\s*\/\s*([\d.]+)/)
  const gpaPct =
    gpaMatch && Number(gpaMatch[2]) > 0
      ? Math.min(100, Math.max(0, (Number(gpaMatch[1]) / Number(gpaMatch[2])) * 100))
      : 0

  return (
    <section id="about" className="section about" ref={typeRef}>
      <AmbientFish sectionId="about" defs={ABOUT_FISH} mode="ambient" speed={0.14} />
      <div className="section__layout section__layout--about-bento">
        <div className="about-bento__head" ref={headRef}>
          <h2 className="section__title about-bento__title">About Me</h2>
        </div>

        <div className="about-bento" ref={choreoRef}>
          <article className="about-card about-card--identity" aria-label="Identity" ref={identityRef}>
            <figure className="about-identity__portrait">
              <img src="/photo.png" alt={profile.name} className="about-identity__photo" />
            </figure>
            <h3 className="about-identity__name">{profile.name}</h3>
            <p className="about-identity__role">{profile.role}</p>
          </article>

          <article className="about-card about-card--intro" aria-label="Introduction" ref={introRef}>
            <p className="about-card__eyebrow">Profile</p>
            <p className="about-intro__lead">
              Computer Science student focused on building{' '}
              <span className="about-intro__accent">interactive digital experiences</span>{' '}
              across frontend, UI systems, and applied AI.
            </p>
            <div className="about-intro__actions">
              <button
                type="button"
                className="about-intro__toggle"
                aria-expanded={notesOpen}
                aria-controls="about-more"
                onClick={() => setNotesOpen((v) => !v)}
              >
                {notesOpen ? 'Show less' : 'Read more'}
              </button>
            </div>
            <div
              id="about-more"
              role="region"
              aria-label="About details"
              hidden={!notesOpen}
              className="about-intro__notes"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setNotesOpen(false)
              }}
            >
              <p>{about.summary}</p>
              <p className="about-intro__langs">
                Languages —{' '}
                {about.languages.map((lang) => `${lang.name} (${lang.level})`).join(' · ')}
              </p>
            </div>
          </article>

          <article className="about-card about-card--toolkit" aria-label="Toolkit" ref={toolkitRef}>
            <p className="about-card__eyebrow">Toolkit</p>
            <ul className="about-toolkit__grid">
              {TOOLKIT.map((group, i) => (
                <li key={group.title} className="about-toolkit__col">
                  <p className="about-toolkit__head">
                    <span className="about-toolkit__icon" aria-hidden="true">
                      <ToolkitIcon kind={['frontend', 'uiux', 'ai'][i]} />
                    </span>
                    {group.title}
                  </p>
                  <ul className="about-toolkit__chips" aria-label={`${group.title} skills`}>
                    {group.lines.map((line) => (
                      <li key={line} className="about-chip">
                        {line}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </article>

          <article className="about-card about-card--education" aria-label="Education" ref={eduRef}>
            <p className="about-card__eyebrow">Education</p>
            <ol className="about-edu__track">
              <li className="about-edu__stop">
                <span className="about-edu__dot" aria-hidden="true" />
                <span className="about-edu__node">SMAKN Anglo Lippo Cikarang</span>
                <span className="about-edu__meta">Natural Science · 2021 — 2024</span>
              </li>
              <li className="about-edu__stop">
                <span className="about-edu__dot" aria-hidden="true" />
                <span className="about-edu__node">BINUS University</span>
                <span className="about-edu__meta">Computer Science — AI · 2024 — Present</span>
                <span className="about-edu__gpa">
                  <span className="about-edu__gpa-text">{gpaNote}</span>
                  <span className="about-edu__bar" aria-hidden="true">
                    <span className="about-edu__fill" style={{ width: `${gpaPct}%` }} />
                  </span>
                </span>
              </li>
              <li className="about-edu__stop about-edu__stop--live">
                <span className="about-edu__dot" aria-hidden="true" />
                <span className="about-edu__node">Next step</span>
                <span className="about-edu__meta">{contact.availability}</span>
                <button
                  type="button"
                  className="about-edu__link"
                  onClick={() => scrollToSection('contact')}
                >
                  Let&rsquo;s connect
                </button>
              </li>
            </ol>
          </article>
        </div>
      </div>
    </section>
  )
}
