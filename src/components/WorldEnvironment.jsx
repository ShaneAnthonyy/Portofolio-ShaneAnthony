import { memo, useEffect, useId, useLayoutEffect, useRef } from 'react'
import { environmentCSS, worldTime } from '../animation/worldTime.js'
import { bindWorldPresentation, underwaterColors } from '../animation/worldPresentation.js'
import { subscribeProgressFrame } from '../hooks/useSectionProgress.js'
import './world-environment.css'

const stars = 'M42 46h2v2h-2z M138 198h3v3h-3z M204 76h2v2h-2z M288 248h2v2h-2z M346 132h3v3h-3z M425 40h2v2h-2z M508 214h2v2h-2z M587 92h3v3h-3z M654 284h2v2h-2z M728 164h2v2h-2z M812 38h3v3h-3z M904 226h2v2h-2z M984 108h2v2h-2z M1072 306h3v3h-3z M1158 58h2v2h-2z M1246 182h2v2h-2z M1340 260h3v3h-3z M1410 84h2v2h-2z M78 332h2v2h-2z M238 398h2v2h-2z M398 320h3v3h-3z M562 436h2v2h-2z M748 364h2v2h-2z M922 442h3v3h-3z M1122 386h2v2h-2z M1306 426h2v2h-2z'
const smooth = (a, b, value) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t) }

