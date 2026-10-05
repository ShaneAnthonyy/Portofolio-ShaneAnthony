import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { skillGroups } from '../data/content.js'
import FishSkill from './FishSkill.jsx'
import useFishDrift from '../hooks/useFishDrift.js'
import { typeTimelines, useTypeReveal } from '../animation/typography.js'
import { choreographyBuilders, useSectionChoreography } from '../animation/sectionChoreography.js'

const FISH_DEFS = [
  { img: '/skill/intermediate1.png', skill: 'HTML', tier: 'intermediate', depth: 'back', zone: 'surface', w: 66 },
  { img: '/skill/intermediate2.png', skill: 'CSS', tier: 'intermediate', depth: 'back', zone: 'surface', w: 60 },
  { img: '/skill/intermediate3.png', skill: 'JavaScript', tier: 'intermediate', depth: 'back', zone: 'surface', w: 84 },
  { img: '/skill/intermediate6.png', skill: 'React', tier: 'intermediate', depth: 'front', zone: 'surface', w: 100 },
  { img: '/skill/intermediate7.png', skill: 'Visual Studio Code', tier: 'intermediate', depth: 'front', zone: 'surface', w: 56 },
  { img: '/skill/intermediate4.png', skill: 'Python', tier: 'intermediate', depth: 'front', zone: 'mid', w: 88 },
  { img: '/skill/intermediate5.png', skill: 'C', tier: 'intermediate', depth: 'back', zone: 'lower', w: 68 },
]

const ZONES = [
  {
    id: 'frontend',
    label: 'Frontend Development',
    desc: 'Interfaces I can ship',
    skills: ['React', 'JavaScript', 'HTML', 'CSS'],
  },
  {
    id: 'backend',
    label: 'Backend Development',
    desc: 'Working knowledge',
    skills: ['Python', 'C', 'PHP', 'Java', 'MySQL'],
  },
  {
    id: 'tools',
    label: 'Tools & Frameworks',
    desc: 'Daily workflow',
    skills: ['Visual Studio Code', 'Figma', 'GitHub', 'Vite', 'Laravel'],
  },
  {
    id: 'professional',
    label: 'Professional Skills',
    desc: 'How I work',
    skills: ['Problem solving', 'Teamwork'],
  },
]

const PRIMARY_DESC = {
  React: 'Component-driven interfaces',
  JavaScript: 'Interactive web behavior',
  Python: 'Scripting and applied AI work',
  HTML: 'Semantic structure',
  CSS: 'Styling and layout',
  'Visual Studio Code': 'Daily development environment',
  C: 'Low-level foundations',
}

function zoneBand(zone, H) {
  if (zone === 'surface') return [Math.max(H * 0.1, 30), Math.max(H * 0.3, 110)]
  if (zone === 'mid') return [Math.max(H * 0.4, 130), Math.max(H * 0.6, 220)]
  return [Math.max(H * 0.68, 240), Math.max(H * 0.86, 330)]
}

const SPREAD_ORDER = [0, 3, 5, 1, 6, 2, 4]

function TierLabel({ tier }) {
  const label = tier.charAt(0).toUpperCase() + tier.slice(1)
  return <span className={`tier tier--${tier}`}>{label}</span>
}

