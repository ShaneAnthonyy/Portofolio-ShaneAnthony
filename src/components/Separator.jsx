import { choreographyBuilders, useSectionChoreography } from '../animation/sectionChoreography.js'

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
