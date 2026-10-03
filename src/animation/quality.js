// Central adaptive performance config (Phase 12).
// INIT-TIME (renderer construction only, never toggled live):
//   antialias, powerPreference
// RUNTIME (applied live, no renderer/scene rebuild):
//   pixel ratio, shadows, transition RTs, extras, animation intensity.

import { useCallback, useEffect, useState } from 'react'

export const PERFORMANCE_KEY = 'shane-performance-mode'

export function detectConstrainedDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  try {
    const touch =
      (navigator.maxTouchPoints || 0) > 0 ||
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(pointer: coarse)').matches)
    const cores =
      typeof navigator.hardwareConcurrency === 'number'
        ? navigator.hardwareConcurrency
        : null
    const mem =
      typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null
    const dpr = window.devicePixelRatio || 1
    const small =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 720px)').matches
    if (!touch && !small) return false
    if (cores != null && cores <= 4) return true
    if (mem != null && mem <= 4) return true
    if (small && dpr >= 2.5) return true
    if (small && touch) return true
    return false
  } catch {
    return false
  }
}

export function readStoredMode() {
  try {
    const v = window.localStorage.getItem(PERFORMANCE_KEY)
    return v === 'lite' || v === 'normal' ? v : null
  } catch {
    return null
  }
}

export function getInitialPerformanceMode() {
  const stored = typeof window !== 'undefined' ? readStoredMode() : null
  const constrained =
    typeof window !== 'undefined' ? detectConstrainedDevice() : false
  // Safe init: a stored NORMAL never forces the heavy pipeline on a
  // constrained device. The toggle still shows the safe (lite) state;
  // the user can explicitly try Normal mid-session (runtime only).
  if (stored === 'lite') return { mode: 'lite', constrained, overridden: false }
  if (stored === 'normal') {
    if (constrained) return { mode: 'lite', constrained, overridden: true }
    return { mode: 'normal', constrained, overridden: false }
  }
  return { mode: constrained ? 'lite' : 'normal', constrained, overridden: false }
}

const QUALITY = {
  normal: {
    init: { antialias: true, powerPreference: 'high-performance' },
    runtime: {
      pixelRatioCap: 1.5,
      renderScale: 1,
      shadows: true,
      shadowSize: 1024,
      transitionSamples: 2,
      transitionScale: 1,
      extras: true,
      animationFull: true,
      fishTickEvery: 1,
      debugThrottleMs: 250,
      // Max texture dimension applied BEFORE GPU upload (GLB textures,
      // sky PNGs). Hill maps keep their own per-channel caps in normal.
      texCap: 2048,
      // Full water/terrain shader injects (caustics, fresnel, horizon).
      waterHigh: true,
    },
  },
  lite: {
    init: { antialias: false, powerPreference: 'low-power' },
    runtime: {
      pixelRatioCap: 1,
      renderScale: 0.75,
      shadows: false,
      shadowSize: 0,
      transitionSamples: 0,
      transitionScale: 0.75,
      extras: false,
      animationFull: false,
      fishTickEvery: 2,
      debugThrottleMs: 500,
      texCap: 512,
      waterHigh: false,
    },
  },
}

export function resolveQuality(mode) {
  return mode === 'lite' ? QUALITY.lite : QUALITY.normal
}

export function effectivePixelRatio(runtime) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return Math.min(dpr, runtime.pixelRatioCap) * runtime.renderScale
}

export function usePerformanceMode() {
  // Initializer runs during App render (before children), so sync the
  // dataset here — effects run bottom-up and would be too late for
  // mount-time lite readers (e.g. AmbientFish).
  const [mode, setModeState] = useState(() => {
    const initial = getInitialPerformanceMode().mode
    try {
      document.documentElement.dataset.perf = initial
    } catch {
      /* no-op */
    }
    return initial
  })

  useEffect(() => {
    try {
      document.documentElement.dataset.perf = mode
    } catch {
      /* no-op */
    }
  }, [mode])

  const setMode = useCallback((next) => {
    const value = next === 'lite' ? 'lite' : 'normal'
    setModeState(value)
    try {
      window.localStorage.setItem(PERFORMANCE_KEY, value)
    } catch {
      /* private mode etc. */
    }
    try {
      document.documentElement.dataset.perf = value
    } catch {
      /* no-op */
    }
  }, [])

  return [mode, setMode]
}
