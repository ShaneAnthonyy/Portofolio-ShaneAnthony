import { useEffect, useRef, useState } from 'react'

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
  const visibleRef = useRef(false)
  const sizeRef = useRef({ w: 800, h: 500 })
  const rafRef = useRef(0)
  const frameRef = useRef(0)
  const cfgRef = useRef(null)
  const syncRef = useRef(null)
  const [ready, setReady] = useState(false)
  cfgRef.current = { defs, bandFor, xRangeFor, speedFor, scaleFor, spread, extraPaint, onHidden }

  const registerVisual = (id) => (el) => {
    if (el) {
      visuals.current[id] = el
      const e = ents.current[id]
      if (e) {
        const dir = e.vx >= 0 ? 1 : -1
        el.style.transform = `translate3d(${e.x}px, ${e.y}px, 0)`
        el.style.setProperty('--fish-dir', String(dir))
        e.lastDir = dir
      }
    }
  }

  const paint = () => {
    const cfg = cfgRef.current
    for (const e of ents.current) {
      const dir = e.vx >= 0 ? 1 : -1
      const v = visuals.current[e.id]
      if (v) {
        v.style.transform = `translate3d(${e.x}px, ${e.y}px, 0)`
        if (e.lastDir !== dir) {
          v.style.setProperty('--fish-dir', String(dir))
          e.lastDir = dir
        }
      }
      if (cfg.extraPaint) cfg.extraPaint(e)
    }
  }

  useEffect(() => {
    const cfg = cfgRef.current
    const layer = layerRef.current
    if (!layer) return
    const W = layer.clientWidth || 800
    const H = layer.clientHeight || 500
    sizeRef.current = { w: W, h: H }
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
        lastDir: null,
        saved: null,
      }
    })
    paint()
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const updateSize = () => {
      if (layer.clientWidth > 0 && layer.clientHeight > 0) {
        sizeRef.current = { w: layer.clientWidth, h: layer.clientHeight }
      }
    }
    updateSize()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null
    ro?.observe(layer)

    const step = () => {
      rafRef.current = 0
      if (!visibleRef.current || document.hidden || reduced) return
      frameRef.current += 1
      const cfg = cfgRef.current
      const liteNow =
        typeof document !== 'undefined' &&
        document.documentElement.dataset.perf === 'lite'
      if (!liteNow || frameRef.current % 2 === 0) {
        const { w: W, h: H } = sizeRef.current
        if (W > 0 && H > 0) {
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
      }
      rafRef.current = requestAnimationFrame(step)
    }

    const syncLoop = () => {
      if (!reduced && visibleRef.current && !document.hidden) {
        if (!rafRef.current) rafRef.current = requestAnimationFrame(step)
      } else if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
    syncRef.current = syncLoop

    const sec =
      (sectionRef && sectionRef.current) ||
      (sectionId ? document.getElementById(sectionId) : null)
    let obs = null
    if (sec && 'IntersectionObserver' in window) {
      obs = new IntersectionObserver(
        ([entry]) => {
          visibleRef.current = entry.isIntersecting
          if (entry.isIntersecting) updateSize()
          else if (cfgRef.current.onHidden) cfgRef.current.onHidden()
          syncLoop()
        },
        { threshold: 0.05 }
      )
      obs.observe(sec)
    } else {
      visibleRef.current = true
      syncLoop()
    }

    document.addEventListener('visibilitychange', syncLoop)
    return () => {
      syncRef.current = null
      document.removeEventListener('visibilitychange', syncLoop)
      obs?.disconnect()
      ro?.disconnect()
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ents, registerVisual, ready }
}
