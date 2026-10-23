import { useCallback, useEffect, useRef, useState } from 'react'

const SRC = '/audio/song.mp3'
const VOLUME = 0.3

// Minimal background-music controller: one lazily-created HTMLAudioElement
// per mounted app, native `loop` for indefinite replay from 0. No storage
// (always boots Off), no polling loops, no Web Audio. Rapid toggles are
// serialized with a generation counter so stale play() promises can never
// start audio after a cancel, and only one element/listeners ever exist.
export default function useBackgroundMusic() {
  const audioRef = useRef(null)
  const genRef = useRef(0)
  const removerRef = useRef(null)
  const [on, setOn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(
    () => () => {
      genRef.current += 1
      removerRef.current?.()
      removerRef.current = null
      const el = audioRef.current
      audioRef.current = null
      if (el) {
        try {
          el.pause()
        } catch {
          /* release-only */
        }
      }
    },
    []
  )

  const toggle = useCallback(() => {
    let el = audioRef.current
    if (!el) {
      el = new Audio()
      el.preload = 'none'
      el.volume = VOLUME
      el.loop = true
      el.src = SRC
      audioRef.current = el
      // DEV-only handle so automated checks can observe real playback
      // (position, loop wrap) without waiting out the full track.
      // Statically stripped from production builds.
      if (import.meta.env.DEV) window.__musicAudio = el
    }
    // Off, or cancel a pending start: invalidate in-flight work first.
    if (on || loading) {
      genRef.current += 1
      removerRef.current?.()
      removerRef.current = null
      setLoading(false)
      setOn(false)
      try {
        el.pause()
      } catch {
      }
      return
    }
    const gen = genRef.current + 1
    genRef.current = gen
    setFailed(false)
    setLoading(true)
    let settled = false
    const cleanup = () => {
      removerRef.current?.()
      removerRef.current = null
    }
    const finish = (ok) => {
      if (settled || genRef.current !== gen) return
      settled = true
      cleanup()
      setLoading(false)
      if (ok) {
        setOn(true)
      } else {
        setOn(false)
        setFailed(true)
      }
    }
    const onError = () => finish(false)
    el.addEventListener('error', onError)
    removerRef.current = () => el.removeEventListener('error', onError)
    el.play().then(
      () => {
        if (genRef.current !== gen) {
          try {
            el.pause()
          } catch {
          }
          return
        }
        finish(true)
      },
      () => {
        try {
          el.pause()
        } catch {
        }
        finish(false)
      }
    )
  }, [on, loading])

  return { on, loading, failed, toggle }
}