export default function Skills() {
  const sectionRef = useRef(null)
  const typeRef = useTypeReveal(typeTimelines.skills, 'skills')
  const choreoRef = useSectionChoreography(choreographyBuilders.skills, 'choreo-skills')
  const layerBackRef = useRef(null)
  const hitEls = useRef({})
  const panelCloseRef = useRef(null)
  const guideCloseRef = useRef(null)
  const guideButtonRef = useRef(null)
  const guidePopRef = useRef(null)

  const [hoveredId, setHoveredId] = useState(null)
  const [heldId, setHeldId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [hoverBelow, setHoverBelow] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [compactGuide, setCompactGuide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
  )

  const { ents, registerVisual, ready } = useFishDrift({
    layerRef: layerBackRef,
    sectionRef,
    defs: FISH_DEFS,
    bandFor: (d, W, H) => zoneBand(d.zone, H),
    xRangeFor: (d, W, H, w) => {
      const xMin = W > 900 ? 344 : 16
      return [xMin, Math.max(W - w - 16, xMin + 1)]
    },
    speedFor: (i) => {
      const speed = 0.22 + ((i * 7) % 3) * 0.07
      const dir = i % 2 === 0 ? 1 : -1
      return { vx: dir * speed, vy: dir * speed * 0.35 }
    },
    scaleFor: (W) => (W < 720 ? 0.62 : W < 1100 ? 0.85 : 1),
    spread: SPREAD_ORDER,
    extraPaint: (e) => {
      const h = hitEls.current[e.id]
      if (h) h.style.transform = `translate3d(${e.x}px, ${e.y}px, 0)`
    },
    onHidden: () => setHoveredId(null),
  })

  const groups = useMemo(() => skillGroups, [])
  const skillMeta = useMemo(() => {
    const map = {}
    groups.forEach((g) => {
      g.items.forEach((it) => {
        map[it.name] = { group: g.label, tier: it.tier }
      })
    })
    return map
  }, [groups])

  const selected = selectedId != null ? ents.current[selectedId] || FISH_DEFS[selectedId] : null
  const selectedMeta = selected ? skillMeta[selected.skill] : null

  useEffect(() => {
    if (selectedId == null && !guideOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (guideOpen) setGuideOpen(false)
        else if (selectedId != null) setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    if (selectedId != null) panelCloseRef.current?.focus({ preventScroll: true })
    else if (guideOpen) guideCloseRef.current?.focus({ preventScroll: true })
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, guideOpen])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)')
    const update = () => setCompactGuide(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useLayoutEffect(() => {
    if (!guideOpen || !compactGuide) return

    const trigger = guideButtonRef.current
    const panel = guidePopRef.current
    if (!trigger || !panel) return

    const placePanel = () => {
      const triggerRect = trigger.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const gap = 8
      const edge = 16
      const width = Math.min(340, viewportWidth - edge * 2)

      panel.style.width = `${width}px`
      panel.style.maxHeight = `${Math.max(80, viewportHeight - edge * 2)}px`

      const panelHeight = panel.getBoundingClientRect().height
      const belowSpace = Math.max(0, viewportHeight - edge - triggerRect.bottom - gap)
      const aboveSpace = Math.max(0, triggerRect.top - edge - gap)
      const placeAbove = belowSpace < panelHeight && aboveSpace > 0
      const availableSpace = placeAbove ? aboveSpace : belowSpace
      const fittedHeight = Math.min(panelHeight, availableSpace)
      const top = placeAbove
        ? triggerRect.top - gap - fittedHeight
        : triggerRect.bottom + gap
      const left = Math.max(edge, Math.min(triggerRect.right - width, viewportWidth - edge - width))

      panel.style.maxHeight = `${Math.max(80, availableSpace)}px`
      panel.style.top = `${Math.max(edge, Math.min(top, viewportHeight - edge - fittedHeight))}px`
      panel.style.left = `${left}px`
    }

    placePanel()
    window.addEventListener('resize', placePanel)
    window.addEventListener('scroll', placePanel, true)
    window.visualViewport?.addEventListener('resize', placePanel)
    window.visualViewport?.addEventListener('scroll', placePanel)

    return () => {
      window.removeEventListener('resize', placePanel)
      window.removeEventListener('scroll', placePanel, true)
      window.visualViewport?.removeEventListener('resize', placePanel)
      window.visualViewport?.removeEventListener('scroll', placePanel)
    }
  }, [guideOpen, compactGuide])

  const pause = (id) => {
    const e = ents.current[id]
    if (!e) return
    if (e.vx !== 0 || e.vy !== 0) e.saved = { vx: e.vx, vy: e.vy }
    e.vx = 0
    e.vy = 0
    setHoverBelow(e.y < 80)
    setHoveredId(id)
  }

  const resume = (id) => {
    const e = ents.current[id]
    if (e && e.saved) {
      e.vx = e.saved.vx
      e.vy = e.saved.vy
      e.saved = null
    } else if (e && (e.vx === 0 && e.vy === 0) && selectedId !== id) {
      e.vx = 0.25
      e.vy = 0.1
    }
    setHeldId((h) => (h === id ? null : h))
    setHoveredId((h) => (h === id ? null : h))
  }

  const hold = (id) => {
    pause(id)
    setHeldId(id)
  }

  const release = (id) => {
    setHeldId((h) => (h === id ? null : h))
    resume(id)
  }

  const selectFish = (id) => {
    setHoveredId(null)
    setHeldId(null)
    setSelectedId((s) => (s === id ? null : id))
  }

  const releaseFish = () => setSelectedId(null)

  const guidePanel = guideOpen && (
    <div
      ref={guidePopRef}
      id="skills-guide"
      className={`guide-pop${compactGuide ? ' guide-pop--mobile' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-label="How to explore skills"
    >
      <strong className="guide-pop__title">How to explore</strong>
      <ul className="guide-pop__list">
        <li><span>Hover</span> — preview a skill</li>
        <li><span>Select</span> — open its details</li>
        <li><span>Keyboard</span> — Enter / Space selects</li>
      </ul>
      <button
        ref={guideCloseRef}
        type="button"
        className="guide-pop__close"
        onClick={() => setGuideOpen(false)}
      >
        Close
      </button>
    </div>
  )

  const renderVisualLayer = () => {
    if (!ready) return null
    return FISH_DEFS.map((d, i) => (
      <FishSkill
        key={i}
        fish={{ ...d, w: ents.current[i]?.w ?? d.w }}
        hovered={hoveredId === i}
        held={heldId === i}
        below={hoveredId === i && hoverBelow}
        selected={selectedId === i}
        outerRef={registerVisual(i)}
      />
    ))
  }

  const renderHitLayer = () => {
    if (!ready) return null
    return FISH_DEFS.map((d, i) => {
      const w = ents.current[i]?.w ?? d.w
      const isSel = selectedId === i
      const isHeld = heldId === i
      return (
        <button
          key={i}
          ref={(el) => {
            if (el) hitEls.current[i] = el
          }}
          type="button"
          className={`fish-hit${isSel ? ' is-selected' : ''}${isHeld ? ' is-held' : ''}`}
          style={{ width: w }}
          aria-label={`${d.skill} — select to view details`}
          aria-pressed={isSel}
          onMouseEnter={() => pause(i)}
          onMouseLeave={() => resume(i)}
          onFocus={() => pause(i)}
          onBlur={() => resume(i)}
          onPointerDown={() => hold(i)}
          onPointerUp={() => release(i)}
          onPointerLeave={() => release(i)}
          onPointerCancel={() => release(i)}
          onClick={() => selectFish(i)}
        >
          <img src={d.img} alt="" aria-hidden="true" draggable="false" />
        </button>
      )
    })
  }

  const [debugBubbles] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('bubble-debug')
  )

  return (
    <section
      id="skills"
      ref={(el) => {
        sectionRef.current = el
        typeRef.current = el
      }}
      className={`section skills${debugBubbles ? ' bubble-debug' : ''}`}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div ref={layerBackRef} className="fish-layer fish-layer--back" aria-hidden="true">
        {renderVisualLayer()}
      </div>

      <div className="section__layout" style={{ position: 'relative', zIndex: 10 }}>
        <aside className="section__rail">
          <h2 className="section__title"><span className="skills-rail__l1">Skill</span><span className="skills-rail__l2">Map</span></h2>
          <p className="section__sub">
            Technologies I can ship with, from interfaces to working systems.
          </p>
        </aside>

        <div className="section__body">
          <div className="depth-map" ref={choreoRef}>
            <div className="depth-map__head">
              <button
                type="button"
                className="guide-btn"
                ref={guideButtonRef}
                aria-label="How to explore skills"
                aria-expanded={guideOpen}
                aria-controls="skills-guide"
                aria-haspopup="dialog"
                onClick={() => setGuideOpen((v) => !v)}
              >
                ?
              </button>
            </div>
            <ol className="depth-map__zones">
              {ZONES.map((zone) => (
                <li key={zone.id} className={`depth-zone depth-zone--${zone.id}`}>
                  <p className="depth-zone__head">
                    <span className="depth-zone__label">{zone.label}</span>
                  </p>
                  <p className="depth-zone__desc">{zone.desc}</p>
                  <ul className="depth-zone__index" aria-label={`${zone.label} skills`}>
                    {zone.skills.map((name) => {
                      const meta = skillMeta[name]
                      return (
                        <li key={name} className="depth-zone__skill">
                          <span>{name}</span>
                          {meta && <TierLabel tier={meta.tier} />}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="fish-hit-layer">
        {renderHitLayer()}
      </div>

      {selected && (
        <div className="specimen-panel" role="dialog" aria-label={`${selected.skill} details`} aria-modal="false">
          <div className="specimen-panel__card">
            <strong className="specimen-panel__name">{selected.skill}</strong>
            <span className="specimen-panel__meta">
              <TierLabel tier={selected.tier} />
            </span>
            {selectedMeta && (
              <span className="specimen-panel__group">{selectedMeta.group}</span>
            )}
            <span className="specimen-panel__note">
              {PRIMARY_DESC[selected.skill] ?? 'Part of the working toolkit'}
            </span>
            <button
              ref={panelCloseRef}
              type="button"
              className="specimen-panel__close"
              onClick={releaseFish}
              aria-label={`Close ${selected.skill} details`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {guideOpen && (
        <button
          type="button"
          className="guide-scrim"
          aria-label="Close guide"
          onClick={() => setGuideOpen(false)}
          tabIndex={-1}
        />
      )}
      {compactGuide ? guideOpen && createPortal(guidePanel, document.body) : guidePanel}
    </section>
  )
}
