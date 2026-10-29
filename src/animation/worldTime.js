export const PRESETS = Object.freeze({ Sunrise: 360, Daytime: 720, Sunset: 1080, Night: 0 })
export const TIME_ANCHORS = Object.freeze([
  [0, 'Midnight', 1, 0], [270, 'Predawn', .94, .04], [330, 'Sunrise', .45, .8],
  [480, 'Morning', .06, .12], [720, 'Noon', 0, 0], [960, 'Afternoon', .02, .25],
  [1050, 'Golden Hour', .22, .8], [1110, 'Sunset', .6, .9],
  [1170, 'Early Night', .9, .12], [1260, 'Night', 1, 0],
].map(Object.freeze))

export function normalizeMinutes(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Time must be finite minutes')
  return ((value % 1440) + 1440) % 1440
}

export function timelineMinutes(offset) {
  if (typeof offset !== 'number' || !Number.isFinite(offset) || offset < 0 || offset > 1440) {
    throw new RangeError('Timeline offset must be between 0 and 1440')
  }
  return normalizeMinutes(300 + offset)
}

export function formatWorldTime(minutes) {
  const whole = Math.floor(normalizeMinutes(minutes))
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}

const mix = (a, b, t) => a + (b - a) * t
const blend = (a, b, t) => a.map((value, i) => mix(value, b[i], t))
const clamp = value => Math.min(1, Math.max(0, value))
const linear = value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
const rgb = hex => [16, 8, 0].map(shift => linear(((hex >> shift) & 255) / 255))

export function environmentCSS(color) {
  const channels = color.map(value => {
    const c = clamp(value)
    return Math.round(255 * (c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055))
  })
  return `rgb(${channels.join(' ')})`
}

// Keep the audited ambient/key mapping in linear RGB.
const DAY = {
  skyTop: rgb(0x65a8ff), skyHorizon: rgb(0xc4e1ff), skyBottom: rgb(0xd0e7ef),
  ambientColor: rgb(0xffe8c8), ambientIntensity: 2.2,
  keyColor: rgb(0xcfe0ee), keyIntensity: .5,
  hemiSky: rgb(0xbfd9ff), hemiGround: rgb(0x8a7a52), hemiIntensity: .9,
  fillColor: rgb(0xffd9b0), fillIntensity: .4, fog: rgb(0xc8d4de), exposure: 1,
  waterDeep: rgb(0x3f777f), waterShallow: rgb(0xb3dad6), waterSand: rgb(0xa9bba6),
  waterLight: rgb(0xe1f2df), waterRock: rgb(0xb4c7b0), waterVolume: rgb(0x3c8ea5),
  waterSunIntensity: 2.2, cloudTint: rgb(0xffffff), skyTint: rgb(0xffffff),
}
const NIGHT = {
  skyTop: rgb(0x101a38), skyHorizon: rgb(0x263458), skyBottom: rgb(0x15243b),
  ambientColor: rgb(0x9db8ff), ambientIntensity: .35,
  keyColor: rgb(0x2a3a55), keyIntensity: .15,
  hemiSky: rgb(0x33415e), hemiGround: rgb(0x1a1f2a), hemiIntensity: .25,
  fillColor: rgb(0x6a86b8), fillIntensity: .1, fog: rgb(0x0a1628), exposure: .85,
  waterDeep: rgb(0x061923), waterShallow: rgb(0x123948), waterSand: rgb(0x254249),
  waterLight: rgb(0x76c4cc), waterRock: rgb(0x527e89), waterVolume: rgb(0x24586d),
  waterSunIntensity: 1.1, cloudTint: rgb(0x8397c8), skyTint: rgb(0xffffff),
}
// Sky-only art direction at the same anchors; existing lighting/water values stay intact.
const SKY = [
  [0x09162e, 0x192c49, 0x344b67, 0x42516b, 0xffdfaf],
  [0x14294b, 0x5c607f, 0xd39985, 0xffb780, 0xffd099],
  [0x315f9f, 0x8998b0, 0xf8aa76, 0xffc189, 0xffd8a0],
  [0x2874d5, 0x5092df, 0x9fc7ee, 0xc1dcf4, 0xfff5d7],
  [0x246cce, 0x4a8fe0, 0x9bc4ef, 0xbdd9f4, 0xfff8e3],
  [0x3077ce, 0x6098d2, 0xbac4ce, 0xf4cc9b, 0xffebc2],
  [0x38649b, 0xa87979, 0xe8995b, 0xf0a563, 0xf4c08b],
  [0x263969, 0x8f626f, 0xd57a49, 0xe99054, 0xefad76],
  [0x142544, 0x2b3e5f, 0x6b6579, 0xb47a6d, 0xffce9e],
  [0x09162e, 0x192c49, 0x344b67, 0x42516b, 0xffdfaf],
]
const palettes = TIME_ANCHORS.map(([, , darkness, warmth], index) => {
  const palette = Object.fromEntries(Object.keys(DAY).map(key => [key,
    Array.isArray(DAY[key]) ? blend(DAY[key], NIGHT[key], darkness) : mix(DAY[key], NIGHT[key], darkness),
  ]))
  palette.skyHorizon = blend(palette.skyHorizon, rgb(0xffaf80), warmth * .7)
  palette.fog = blend(palette.fog, rgb(0xe7b3a0), warmth * .18)
  palette.waterLight = blend(palette.waterLight, rgb(0xffc78d), warmth * .55)
  palette.cloudTint = blend(palette.cloudTint, rgb(0xffd6b0), warmth * .35)
  palette.skyTint = blend(palette.skyTint, rgb(0xffd6b0), warmth * .16)
  const [skyZenith, skyMiddle, skyLine, skyGlow, skySun] = SKY[index].map(rgb)
  return { ...palette, skyZenith, skyMiddle, skyLine, skyGlow, skySun,
    darkness, shadowFactor: mix(1, .7, darkness) }
})

