import { forwardRef } from 'react'

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
