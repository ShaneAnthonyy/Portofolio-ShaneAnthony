import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import Skills from './components/Skills.jsx'
import Projects from './components/Projects.jsx'
import Certificates from './components/Certificates.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'
import Separator from './components/Separator.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import DiveProbe, { isProbeEnabled } from './components/DiveProbe.jsx'
import useSectionProgress, { refreshSectionProgress } from './hooks/useSectionProgress.js'
import useBackgroundMusic from './hooks/useBackgroundMusic.js'
import { usePerformanceMode } from './animation/quality.js'
import { gsap } from './animation/gsap.js'
import { magneticMotion } from './animation/diveArrival.js'

const AquariumDivePrototype = lazy(() => import('./components/AquariumDivePrototype.jsx'))

const isDivePoc =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('webgl-poc') === '1'

const isBubbleDebug =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('bubble-debug')

const BUBBLES = [
  { depth: 'background', x: '12%', rest: '10vh', size: 7, duration: 30, delay: -12, sway: 10 },
  { depth: 'background', x: '20%', rest: '55vh', size: 8, duration: 36, delay: -8, sway: -9 },
  { depth: 'background', x: '84%', rest: '25vh', size: 7, duration: 32, delay: -20, sway: 12 },
  { depth: 'background', x: '90%', rest: '70vh', size: 8, duration: 40, delay: -6, sway: -10 },
  { depth: 'background', x: '74%', rest: '85vh', size: 7, duration: 34, delay: -30, sway: 8 },
  { depth: 'midground', x: '10%', rest: '30vh', size: 11, duration: 28, delay: -9, sway: 18 },
  { depth: 'midground', x: '16%', rest: '75vh', size: 10, duration: 33, delay: -5, sway: -16 },
  { depth: 'midground', x: '28%', rest: '12vh', size: 12, duration: 30, delay: -14, sway: -15 },
  { depth: 'midground', x: '82%', rest: '50vh', size: 11, duration: 26, delay: -10, sway: -18 },
  { depth: 'midground', x: '88%', rest: '80vh', size: 10, duration: 29, delay: -22, sway: 16 },
  { depth: 'midground', x: '68%', rest: '8vh', size: 13, duration: 31, delay: -18, sway: -13 },
  { depth: 'midground', x: '14%', rest: '48vh', size: 10, duration: 35, delay: -30, sway: 14 },
  { depth: 'midground', x: '64%', rest: '62vh', size: 14, duration: 24, delay: -7, sway: -17 },
  { depth: 'foreground', x: '9%', rest: '58vh', size: 16, duration: 36, delay: -11, sway: 22 },
  { depth: 'foreground', x: '89%', rest: '14vh', size: 17, duration: 34, delay: -15, sway: -20 },
  { depth: 'foreground', x: '78%', rest: '42vh', size: 15, duration: 38, delay: -35, sway: 18 },
]

