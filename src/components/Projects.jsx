import { useEffect, useRef, useState } from 'react'
import { projects } from '../data/content.js'
import { PROJECTS_FISH } from '../data/fauna.js'
import AmbientFish from './AmbientFish.jsx'
import { typeTimelines, useTypeReveal, useVisibleTypeReveal } from '../animation/typography.js'
import { choreographyBuilders, useVisibleChoreography } from '../animation/sectionChoreography.js'

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

function FigmaIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M5.5 1h3a2 2 0 0 1 0 4h-3V1Z" fill="currentColor" stroke="none" opacity="0.9" />
      <path d="M2.5 1h3v4h-3a2 2 0 0 1 0-4Z" />
      <path d="M2.5 5h3v4h-3a2 2 0 0 1 0-4Z" />
      <circle cx="10.5" cy="3" r="2" />
      <path d="M5.5 9h3a2 2 0 0 1 0 4h-3V9Z" />
      <path d="M2.5 9h3v4h-3a2 2 0 0 1 0-4Z" />
      <circle cx="10.5" cy="11" r="2" />
    </svg>
  )
}

function PrototypeEmbed({ project }) {
  const wrapRef = useRef(null)
  const [near, setNear] = useState(false)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || !('IntersectionObserver' in window)) {
      setNear(true)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true)
          obs.disconnect()
        }
      },
      { rootMargin: '400px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  if (!project.figma) return null

  return (
    <div ref={wrapRef} className="project-card__embed">
      {near && active ? (
        <iframe
          src={project.figma}
          title={`${project.title} — interactive prototype`}
          loading="lazy"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="project-card__embed-fallback"
          onClick={() => setActive(true)}
          aria-label={`Load interactive prototype for ${project.title}`}
        >
          <FigmaIcon />
          <span>{near ? 'Load live prototype' : 'Prototype below'}</span>
          <small>Figma embed loads on demand</small>
        </button>
      )}
    </div>
  )
}

