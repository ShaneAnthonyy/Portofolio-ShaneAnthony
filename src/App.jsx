import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
import { usePerformanceMode } from './animation/quality.js'

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
  const showProbe = isProbeEnabled()
  const diveProbeRef = useRef(null)
  const canReplay = !isDivePoc && !webglFailed
  const shouldDive = canReplay && (!progress.reduced || reducedDiveActive)
  const entered = !shouldDive || introComplete || progress.dive >= 0.995
  const portfolioEntered = entered
  const portfolioUnlocked = !shouldDive || (introComplete && !returningToP0)
  const bubbleDepth = Math.min(Math.max(progress.t, 0), 1)
  const visualEntered = entered || shouldDive && progress.dive >= 0.94
  const diveProgress = (introComplete && !returningToP0) ? 1 : reducedDiveActive ? progress.dive : undefined
  const reveal = Math.min(Math.max((progress.dive - 0.94) / 0.06, 0), 1)
  const backgroundBlur = introComplete || progress.dive < 0.94 ? 0 : (1 - reveal) * 1.5
  const atmosphereBlur = shouldDive && progress.dive >= 0.94 ? 2 + (1 - reveal) * 2 : 2

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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = Array.from(document.querySelectorAll('.section__layout, .hero__content'))
    els.forEach((el) => el.classList.add('reveal'))
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
      <Navbar diveActive={shouldDive} entered={portfolioEntered} diveProgress={diveProgress ?? progress.dive} performanceMode={performanceMode} onPerformanceModeChange={setPerformanceMode} />
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
              <Hero onDiveAgain={canReplay ? diveAgain : undefined} />
            </AquariumDivePrototype>
          </Suspense>
        ) : (
          <Hero onDiveAgain={canReplay ? diveAgain : undefined} />
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
