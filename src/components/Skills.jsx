import { useEffect, useMemo, useRef, useState } from 'react'
import { skillGroups } from '../data/content.js'
import FishSkill from './FishSkill.jsx'
import useFishDrift from '../hooks/useFishDrift.js'
import { typeTimelines, useTypeReveal } from '../animation/typography.js'
import { choreographyBuilders, useSectionChoreography } from '../animation/sectionChoreography.js'

// Depth-map zone per fish. INTERMEDIATE specimens only — amateur fish are
// reserved for later sections and never render here. All 7 may be hovered
// and caught. Every intermediate image file is used.
const FISH_DEFS = [
  // SURFACE — comfortable / frequently used
  { img: '/skill/intermediate1.png', skill: 'HTML', tier: 'intermediate', depth: 'back', zone: 'surface', w: 66 },
  { img: '/skill/intermediate2.png', skill: 'CSS', tier: 'intermediate', depth: 'back', zone: 'surface', w: 60 },
  { img: '/skill/intermediate3.png', skill: 'JavaScript', tier: 'intermediate', depth: 'back', zone: 'surface', w: 84 },
  { img: '/skill/intermediate6.png', skill: 'React', tier: 'intermediate', depth: 'front', zone: 'surface', w: 100 },
  { img: '/skill/intermediate7.png', skill: 'Visual Studio Code', tier: 'intermediate', depth: 'front', zone: 'surface', w: 56 },
  // MID WATER — working knowledge
  { img: '/skill/intermediate4.png', skill: 'Python', tier: 'intermediate', depth: 'front', zone: 'mid', w: 88 },
  // LOWER DEPTH — developing / foundational
  { img: '/skill/intermediate5.png', skill: 'C', tier: 'intermediate', depth: 'back', zone: 'lower', w: 68 },
]

// Supporting index: every skill discoverable without interaction.
// Fish-less skills (Figma, Vite, Problem solving, Teamwork) live here.
const ZONES = [
  {
    id: 'surface',
    no: '01',
    label: 'Surface',
    cm: '08 CM',
    desc: 'Comfortable / frequently used',
    skills: ['React', 'JavaScript', 'HTML', 'CSS', 'Visual Studio Code'],
  },
  {
    id: 'mid',
    no: '02',
    label: 'Mid Water',
    cm: '18 CM',
    desc: 'Working knowledge',
    skills: ['Python', 'Figma', 'GitHub', 'MySQL', 'Vite', 'Problem solving', 'Teamwork'],
  },
  {
    id: 'lower',
    no: '03',
    label: 'Lower Depth',
    cm: '28 CM',
    desc: 'Developing / foundational',
    skills: ['PHP', 'Java', 'C', 'Laravel'],
  },
]

// Concise neutral specimen notes, one per swimming intermediate fish.
const PRIMARY_DESC = {
  React: 'Component-driven interfaces',
  JavaScript: 'Interactive web behavior',
  Python: 'Scripting and applied AI work',
  HTML: 'Semantic structure',
  CSS: 'Styling and layout',
  'Visual Studio Code': 'Daily development environment',
  C: 'Low-level foundations',
}

// Open-water swimming corridors (fractions of field height). Fish travel
// these bands; zone information sits in the complementary space, so paths
// avoid text by construction — no per-frame collision detection.
function zoneBand(zone, H) {
  if (zone === 'surface') return [Math.max(H * 0.1, 30), Math.max(H * 0.3, 110)]
  if (zone === 'mid') return [Math.max(H * 0.4, 130), Math.max(H * 0.6, 220)]
  return [Math.max(H * 0.68, 240), Math.max(H * 0.86, 330)]
}

// Deterministic spread order across the field width (no clustering).
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

  const [hoveredId, setHoveredId] = useState(null)
  const [heldId, setHeldId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [hoverBelow, setHoverBelow] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  // Shared drift-field motion core (init / paint / rAF / visibility).
  // Interaction (pause / hold / select) stays local below.
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

  // Escape closes panel or guide; focus close on open
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
      // gentle restart if it was paused without saved velocity (edge)
      e.vx = 0.25
      e.vy = 0.1
    }
    setHeldId((h) => (h === id ? null : h))
    setHoveredId((h) => (h === id ? null : h))
  }

  // Press / touch-hold: contain the fish inside a visible bubble field.
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

  const renderVisualLayer = (depth) => {
    if (!ready) return null
    return FISH_DEFS.map((d, i) =>
      d.depth !== depth ? null : (
        <FishSkill
          key={i}
          fish={{ ...d, w: ents.current[i]?.w ?? d.w }}
          hovered={hoveredId === i}
          held={heldId === i}
          below={hoveredId === i && hoverBelow}
          selected={selectedId === i}
          outerRef={registerVisual(i)}
        />
      )
    )
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
          aria-label={`${d.skill} (${d.tier}) — press and hold to contain, release to view skill`}
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

  // DEV-only (?bubble-debug=1): flags the section so the local
  // capture-bubble binary test can reach Skills fish. Query-gated.
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
        {renderVisualLayer('back')}
      </div>

      <div className="section__layout" style={{ position: 'relative', zIndex: 10 }}>
        <aside className="section__rail">
          <p className="section__eyebrow">— 18 cm · Depth Map</p>
          <h2 className="section__title"><span className="skills-rail__l1">Skill Depth</span><span className="skills-rail__l2">Map</span></h2>
          <p className="section__sub">
            Tools I can ship with, from surface-level fluency to deeper working knowledge.
          </p>
          <p className="section__meta">01 / Surface · 02 / Mid Water · 03 / Lower Depth</p>
        </aside>

        <div className="section__body">
          <div className="depth-map" ref={choreoRef}>
            <div className="depth-map__head">
              <span className="depth-map__label">Observation field</span>
              <button
                type="button"
                className="guide-btn"
                aria-label="How to explore skills"
                aria-expanded={guideOpen}
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
                    <span className="depth-zone__no">{zone.no}</span>
                    <span className="depth-zone__label">{zone.label}</span>
                    <span className="depth-zone__cm">{zone.cm}</span>
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

      <div className="fish-layer fish-layer--front" aria-hidden="true">
        {renderVisualLayer('front')}
      </div>

      {/* Interaction layer above the content, visuals stay behind/around it */}
      <div className="fish-hit-layer">
        {renderHitLayer()}
      </div>

      {selected && (
        <div className="specimen-panel" role="dialog" aria-label={`${selected.skill} specimen`} aria-modal="false">
          <div className="specimen-panel__card">
            <span className="specimen-panel__index">
              Specimen {String((selected.id ?? 0) + 1).padStart(2, '0')}
            </span>
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
              aria-label={`Release ${selected.skill} and return it to the reef`}
            >
              Release
            </button>
          </div>
        </div>
      )}

      {guideOpen && (
        <>
          <button
            type="button"
            className="guide-scrim"
            aria-label="Close guide"
            onClick={() => setGuideOpen(false)}
            tabIndex={-1}
          />
          <div className="guide-pop" role="dialog" aria-modal="false" aria-label="How to explore skills">
            <strong className="guide-pop__title">Field guide</strong>
            <ul className="guide-pop__list">
              <li><span>Press / hold</span> — contain the fish in a bubble</li>
              <li><span>Release</span> — open its specimen label</li>
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
        </>
      )}
    </section>
  )
}
