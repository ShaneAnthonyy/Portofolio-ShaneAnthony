import { useEffect, useRef, useState } from 'react'
import { subscribeProgressFrame } from '../hooks/useSectionProgress.js'

export default function HeroAquarium({ enabled, preview = false, sceneReady, prewarm = false, performanceMode, onVisibilityChange }) {
  const hostRef = useRef(null)
  const clockRef = useRef(18)
  const prewarmRef = useRef(prewarm)
  prewarmRef.current = prewarm
  const [inView, setInView] = useState(false)
  const [exitRatio, setExitRatio] = useState(1)
  // Last reported (visible, ratio). Effect cleanups run on every re-run, not
  // just on unmount — reporting there would fake visibility transitions and
  // permanently trip the App's handoff hysteresis/latch. Only a real unmount
  // reports, using the last known ratio (never a hard 0).
  const visRef = useRef([false, 1])
  const unmountedRef = useRef(false)
  useEffect(() => () => { unmountedRef.current = true }, [])
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const staticMode = performanceMode === 'lite' || reduced
  const animate = enabled && sceneReady && inView && pageVisible && !staticMode && !failed

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motion = () => setReduced(media.matches)
    const visibility = () => setPageVisible(!document.hidden)
    // Continuous exit progress for cinematic scrubbing. Driven by the
    // existing rAF-throttled scroll feed (no new listeners, no React
    // re-renders): normalized 0 (hero fully visible) to 1 (fully out),
    // derived from live hero geometry so spacer collapse, resize and font
    // loads can't desync it. Writes go straight to the DOM, gated to the
    // transition region, and skip when values haven't changed.
    // IntersectionObserver below stays on visibility/lifecycle duty only.
    let lastDepth = null
    let lastEdge = null
    const writeProgress = () => {
      const host = hostRef.current
      const home = document.getElementById('home')
      if (!host || !home) return
      const rect = home.getBoundingClientRect()
      const p = Math.min(Math.max(-rect.top / Math.max(rect.height, 1), 0), 1)
      let depth, edge
      if (media.matches) {
        depth = p > 0.85 ? 1 : 0
        edge = depth
      } else {
        depth = Math.min(Math.max((p - 0.4) / 0.55, 0), 1)
        edge = Math.min(Math.max((p - 0.3) / 0.65, 0), 1)
      }
      const d = depth.toFixed(3)
      const e = edge.toFixed(3)
      if (d === lastDepth && e === lastEdge) return
      lastDepth = d
      lastEdge = e
      host.style.setProperty('--surface-depth', d)
      host.style.setProperty('--dive-edge', e)
    }
    const unsubProgress = subscribeProgressFrame(writeProgress)
    media.addEventListener('change', motion)
    document.addEventListener('visibilitychange', visibility)
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            // Rapid scrolls cross several thresholds in one frame; the last
            // entry is the freshest.
            const entry = entries[entries.length - 1]
            const ratio = entry.isIntersecting ? entry.intersectionRatio : 0
            setInView(ratio > 0)
            setExitRatio(ratio)
          },
          { threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1] }
        )
      : null
    if (observer) observer.observe(hostRef.current)
    else setInView(true)
    return () => {
      unsubProgress()
      observer?.disconnect()
      media.removeEventListener('change', motion)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  useEffect(() => {
    visRef.current = [enabled && inView, exitRatio]
    onVisibilityChange?.(...visRef.current)
    return () => {
      if (unmountedRef.current) onVisibilityChange?.(false, visRef.current[1])
    }
  }, [enabled, inView, exitRatio, onVisibilityChange])

  useEffect(() => {
    if (!animate) return
    const host = hostRef.current
    let cancelled = false, frame = 0, scene, resize, theme
    const contextLost = event => {
      event.preventDefault()
      setFailed(true)
    }
    import('../scenes/heroAquarium.js').then(({ createHeroAquarium }) => {
      if (cancelled) return
      scene = createHeroAquarium(host)
      scene.canvas.addEventListener('webglcontextlost', contextLost)
      const resizeScene = () => {
        scene.resize(host.clientWidth, host.clientHeight)
        scene.render(clockRef.current)
      }
      resize = new ResizeObserver(resizeScene)
      resize.observe(host)
      theme = new MutationObserver(() => {
        scene.setTheme(document.documentElement.dataset.theme === 'dark')
        scene.render(clockRef.current)
      })
      theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
      scene.render(clockRef.current)
      if (preview && clockRef.current === 18) {
        scene.canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' })
      }
      setReady(true)
      let last = performance.now()
      let previous = last
      const tick = now => {
        // Water and slow swimming need only 30 updates/sec. Time advances only
        // while visible, so returning to the Hero never fast-forwards the fish.
        if (!prewarmRef.current && now - last >= 1000 / 30) {
          clockRef.current += Math.min((now - previous) / 1000, 0.1)
          previous = now
          scene.render(clockRef.current)
          last = now - (now - last) % (1000 / 30)
        }
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }).catch(() => {
      if (!cancelled) setFailed(true)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      resize?.disconnect()
      theme?.disconnect()
      scene?.canvas.removeEventListener('webglcontextlost', contextLost)
      scene?.dispose()
      setReady(false)
    }
  }, [animate])

  return (
    <div
      ref={hostRef}
      className="hero-aquarium"
      aria-hidden="true"
      data-enabled={enabled}
      data-preview={preview}
      data-ready={ready}
      data-state={ready ? prewarm ? 'prewarmed' : 'running' : staticMode || failed ? 'poster' : 'paused'}
    />
  )
}
