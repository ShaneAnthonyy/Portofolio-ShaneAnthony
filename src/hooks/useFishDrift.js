import { useEffect, useRef, useState } from 'react'

// Shared drift-field motion core for aquarium fauna. One rAF loop per
// mounted field, idle while its section is offscreen. No per-frame React
// state — positions are written straight to the DOM.
//
// Config:
//   defs       [{ img, skill, tier, w, ... }] (w = base width px)
//   bandFor    (def, W, H) => [yMin, yMax] drift band in px
//   xRangeFor  (def, W, H, w) => [xMin, xMax] horizontal bounds in px
//   speedFor   (i, def) => { vx, vy } base velocity (reduced-motion => 0)
//   scaleFor   (W) => scale factor for fish width
//   spread     optional deterministic slot order across the width
//   extraPaint (entity) => void — position auxiliary nodes (hit targets)
//   onHidden   () => void — section left the viewport
export default function useFishDrift({
  layerRef,
  sectionRef,
  sectionId,
  defs,
  bandFor,
  xRangeFor,
  speedFor,
  scaleFor,
  spread,
  extraPaint,
  onHidden,
}) {
  const ents = useRef([])
  const visuals = useRef({})
  const visibleRef = useRef(true)
  const rafRef = useRef(0)
  const frameRef = useRef(0)
  const cfgRef = useRef(null)
  const [ready, setReady] = useState(false)
  cfgRef.current = { defs, bandFor, xRangeFor, speedFor, scaleFor, spread, extraPaint, onHidden }

  const registerVisual = (id) => (el) => {
    if (el) visuals.current[id] = el
  }

  const paint = () => {
    const cfg = cfgRef.current
    for (const e of ents.current) {
      const dir = e.vx >= 0 ? 1 : -1
      const v = visuals.current[e.id]
      if (v) {
        v.style.transform = `translate3d(${e.x}px, ${e.y}px, 0)`
        v.style.setProperty('--fish-dir', String(dir))
      }
      if (cfg.extraPaint) cfg.extraPaint(e)
    }
  }

  // Deterministic init once the layer size is known (no RNG clustering).
  useEffect(() => {
    const cfg = cfgRef.current
    const layer = layerRef.current
    if (!layer) return
    const W = layer.clientWidth || 800
    const H = layer.clientHeight || 500
    const scale = cfg.scaleFor ? cfg.scaleFor(W) : 1
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const n = cfg.defs.length
    const order = cfg.spread && cfg.spread.length ? cfg.spread : cfg.defs.map((_, i) => i)
    ents.current = cfg.defs.map((d, i) => {
      const w = Math.round(d.w * scale)
      const [yMin, yMax] = cfg.bandFor(d, W, H)
      const [xMin, xMax] = cfg.xRangeFor(d, W, H, w)
      const slot = order[i % order.length]
      const span = Math.max(xMax - xMin, 1)
      const v = cfg.speedFor(i, d)
      const mid = (yMin + yMax) / 2 + ((i % 3) - 1) * ((yMax - yMin) / 5)
      return {
        ...d,
        id: i,
        w,
        x: xMin + ((slot + 0.5) / n) * span,
        y: Math.min(Math.max(mid, yMin), yMax),
        vx: reduced ? 0 : v.vx,
        vy: reduced ? 0 : v.vy,
        saved: null,
      }
    })
    paint()
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Single drift loop: slow calm swim + soft bounce inside the band.
  // Phase 12: lite halves integration cadence (checked live per frame so
  // the navbar toggle applies without remounting or prop drilling).
  useEffect(() => {
    const step = () => {
      frameRef.current += 1
      const cfg = cfgRef.current
      const layer = layerRef.current
      const liteNow =
        typeof document !== 'undefined' &&
        document.documentElement.dataset.perf === 'lite'
      if (layer && visibleRef.current && (!liteNow || frameRef.current % 2 === 0)) {
        const W = layer.clientWidth
        const H = layer.clientHeight
        for (const e of ents.current) {
          const [yMin, yMax] = cfg.bandFor(e, W, H)
          const [xMin, xMax] = cfg.xRangeFor(e, W, H, e.w)
          e.x += e.vx
          e.y += e.vy
          if (e.x <= xMin) {
            e.x = xMin
            e.vx = Math.abs(e.vx)
          } else if (e.x >= xMax) {
            e.x = xMax
            e.vx = -Math.abs(e.vx)
          }
          if (e.y <= yMin) {
            e.y = yMin
            e.vy = Math.abs(e.vy)
          } else if (e.y >= yMax) {
            e.y = yMax
            e.vy = -Math.abs(e.vy)
          }
        }
        paint()
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Only animate while the section is on screen.
  useEffect(() => {
    const sec =
      (sectionRef && sectionRef.current) ||
      (sectionId ? document.getElementById(sectionId) : null)
    if (!sec || !('IntersectionObserver' in window)) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting
        if (!entry.isIntersecting && cfgRef.current.onHidden) cfgRef.current.onHidden()
      },
      { threshold: 0.05 }
    )
    obs.observe(sec)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ents, registerVisual, ready }
}
