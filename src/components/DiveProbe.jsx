
import { useEffect, useRef } from 'react'

export function isProbeEnabled() {
  try {
    return (
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).has('dive-probe')
    )
  } catch {
    return false
  }
}

function jsHeap() {
  try {
    const mem = performance.memory
    if (!mem) return null
    return `jsHeap ${(mem.usedJSHeapSize / 1048576).toFixed(0)}/${(mem.jsHeapSizeLimit / 1048576).toFixed(0)}MB`
  } catch {
    return null
  }
}

export default function DiveProbe({ target }) {
  const elRef = useRef(null)

  useEffect(() => {
    let raf = 0
    let last = 0
    const paint = () => {
      raf = requestAnimationFrame(paint)
      const now = performance.now()
      if (now - last < 500) return
      last = now
      const el = elRef.current
      if (!el) return
      const s = target ? target.current : null
      if (!s || s.calls == null) {
        el.textContent = 'dive-probe: waiting for frames…'
        return
      }
      const fps = s.ms > 0 ? 1000 / s.ms : 0
      const lines = [
        `dive-probe [${s.mode || '?'}] phase=${s.phase || '?'} ${s.ms.toFixed(1)}ms ~${fps.toFixed(0)}fps`,
        `calls=${s.calls} tris=${s.tris} geos=${s.geos} texs=${s.texs}`,
        `pr=${s.pr} buf=${s.bufW}x${s.bufH}` +
          (s.rtW ? ` rt=${s.rtW}x${s.rtH}` : ' rt=-') +
          (s.shadow != null ? ` shadow=${s.shadow}` : ''),
        `ready=${s.ready || '?'} frames=${s.frames || 0}` + (jsHeap() ? ` ${jsHeap()}` : ''),
        `settles(${(s.settles || []).length}): ` +
          (s.settles || [])
            .slice(-8)
            .map((e) => `${e.label}@${e.ms.toFixed(0)}`)
            .join(' '),
      ]
      el.textContent = lines.join('\n')
    }
    raf = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return <pre ref={elRef} className="dive-probe" aria-hidden="true" />
}