export default function App() {
  const progress = useSectionProgress()
  const music = useBackgroundMusic()
  const [performanceMode, setPerformanceMode] = usePerformanceMode()
  const lite = performanceMode === 'lite'
  const activeBubbles = lite ? BUBBLES.filter((_, i) => i % 3 === 0) : BUBBLES
  const [webglFailed, setWebglFailed] = useState(false)
  const [webglHealthy, setWebglHealthy] = useState(false)
  const [introComplete, setIntroComplete] = useState(false)
  const [reducedDiveActive, setReducedDiveActive] = useState(false)
  const [returningToP0, setReturningToP0] = useState(false)
  const [returnParked, setReturnParked] = useState(false)
  const [gateEntered, setGateEntered] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [heroInView, setHeroInView] = useState(false)
  const [heroActive, setHeroActive] = useState(false)
  const [heroLive, setHeroLive] = useState(false)
  const arrivalRef = useRef({ progress: 0, update: null })
  const rootRef = useRef(null)
  const updateArrival = useCallback((value, hero) => {
    const root = rootRef.current
    if (!root || value === arrivalRef.current.progress && root.dataset.arrivalState) return
    arrivalRef.current.progress = value
    hero?.style.setProperty('--arrival-progress', value)
    const state = value === 1 ? 'settled' : value === 0 ? 'dive' : 'transition'
    if (root.dataset.arrivalState !== state) root.dataset.arrivalState = state
    arrivalRef.current.update?.(value)
  }, [])
  // Surface-to-depth handoff: the Dive backdrop stays parked while the Hero
  // is meaningfully visible, and resumes once it is mostly scrolled out —
  // while the Hero still renders its fade-out (brief controlled overlap).
  // Hysteresis (off ≤0.1, on ≥0.2) stops mount/unmount thrashing at the edge.
  const handleAquariumVisibility = useCallback((visible, ratio = visible ? 1 : 0) => {
    setHeroInView(visible)
    setHeroActive((prev) => (ratio >= 0.2 ? true : ratio <= 0.1 ? false : prev))
  }, [])
  const [backdropPaused, setBackdropPaused] = useState(false)
  // Scene-ready latch: the Hero mounts once the Dive backdrop parks for
  // handoff, then stays alive through the exit overlap even as the backdrop
  // resumes beneath it. Resets once the Hero fully leaves view so the next
  // entry re-waits for a parked backdrop (poster covers the remount).
  useEffect(() => {
    if (backdropPaused) setHeroLive(true)
    else if (!heroInView) setHeroLive(false)
  }, [backdropPaused, heroInView])
  const showProbe = isProbeEnabled()
  const diveProbeRef = useRef(null)
  const canReplay = !isDivePoc && !webglFailed
  const shouldDive = canReplay && (!progress.reduced || reducedDiveActive)
  const entered = !shouldDive || introComplete || progress.dive >= 0.995
  const portfolioUnlocked = !shouldDive || (introComplete && !returningToP0)
  const bubbleDepth = Math.min(Math.max(progress.t, 0), 1)
  const visualEntered = entered || shouldDive && progress.dive >= 0.94
  const diveProgress = (introComplete && !returningToP0) ? 1 : reducedDiveActive ? progress.dive : undefined
  const diveNearEnd = shouldDive && !introComplete && !returningToP0 && (progress.dive ?? 0) >= 0.9
  const heroPrewarm = diveNearEnd && performanceMode !== 'lite' && !progress.reduced
  const reveal = Math.min(Math.max((progress.dive - 0.94) / 0.06, 0), 1)
  const backgroundBlur = introComplete || progress.dive < 0.94 ? 0 : (1 - reveal) * 1.5
  const atmosphereBlur = shouldDive && progress.dive >= 0.94 ? 2 + (1 - reveal) * 2 : 2

  useLayoutEffect(() => {
    if (!shouldDive) updateArrival(1)
  }, [shouldDive, updateArrival])

  useEffect(() => {
    refreshSectionProgress()
  }, [shouldDive])

  useEffect(() => {
    if (!shouldDive) setLoadProgress(1)
  }, [shouldDive])

  useEffect(() => {
    if (gateEntered || isDivePoc) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [gateEntered])

  const loadReady = loadProgress >= 1 || webglFailed || !shouldDive
  const enterPortfolio = () => {
    setGateEntered(true)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    requestAnimationFrame(refreshSectionProgress)
  }
  const handleDiveProgress = (p) => {
    setLoadProgress((prev) => Math.max(prev, Math.min(Math.max(p, 0), 1)))
  }

  useEffect(() => {
    if (!isBubbleDebug) return
    const layerEl = document.querySelector('.aqua-bubble-layer')
    const sampleEl = document.querySelector('.aqua-bubble-layer .aqua-bubble-layer__bubble--midground')
    const layerCounts = {}
    document.querySelectorAll('.aqua-bubble-layer .aqua-bubble-layer__bubble').forEach((b) => {
      const depth = b.className.includes('--background')
        ? 'background'
        : b.className.includes('--foreground')
          ? 'foreground'
          : 'midground'
      layerCounts[depth] = (layerCounts[depth] || 0) + 1
    })
    // eslint-disable-next-line no-console
    console.log(
      '[bubble-debug]',
      'count:', activeBubbles.length,
      'live-layers:', layerCounts,
      'layer-opacity:', layerEl ? getComputedStyle(layerEl).opacity : null,
      'entered:', visualEntered,
      'unlocked:', portfolioUnlocked,
      'reduced-motion:', window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      'sample-opacity:', sampleEl ? getComputedStyle(sampleEl).opacity : null,
      'sample-rect:', sampleEl ? JSON.stringify(sampleEl.getBoundingClientRect().toJSON()) : null
    )
  }, [isBubbleDebug])

  useLayoutEffect(() => {
    if (shouldDive && !introComplete && !returningToP0 && progress.dive >= 0.995) setIntroComplete(true)
  }, [shouldDive, introComplete, returningToP0, progress.dive])

  useLayoutEffect(() => {
    if (!shouldDive || !introComplete || returningToP0) return
    magneticTween.current?.kill()
    magneticTween.current = null
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const frame = requestAnimationFrame(refreshSectionProgress)
    return () => cancelAnimationFrame(frame)
  }, [shouldDive, introComplete, returningToP0])

  const diveAgain = () => {
    if (progress.reduced) {
      setIntroComplete(false)
      setReducedDiveActive(true)
    } else if (introComplete && !returningToP0) {
      setReturnParked(false)
      setReturningToP0(true)
    }
  }

  const handleReturnComplete = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    refreshSectionProgress()
    setReturnParked(true)
  }

  useLayoutEffect(() => {
    if (!returningToP0 || !introComplete || !returnParked || progress.dive >= 0.05) return
    setReturnParked(false)
    setReturningToP0(false)
    setIntroComplete(false)
  }, [returningToP0, introComplete, returnParked, progress.dive])

  useLayoutEffect(() => {
    if (returningToP0 || introComplete) return
    refreshSectionProgress()
  }, [returningToP0, introComplete])

  const magneticTween = useRef(null)
  const magneticDone = useRef(false)

  useEffect(() => {
    if (returningToP0) {
      magneticTween.current?.kill()
      magneticTween.current = null
      magneticDone.current = false
      return
    }
    if (introComplete || !shouldDive || progress.reduced) {
      magneticTween.current?.kill()
      magneticTween.current = null
      magneticDone.current = true
      return
    }
    if (magneticTween.current?.isActive()) return
    if (!shouldDive || progress.reduced || magneticDone.current) return
    const d = progress.dive
    if (d < 0.93 || d >= 0.995 || progress.dir !== 'down') return
    const intro = document.getElementById('portfolio-dive')
    if (!intro || intro.offsetHeight < 1) return
    const target = intro.getBoundingClientRect().top + window.scrollY + 0.997 * intro.offsetHeight
    const remaining = target - window.scrollY
    if (remaining <= 0) return
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const { duration, ease } = magneticMotion(remaining, progress.velocity, coarse)
    magneticDone.current = true
    const root = document.documentElement
    const prev = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    const restore = () => {
      root.style.scrollBehavior = prev
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', cancel)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    const cancel = () => {
      const tween = magneticTween.current
      if (tween?.isActive()) {
        magneticDone.current = false
        tween.kill()
      }
    }
    const onWheel = event => { if (event.deltaY < 0) cancel() }
    let touchY = null
    const onTouchStart = event => { touchY = event.touches[0]?.clientY ?? null }
    const onTouchMove = event => {
      const y = event.touches[0]?.clientY
      if (touchY !== null && y !== undefined && y - touchY > 24) cancel()
    }
    const onKey = event => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(event.key)) cancel()
    }
    const onVisibility = () => { if (document.hidden) cancel() }
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', cancel)
    document.addEventListener('visibilitychange', onVisibility)
    magneticTween.current = gsap.to(window, {
      duration,
      ease,
      overwrite: 'auto',
      scrollTo: { y: target, autoKill: true },
      onComplete: () => {
        magneticTween.current = null
        magneticDone.current = true
        restore()
        refreshSectionProgress()
      },
      onInterrupt: () => {
        magneticTween.current = null
        restore()
      },
    })
  }, [shouldDive, introComplete, returningToP0, progress.dive, progress.dir, progress.reduced])

  useEffect(() => () => magneticTween.current?.kill(), [])

  useEffect(() => {
    if (!returningToP0 || progress.reduced) return
    const preventScroll = (event) => event.preventDefault()
    const preventScrollKeys = (event) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
        event.preventDefault()
      }
    }
    window.addEventListener('wheel', preventScroll, { passive: false, capture: true })
    window.addEventListener('touchmove', preventScroll, { passive: false, capture: true })
    window.addEventListener('keydown', preventScrollKeys, true)
    return () => {
      window.removeEventListener('wheel', preventScroll, true)
      window.removeEventListener('touchmove', preventScroll, true)
      window.removeEventListener('keydown', preventScrollKeys, true)
    }
  }, [returningToP0, progress.reduced])

  useEffect(() => {
    if (isDivePoc || !portfolioUnlocked) return
    if (gateEntered && shouldDive) document.documentElement.classList.add('dive-arrived')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = Array.from(document.querySelectorAll('.section__layout, .hero__content'))
    els.forEach((el) => {
      el.classList.add('reveal')
      if (el.classList.contains('hero__content') && gateEntered && shouldDive) el.classList.add('is-visible')
    })
    if (reduced) {
      els.forEach((el) => el.classList.add('is-visible'))
      return
    }
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'))
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            entry.target.style.transitionDelay = `${Math.min(i * 60, 240)}ms`
            entry.target.classList.add('is-visible')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [portfolioUnlocked])

  if (isDivePoc) {
    return (
      <Suspense fallback={null}>
        <AquariumDivePrototype />
      </Suspense>
    )
  }

  return (
    <div
      ref={rootRef}
      data-dive-arrival={shouldDive || undefined}
      className={`aqua-root${visualEntered ? ' is-entered' : ''}${portfolioUnlocked ? ' is-portfolio-unlocked' : ''}${webglHealthy ? ' has-webgl' : ''}`}
      style={{
        '--intro-background-blur': `${backgroundBlur}px`,
        '--aqua-atmosphere-blur': `${atmosphereBlur}px`,
        '--bubble-background-opacity': 0.14 + bubbleDepth * 0.06,
        '--bubble-midground-opacity': 0.22 + bubbleDepth * 0.1,
        '--bubble-foreground-opacity': 0.18 + bubbleDepth * 0.08,
        '--aqua-sat': 0.58 - bubbleDepth * 0.08,
        '--aqua-top-a': 0.3 - bubbleDepth * 0.06,
        '--aqua-mid-a': 0.48 + bubbleDepth * 0.12,
        '--aqua-deep-a': 0.58 + bubbleDepth * 0.12,
      }}
    >
      <Navbar diveActive={shouldDive} entered={portfolioUnlocked} diveProgress={diveProgress ?? progress.dive} performanceMode={performanceMode} onPerformanceModeChange={setPerformanceMode} musicOn={music.on} musicLoading={music.loading} musicFailed={music.failed} onMusicToggle={music.toggle} arrivalRef={arrivalRef} />
      <div className={`aqua-bubble-layer${isBubbleDebug ? ' bubble-debug' : ''}`} aria-hidden="true">
        {activeBubbles.map((bubble) => (
          <span
            key={`${bubble.depth}-${bubble.x}`}
            className={`aqua-bubble-layer__bubble aqua-bubble-layer__bubble--${bubble.depth}`}
            style={{
              '--bubble-x': bubble.x,
              '--bubble-rest': bubble.rest,
              '--bubble-size': `${bubble.size}px`,
              '--bubble-duration': `${bubble.duration}s`,
              '--bubble-delay': `${bubble.delay}s`,
              '--bubble-sway': `${bubble.sway}px`,
            }}
          />
        ))}
      </div>
      <main
        inert={!portfolioUnlocked ? '' : undefined}
      >
        {shouldDive ? (
          <Suspense
            fallback={
              <>
                <div id="portfolio-dive" className="portfolio-dive-spacer" aria-hidden="true" />
                <div aria-hidden="true" style={{ visibility: 'hidden', pointerEvents: 'none' }}>
                  <Hero />
                </div>
              </>
            }
          >
            <AquariumDivePrototype
              integrated
              diveProgress={diveProgress}
              introComplete={introComplete}
              returningToP0={returningToP0}
              qualityMode={performanceMode}
              pauseBackdrop={portfolioUnlocked && heroActive}
              onBackdropPaused={setBackdropPaused}
              onArrivalProgress={updateArrival}
              onReturnComplete={handleReturnComplete}
              onProgress={handleDiveProgress}
              probeRef={showProbe ? diveProbeRef : null}
              onHealthy={() => {
                setWebglHealthy(true)
                setLoadProgress(1)
              }}
              onFail={() => {
                setWebglHealthy(false)
                setWebglFailed(true)
                setLoadProgress(1)
              }}
            >
              <Hero
                onDiveAgain={canReplay ? diveAgain : undefined}
                aquariumEnabled={gateEntered && (portfolioUnlocked || heroPrewarm)}
                aquariumPreview={gateEntered}
                aquariumReady={heroLive || heroPrewarm}
                performanceMode={performanceMode}
                onAquariumVisibilityChange={handleAquariumVisibility}
              />
            </AquariumDivePrototype>
          </Suspense>
        ) : (
          <Hero
            onDiveAgain={canReplay ? diveAgain : undefined}
            aquariumEnabled={gateEntered && portfolioUnlocked}
            aquariumReady
            performanceMode={performanceMode}
            onAquariumVisibilityChange={setHeroInView}
          />
        )}
        <div
          className="portfolio-sections"
          style={{ visibility: portfolioUnlocked ? 'visible' : 'hidden' }}
          inert={!portfolioUnlocked ? '' : undefined}
          aria-hidden={!portfolioUnlocked || undefined}
        >
          <About unlocked={portfolioUnlocked} />
          <Separator />
          <Skills />
          <Separator />
          <Projects />
          <Separator />
          <Certificates />
          <Separator />
          <Contact />
        </div>
      </main>
      <Footer hidden={!portfolioUnlocked} />
      {!gateEntered && !isDivePoc && (
        <LoadingScreen progress={loadProgress} ready={loadReady} onEnter={enterPortfolio} />
      )}
      {showProbe && <DiveProbe target={diveProbeRef} />}
    </div>
  )
}
