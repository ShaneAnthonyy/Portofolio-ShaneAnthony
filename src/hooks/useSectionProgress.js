import { useEffect, useState } from 'react'
import { portfolioSectionIds } from '../data/content.js'

const IDS = portfolioSectionIds
const HYST = 24

function measure() {
  const centers = []
  for (const id of IDS) {
    const el = document.getElementById(id)
    if (el) centers.push({ id, c: el.offsetTop + el.offsetHeight / 2 })
  }
  return centers
}

function interpolate(centers) {
  const vh = window.innerHeight
  const mid = window.scrollY + vh * 0.5
  if (centers.length < 2) {
    const h = document.documentElement
    const max = h.scrollHeight - vh
    return { t: max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0, mid }
  }
  let t = 0
  if (mid <= centers[0].c) t = 0
  else if (mid >= centers[centers.length - 1].c) t = 1
  else {
    for (let i = 0; i < centers.length - 1; i++) {
      const a = centers[i].c
      const b = centers[i + 1].c
      if (mid >= a && mid <= b) {
        t = (i + (b > a ? (mid - a) / (b - a) : 0)) / (centers.length - 1)
        break
      }
    }
  }
  return { t, mid }
}

function activeWithHyst(centers, mid, prev) {
  let raw = 0
  centers.forEach((s, i) => {
    if (s.c <= mid) raw = i
  })
  if (prev == null || raw === prev || !centers[raw] || !centers[prev]) return raw
  if (raw > prev) return mid >= centers[raw].c + HYST ? raw : prev
  return mid <= centers[prev].c - HYST ? raw : prev
}

function initialState() {
  return {
    t: 0,
    dive: 0,
    activeId: IDS[0],
    scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
    dir: 'idle',
    velocity: 0,
    reduced:
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }
}

let centers = []
let introEl = null
let introTop = 0
let introHeight = 0
let maxScroll = 0
let prevIdx = null
let lastY = typeof window !== 'undefined' ? window.scrollY : 0
let lastTime = 0
let raf = 0
let queued = false
let current = initialState()
const subscribers = new Set()
const frameSubscribers = new Set()
export function subscribeProgressFrame(fn) {
  frameSubscribers.add(fn)
  ensureListening()
  fn({ scrollY: window.scrollY, viewportH: window.innerHeight, progress: current })
  return () => {
    frameSubscribers.delete(fn)
    releaseListening()
  }
}
export function getSectionProgress() {
  return current
}
let listening = false
let motionPreference

function measureLayout() {
  centers = measure()
  introEl = document.getElementById('portfolio-dive')
  introTop = introEl ? introEl.getBoundingClientRect().top + window.scrollY : 0
  introHeight = introEl ? introEl.offsetHeight : 0
  maxScroll = document.documentElement.scrollHeight - window.innerHeight
}

function snapshot() {
  return current
}

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (let i = 0; i < keysA.length; i++) {
    const k = keysA[i]
    if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k])) return false
  }
  return true
}

function compute() {
  queued = false
  if (centers.length === 0) measureLayout()
  if (introEl && !introEl.isConnected) measureLayout()
  const { t, mid } = interpolate(centers)
  const intro = introEl
  const h = intro
    ? intro.style.height === '0px'
      ? 0
      : introHeight || (introHeight = intro.offsetHeight)
    : 0
  const dive = intro
    ? intro.dataset.diveProgress !== undefined ? Number(intro.dataset.diveProgress)
      : h === 0 ? 1
        : Math.min(Math.max((window.scrollY - introTop) / h, 0), 1)
    : maxScroll > 0 ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1) : 0
  const idx = activeWithHyst(centers, mid, prevIdx)
  prevIdx = idx
  const y = window.scrollY
  const dir = y > lastY + 1 ? 'down' : y < lastY - 1 ? 'up' : 'idle'
  const now = performance.now()
  const velocity = lastTime ? Math.max(0, (y - lastY) * 1000 / Math.max(now - lastTime, 16)) : 0
  lastTime = now
  lastY = y
  const next = {
    t,
    dive,
    activeId: centers[idx] ? centers[idx].id : IDS[0],
    scrollY: y,
    dir,
    velocity,
    reduced: motionPreference ? motionPreference.matches : current.reduced,
  }
  if (
    current.t !== next.t ||
    current.dive !== next.dive ||
    current.activeId !== next.activeId ||
    current.scrollY !== next.scrollY ||
    current.dir !== next.dir ||
    current.reduced !== next.reduced
  ) {
    const notifyReact = intro?.dataset.diveProgress === undefined || current.reduced !== next.reduced
    if (notifyReact) {
      current = next
      subscribers.forEach((notify) => notify(next))
    }
  }
  frameSubscribers.forEach((fn) => fn({ scrollY: y, viewportH: window.innerHeight, progress: next }))
}

function schedule() {
  if (queued) return
  queued = true
  raf = requestAnimationFrame(compute)
}

function remeasure() {
  measureLayout()
  schedule()
}

export function refreshSectionProgress() {
  remeasure()
}

function ensureListening() {
  if (listening || typeof window === 'undefined') return
  listening = true
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  measureLayout()
  compute()
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', remeasure)
  window.addEventListener('load', remeasure)
  motionPreference.addEventListener('change', remeasure)
}

function releaseListening() {
  if (!listening || subscribers.size + frameSubscribers.size > 0 || typeof window === 'undefined') return
  listening = false
  queued = false
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', remeasure)
  window.removeEventListener('load', remeasure)
  motionPreference.removeEventListener('change', remeasure)
  cancelAnimationFrame(raf)
}

export default function useSectionProgress(selector) {
  const [state, setState] = useState(() => (selector ? selector(snapshot()) : snapshot()))

  useEffect(() => {
    const notify = (next) => {
      if (!selector) {
        setState(next)
        return
      }
      const selected = selector(next)
      setState((prev) => (shallowEqual(prev, selected) ? prev : selected))
    }
    subscribers.add(notify)
    ensureListening()
    notify(current)
    return () => {
      subscribers.delete(notify)
      releaseListening()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}
