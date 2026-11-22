import { memo, useEffect, useRef, useState } from 'react'

const EXIT_MS = 460
const SETTLE_MS = 420
const COALESCE_MS = 140

const BUBBLES = [
  { x: '12%', size: 6, dur: '3.2s', delay: '-0.4s' },
  { x: '28%', size: 8, dur: '4.1s', delay: '-1.9s' },
  { x: '52%', size: 6, dur: '3.5s', delay: '-1.1s' },
  { x: '72%', size: 8, dur: '4.4s', delay: '-2.6s' },
  { x: '86%', size: 6, dur: '3.0s', delay: '-0.8s' },
]

function stageLabel(pct, ready) {
  if (ready) return 'WORLD READY'
  if (pct >= 90) return 'RENDERING WORLD'
  if (pct >= 72) return 'BUILDING WATER SHADERS'
  if (pct >= 35) return 'SPAWNING FAUNA'
  return 'GENERATING AQUARIUM'
}

export default memo(function LoadingScreen({
  progress = 0,
  subscribeProgress = null,
  ready = false,
  exiting = false,
  onVisualReady = null,
  onEnter = null,
  onExited = null,
}) {
  const [visualReady, setVisualReady] = useState(() => Boolean(ready))
  const waterRef = useRef(null)
  const barRef = useRef(null)
  const barFillRef = useRef(null)
  const pctRef = useRef(null)
  const labelRef = useRef(null)
  const onVisualReadyRef = useRef(onVisualReady)
  onVisualReadyRef.current = onVisualReady

  const stateRef = useRef({
    target: Math.min(Math.max(progress, 0), 1),
    committed: ready ? 1 : Math.min(Math.max(progress, 0), 1),
    shown: ready ? 1 : Math.min(Math.max(progress, 0), 1),
    ready: Boolean(ready),
    exiting: Boolean(exiting),
    lastPct: -1,
    lastLabel: '',
    lastCommitAt: 0,
    push: null,
    finish: null,
  })
  stateRef.current.ready = Boolean(ready)
  stateRef.current.exiting = Boolean(exiting)

  useEffect(() => {
    if (subscribeProgress) return
    stateRef.current.push?.(progress)
  }, [progress, subscribeProgress])

  useEffect(() => {
    if (ready) stateRef.current.finish?.()
  }, [ready])

  useEffect(() => {
    const s = stateRef.current
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let lastTime = 0
    let coalesceTimer = 0
    let readyTimer = 0
    let finished = false

    const commitCompositor = (val) => {
      s.committed = val
      s.lastCommitAt = performance.now()
      if (waterRef.current && !s.exiting) {
        const yPct = (1 - val * 0.82) * 100
        waterRef.current.style.transform = `translate3d(0, ${yPct.toFixed(2)}%, 0)`
      }
      if (barFillRef.current) {
        barFillRef.current.style.transform = `scaleX(${val.toFixed(4)})`
      }
    }

    const paintReadout = (val, isDone) => {
      const pct = Math.round(val * 100)
      if (pct !== s.lastPct) {
        s.lastPct = pct
        if (pctRef.current) pctRef.current.textContent = `${pct}%`
        if (barRef.current) barRef.current.setAttribute('aria-valuenow', String(pct))
      }
      const nextLabel = stageLabel(pct, isDone)
      if (nextLabel !== s.lastLabel) {
        s.lastLabel = nextLabel
        if (labelRef.current) labelRef.current.textContent = nextLabel
      }
    }

    const tickReadout = (now) => {
      raf = 0
      const dt = lastTime ? Math.min(Math.max((now - lastTime) / 1000, 0), 0.05) : 0.016
      lastTime = now
      const goal = s.committed
      const gap = goal - s.shown
      if (reduced || gap <= 0.003) {
        s.shown = goal
      } else {
        s.shown += gap * (1 - Math.exp(-dt * (s.ready ? 9 : 5)))
        if (goal - s.shown <= 0.003) s.shown = goal
      }
      paintReadout(s.shown, finished)
      if (s.shown < goal) {
        raf = requestAnimationFrame(tickReadout)
      } else {
        lastTime = 0
      }
    }

    const wakeReadout = () => {
      if (reduced) {
        s.shown = s.committed
        paintReadout(s.shown, finished)
        return
      }
      if (!raf) {
        lastTime = 0
        raf = requestAnimationFrame(tickReadout)
      }
    }

    const push = (raw) => {
      const clamped = Math.min(Math.max(raw, 0), 1)
      if (clamped <= s.target) return
      s.target = clamped
      const now = performance.now()
      const elapsed = now - s.lastCommitAt
      if (reduced || clamped >= 1 || s.committed === 0 || elapsed >= COALESCE_MS) {
        clearTimeout(coalesceTimer)
        coalesceTimer = 0
        commitCompositor(s.target)
        wakeReadout()
      } else if (!coalesceTimer) {
        coalesceTimer = setTimeout(() => {
          coalesceTimer = 0
          commitCompositor(s.target)
          wakeReadout()
        }, COALESCE_MS - elapsed)
      }
    }

    const finish = () => {
      if (finished) return
      clearTimeout(coalesceTimer)
      coalesceTimer = 0
      s.target = 1
      commitCompositor(1)
      wakeReadout()
      const complete = () => {
        if (finished) return
        finished = true
        s.shown = 1
        paintReadout(1, true)
        setVisualReady(true)
        onVisualReadyRef.current?.()
      }
      if (reduced) {
        complete()
      } else {
        clearTimeout(readyTimer)
        readyTimer = setTimeout(complete, SETTLE_MS)
      }
    }

    s.push = push
    s.finish = finish
    commitCompositor(s.committed)
    paintReadout(s.shown, s.ready && s.shown >= 1)

    const unsub = subscribeProgress ? subscribeProgress(push) : null
    if (s.ready) finish()

    return () => {
      s.push = null
      s.finish = null
      clearTimeout(coalesceTimer)
      clearTimeout(readyTimer)
      cancelAnimationFrame(raf)
      unsub?.()
    }
  }, [subscribeProgress])

  useEffect(() => {
    if (!exiting) return
    if (waterRef.current) waterRef.current.style.transform = ''
    const timer = setTimeout(() => {
      onExited?.()
    }, EXIT_MS)
    return () => clearTimeout(timer)
  }, [exiting, onExited])

  return (
    <div
      className={`loading-screen${visualReady ? ' is-ready' : ''}${exiting ? ' is-exiting' : ''}`}
      role="status"
      aria-label="Loading portfolio"
    >
      <div className={`loading-screen__inner${visualReady ? ' is-ready' : ''}`}>
        <div className="loading-screen__tank" aria-hidden="true">
          <div ref={waterRef} className="loading-screen__water">
            <svg
              className="loading-screen__wave loading-screen__wave--back"
              viewBox="0 0 96 8"
              preserveAspectRatio="none"
              shapeRendering="crispEdges"
            >
              <path d="M0 4h6v-1h6v-1h12v1h6v1h6v1h12v-1h6v-1h6v-1h12v1h6v1h6v1h12v3H0z" />
            </svg>
            <svg
              className="loading-screen__wave loading-screen__wave--front"
              viewBox="0 0 96 8"
              preserveAspectRatio="none"
              shapeRendering="crispEdges"
            >
              <path d="M0 3h6v-1h12v1h6v1h6v1h12v-1h6v-1h6v-1h12v1h6v1h6v1h12v3H0z" />
            </svg>
            <div className="loading-screen__fill">
              <svg
                className="loading-screen__fish loading-screen__fish--a"
                viewBox="0 0 12 7"
                shapeRendering="crispEdges"
              >
                <rect x="0" y="1" width="2" height="5" fill="#e8744a" />
                <rect x="2" y="2" width="2" height="3" fill="#f39c6b" />
                <rect x="4" y="1" width="5" height="5" fill="#f8b27a" />
                <rect x="5" y="0" width="3" height="1" fill="#e8744a" />
                <rect x="9" y="2" width="3" height="3" fill="#f8b27a" />
                <rect x="10" y="2" width="1" height="1" fill="#071926" />
              </svg>
              <svg
                className="loading-screen__fish loading-screen__fish--b"
                viewBox="0 0 12 7"
                shapeRendering="crispEdges"
              >
                <rect x="10" y="1" width="2" height="5" fill="#4fb8d6" />
                <rect x="8" y="2" width="2" height="3" fill="#7dd6ea" />
                <rect x="3" y="1" width="5" height="5" fill="#b4eef7" />
                <rect x="4" y="0" width="3" height="1" fill="#4fb8d6" />
                <rect x="0" y="2" width="3" height="3" fill="#b4eef7" />
                <rect x="1" y="2" width="1" height="1" fill="#071926" />
              </svg>
              {BUBBLES.map((b) => (
                <span
                  key={b.x}
                  className="loading-screen__bubble"
                  style={{
                    '--b-x': b.x,
                    '--b-s': `${b.size}px`,
                    '--b-d': b.dur,
                    '--b-delay': b.delay,
                  }}
                />
              ))}
            </div>
          </div>

          <svg
            className="loading-screen__scenery"
            viewBox="0 0 70 44"
            preserveAspectRatio="none"
            shapeRendering="crispEdges"
          >
            <rect x="7" y="30" width="2" height="10" fill="#1e6b4f" />
            <rect x="9" y="26" width="2" height="14" fill="#2c8f68" />
            <rect x="11" y="33" width="2" height="7" fill="#1e6b4f" />
            <rect x="57" y="28" width="2" height="12" fill="#1e6b4f" />
            <rect x="59" y="24" width="2" height="16" fill="#2c8f68" />
            <rect x="61" y="32" width="2" height="8" fill="#1e6b4f" />
            <rect x="22" y="37" width="5" height="3" fill="#3a4c59" />
            <rect x="23" y="36" width="3" height="1" fill="#516675" />
            <rect x="46" y="38" width="4" height="2" fill="#3a4c59" />
            <rect x="0" y="40" width="70" height="4" fill="#6b5c42" />
            <rect x="0" y="40" width="70" height="1" fill="#8b7a58" />
            <rect x="4" y="41" width="3" height="1" fill="#534631" />
            <rect x="16" y="42" width="4" height="1" fill="#534631" />
            <rect x="33" y="41" width="3" height="1" fill="#8b7a58" />
            <rect x="49" y="42" width="4" height="1" fill="#534631" />
            <rect x="62" y="41" width="3" height="1" fill="#8b7a58" />
          </svg>

          <svg
            className="loading-screen__glass"
            viewBox="0 0 70 44"
            preserveAspectRatio="none"
            shapeRendering="crispEdges"
          >
            <rect x="4" y="4" width="2" height="2" fill="#d8f7ff" fillOpacity="0.34" />
            <rect x="6" y="6" width="2" height="2" fill="#d8f7ff" fillOpacity="0.26" />
            <rect x="8" y="4" width="2" height="2" fill="#d8f7ff" fillOpacity="0.18" />
            <rect x="62" y="32" width="2" height="2" fill="#d8f7ff" fillOpacity="0.22" />
            <rect x="64" y="30" width="2" height="2" fill="#d8f7ff" fillOpacity="0.28" />
          </svg>

          <span ref={pctRef} className="loading-screen__pct" aria-live="polite">
            0%
          </span>
        </div>

        <p ref={labelRef} className="loading-screen__label">
          GENERATING AQUARIUM
        </p>

        <div
          ref={barRef}
          className={`loading-screen__bar${visualReady ? ' is-ready' : ''}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-label="Initialization progress"
          aria-hidden={visualReady || undefined}
        >
          <span ref={barFillRef} className="loading-screen__bar-fill" />
        </div>

        <div className="loading-screen__slot">
          {visualReady && (
            <button
              type="button"
              className="loading-screen__enter"
              disabled={exiting}
              onClick={onEnter}
              autoFocus
            >
              ENTER PORTFOLIO
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
