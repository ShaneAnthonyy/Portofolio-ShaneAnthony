import { forwardRef } from 'react'

// Static button passthrough (magnetic follow removed per user request).
const MagneticButton = forwardRef(function MagneticButton(
  { as: Tag = 'button', children, className = '', ...rest },
  ref
) {
  return (
    <Tag ref={ref} className={`magnetic-btn ${className}`} {...rest}>
      <span className="magnetic-btn__label">{children}</span>
    </Tag>
  )
})

export default MagneticButton
