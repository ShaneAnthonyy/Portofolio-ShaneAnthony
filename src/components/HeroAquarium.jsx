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
    const content = home?.querySelector('.hero__content')
    const replay = home?.querySelector('.hero__replay')
    const scene = surface.querySelector('.hero-surface__scene')
    const clip = surface.querySelector('clipPath path')
    const reflection = surface.querySelector('.hero-surface__reflection')
    const meniscus = surface.querySelector('.hero-surface__meniscus')
    const media = gsap.matchMedia()
    media.add({ compact: '(max-width: 720px)', full: '(min-width: 721px)', reduced: '(prefers-reduced-motion: reduce)', fine: '(pointer: fine)' }, context => {
      const { compact, reduced: simple, fine } = context.conditions
      const curveScale = compact ? .45 : 1
      const timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
      const travel = { progress: 0 }
      timeline.to(travel, { progress: 1, duration: 1 }, 0)
      if (!simple) {
        if (content) {
          timeline.fromTo(
            content,
            { y: 0, scale: 1, opacity: 1 },
            { y: compact ? 18 : 28, scale: .965, opacity: 0, duration: .40, ease: 'power1.inOut' },
            .04
          )
        }
        if (replay) {
          timeline.fromTo(
            replay,
            { xPercent: -50, x: 0, y: 0, opacity: 1 },
            { xPercent: -50, x: 0, y: -8, opacity: 0, duration: .15, ease: 'power1.out' },
            .01
          )
        }
        if (staticMode) {
          timeline.fromTo(scene, { yPercent: 0, opacity: 1 }, { yPercent: -112, duration: .74, ease: 'sine.inOut' }, .02)
          timeline.to(scene, { opacity: 0, duration: .26, ease: 'sine.in' }, .48)
          timeline.fromTo(meniscus, { yPercent: 108 }, { yPercent: -12, duration: .74, ease: 'sine.inOut' }, .02)
          timeline.fromTo(meniscus, { opacity: 0 }, { opacity: 1, duration: .14, ease: 'sine.out' }, .04)
          timeline.to(meniscus, { opacity: 0, duration: .18, ease: 'sine.in' }, .58)
        } else {
          timeline.fromTo(approachRef.current, { value: 0 }, { value: 1, duration: .64, ease: 'sine.inOut' }, 0)
          timeline.fromTo(hostRef.current, { scaleX: 1, scaleY: 1, yPercent: 0 }, {
            scaleX: compact ? 1.012 : 1.025, scaleY: compact ? 1.035 : 1.065,
            yPercent: compact ? -1 : -2, duration: .64, ease: 'sine.inOut',
          }, 0)
          timeline.fromTo(reflection, { opacity: 0, yPercent: 5 }, { opacity: .62, yPercent: -8, duration: .34, ease: 'sine.inOut' }, .02)
          timeline.to(reflection, { opacity: 0, yPercent: -18, duration: .38, ease: 'sine.in' }, .36)
          timeline.fromTo(clip, { attr: { transform: `translate(0 1.08) scale(1 ${curveScale})` } }, { attr: { transform: `translate(0 -0.12) scale(1 ${curveScale})` }, duration: .74, ease: 'sine.inOut' }, .02)
          timeline.fromTo(meniscus, { yPercent: 108 }, { yPercent: -12, duration: .74, ease: 'sine.inOut' }, .02)
          timeline.fromTo(meniscus, { opacity: 0 }, { opacity: 1, duration: .14, ease: 'sine.out' }, .04)
          timeline.to(meniscus, { opacity: 0, duration: .18, ease: 'sine.in' }, .58)
        }
      }
      let previous = -1
      let visualP = -1
      let smoothRaf = 0
      let smoothLastT = 0
      let resident = surface.dataset.resident !== 'false'
      let handoff = -1
      const applyVisual = (vp) => {
        visualP = vp
        timeline.progress(vp)
        sceneRef.current?.setApproach(approachRef.current.value)
        surface.dataset.surfaceState = vp === 0 ? 'surface' : vp >= .8 ? 'submerged' : 'crossing'
        surface.style.visibility = !simple && vp >= .8 ? 'hidden' : ''
        scene.style.visibility = !simple && vp >= .76 ? 'hidden' : ''
        const crossing = !simple && vp > .01 && vp < .78
        const nextClip = !simple && !staticMode && vp > .01 ? `url(#surface-${id})` : 'none'
        if (scene.style.clipPath !== nextClip) scene.style.clipPath = nextClip
        const reflVis = crossing && !staticMode ? 'visible' : 'hidden'
        const menVis = crossing ? 'visible' : 'hidden'
        if (reflection.style.visibility !== reflVis) reflection.style.visibility = reflVis
        if (meniscus.style.visibility !== menVis) meniscus.style.visibility = menVis
        if (replay && !simple) {
          const nextPtr = vp > .14 ? 'none' : ''
          if (replay.style.pointerEvents !== nextPtr) replay.style.pointerEvents = nextPtr
        }
        loopRef.current?.()
      }
      const stepSmooth = (now) => {
        smoothRaf = 0
        if (document.hidden) {
          applyVisual(previous)
          return
        }
        const dt = Math.min((now - smoothLastT) / 1000, 0.05)
        smoothLastT = now
        const next = visualP + (previous - visualP) * (1 - Math.exp(-dt * 24))
        if (Math.abs(previous - next) < 0.0008) {
          applyVisual(previous)
          return
        }
        applyVisual(next)
        smoothRaf = requestAnimationFrame(stepSmooth)
      }
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
        surface.dataset.progress = p.toFixed(4)
        const shouldSmooth = fine && !simple && !document.hidden && visualP >= 0 && Math.abs(p - visualP) <= .25
        if (!shouldSmooth) {
          if (smoothRaf) {
            cancelAnimationFrame(smoothRaf)
            smoothRaf = 0
          }
          applyVisual(p)
        } else if (!smoothRaf) {
          smoothLastT = performance.now()
          smoothRaf = requestAnimationFrame(stepSmooth)
        }
      }
      const unsubscribe = subscribeProgressFrame(update)
      const resize = new ResizeObserver(update)
      resize.observe(home)
      return () => {
        if (smoothRaf) cancelAnimationFrame(smoothRaf)
        unsubscribe()
        resize.disconnect()
        surface.style.visibility = ''
        scene.style.visibility = ''
        scene.style.clipPath = 'none'
        reflection.style.visibility = ''
        meniscus.style.visibility = ''
        if (content) gsap.set(content, { clearProps: 'transform,opacity' })
        if (replay) gsap.set(replay, { clearProps: 'transform,opacity,pointerEvents' })
      }
    })
    return () => media.revert()
  }, { scope: surfaceRef, dependencies: [enabled, staticMode], revertOnUpdate: true })

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
    let lastLight = '', lastShadow = '', lastTint = ''
    const update = () => {
      const sample = worldTime.getSnapshot().environment
      const light = environmentCSS(sample.waterLight)
      const shadow = environmentCSS(sample.waterDeep)
      const tint = `color-mix(in srgb, ${light} 14%, transparent)`
      if (light !== lastLight) { lastLight = light; surface.style.setProperty('--surface-light', light) }
      if (shadow !== lastShadow) { lastShadow = shadow; surface.style.setProperty('--surface-shadow', shadow) }
      if (tint !== lastTint) { lastTint = tint; host.style.setProperty('--world-poster-tint', tint) }
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
      let appliedEnv = null
      unsubscribeWorld = worldTime.subscribe(() => { environment = worldTime.getSnapshot().environment })
      const render = () => {
        if (environment !== appliedEnv) {
          appliedEnv = environment
          scene.setEnvironment(environment)
        }
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
            <stop offset=".32" stopColor="var(--surface-shadow)" stopOpacity=".46" />
            <stop offset=".55" stopColor="var(--surface-light)" stopOpacity=".30" />
            <stop offset=".78" stopColor="var(--surface-light)" stopOpacity=".10" />
            <stop offset="1" stopColor="var(--surface-light)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="hero-surface__scene">
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
