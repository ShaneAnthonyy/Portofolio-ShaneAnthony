import { choreographyBuilders, useSectionChoreography } from '../animation/sectionChoreography.js'

function slug(text) {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'gap'
}

// Depth handoff between sections. Phase 11D arrival (opacity/transform only,
// once) rides the shared choreography hook — no layout change, no new
// observer pattern, authored static state stays the reduced-motion fallback.
export default function Separator({ depth = '', label = '' }) {
  const text = label || depth
  const choreoRef = useSectionChoreography(
    choreographyBuilders.separator,
    `choreo-sep-${slug(text)}`
  )
  if (!text) {
    return (
      <div aria-hidden="true" className="depth-gap" ref={choreoRef}>
        <span className="depth-gap__line" />
      </div>
    )
  }
  return (
    <div aria-hidden="true" className="depth-gap" ref={choreoRef}>
      <span className="depth-gap__line" />
      <span className="depth-gap__label">{text}</span>
      <span className="depth-gap__line" />
    </div>
  )
}
