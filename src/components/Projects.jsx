import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { projects } from '../data/content.js'
import { PROJECTS_FISH } from '../data/fauna.js'
import AmbientFish from './AmbientFish.jsx'
import { gsap, prefersReducedMotion } from '../animation/gsap.js'
import './projects-motion.css'

const N = projects.length
const previewNames = ['Sinefolis', 'Crypto Assets NER', 'Emotion Classification', 'FootFit', 'DevPath', 'TixConzer']
const previewImages = ['sinefolis', 'heuristic', 'emotion', 'footfit', 'devpath', 'tixconzer']

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

function ProjectBanner({ project, variant = 'card', deferPrototype = false, eager = false }) {
  const banner = project.banner
  const imageSrc = typeof banner === 'string'
    ? banner
    : banner?.type === 'image'
      ? banner.src
      : null
  const hasImage = Boolean(imageSrc)
  const hasPrototype = banner?.type === 'figma' && Boolean(banner.url) && !deferPrototype
  const isDetail = variant === 'detail'
  const preview = technologyPreview(project)

  return (
    <div className="slider-card__banner" aria-hidden={hasImage || hasPrototype ? undefined : 'true'}>
      {hasImage ? (
        <img src={imageSrc} alt="" draggable="false" loading={eager ? 'eager' : 'lazy'} />
      ) : hasPrototype ? (
        isDetail ? (
          <iframe
            src={banner.url}
            title={`${project.title} — live prototype`}
            loading="lazy"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 0 }}
          />
        ) : (
          <iframe
            src={banner.url}
            title={`${project.title} — live prototype preview`}
            loading="lazy"
            allowFullScreen
            tabIndex={-1}
            aria-hidden="true"
            style={{ width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
          />
        )
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

function ProjectCard({ project, index, position, featured, visible, cardRef, onActivate }) {
  const image = previewImages[index]

  return (
    <article
      ref={cardRef}
      className="tidal-card"
      data-project-index={index}
      data-position={position}
      role="button"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label={featured ? `Open case study: ${project.title}` : `Show ${project.title}`}
      aria-haspopup={featured ? 'dialog' : undefined}
      aria-controls={featured ? 'project-detail-dialog' : undefined}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onActivate(event)
        }
      }}
    >
      <div className={`tidal-card__media${image ? '' : ' tidal-card__media--prototype'}`}>
        {image ? (
          <img
            src={`/projects/${image}-960.webp`}
            alt=""
            width="960"
            height="540"
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        ) : (
          <div className="tidal-card__prototype-fallback" aria-hidden="true" />
        )}
      </div>
      <div className="tidal-card__body">
        <div className="tidal-card__content">
          <p className="tidal-card__index">{String(index + 1).padStart(2, '0')} — Featured / {String(N).padStart(2, '0')}</p>
          <p className="tidal-card__meta">{[project.role, project.year].filter(Boolean).join(' · ')}</p>
          <h3 className="tidal-card__title">{project.title}</h3>
          <p className="tidal-card__description">{project.description}</p>
          <p className="tidal-card__tech">{technologyPreview(project)}</p>
          <span className="tidal-card__action">Explore case study <span aria-hidden="true">↗</span></span>
        </div>
      </div>
      <div className="tidal-card__preview" aria-hidden="true">
        <span className="tidal-card__preview-kicker">Project {String(index + 1).padStart(2, '0')}</span>
        <span className="tidal-card__name">{previewNames[index]}</span>
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
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return
          const root = detailRef.current
          if (!root) return
          const items = root.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
          if (!items.length) return
          const first = items[0]
          const last = items[items.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }}
        style={{
          position: 'relative',
          width: 'min(920px, 100%)',
          maxHeight: 'calc(100dvh - var(--project-detail-nav-height) - var(--project-detail-gap) - var(--project-detail-gap))',
          margin: 0,
        }}
      >
        <div className="slider-detail__scroll">
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

        <ProjectBanner project={project} variant="detail" eager />
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
        {project.links?.prototype && (
          <section className="case-study__section case-study__section--prototype">
            <h4 className="case-study__section-title">Live Prototype</h4>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', overflow: 'hidden', borderRadius: 12 }}>
              <iframe
                src={project.links.prototype}
                title={`${project.title} — live prototype`}
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
            </div>
            <p className="case-study__paragraph">
              <a href={project.links.prototype} target="_blank" rel="noopener noreferrer">Open live prototype in a new tab</a>
            </p>
          </section>
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
    </div>
  )
}

function distance(index, active) {
  let value = (index - active) % N
  if (value >= N / 2) value -= N
  if (value < -N / 2) value += N
  return value
}

const clamp = (value, min, max) => Math.max(min, Math.min(value, max))
const interpolate = (start, end, amount) => start + (end - start) * amount
const smoothstep = (start, end, value) => {
  const position = clamp((value - start) / (end - start), 0, 1)
  return position * position * (3 - 2 * position)
}

function getLayout(width) {
  const mobile = width <= 760
  const tablet = width > 760 && width <= 900
  const compact = width > 900 && width <= 1100
  const gap = mobile ? 12 : 20
  const featuredWidth = mobile || tablet ? width : width * (compact ? 0.69 : 0.70)
  const featuredHeight = mobile ? Math.round(width * 9 / 16) + 390 : tablet ? 470 : compact ? 500 : 460
  const featuredMediaWidth = mobile ? featuredWidth : featuredWidth * (compact ? 0.48 : tablet ? 0.52 : 0.58)
  const featuredMediaHeight = mobile ? Math.round(width * 9 / 16) : featuredHeight
  const previewWidth = mobile || tablet ? (width - gap) / 2 : width * (compact ? 0.14 : 0.132)
  const previewMediaWidth = mobile ? 62 : tablet ? 88 : previewWidth
  const previewMediaHeight = mobile ? 70 : tablet ? 74 : Math.min(235, featuredHeight * 0.55)
  const previewHeight = mobile ? 88 : tablet ? 90 : previewMediaHeight + 55
  const below = mobile || tablet
  const centerX = (width - featuredWidth) / 2
  const previewY = below ? featuredHeight + 18 : (featuredHeight - previewHeight) / 2
  const previewRightX = width - previewWidth
  return {
    mobile,
    below,
    width,
    featuredWidth,
    featuredHeight,
    featuredMediaWidth,
    featuredMediaHeight,
    previewWidth,
    previewMediaWidth,
    previewMediaHeight,
    previewHeight,
    previewY,
    centerX,
    previewRightX,
    bodyWidth: mobile ? featuredWidth : featuredWidth - featuredMediaWidth,
    bodyHeight: mobile ? featuredHeight - featuredMediaHeight : featuredHeight,
    stageHeight: below ? featuredHeight + previewHeight + 32 : featuredHeight + 4,
  }
}

function geometry(position, layout) {
  const side = position < 0 ? -1 : 1
  const far = Math.abs(position) >= 2
  if (position === 0) {
    return {
      x: layout.centerX, y: 0,
      width: layout.featuredWidth, height: layout.featuredHeight,
      mediaWidth: layout.featuredMediaWidth,
      mediaHeight: layout.featuredMediaHeight,
      reveal: 1, alpha: 1,
    }
  }
  return {
    x: far ? (side < 0 ? -layout.previewWidth - 36 : layout.width + 36)
      : side < 0 ? 0 : layout.previewRightX,
    y: layout.previewY,
    width: layout.previewWidth,
    height: layout.previewHeight,
    mediaWidth: layout.previewMediaWidth,
    mediaHeight: layout.previewMediaHeight,
    reveal: 0,
    alpha: far ? 0 : 1,
  }
}

function paintCard(card, frame, layout) {
  if (!card) return
  const { x, y, width, height, mediaWidth, mediaHeight, reveal, alpha } = frame
  const visible = alpha > 0.003
  card.style.visibility = visible ? 'visible' : 'hidden'
  card.style.pointerEvents = visible ? 'auto' : 'none'
  if (!visible) return
  card.style.opacity = String(alpha)
  card.style.transform = `translate3d(${x}px, ${y}px, 0)`
  card.style.width = `${width}px`
  card.style.height = `${height}px`
  card.style.setProperty('--tidal-feature', String(reveal))
  const media = card.querySelector('.tidal-card__media')
  const body = card.querySelector('.tidal-card__body')
  const content = card.querySelector('.tidal-card__content')
  const preview = card.querySelector('.tidal-card__preview')
  if (media) {
    media.style.width = `${mediaWidth}px`
    media.style.height = `${mediaHeight}px`
    media.style.borderRadius = `${interpolate(11, 0, reveal)}px`
    media.style.opacity = '1'
  }
  if (body && content) {
    body.style.width = `${layout.bodyWidth}px`
    body.style.height = `${layout.bodyHeight}px`
    body.style.left = layout.mobile ? '0px' : `${mediaWidth - (1 - reveal) * layout.bodyWidth}px`
    body.style.top = layout.mobile ? `${mediaHeight - (1 - reveal) * layout.bodyHeight}px` : '0px'
    content.style.width = `${layout.bodyWidth}px`
    content.style.height = `${layout.bodyHeight}px`
    body.style.visibility = reveal < 0.005 ? 'hidden' : 'visible'
  }
  if (preview) {
    preview.style.opacity = String(frame.labelOpacity ?? (1 - reveal))
    preview.style.left = layout.below ? `${mediaWidth + 9}px` : '0px'
    preview.style.top = layout.below ? '7px' : `${mediaHeight + 10}px`
    preview.style.width = layout.below ? `${Math.max(0, width - mediaWidth - 10)}px` : `${width}px`
  }
}

export default function Projects() {
  const [active, setActive] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)
  const activeRef = useRef(0)
  const detailOpenRef = useRef(false)
  const cardRefs = useRef({})
  const stageRef = useRef(null)
  const trackRef = useRef(null)
  const controlsRef = useRef(null)
  const detailRef = useRef(null)
  const layoutRef = useRef(null)
  const animationRef = useRef(null)
  const gestureRef = useRef(null)
  const suppressClickRef = useRef(false)
  const pendingDirectionRef = useRef(0)
  const wheelRef = useRef({ acc: 0, last: 0, fired: false })
  const navigateRef = useRef(null)
  const preloadRef = useRef(false)
  const entranceRef = useRef(null)
  const gestureCleanupRef = useRef(null)

  detailOpenRef.current = detailOpen

  const paint = (from, direction = 0, progress = 0) => {
    const layout = layoutRef.current
    if (!layout) return
    projects.forEach((_, index) => {
      const original = distance(index, from)
      const starting = geometry(original, layout)
      const destination = geometry(original - direction, layout)
      const frame = {}
      Object.keys(starting).forEach((key) => {
        frame[key] = interpolate(starting[key], destination[key], progress)
      })
      if (direction !== 0 && original === 0) {
        frame.reveal = 1 - smoothstep(0, 0.65, progress)
        frame.labelOpacity = smoothstep(0.78, 1, progress)
      }
      if (direction !== 0 && original === direction) {
        frame.reveal = smoothstep(0.35, 1, progress)
        frame.labelOpacity = 1 - smoothstep(0, 0.22, progress)
      }
      if (!layout.below && Math.abs(original) <= 1 && Math.abs(original - direction) <= 1) {
        frame.mediaWidth = frame.width - frame.reveal * layout.bodyWidth
      }
      const card = cardRefs.current[index]
      if (card) {
        const incoming = original === direction
        const outgoing = original === 0
        card.style.zIndex = incoming ? '4' : outgoing ? '3' : '2'
        paintCard(card, frame, layout)
      }
    })
  }

  const cancelEntrance = () => {
    if (entranceRef.current) entranceRef.current.progress(1).kill()
    entranceRef.current = null
    const heading = stageRef.current?.closest('section')?.querySelector('.projects__head')
    if (heading) gsap.set(heading.querySelectorAll('.section__title, .section__sub'), { clearProps: 'opacity,transform' })
    if (trackRef.current) gsap.set(trackRef.current, { clearProps: 'opacity,transform' })
    if (controlsRef.current) gsap.set(controlsRef.current, { clearProps: 'opacity,transform' })
  }

  const animate = (direction, start = 0, complete = true) => {
    if (prefersReducedMotion()) {
      if (complete) {
        activeRef.current = (activeRef.current + direction + N) % N
        setActive(activeRef.current)
      }
      paint(activeRef.current)
      return
    }
    cancelEntrance()
    animationRef.current?.kill()
    const from = activeRef.current
    const tween = { progress: start }
    const end = complete ? 1 : 0
    const duration = Math.max(0.16, Math.abs(end - start) * (layoutRef.current?.mobile ? 0.88 : 1.12))
    animationRef.current = gsap.to(tween, {
      progress: end,
      duration,
      ease: complete ? 'power2.inOut' : 'power3.out',
      onUpdate: () => paint(from, direction, tween.progress),
      onComplete: () => {
        animationRef.current = null
        if (complete) {
          activeRef.current = (from + direction + N) % N
          setActive(activeRef.current)
        }
        paint(activeRef.current)
        const pending = pendingDirectionRef.current
        pendingDirectionRef.current = 0
        if (pending) navigateRef.current?.(pending)
      },
    })
  }

  const navigate = (direction) => {
    if (detailOpenRef.current) return
    if (gestureRef.current?.dragging) return
    if (animationRef.current) {
      pendingDirectionRef.current = direction
      return
    }
    animate(direction)
  }

  navigateRef.current = navigate

  useLayoutEffect(() => {
    const update = () => {
      gestureCleanupRef.current?.()
      const stage = stageRef.current
      const track = trackRef.current
      if (!stage || !track) return
      animationRef.current?.progress(1)
      const layout = getLayout(stage.clientWidth)
      layoutRef.current = layout
      track.style.height = `${layout.stageHeight}px`
      paint(activeRef.current)
    }
    update()
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      gestureCleanupRef.current?.()
      animationRef.current?.kill()
    }
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    const section = stage?.closest('section')
    if (!stage || !section || prefersReducedMotion() || !('IntersectionObserver' in window)) return
    const heading = section.querySelector('.projects__head .section__title')
    const subtitle = section.querySelector('.projects__head .section__sub')
    const targets = [heading, subtitle, trackRef.current, controlsRef.current].filter(Boolean)
    gsap.set(targets, { opacity: 0 })
    let played = false
    let intersecting = false
    const activate = () => {
      if (played || !intersecting || document.body.style.overflow === 'hidden') return
      played = true
      intersection.disconnect()
      readiness.disconnect()
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      if (heading) tl.fromTo(heading, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0)
      if (subtitle) tl.fromTo(subtitle, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 0.1)
      if (trackRef.current) tl.fromTo(trackRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.16)
      if (controlsRef.current) tl.fromTo(controlsRef.current, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, 0.38)
      tl.set(targets, { clearProps: 'opacity,transform' })
      entranceRef.current = tl
    }
    const intersection = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting && entry.intersectionRatio >= 0.18
      activate()
    }, { threshold: [0, 0.18, 0.4] })
    const readiness = new MutationObserver(activate)
    readiness.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] })
    intersection.observe(stage)
    return () => {
      intersection.disconnect()
      readiness.disconnect()
      entranceRef.current?.kill()
      gsap.set(targets, { clearProps: 'opacity,transform' })
    }
  }, [])

  useEffect(() => {
    if (preloadRef.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || preloadRef.current) return
      preloadRef.current = true
      observer.disconnect()
      previewImages.filter(Boolean).forEach((key) => {
        const image = new Image()
        image.src = `/projects/${key}-960.webp`
        image.decode?.().catch(() => {})
      })
    }, { rootMargin: '600px' })
    if (stageRef.current) observer.observe(stageRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!detailOpen) return
    const onKey = (event) => {
      if (event.key === 'Escape') setDetailOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    const previousPadding = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    window.addEventListener('keydown', onKey)
    detailRef.current?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPadding
      queueMicrotask(() => cardRefs.current[activeRef.current]?.focus({ preventScroll: true }))
    }
  }, [detailOpen])

  const onPointerDown = (event) => {
    if (event.button !== 0 || detailOpenRef.current || animationRef.current) return
    const target = event.target.closest('.tidal-card')
    if (!target || !stageRef.current?.contains(target)) return
    const gesture = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      dragging: false,
      cancelled: false,
      direction: 0,
      progress: 0,
    }
    gestureRef.current = gesture
    const cleanup = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', cancel)
      if (stageRef.current) delete stageRef.current.dataset.dragging
      gestureRef.current = null
      gestureCleanupRef.current = null
    }
    gestureCleanupRef.current = cleanup
    const move = (pointerEvent) => {
      if (pointerEvent.pointerId !== gesture.id || gesture.cancelled) return
      const dx = pointerEvent.clientX - gesture.startX
      const dy = pointerEvent.clientY - gesture.startY
      if (!gesture.dragging) {
        if (Math.abs(dy) > Math.abs(dx) * 1.15 && Math.abs(dy) > 10) {
          gesture.cancelled = true
          cleanup()
          return
        }
        if (Math.abs(dx) < 9 || Math.abs(dx) < Math.abs(dy) * 1.15) return
        gesture.dragging = true
        cancelEntrance()
        if (stageRef.current) stageRef.current.dataset.dragging = 'true'
      }
      pointerEvent.preventDefault()
      const now = performance.now()
      gesture.velocity = (pointerEvent.clientX - gesture.lastX) / Math.max(1, now - gesture.lastTime)
      gesture.lastX = pointerEvent.clientX
      gesture.lastTime = now
      gesture.direction = dx < 0 ? 1 : -1
      const width = layoutRef.current?.featuredWidth || 500
      const travel = Math.min(460, Math.max(180, width * 0.5))
      gesture.progress = clamp(Math.abs(dx) / travel, 0, 1)
      paint(activeRef.current, gesture.direction, gesture.progress)
    }
    const end = (pointerEvent) => {
      if (pointerEvent.pointerId !== gesture.id) return
      const dragging = gesture.dragging
      const direction = gesture.direction
      const progress = gesture.progress
      const velocity = gesture.velocity
      cleanup()
      if (!dragging) return
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
      const commit = progress > 0.23 || Math.abs(velocity) > 0.55
      animate(direction, progress, commit)
    }
    const cancel = (pointerEvent) => {
      if (pointerEvent.pointerId !== gesture.id) return
      const dragging = gesture.dragging
      const direction = gesture.direction
      const progress = gesture.progress
      cleanup()
      if (dragging) animate(direction, progress, false)
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', cancel)
  }

  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    const onWheel = (event) => {
      if (detailOpenRef.current || event.ctrlKey) return
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      const intentional = horizontal || event.shiftKey
      if (!intentional) return
      event.preventDefault()
      const state = wheelRef.current
      const now = performance.now()
      if (now - state.last > 220) { state.acc = 0; state.fired = false }
      state.last = now
      if (state.fired) return
      const delta = (horizontal ? event.deltaX : event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1)
      if (Math.sign(delta) !== Math.sign(state.acc)) state.acc = 0
      state.acc += delta
      if (Math.abs(state.acc) >= 56) {
        state.fired = true
        navigateRef.current?.(state.acc > 0 ? 1 : -1)
      }
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  const onRegionKeyDown = (event) => {
    if (detailOpen || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      if (!event.repeat) navigate(event.key === 'ArrowRight' ? 1 : -1)
    }
  }

  const activateProject = (index, event) => {
    if (suppressClickRef.current || animationRef.current || event.detail > 1) return
    if (index === activeRef.current) {
      setDetailOpen(true)
      return
    }
    navigate(distance(index, activeRef.current) < 0 ? -1 : 1)
  }

  const activeProject = projects[active]

  return (
    <section id="projects" className="section projects tidal-v3">
      <AmbientFish sectionId="projects" defs={PROJECTS_FISH} mode="ambient" speed={0.15} trimTo={2} />
      <div className="section__rail projects__head">
        <h2 className="section__title">Projects</h2>
        <p className="section__sub">Selected systems, experiments, and things I&apos;ve built.</p>
      </div>
      <div
        className="slider-region tidal-showcase"
        role="region"
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label="Projects carousel. Use arrow keys or swipe horizontally to browse. Select the featured project to explore its case study."
        onKeyDown={onRegionKeyDown}
      >
        <p className="sr-only" aria-live="polite">Showing {active + 1} of {N}: {activeProject.title}</p>
        <div className="tidal-stage" ref={stageRef} onPointerDown={onPointerDown}>
          <div className="tidal-track" ref={trackRef}>
            {projects.map((project, index) => {
              const position = distance(index, active)
              return (
                <ProjectCard
                  key={project.title}
                  project={project}
                  index={index}
                  position={position}
                  featured={position === 0}
                  visible={Math.abs(position) <= 1}
                  cardRef={(element) => { cardRefs.current[index] = element }}
                  onActivate={(event) => activateProject(index, event)}
                />
              )
            })}
          </div>
        </div>
        <div className="slider-controls" ref={controlsRef}>
          <button type="button" className="archive-specimen__link slider-control" onClick={() => navigate(-1)} aria-label="Show previous project">
            <span aria-hidden="true">←</span><span>Previous</span>
          </button>
          <p className="slider-counter" aria-hidden="true"><span className="slider-counter__current">{String(active + 1).padStart(2, '0')}</span><span className="slider-counter__sep"> / </span><span>{String(N).padStart(2, '0')}</span></p>
          <button type="button" className="archive-specimen__link slider-control" onClick={() => navigate(1)} aria-label="Show next project">
            <span>Next</span><span aria-hidden="true">→</span>
          </button>
        </div>
        {detailOpen && <ProjectDetail project={activeProject} detailRef={detailRef} onClose={() => setDetailOpen(false)} />}
      </div>
    </section>
  )
}
