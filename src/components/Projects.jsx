import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { projects } from '../data/content.js'
import { PROJECTS_FISH } from '../data/fauna.js'
import AmbientFish from './AmbientFish.jsx'
import { typeTimelines, useTypeReveal } from '../animation/typography.js'

const N = projects.length
// Gap between adjacent card centers. Cards are absolutely positioned, so
// this constant is the single source of truth — no CSS value to mirror.
const CARD_GAP = 24
const DRAG_MIN = 60
const CLICK_SLOP = 8
const FLICK_VELOCITY = 0.5 // px/ms
const FLICK_MIN_DIST = 24
const WHEEL_THRESHOLD = 24
const WHEEL_COOLDOWN = 400 // ms

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

function PaperIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 2.75h6l4 4v10.5H5z" />
      <path d="M11 2.75v4h4M7.5 11h5M7.5 14h5" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4h5v5M16 4l-7 7" />
      <path d="M14 11v4.25a.75.75 0 0 1-.75.75h-8.5a.75.75 0 0 1-.75-.75v-8.5A.75.75 0 0 1 4.75 6H9" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" />
      <path d="m8.5 6.8 5 3.2-5 3.2z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function technologyPreview(project) {
  return project.technology?.groups
    ?.flatMap((group) => group.items || [])
    .slice(0, 3)
    .join(' · ')
}