function ArchiveVisual({ project, index, total }) {
  return (
    <div className="archive-visual" aria-hidden={project.figma ? undefined : 'true'}>
      <span className="archive-visual__tag">
        Field view · {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
      <span className="archive-visual__plate">
        <span className="archive-visual__no">{String(index + 1).padStart(2, '0')}</span>
        <span className="archive-visual__stack">{project.stack}</span>
      </span>
      <PrototypeEmbed project={project} />
    </div>
  )
}

function ArchiveEntry({ project, index, total, visible }) {
  const entryRef = useVisibleTypeReveal(visible, typeTimelines.entry, `entry-${index}`)
  // Supporting visual only (marker/title/desc/tags/actions owned by the
  // entry timeline above). Same visible prop, no new observer.
  const visualRef = useVisibleChoreography(visible, choreographyBuilders.projectVisual, `choreo-entry-${index}`)
  const tags = project.stack
    .split('·')
    .map((t) => t.trim())
    .filter(Boolean)
  return (
    <article
      ref={(el) => {
        entryRef.current = el
        visualRef.current = el
      }}
      className={`archive-specimen reveal${project.featured ? ' archive-specimen--lead' : ''}${visible ? ' is-visible' : ''}`}
      data-specimen={index}
    >
      <span className="archive-specimen__marker" aria-hidden="true">
        <span className="archive-specimen__marker-no">Archive {String(index + 1).padStart(2, '0')}</span>
        <span className="archive-specimen__marker-depth">24 CM</span>
      </span>
      <ArchiveVisual project={project} index={index} total={total} />
      <div className="archive-specimen__info">
        <p className="archive-specimen__kicker">
          Archive {String(index + 1).padStart(2, '0')} · Field system
          {project.featured ? ' · Lead specimen' : ''}
        </p>
        <h3 className="archive-specimen__title">{project.title}</h3>
        <p className="archive-specimen__desc">{project.description}</p>
        <ul className="archive-specimen__tags" aria-label={`Technologies used in ${project.title}`}>
          {tags.map((tag) => (
            <li key={tag} className="archive-specimen__tag">
              {tag}
            </li>
          ))}
        </ul>
        <div className="archive-specimen__actions">
          <a
            className="archive-specimen__link"
            href={project.github}
            target="_blank"
            rel="noreferrer"
            aria-label={`View ${project.title} project`}
          >
            <GitHubIcon />
            <span>View project</span>
          </a>
          {project.figma ? (
            <a
              className="archive-specimen__link"
              href={project.figma}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${project.title} prototype in Figma`}
            >
              <FigmaIcon />
              <span>Live prototype</span>
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default function Projects() {
  const listRef = useRef(null)
  const typeRef = useTypeReveal(typeTimelines.projects, 'projects-rail')
  const [current, setCurrent] = useState(1)
  const [announced, setAnnounced] = useState(1)
  const total = projects.length

  // is-visible lives in React state (not DOM classList): re-renders would
  // wipe a DOM-added class via the className prop, stranding specimens
  // at opacity 0.
  const [visibleMap, setVisibleMap] = useState({})

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const cards = Array.from(list.querySelectorAll('[data-specimen]'))
    if (cards.length === 0) return
    const markAll = () => {
      const all = {}
      cards.forEach((c) => {
        const i = Number(c.getAttribute('data-specimen'))
        if (Number.isFinite(i)) all[i] = true
      })
      setVisibleMap(all)
    }
    if (!('IntersectionObserver' in window)) {
      markAll()
      return
    }
    // Archival position readout only — no dimming, no scroll interception.
    const countObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const i = Number(entry.target.getAttribute('data-specimen'))
            if (Number.isFinite(i)) setCurrent(i + 1)
          }
        })
      },
      { root: null, rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    )
    // Per-entry reveal, mirroring the app-wide reveal pattern.
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            const el = entry.target
            const idx = Number(el.getAttribute('data-specimen'))
            el.style.transitionDelay = `${Math.min(i * 60, 180)}ms`
            if (Number.isFinite(idx)) {
              setVisibleMap((m) => (m[idx] ? m : { ...m, [idx]: true }))
            }
            revealObs.unobserve(el)
            // One-shot: clear the entrance stagger after reveal.
            window.setTimeout(() => {
              el.style.transitionDelay = ''
            }, 800)
          }
        })
      },
      { threshold: 0.12 }
    )
    cards.forEach((c) => {
      countObs.observe(c)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const idx = Number(c.getAttribute('data-specimen'))
        if (Number.isFinite(idx)) {
          setVisibleMap((m) => ({ ...m, [idx]: true }))
        }
      } else {
        revealObs.observe(c)
      }
    })
    return () => {
      countObs.disconnect()
      revealObs.disconnect()
    }
  }, [])

  // Debounced live-region: visuals update instantly, SR hears settled value.
  useEffect(() => {
    const t = window.setTimeout(() => setAnnounced(current), 300)
    return () => window.clearTimeout(t)
  }, [current])

  return (
    <section id="projects" className="section projects" ref={typeRef}>
      <AmbientFish sectionId="projects" defs={PROJECTS_FISH} mode="ambient" speed={0.15} trimTo={2} />
      <div className="section__layout">
        <aside className="section__rail">
          <p className="section__eyebrow">— 24 cm · Archive</p>
          <p className="projects__registry">Archive / {String(total).padStart(2, '0')} entries</p>
          <h2 className="section__title">Field Archive</h2>
          <p className="section__sub">
            Selected systems, experiments, and things I&apos;ve built.
          </p>
          <p className="projects__count" aria-live="polite">
            <span className="projects__count-now">Archive {String(current).padStart(2, '0')}</span>
            <span aria-hidden="true"> / {String(total).padStart(2, '0')} entries</span>
            <span className="sr-only">Showing specimen {announced} of {total}</span>
          </p>
          <span className="projects__bar" aria-hidden="true">
            <span className="projects__bar-fill" style={{ transform: `scaleX(${current / total})` }} />
          </span>
        </aside>

        <div className="section__body">
          <div ref={listRef} className="archive-flow">
            {projects.map((project, index) => (
              <ArchiveEntry key={project.title} project={project} index={index} total={total} visible={!!visibleMap[index]} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
