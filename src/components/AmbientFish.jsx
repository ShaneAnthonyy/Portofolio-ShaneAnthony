import { useRef, useState } from 'react'
import useFishDrift from '../hooks/useFishDrift.js'
import FishSkill from './FishSkill.jsx'

const ROWS = { top: [0.06, 0.3], mid: [0.38, 0.62], bottom: [0.68, 0.9], bed: [0.5, 0.88] }
const SIDES = { left: [0.02, 0.16], right: [0.84, 0.98], full: [0.04, 0.96] }
const SPREAD = [0, 2, 4, 1, 3]

// Section fauna: ambient swimming (About/Projects/Contact) or hover-only
// identification (Footer). No catch, no panel, no global-bubble reuse.
// mode: 'ambient' | 'hover'. trimTo: max fish on narrow viewports.
export default function AmbientFish({
  sectionId,
  defs,
  mode = 'ambient',
  speed = 0.16,
  trimTo = 2,
}) {
  const layerRef = useRef(null)
  const hits = useRef({})
  const [compact] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 720px)').matches
  )
  const list = compact ? defs.slice(0, trimTo) : defs

  const { ents, registerVisual, ready } = useFishDrift({
    layerRef,
    sectionId,
    defs: list,
    bandFor: (d, W, H) => {
      const [a, b] = ROWS[d.row] || ROWS.mid
      return [H * a, Math.max(H * b, H * a + 40)]
    },
    xRangeFor: (d, W, H, w) => {
      const [a, b] = SIDES[d.side] || SIDES.full
      return [W * a, Math.max(W * b - w, W * a + 1)]
    },
    speedFor: (i) => ({
      vx: (i % 2 === 0 ? 1 : -1) * (speed + (i % 3) * 0.04),
      vy: (i % 2 === 0 ? 1 : -1) * speed * 0.3,
    }),
    scaleFor: (W) => (W < 720 ? 0.7 : 1),
    spread: SPREAD,
    extraPaint: (e) => {
      const h = hits.current[e.id]
      if (h) h.style.transform = `translate3d(${e.x}px, ${e.y}px, 0)`
    },
  })

  return (
    <div ref={layerRef} className="ambient-fish-layer" aria-hidden={mode === 'ambient'}>
      {ready &&
        list.map((d, i) => (
          <FishSkill
            key={d.img}
            fish={{ ...d, w: ents.current[i]?.w ?? d.w }}
            hovered={false}
            held={false}
            below={false}
            selected={false}
            outerRef={registerVisual(i)}
          />
        ))}
      {mode === 'hover' &&
        ready &&
        list.map((d, i) => {
          const w = ents.current[i]?.w ?? d.w
          return (
            <span
              key={`hit-${d.img}`}
              ref={(el) => {
                if (el) hits.current[i] = el
              }}
              className="ambient-hit"
              style={{ width: w, height: w }}
              tabIndex={0}
              role="img"
              aria-label={`${d.skill}, ${d.tier} skill`}
            >
              <span className="ambient-tip" aria-hidden="true">
                {d.skill} · {d.tier}
              </span>
            </span>
          )
        })}
    </div>
  )
}