export function sampleEnvironment(value) {
  const minutes = normalizeMinutes(value)
  let index = TIME_ANCHORS.length - 1
  for (let i = 0; i < TIME_ANCHORS.length - 1; i++) {
    if (minutes < TIME_ANCHORS[i + 1][0]) { index = i; break }
  }
  const end = TIME_ANCHORS[index + 1]?.[0] ?? 1440
  const fraction = (minutes - TIME_ANCHORS[index][0]) / (end - TIME_ANCHORS[index][0])
  const t = fraction * fraction * (3 - 2 * fraction)
  const a = palettes[index], b = palettes[(index + 1) % palettes.length]
  const sample = Object.fromEntries(Object.keys(a).map(key => [key,
    Array.isArray(a[key]) ? Object.freeze(blend(a[key], b[key], t)) : mix(a[key], b[key], t),
  ]))
  const angle = (minutes - 360) / 1440 * Math.PI * 2
  const length = Math.hypot(1, .35)
  const direction = [Math.cos(angle) / length, Math.sin(angle) / length, .35 / length]
  return Object.freeze({
    ...sample, minutes, label: TIME_ANCHORS[index][1],
    sunDirection: Object.freeze(direction), moonDirection: Object.freeze(direction.map(v => -v)),
    sunVisibility: clamp(direction[1] * 4), moonVisibility: clamp(-direction[1] * 4),
    starVisibility: sample.darkness ** 2,
  })
}

export function createWorldTimeStore({ now = () => new Date(), host = globalThis } = {}) {
  const listeners = new Set()
  const page = host.document
  const view = host.window || host
  let timer = null, frame = null, pending = null, disposed = false
  const clock = () => {
    const date = now()
    return normalizeMinutes(date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60 + date.getMilliseconds() / 60000)
  }
  const makeSnapshot = (mode, minutes, sliderOffset = normalizeMinutes(minutes - 300)) =>
    Object.freeze({ mode, minutes, sliderOffset, environment: sampleEnvironment(minutes) })
  let snapshot = makeSnapshot('live', clock())
  const cancelTimer = () => { if (timer !== null) host.clearTimeout(timer); timer = null }
  const cancelInput = () => {
    if (frame !== null) host.cancelAnimationFrame(frame)
    frame = null; pending = null
  }
  const publish = (mode, minutes, offset) => {
    if (disposed) return
    const sliderOffset = offset ?? normalizeMinutes(minutes - 300)
    if (snapshot.mode === mode && snapshot.minutes === minutes && snapshot.sliderOffset === sliderOffset) return
    snapshot = makeSnapshot(mode, minutes, sliderOffset)
    listeners.forEach(listener => listener())
  }
  const scheduleClock = () => {
    cancelTimer()
    if (!disposed && listeners.size && snapshot.mode === 'live' && !page?.hidden) {
      timer = host.setTimeout(() => { timer = null; publish('live', clock()); scheduleClock() }, 1000)
    }
  }
  const flushInput = () => {
    if (pending === null) return
    const offset = pending
    cancelInput()
    publish('manual', timelineMinutes(offset), offset)
    scheduleClock()
  }
  const resync = () => {
    flushInput()
    if (!page?.hidden && snapshot.mode === 'live') publish('live', clock())
    scheduleClock()
  }
  const stop = () => {
    cancelTimer(); cancelInput()
    page?.removeEventListener('visibilitychange', resync)
    view.removeEventListener?.('focus', resync)
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (disposed) throw new Error('World Time store is disposed')
      listeners.add(listener)
      if (listeners.size === 1) {
        page?.addEventListener('visibilitychange', resync)
        view.addEventListener?.('focus', resync)
        resync()
      }
      let subscribed = true
      return () => {
        if (!subscribed) return
        subscribed = false; listeners.delete(listener)
        if (!listeners.size) stop()
      }
    },
    setManual(minutes) {
      const value = normalizeMinutes(minutes)
      cancelInput(); publish('manual', value); scheduleClock()
    },
    setTimeline(offset) {
      timelineMinutes(offset)
      if (disposed) return
      pending = offset
      cancelTimer()
      if (!listeners.size || page?.hidden || !host.requestAnimationFrame) flushInput()
      else if (frame === null) frame = host.requestAnimationFrame(() => { frame = null; flushInput() })
    },
    flushInput,
    setPreset(name) {
      if (!Object.hasOwn(PRESETS, name)) throw new RangeError('Unknown time preset')
      cancelInput(); publish('manual', PRESETS[name]); scheduleClock()
    },
    setMode(mode) {
      if (mode !== 'live' && mode !== 'manual') throw new RangeError('Unknown time mode')
      cancelInput()
      publish(mode, mode === 'live' || snapshot.mode === 'live' ? clock() : snapshot.minutes,
        mode === 'manual' && snapshot.mode === 'manual' ? snapshot.sliderOffset : undefined)
      scheduleClock()
    },
    dispose() { disposed = true; stop(); listeners.clear() },
  }
}

export const worldTime = createWorldTimeStore()