export default memo(function WorldEnvironment({ enabled, diveActive, onOwnershipChange }) {
  const hostRef = useRef(null)
  const cloudRef = useRef({ mode: null, minutes: 0, offset: 0 })
  const id = useId().replace(/:/g, '')

  useLayoutEffect(() => bindWorldPresentation(hostRef.current.parentElement), [])

  useEffect(() => {
    const host = hostRef.current
    if (!enabled) return
    const home = document.getElementById('home'), sun = host.querySelector('[data-sun]'), moon = host.querySelector('[data-moon]'), clouds = host.querySelector('.world-environment__wind svg')
    let { environment: sample, mode } = worldTime.getSnapshot(), applied, width, height, surfaceWidth, frame = 0, opacity = 0, owned = false, backdrop
    const written = {}
    const setVar = (name, value) => {
      const str = String(value)
      if (written[name] === str) return
      written[name] = str
      host.style.setProperty(name, str)
    }
    const apply = () => {
      const w = window.innerWidth, h = window.innerHeight, planeWidth = host.clientWidth
      if (sample === applied && width === w && height === h && surfaceWidth === planeWidth) return
      width = w; height = h; surfaceWidth = planeWidth; applied = sample
      for (const [name, color] of [['top', sample.skyZenith], ['middle', sample.skyMiddle], ['horizon', sample.skyLine], ['glow', sample.skyLine.map((v, i) => v * .68 + sample.skyGlow[i] * .32)], ['sun', sample.skySun], ['cloud', sample.cloudTint.map((v, i) => v + (sample.skyLine[i] - v) * sample.darkness * .55)]]) {
        setVar(`--world-${name}`, environmentCSS(color))
      }
      setVar('--world-stars', sample.starVisibility * .8)
      setVar('--world-cloud-opacity', .88 - .5 * sample.darkness)
      const optics = underwaterColors(sample)
      setVar('--world-water-rgb', optics.water)
      setVar('--world-depth-rgb', optics.depth)
      setVar('--world-reflection-rgb', optics.reflection)
      const spread = Math.max(.5, Math.min(1, w / h / .9))
      for (const [node, direction] of [[sun, sample.sunDirection], [moon, sample.moonDirection]]) {
        const x = (direction[0] * .57 - direction[1] * .44) * spread
        const y = Math.sign(direction[1]) * smooth(0, .35, Math.abs(direction[1])) * .425 + .02
        const top = Math.max((.86 - y * 1.7) * h, Math.min(h * .28, 125))
        const transform = `translate3d(${(.5 + x * .6 / Math.min(w / h, 1)) * w}px,${top}px,0) translate(-50%,-50%)`
        const vis = String(smooth(-.06, .06, direction[1]))
        if (node.style.transform !== transform) node.style.transform = transform
        if (node.style.opacity !== vis) node.style.opacity = vis
      }
      const cloud = cloudRef.current
      if (cloud.mode === 'manual' && mode === 'live') cloud.offset = ((cloud.offset + (cloud.minutes - sample.minutes) / 1440 * 500) % 500 + 500) % 500
      const phase = ((((sample.minutes - 720) / 1440 * 500 + cloud.offset) % 500) + 500) % 500
      const cloudTransform = `translate3d(${-phase * planeWidth / 1000}px,0,0)`
      if (clouds.style.transform !== cloudTransform) clouds.style.transform = cloudTransform
      cloud.mode = mode; cloud.minutes = sample.minutes
      host.dataset.minutes = String(sample.minutes)
    }
    const schedule = () => {
      if (!frame && opacity > 0 && !document.hidden) frame = requestAnimationFrame(() => { frame = 0; apply() })
    }
    const update = () => {
      const next = smooth(.03, .36, -home.getBoundingClientRect().top / Math.max(home.offsetHeight, 1))
      if (next > 0 && !document.hidden) apply()
      if (next === 0 && frame) { cancelAnimationFrame(frame); frame = 0 }
      if (next !== opacity) {
        opacity = next
        host.style.opacity = opacity
        host.style.visibility = opacity > 0 ? 'visible' : 'hidden'
      }
      if (!backdrop?.isConnected) backdrop = host.parentElement.querySelector('.webgl-backdrop')
      if (backdrop) {
        backdrop.style.opacity = 1 - opacity
        backdrop.style.visibility = opacity === 1 ? 'hidden' : ''
      }
      if ((opacity > 0) !== owned) { owned = opacity > 0; onOwnershipChange(owned) }
      const running = String(opacity > 0 && !document.hidden)
      if (host.dataset.running !== running) host.dataset.running = running
    }
    const visibility = () => { update(); if (!document.hidden) schedule() }
    const unsubscribeTime = worldTime.subscribe(() => { ({ environment: sample, mode } = worldTime.getSnapshot()); schedule() })
    const unsubscribeScroll = subscribeProgressFrame(update)
    const resize = new ResizeObserver(update)
    resize.observe(home)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      cancelAnimationFrame(frame)
      unsubscribeTime(); unsubscribeScroll(); resize.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      host.style.opacity = 0; host.style.visibility = 'hidden'; host.dataset.running = 'false'
      backdrop?.style.removeProperty('opacity'); backdrop?.style.removeProperty('visibility')
      onOwnershipChange(false)
    }
  }, [enabled, diveActive, onOwnershipChange])

  return <div ref={hostRef} className="world-environment" aria-hidden="true" data-running="false">
    <svg className="world-environment__stars" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false"><path d={stars} /></svg>
    <svg data-sun className="world-environment__celestial world-environment__sun" viewBox="0 0 16 16" focusable="false"><path d="M0 0h16v16H0z" /></svg>
    <svg data-moon className="world-environment__celestial world-environment__moon" viewBox="0 0 16 16" focusable="false"><path fill="#c3d4e8" d="M0 0h16v16H0z" /><path fill="#91a9c5" d="M2 2h6v3H2z M9 5h5v6H9z M3 9h4v5H3z M8 13h4v2H8z" /></svg>
    <div className="world-environment__wind"><svg viewBox="0 0 2000 650" preserveAspectRatio="none" focusable="false">
      <defs><pattern id={`clouds-${id}`} width="500" height="650" patternUnits="userSpaceOnUse">
        <path fill="var(--world-cloud)" d="M28 102h74V88h68v14h48v22h38v25H28z M312 276h64v-18h54v18h48v32H312z M110 428h48v-16h76v16h64v27H110z" />
        <path fill="var(--world-cloud)" opacity=".86" d="M28 149h228v8H28z M312 308h166v8H312z M110 455h188v8H110z" />
      </pattern></defs><path fill={`url(#clouds-${id})`} d="M0 0h2000v650H0z" />
    </svg></div>
  </div>
})
