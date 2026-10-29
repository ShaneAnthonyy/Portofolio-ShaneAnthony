import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { formatWorldTime, PRESETS, worldTime } from '../animation/worldTime.js'
import './world-time.css'

export default function WorldTimeController({ triggerRef }) {
  const snapshot = useSyncExternalStore(worldTime.subscribe, worldTime.getSnapshot)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 16, left: 16 })
  const panelRef = useRef(null)
  const id = useId()
  const nextDay = snapshot.sliderOffset >= 1140
  const time = formatWorldTime(snapshot.minutes)

  const close = (restore = false) => {
    worldTime.flushInput()
    setOpen(false)
    if (restore) triggerRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const trigger = triggerRef.current.getBoundingClientRect()
    const width = panel.offsetWidth, height = panel.offsetHeight
    setPosition({
      left: Math.max(12, Math.min(trigger.right - width, window.innerWidth - width - 12)),
      top: Math.max(12, Math.min(trigger.bottom + 10, window.innerHeight - height - 12)),
    })
    panel.querySelector('button')?.focus({ preventScroll: true })
    const outside = event => {
      if (!panel.contains(event.target) && !triggerRef.current?.contains(event.target)) close()
    }
    const key = event => {
      if (event.key === 'Escape') { event.stopPropagation(); close(true) }
    }
    const resized = () => close(true)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    panel.addEventListener('keydown', key)
    window.addEventListener('resize', resized)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      panel.removeEventListener('keydown', key)
      window.removeEventListener('resize', resized)
    }
  }, [open, triggerRef])

  return <>
    <button ref={triggerRef} type="button" className="world-time-trigger"
      aria-label="World Time" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      title="World Time" onClick={() => open ? close() : setOpen(true)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" />
      </svg>
    </button>
    {open && createPortal(<div id={id} ref={panelRef} role="dialog" aria-modal="false" aria-labelledby={`${id}-title`}
      className="world-time-panel" style={position}>
      <div className="world-time-panel__head">
        <strong id={`${id}-title`}>World Time</strong>
        <button type="button" aria-label="Close World Time" onClick={() => close(true)}>×</button>
      </div>
      <div className="world-time-panel__modes" role="group" aria-label="Time mode">
        {['live', 'manual'].map(mode => <button key={mode} type="button" aria-pressed={snapshot.mode === mode}
          onClick={() => worldTime.setMode(mode)}>{mode === 'live' ? 'Live' : 'Manual'}</button>)}
      </div>
      <div className="world-time-panel__readout"><output htmlFor={`${id}-range`} aria-live="off">{time}</output><span>{snapshot.environment.label}</span></div>
      <label htmlFor={`${id}-range`}>Time of day{nextDay ? ' · next day' : ''}</label>
      <input id={`${id}-range`} type="range" min="0" max="1440" step="1" value={snapshot.sliderOffset}
        aria-valuetext={`${time}${nextDay ? ', next day' : ''}`}
        onChange={event => worldTime.setTimeline(Number(event.target.value))} />
      <div className="world-time-panel__ends"><span>05:00</span><span>05:00 +1 day</span></div>
      <div className="world-time-panel__presets" role="group" aria-label="Time presets">
        {Object.entries(PRESETS).map(([label, minutes]) => <button key={label} type="button"
          onClick={() => worldTime.setPreset(label)}>{label}<small>{formatWorldTime(minutes)}</small></button>)}
      </div>
      <p>Live follows your device clock. Manual holds the selected time.</p>
    </div>, document.body)}
  </>
}
