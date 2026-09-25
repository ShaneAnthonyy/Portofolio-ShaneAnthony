import { forwardRef } from 'react'

// Static button passthrough (formerly magnetic, follow removed per user request).
const ActionButton = forwardRef(function ActionButton(
  { as: Tag = 'button', children, className = '', ...rest },
  ref
) {
  return (
    <Tag ref={ref} className={`action-btn ${className}`} {...rest}>
      <span className="action-btn__label">{children}</span>
    </Tag>
  )
})

export default ActionButton
