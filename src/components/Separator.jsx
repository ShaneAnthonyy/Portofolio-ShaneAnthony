import { choreographyBuilders, useSectionChoreography } from '../animation/sectionChoreography.js'

// Simple section separator. Arrival (opacity/transform only, once) rides
// the shared choreography hook — no layout change, no new observer
// pattern, authored static state stays the reduced-motion fallback.
export default function Separator() {
  const choreoRef = useSectionChoreography(
    choreographyBuilders.separator,
    'choreo-sep'
  )
  return (
    <div aria-hidden="true" className="depth-gap" ref={choreoRef}>
      <span className="depth-gap__line" />
    </div>
  )
}
