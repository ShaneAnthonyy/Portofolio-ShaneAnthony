import { useEffect, useId, useRef, useState } from 'react'
import { gsap, useGSAP } from '../animation/gsap.js'
import { subscribeProgressFrame } from '../hooks/useSectionProgress.js'
import { worldTime, environmentCSS } from '../animation/worldTime.js'

export default function HeroAquarium({ enabled, preview = false, sceneReady, prewarm = false, performanceMode, onVisibilityChange }) {
  const surfaceRef = useRef(null)
  const hostRef = useRef(null)
  const clockRef = useRef(18)
  const progressRef = useRef(0)
  const approachRef = useRef({ value: 0 })
  const sceneRef = useRef(null)
  const loopRef = useRef(null)
  const visibilityRef = useRef(onVisibilityChange)
  const prewarmRef = useRef(prewarm)
  visibilityRef.current = onVisibilityChange
  prewarmRef.current = prewarm
  const id = useId().replace(/:/g, '')
  const [near, setNear] = useState(true)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const staticMode = performanceMode === 'lite' || reduced

  useGSAP(() => {
    const surface = surfaceRef.current
    const home = surface.closest('#home')
    const scene = surface.querySelector('.hero-surface__scene')
    const clip = surface.querySelector('clipPath path')
    const reflection = surface.querySelector('.hero-surface__reflection')
    const meniscus = surface.querySelector('.hero-surface__meniscus')
    const media = gsap.matchMedia()
    media.add({ compact: '(max-width: 720px)', full: '(min-width: 721px)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
      const { compact, reduced: simple } = context.conditions
      const curveScale = compact ? .45 : 1
      const timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
      const travel = { progress: 0 }
      timeline.to(travel, { progress: 1, duration: 1 }, 0)
      if (!simple) {
        timeline.fromTo(approachRef.current, { value: 0 }, { value: 1, duration: .62, ease: 'sine.inOut' }, 0)
        timeline.fromTo(hostRef.current, { scaleX: 1, scaleY: 1, yPercent: 0 }, {
          scaleX: compact ? 1.012 : 1.025, scaleY: compact ? 1.035 : 1.065,
          yPercent: compact ? -1 : -2, duration: .62, ease: 'sine.inOut',
        }, 0)
        timeline.fromTo(reflection, { opacity: 0, yPercent: 5 }, { opacity: .6, yPercent: -8, duration: .32, ease: 'sine.inOut' }, .04)
        timeline.to(reflection, { opacity: 0, yPercent: -18, duration: .38 }, .36)
        timeline.fromTo(clip, { attr: { transform: `translate(0 1.08) scale(1 ${curveScale})` } }, { attr: { transform: `translate(0 -0.12) scale(1 ${curveScale})` }, duration: .68, ease: 'sine.inOut' }, .1)
        timeline.fromTo(meniscus, { yPercent: 108 }, { yPercent: -12, duration: .68, ease: 'sine.inOut' }, .1)
        timeline.fromTo(meniscus, { opacity: 0 }, { opacity: 1, duration: .12 }, .2)
        timeline.to(meniscus, { opacity: 0, duration: .14 }, .64)
      }
      let previous = -1
      let resident = surface.dataset.resident !== 'false'
      let handoff = -1
      const update = () => {
        const rect = home.getBoundingClientRect()
        const distance = -rect.top / Math.max(rect.height, 1)
        const p = gsap.utils.clamp(0, 1, distance)
        const nextResident = distance < 1.45 ? true : distance > 1.8 ? false : resident
        if (nextResident !== resident) {
          resident = nextResident
          setNear(resident)
        }
        const ratio = p < .27 ? 1 : p > .32 ? 0 : .15
        if (handoff !== ratio || nextResident !== (surface.dataset.resident === 'true')) {
          handoff = ratio
          surface.dataset.resident = String(resident)
          visibilityRef.current?.(enabled && resident, ratio)
        }
        if (p === previous) return
        previous = p
        progressRef.current = p
        timeline.progress(p)
        sceneRef.current?.setApproach(approachRef.current.value)
        surface.dataset.progress = p.toFixed(4)
        surface.dataset.surfaceState = p === 0 ? 'surface' : p >= .8 ? 'submerged' : 'crossing'
        surface.style.visibility = !simple && p >= .8 ? 'hidden' : ''
        scene.style.visibility = !simple && p >= .76 ? 'hidden' : ''
        loopRef.current?.()
      }
      const unsubscribe = subscribeProgressFrame(update)
      const resize = new ResizeObserver(update)
      resize.observe(home)
      return () => {
        unsubscribe()
        resize.disconnect()
        surface.style.visibility = ''
        scene.style.visibility = ''
      }
    })
    return () => media.revert()
  }, { scope: surfaceRef, dependencies: [enabled], revertOnUpdate: true })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motion = () => setReduced(media.matches)
    const visibility = () => loopRef.current?.()
    media.addEventListener('change', motion)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      media.removeEventListener('change', motion)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  useEffect(() => { loopRef.current?.() }, [prewarm, ready])

  useEffect(() => {

    const host = hostRef.current, surface = surfaceRef.current
    const update = () => {
      const sample = worldTime.getSnapshot().environment
      surface.style.setProperty('--surface-light', environmentCSS(sample.waterLight))
      surface.style.setProperty('--surface-shadow', environmentCSS(sample.waterDeep))
      host.style.setProperty('--world-poster-tint', `color-mix(in srgb, ${environmentCSS(sample.waterLight)} 14%, transparent)`)
      host.dataset.worldTime = String(sample.minutes)
    }
    update()
    const unsubscribe = worldTime.subscribe(update)
    return () => {
      unsubscribe()
      surface.style.removeProperty('--surface-light')
      surface.style.removeProperty('--surface-shadow')
      host.style.removeProperty('--world-poster-tint')
      delete host.dataset.worldTime
    }
  }, [])

  useEffect(() => {
    if (!enabled || !sceneReady || !near || staticMode || failed) return
    const host = hostRef.current
    let cancelled = false, frame = 0, scene, resize, unsubscribeWorld
    const contextLost = event => {
      event.preventDefault()
      setFailed(true)
    }
    import('../scenes/heroAquarium.js').then(({ createHeroAquarium }) => {
      if (cancelled) return
      scene = createHeroAquarium(host)
      sceneRef.current = scene
      scene.setApproach(approachRef.current.value)
      scene.canvas.addEventListener('webglcontextlost', contextLost)
      let environment = worldTime.getSnapshot().environment
      unsubscribeWorld = worldTime.subscribe(() => { environment = worldTime.getSnapshot().environment })
      const render = () => {
        scene.setEnvironment(environment)
        scene.render(clockRef.current)
      }
      resize = new ResizeObserver(() => {
        scene.resize(host.clientWidth, host.clientHeight)
        if (!document.hidden) render()
      })
      resize.observe(host)

      render()
      if (preview && clockRef.current === 18) {
        scene.canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' })
      }
      setReady(true)
      let last = performance.now()
      let previous = last
      const tick = now => {
        if (now - last >= 1000 / 30) {
          clockRef.current += Math.min((now - previous) / 1000, .1)
          previous = now
          render()
          last = now - (now - last) % (1000 / 30)
        }
        frame = requestAnimationFrame(tick)
      }
      const syncLoop = () => {
        const running = !prewarmRef.current && !document.hidden && progressRef.current < .76
        host.dataset.state = prewarmRef.current ? 'prewarmed' : document.hidden ? 'hidden' : running ? 'running' : 'parked'
        if (running && !frame) {
          render()
          previous = last = performance.now()
          frame = requestAnimationFrame(tick)
        } else if (!running && frame) {
          cancelAnimationFrame(frame)
          frame = 0
        }
      }
      loopRef.current = syncLoop
      syncLoop()
    }).catch(() => {
      if (!cancelled) setFailed(true)
    })
    return () => {
      cancelled = true
      loopRef.current = null
      sceneRef.current = null
      cancelAnimationFrame(frame)
      resize?.disconnect()
      unsubscribeWorld?.()
      scene?.canvas.removeEventListener('webglcontextlost', contextLost)
      scene?.dispose()
      setReady(false)
    }
  }, [enabled, sceneReady, near, staticMode, failed])

  return (
    <div ref={surfaceRef} className="hero-surface" aria-hidden="true">
      <svg className="hero-surface__defs" width="0" height="0">
        <defs>
          <clipPath id={`surface-${id}`} clipPathUnits="objectBoundingBox">
            <path d="M-.04 -4H1.04V.012C.88 .03 .8 -.032 .65 -.016S.41 .04 .27 .008S.08 -.03 -.04 .012Z" transform="translate(0 1.08)" />
          </clipPath>
          <clipPath id={`lens-${id}`} clipPathUnits="objectBoundingBox">
            <path d="M1.04 .5C.88 .68 .8 .06 .65 .22C.5 .38 .41 .78 .27 .46C.13 .14 .08 .08 -.04 .5V.74C.08 .32 .13 .38 .27 .7C.41 1.02 .5 .62 .65 .46C.8 .3 .88 .92 1.04 .74Z" />
          </clipPath>
          <linearGradient id={`water-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--surface-shadow)" stopOpacity="0" />
            <stop offset=".46" stopColor="var(--surface-shadow)" stopOpacity=".5" />
            <stop offset=".62" stopColor="var(--surface-light)" stopOpacity=".2" />
            <stop offset="1" stopColor="var(--surface-light)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="hero-surface__scene" style={{ clipPath: `url(#surface-${id})` }}>
        <div
          ref={hostRef}
          className="hero-aquarium"
          data-enabled={enabled}
          data-preview={preview}
          data-ready={ready}
          data-state={ready ? prewarm ? 'prewarmed' : 'running' : staticMode || failed ? 'poster' : 'paused'}
        />
        <div className="hero-surface__reflection" />
      </div>
      <div className="hero-surface__meniscus">
        <div className="hero-surface__lens" style={{ clipPath: `url(#lens-${id})` }} />
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <path d="M1040 -14C880 4 800 -58 650 -42S410 14 270 -18S80 -56 -40 -14V27C80 -15 130 -9 270 23C410 55 500 15 650 -1C800 -17 880 45 1040 27Z" fill={`url(#water-${id})`} />
        </svg>
      </div>
    </div>
  )
}