function ProjectBanner({ project, variant = 'card' }) {
  const banner = project.banner
  const imageSrc = typeof banner === 'string'
    ? banner
    : banner?.type === 'image'
      ? banner.src
      : null
  const hasImage = Boolean(imageSrc)
  const hasPrototype = variant === 'card' && banner?.type === 'figma' && Boolean(banner.url)
  const preview = technologyPreview(project)

  return (
    <div className="slider-card__banner" aria-hidden={hasImage || hasPrototype ? undefined : 'true'}>
      {hasImage ? (
        <img src={imageSrc} alt="" draggable="false" loading="lazy" />
      ) : hasPrototype ? (
        <iframe
          src={banner.url}
          title={`${project.title} — live prototype preview`}
          loading="lazy"
          allowFullScreen
          tabIndex={-1}
          aria-hidden="true"
          style={{ width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
        />
      ) : (
        preview && <span className="slider-card__banner-stub">{preview}</span>
      )}
    </div>
  )
}

function CaseStudySection({ section }) {
  const paragraphs = section.paragraphs || (section.text ? [section.text] : [])
  const items = (section.items || []).map((item) =>
    typeof item === 'string' ? { text: item } : item
  )
  const metrics = section.metrics || []
  const points = section.points || []
  const groups = section.groups || []

  if (!paragraphs.length && !items.length && !metrics.length && !points.length && !groups.length) {
    return null
  }

  const cardItems = ['approach', 'methodology', 'features', 'architecture'].includes(section.type)

  return (
    <section className={`case-study__section case-study__section--${section.type || 'content'}`}>
      {section.title && <h4 className="case-study__section-title">{section.title}</h4>}
      {paragraphs.map((paragraph, index) => (
        <p className="case-study__paragraph" key={`${section.type}-paragraph-${index}`}>
          {paragraph}
        </p>
      ))}
      {items.length > 0 && (
        <ol className={`case-study__items${cardItems ? ' case-study__items--grid' : ''}`}>
          {items.map((item, index) => (
            <li className="case-study__item" key={item.title || item.text || index}>
              {item.number && <span className="case-study__item-number">{item.number}</span>}
              {item.title && <h5>{item.title}</h5>}
              {item.text && <p>{item.text}</p>}
            </li>
          ))}
        </ol>
      )}
      {metrics.length > 0 && (
        <div className="case-study__metrics">
          {metrics.map((metric) => (
            <div className="case-study__metric" key={`${metric.label}-${metric.value}`}>
              <strong className="case-study__metric-value">{metric.value}</strong>
              <span className="case-study__metric-label">{metric.label}</span>
              {metric.detail && <span className="case-study__metric-detail">{metric.detail}</span>}
            </div>
          ))}
        </div>
      )}
      {points.length > 0 && (
        <ul className="case-study__points">
          {points.map((point, index) => <li key={`${point}-${index}`}>{point}</li>)}
        </ul>
      )}
      {groups.length > 0 && (
        <div className="case-study__groups">
          {groups.map((group) => (
            <div className="case-study__group" key={group.title}>
              {group.title && <h5>{group.title}</h5>}
              <ul>
                {(group.items || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ProjectActions({ links }) {
  const actions = [
    { href: links.github, label: 'Source Code', icon: 'github' },
    { href: links.live, label: 'Live Demo', icon: 'external' },
    { href: links.paper, label: 'View Paper', icon: 'paper' },
    { href: links.prototype, label: 'Live Prototype', icon: 'figma' },
    { href: links.video, label: 'Video Demo', icon: 'play' },
  ].filter((action) => action.href)

  if (!actions.length) return null

  return (
    <section className="case-study__actions-section">
      <h4 className="case-study__section-title">Actions</h4>
      <div className="archive-specimen__actions">
        {actions.map((action) => (
          <a
            className="project-action"
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            key={action.label}
            aria-label={action.label}
            title={action.label}
            data-tooltip={action.label}
          >
            {action.icon === 'github' && <GitHubIcon />}
            {action.icon === 'figma' && <FigmaIcon />}
            {action.icon === 'paper' && <PaperIcon />}
            {action.icon === 'play' && <PlayIcon />}
            {action.icon === 'external' && <ExternalLinkIcon />}
          </a>
        ))}
      </div>
    </section>
  )
}

function ProjectCard({
  project,
  index,
  position,
  step,
  dragX,
  dragging,
  isActive,
  onSelect,
  onOpen,
  cardRef,
}) {
  const absPosition = Math.abs(position)
  const hidden = absPosition > 2
  const preview = technologyPreview(project)
  const offset = position * step + (dragX ?? 0)
  // Phase 13B: full cards, no mask cropping. Same markup all states.
  const sideOpacity =
    isActive ? 1 : absPosition === 1 ? 0.38 : 0
  const handleCardKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (isActive) onOpen(index)
      else onSelect(index)
    }
  }
  return (
    <article
      ref={cardRef}
      className={`slider-card${isActive ? ' is-active' : ''}${hidden ? ' is-hidden' : ''}`}
      style={{
        transform: `translateX(-50%) translateX(${offset}px) scale(${isActive ? 1 : 0.88})`,
        opacity: hidden ? 0 : sideOpacity,
        zIndex: 10 - absPosition,
        transition: dragging ? 'none' : undefined,
        pointerEvents: hidden ? 'none' : undefined,
        cursor: hidden ? 'default' : 'pointer',
      }}
      role="button"
      tabIndex={hidden ? -1 : 0}
      aria-label={isActive ? `Open details for ${project.title}` : `Show ${project.title}`}
      aria-hidden={hidden || undefined}
      data-project-index={index}
      onKeyDown={handleCardKeyDown}
    >
      <ProjectBanner project={project} />
      <div className="slider-card__body">
        <h3 className="slider-card__title">{project.title}</h3>
        {(project.role || project.year) && (
          <p className="slider-card__meta">
            {[project.role, project.year].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="slider-card__desc">{project.description}</p>
        {preview && <p className="slider-card__tech">{preview}</p>}
      </div>
    </article>
  )
}

function ProjectDetail({ project, detailRef, onClose }) {
  const detail = project.detail || {}
  const sections = detail.sections || []
  const technologyGroups = project.technology?.groups || []
  const hasOverviewSection = sections.some((section) => section.type === 'overview')
  const hasTechnologySection = sections.some((section) => section.type === 'technology')
  const overlayRef = useRef(null)

  useLayoutEffect(() => {
    const navbar = document.querySelector('.navbar')
    const overlay = overlayRef.current
    if (!navbar || !overlay) return

    const syncNavbarOffset = () => {
      overlay.style.setProperty(
        '--project-detail-nav-height',
        `${Math.ceil(navbar.getBoundingClientRect().bottom)}px`
      )
    }

    syncNavbarOffset()
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(syncNavbarOffset)
    observer?.observe(navbar)
    window.addEventListener('resize', syncNavbarOffset)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', syncNavbarOffset)
    }
  }, [])

  return (
    <div
      ref={overlayRef}
      className="slider-detail-overlay"
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        '--project-detail-nav-height': '0px',
        '--project-detail-gap': 'clamp(18px, 4vw, 48px)',
        inset: 'var(--project-detail-nav-height) 0 0',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--project-detail-gap)',
        background: 'rgba(3, 11, 20, 0.58)',
        backdropFilter: 'blur(10px) saturate(0.9)',
        WebkitBackdropFilter: 'blur(10px) saturate(0.9)',
      }}
    >
      <div
        id="project-detail-dialog"
        ref={detailRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby="project-detail-title"
        className="slider-detail"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(920px, 100%)',
          maxHeight: 'calc(100dvh - var(--project-detail-nav-height) - var(--project-detail-gap) - var(--project-detail-gap))',
          overflowY: 'auto',
          margin: 0,
          paddingTop: 'clamp(24px, 3vw, 34px)',
          scrollbarGutter: 'stable',
        }}
      >
        <button
          type="button"
          className="slider-detail__close"
          onClick={onClose}
          aria-label="Close project details"
          style={{
            position: 'sticky',
            top: 8,
            alignSelf: 'flex-end',
            marginBottom: -38,
            marginRight: -4,
            zIndex: 2,
            width: 38,
            height: 38,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            border: '1px solid var(--aqua-pill-border)',
            background: 'var(--aqua-panel-bg)',
            color: 'var(--aqua-ink)',
            cursor: 'pointer',
            fontSize: 24,
            lineHeight: 1,
          }}
        >
          <span aria-hidden="true">×</span>
        </button>

        <ProjectBanner project={project} variant="detail" />
        <header className="case-study__header">
          <h3 id="project-detail-title" className="slider-detail__title">{project.title}</h3>
          {(project.role || project.year) && (
            <p className="case-study__meta">
              {[project.role, project.year].filter(Boolean).join(' · ')}
            </p>
          )}
        </header>
        {detail.overview && !hasOverviewSection && (
          <CaseStudySection
            section={{ type: 'overview', title: 'Project Overview', text: detail.overview }}
          />
        )}
        {sections.map((section, index) => (
          <CaseStudySection section={section} key={`${section.type || 'section'}-${index}`} />
        ))}
        {!hasTechnologySection && technologyGroups.length > 0 && (
          <CaseStudySection
            section={{ type: 'technology', title: 'Technology', groups: technologyGroups }}
          />
        )}
        <ProjectActions links={project.links || {}} />
      </div>
    </div>
  )
}

// Modular distance in [-N/2, N/2): wrap is pure arithmetic, so moving
// past either end lands on the other side with no reset jump and no
// duplicated DOM. One source of truth: `active`.
function distance(index, active) {
  let d = (index - active) % N
  if (d >= N / 2) d -= N
  if (d < -N / 2) d += N
  return d
}

export default function Projects() {
  const typeRef = useTypeReveal(typeTimelines.projects, 'projects-rail')
  const [active, setActive] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)
  const [dragX, setDragX] = useState(null)
  const [step, setStep] = useState(0)
  const [trackH, setTrackH] = useState(0)
  const cardRefs = useRef({})
  const gestureRef = useRef(null)
  const wheelRef = useRef(0)
  const detailRef = useRef(null)
  const sliderViewportRef = useRef(null)

  // Card width drives the snap step; the active card's height drives the
  // track height (cards are absolutely positioned). Measured pre-paint
  // so the first frame is already correct; re-measured on resize.
  // Banner boxes use a fixed aspect ratio and text rows are clamped, so
  // heights stay stable after fonts settle.
  useLayoutEffect(() => {
    const measure = () => {
      const w = cardRefs.current[0]?.offsetWidth || 0
      setStep(w + CARD_GAP)
      const h = cardRefs.current[active]?.offsetHeight || 0
      if (h > 0) setTrackH(h)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active])

  const go = (dir) => {
    setActive((a) => (a + dir + N) % N)
    setDetailOpen(false)
    setDragX(null)
  }


  // Modal lifecycle: Escape closes it, focus moves into it, and page scroll
  // is temporarily locked while the project overlay is open.
  useEffect(() => {
    if (!detailOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setDetailOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    detailRef.current?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [detailOpen, active])

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // A card owns both interactions: a stationary pointer release opens it;
    // horizontal movement upgrades the same gesture into carousel dragging.
    // Starting on empty viewport space does nothing.
    if (e.target.closest('button, a')) return
    const card = e.target.closest('.slider-card')
    if (!card || card.classList.contains('is-hidden')) return
    const cardIndex = Number(card.dataset.projectIndex)
    if (!Number.isInteger(cardIndex)) return

    gestureRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      locked: false,
      moves: [],
      cardIndex,
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* capture unsupported — window-less drag still tracks while inside */
    }
  }

  const handlePointerMove = (e) => {
    const g = gestureRef.current
    if (!g) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    if (!g.locked) {
      // Direction lock: vertical gestures belong to page scroll.
      // touch-action: pan-y keeps them native; we simply abandon.
      if (Math.abs(dx) < CLICK_SLOP && Math.abs(dy) < CLICK_SLOP) return
      if (Math.abs(dx) < Math.abs(dy)) {
        gestureRef.current = null
        return
      }
      g.locked = true
    }
    g.moves.push({ x: e.clientX, t: performance.now() })
    if (g.moves.length > 6) g.moves.shift()
    setDragX(dx)
  }

  const endGesture = (commit) => {
    const g = gestureRef.current
    gestureRef.current = null
    if (!g) return
    if (commit !== 0) go(commit)
    else setDragX(null)
  }

  const handlePointerUp = (e) => {
    const g = gestureRef.current
    if (!g) return

    // Tap (no direction lock): side card centers, active body opens detail.
    // Button/link presses never reach here (pointerdown ignores them).
    if (!g.locked) {
      const cardIndex = g.cardIndex
      gestureRef.current = null
      setDragX(null)
      if (cardIndex !== active) selectProject(cardIndex)
      else openProject(cardIndex)
      return
    }

    const dx = e.clientX - g.startX
    const threshold = Math.max(DRAG_MIN, step * 0.25)
    let commit = 0
    if (dx <= -threshold) commit = 1
    else if (dx >= threshold) commit = -1
    else if (g.moves.length >= 2) {
      const first = g.moves[0]
      const last = g.moves[g.moves.length - 1]
      const dt = Math.max(last.t - first.t, 1)
      const v = (last.x - first.x) / dt
      if (v <= -FLICK_VELOCITY && dx <= -FLICK_MIN_DIST) commit = 1
      else if (v >= FLICK_VELOCITY && dx >= FLICK_MIN_DIST) commit = -1
    }
    endGesture(commit)
  }

  const handlePointerCancel = () => {
    // Browser took the gesture (e.g. vertical scroll): snap back.
    gestureRef.current = null
    setDragX(null)
  }

  useEffect(() => {
    const el = sliderViewportRef.current
    if (!el) return

    const onWheel = (e) => {
      if (detailOpen || N < 2) return
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY)
          ? e.deltaX
          : e.deltaY

      const threshold = e.deltaMode === 0 ? WHEEL_THRESHOLD : 1

      if (Math.abs(delta) < threshold) return

      e.preventDefault()
      e.stopPropagation()

      const now = performance.now()
      if (now - wheelRef.current < WHEEL_COOLDOWN) return

      wheelRef.current = now
      go(delta > 0 ? 1 : -1)
    }

    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('wheel', onWheel)
    }
  }, [detailOpen])

  const handleRegionKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    }
  }

  const dragging = dragX !== null
  const activeProject = projects[active]

  const selectProject = (index) => {
    setActive(index)
    setDragX(null)
    setDetailOpen(false)
  }

  const openProject = (index) => {
    setActive(index)
    setDragX(null)
    setDetailOpen(true)
  }

  return (
    <section id="projects" className="section projects" ref={typeRef}>
      <AmbientFish sectionId="projects" defs={PROJECTS_FISH} mode="ambient" speed={0.15} trimTo={2} />
      <div className="section__rail projects__head">
        <h2 className="section__title">Projects</h2>
        <p className="section__sub">
          Selected systems, experiments, and things I&apos;ve built.
        </p>
      </div>

      <div
        className="slider-region"
        role="region"
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label="Projects carousel. Scroll, drag, swipe, or use arrow keys to browse. Click a side card to show it, click the active card for details."
        onKeyDown={handleRegionKeyDown}
      >
        <p className="sr-only" aria-live="polite">
          Showing {active + 1} of {N}: {activeProject.title}
        </p>
        <div
          ref={sliderViewportRef}
          className={`slider-viewport${dragging ? ' is-dragging' : ''}`}
          title="Scroll or drag to browse. Click a side card to show it, click the active card for details."
          style={{ overscrollBehavior: 'contain' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div className="slider-track" style={trackH > 0 ? { height: trackH } : undefined}>
            {projects.map((project, index) => (
              <ProjectCard
                key={project.title}
                project={project}
                index={index}
                position={distance(index, active)}
                step={step}
                dragX={dragX}
                dragging={dragging}
                isActive={index === active}
                onSelect={selectProject}
                onOpen={openProject}
                cardRef={(el) => {
                  if (el) cardRefs.current[index] = el
                }}
              />
            ))}
          </div>
        </div>

        <div className="slider-controls">
          <button
            type="button"
            className="archive-specimen__link slider-control"
            onClick={() => go(-1)}
            aria-label="Show previous project"
          >
            <span aria-hidden="true">←</span>
            <span>Previous</span>
          </button>
          <button
            type="button"
            className="archive-specimen__link slider-control"
            onClick={() => go(1)}
            aria-label="Show next project"
          >
            <span>Next</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {detailOpen && (
          <ProjectDetail
            project={activeProject}
            detailRef={detailRef}
            onClose={() => setDetailOpen(false)}
          />
        )}
      </div>
    </section>
  )
}
