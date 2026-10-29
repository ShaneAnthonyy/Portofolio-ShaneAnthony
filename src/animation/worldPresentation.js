import { environmentCSS, worldTime } from './worldTime.js'

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
const linear = v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4
const rgb = hex => [16, 8, 0].map(shift => linear(((hex >> shift) & 255) / 255))
const channels = color => environmentCSS(color).slice(4, -1)

// Optical color grading consumes the existing water/sky sample, never another clock.
export function underwaterColors(sample) {
  const warm = Math.max(0, sample.skyLine[0] - sample.skyLine[2])
  const lightWarmth = Math.max(0, sample.skyGlow[0] - sample.skyGlow[2])
  const water = mix(mix(sample.waterDeep, sample.waterVolume, .18), sample.skyMiddle, warm * .2)
  const depth = mix(water, rgb(0x031623), .64)
  const reflection = mix(sample.waterLight, sample.skyGlow, lightWarmth * .7)
  return { water: channels(water.map(v => v * .8)), depth: channels(depth), reflection: channels(reflection) }
}

export function worldPresentation(sample) {
  const night = sample.darkness, warm = Math.max(0, sample.skyLine[0] - sample.skyLine[2])
  const surface = mix(mix(rgb(0x123846), rgb(0x071923), night), rgb(0x382d42), warm * .45)
  return {
    ...underwaterColors(sample),
    ui: {
      '--world-rgb': channels(surface),
      '--world-reflection-rgb': channels(sample.waterLight),
      '--world-primary': environmentCSS(mix(mix(rgb(0xeaf7f5), rgb(0xe9effb), night), rgb(0xffeee3), warm * .55)),
      '--world-secondary': environmentCSS(mix(mix(rgb(0xddecf1), rgb(0xbacfe6), night), rgb(0xf0e1e7), warm * .5)),
      '--world-muted': environmentCSS(mix(mix(rgb(0xd6e8e9), rgb(0xabc2db), night), rgb(0xe9d9e4), warm * .5)),
      '--world-accent': environmentCSS(mix(mix(rgb(0xb4efec), rgb(0xa9c8f4), night), rgb(0xf9d9cd), warm * .65)),
      '--world-alpha': (.44 - night * .1 + warm * .025).toFixed(3),
      '--world-border-alpha': (.22 - night * .04 + warm * .04).toFixed(3),
      '--world-edge-alpha': (.065 + night * night * .035).toFixed(3),
      '--world-shadow-alpha': (.25 + night * .18).toFixed(3),
    },
  }
}

// Only visible presentation islands inherit palette changes; the app/body never do.
export function bindWorldPresentation(root) {
  const selector = '.navbar, #home, .portfolio-sections > .section, .footer, .world-time-panel, .guide-pop--mobile'
  const islands = new Map()
  let sample = worldTime.getSnapshot().environment, cached = sample, palette = worldPresentation(sample).ui, timer = 0, last = 0
  const currentPalette = () => { if (cached !== sample) { cached = sample; palette = worldPresentation(sample).ui } }
  const write = (el, entry) => {
    for (const [name, value] of Object.entries(palette)) if (entry.values[name] !== value) {
      el.style.setProperty(name, value); entry.values[name] = value
    }
  }
  const flush = () => {
    clearTimeout(timer); timer = 0
    if (document.hidden) return
    last = performance.now(); currentPalette()
    for (const [el, entry] of islands) if (entry.visible) write(el, entry)
  }
  const schedule = () => {
    if (document.hidden || timer) return
    const remaining = 80 - (performance.now() - last)
    if (remaining <= 0) flush()
    else timer = setTimeout(flush, remaining)
  }
  const observer = new IntersectionObserver(entries => {
    currentPalette()
    for (const { target, isIntersecting } of entries) {
      const entry = islands.get(target)
      if (!entry) continue
      entry.visible = isIntersecting || target.matches('.navbar, .world-time-panel, .guide-pop--mobile')
      if (entry.visible && !document.hidden) write(target, entry)
    }
  }, { rootMargin: '400px 0px' })
  const add = el => {
    if (islands.has(el)) return
    currentPalette()
    const entry = { visible: true, values: {} }
    islands.set(el, entry); el.dataset.worldUi = 'true'; write(el, entry); observer.observe(el)
  }
  const remove = (el, entry) => {
    observer.unobserve(el); delete el.dataset.worldUi
    for (const name of Object.keys(entry.values)) el.style.removeProperty(name)
    islands.delete(el)
  }
  root.querySelectorAll(selector).forEach(add)
  const mutation = new MutationObserver(records => {
    for (const [el, entry] of islands) if (!el.isConnected) remove(el, entry)
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) {
      if (node.matches(selector)) add(node)
      node.querySelectorAll(selector).forEach(add)
    }
  })
  mutation.observe(document.body, { childList: true, subtree: true })
  const visible = () => { if (document.hidden) { clearTimeout(timer); timer = 0 } else flush() }
  document.addEventListener('visibilitychange', visible)
  const unsubscribe = worldTime.subscribe(() => { sample = worldTime.getSnapshot().environment; schedule() })
  return () => {
    clearTimeout(timer); unsubscribe(); observer.disconnect(); mutation.disconnect()
    document.removeEventListener('visibilitychange', visible)
    for (const [el, entry] of islands) remove(el, entry)
  }
}
