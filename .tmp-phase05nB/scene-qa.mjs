import { writeFile, mkdir } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
const CDP = 9229
const base = new URL('./', import.meta.url)
await mkdir(new URL('./scene', base), { recursive: true })
const v = await fetch(`http://127.0.0.1:${CDP}/json/version`).then(r => r.json())
const openSocket = (url) => new Promise((res, rej) => {
  const ws = new WebSocket(url)
  ws.addEventListener('open', () => res(ws), { once: true })
  ws.addEventListener('error', rej, { once: true })
})
const browserWs = await openSocket(v.webSocketDebuggerUrl)
let bid = 0
const bp = new Map()
browserWs.addEventListener('message', e => {
  const m = JSON.parse(e.data); const p = bp.get(m.id)
  if (p) { bp.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result) }
})
const bsend = (method, params = {}) => new Promise((res, rej) => {
  const id = ++bid; bp.set(id, { resolve: res, reject: rej })
  browserWs.send(JSON.stringify({ id, method, params }))
})
const { browserContextId } = await bsend('Target.createBrowserContext', { disposeOnDetach: true })
const { targetId } = await bsend('Target.createTarget', { url: 'about:blank', browserContextId })
const tabs = await fetch(`http://127.0.0.1:${CDP}/json`).then(r => r.json())
const tab = tabs.find(t => t.id === targetId)
const ws = await openSocket(tab.webSocketDebuggerUrl)
let nid = 0
const pend = new Map()
const errors = []
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(m.params.exceptionDetails).slice(0, 500))
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text)
  if (!m.id) return
  const p = pend.get(m.id); if (!p) return
  pend.delete(m.id); clearTimeout(p.timer)
  m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
})
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++nid
  pend.set(id, { resolve: res, reject: rej, timer: setTimeout(() => { pend.delete(id); rej(new Error('Timeout ' + method)) }, 60000) })
  ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: `JSON.stringify(((${expr})) ?? null)`, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 2000))
  return r.result.value === undefined ? null : JSON.parse(r.result.value)
}
const until = async (expr, timeout = 45000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) { if (await evaluate(expr)) return; await delay(500) }
  throw new Error('until timeout: ' + expr)
}
const shot = async (file) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(new URL(file, base), Buffer.from(data, 'base64'))
}
const chars = () => evaluate(`(window.__charRigs || []).map(c => ({ kind: c.kind, t: +c.t.toFixed(2), clip: c.curClip, active: c.active, visible: c.group.visible, pos: c.root.position.toArray().map(v => +v.toFixed(2)) }))`)
const stats = () => evaluate(`window.__diveStats ? window.__diveStats() : null`)
const proj = () => evaluate(`(() => {
  const cam = window.__diveCamera
  const out = {}
  for (const c of (window.__charRigs || [])) {
    const p = c.root.position.clone().project(cam)
    out[c.kind] = { ndc: p.toArray().map(v => +v.toFixed(3)), behind: p.z > 1 }
  }
  return { chars: out, cam: cam.position.toArray().map(v => +v.toFixed(2)), w: innerWidth, h: innerHeight }
})()`)
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' })
await until('!!document.querySelector("#portfolio-dive")')
await until('(window.__charRigs || []).length === 2')
await until(`!!document.querySelector('.loading-screen__enter:not(:disabled)')`)
await delay(500)
const pt = await evaluate(`(() => { const r = document.querySelector('.loading-screen__enter').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...pt })
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...pt })
await until(`!document.querySelector('.loading-screen')`)
await delay(2500)
const report = { states: [], timeline: [], perf: [], replay: null, errors }
for (const [name, p] of [['p0', 0], ['p05', 0.5], ['p091', 0.91]]) {
  await evaluate(`scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * ${p}, behavior: 'instant'})`)
  await delay(2500)
  const s = { state: name, chars: await chars(), stats: await stats(), proj: await proj() }
  report.states.push(s)
  await shot(`./scene/${name}.png`)
  console.log(name, JSON.stringify(s.chars), JSON.stringify(s.stats))
}
await evaluate(`scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * 0.5, behavior: 'instant'})`)
await delay(1200)
for (const [name, wait] of [['t1-idle', 1000], ['t35-walk', 2500], ['t6-run', 2500], ['t9-exit', 3000]]) {
  await delay(wait)
  const s = { state: name, chars: await chars(), proj: await proj() }
  report.timeline.push(s)
  await shot(`./scene/ch-${name}.png`)
  console.log(name, JSON.stringify(s.chars))
}
const profile = async (label, from, to, durMs) => {
  const raw = await send('Runtime.evaluate', { expression: `new Promise(resolve => {
    const y0 = document.querySelector('#portfolio-dive').offsetHeight * ${from}
    const y1 = document.querySelector('#portfolio-dive').offsetHeight * ${to}
    const t0 = performance.now()
    const frames = []
    let last = performance.now()
    const tick = (t) => {
      frames.push(t - last); last = t
      const k = Math.min((t - t0) / ${durMs}, 1)
      scrollTo({ top: y0 + (y1 - y0) * k, behavior: 'instant' })
      if (k < 1) requestAnimationFrame(tick)
      else resolve(frames)
    }
    requestAnimationFrame(tick)
  })`, returnByValue: true, awaitPromise: true })
  if (raw.exceptionDetails) throw new Error('profile threw')
  const r = raw.result.value
  const s = [...r].sort((a, b) => a - b)
  const row = { label, frames: r.length, median: +s[Math.floor(s.length / 2)].toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), max: +Math.max(...r).toFixed(2), over50: r.filter(x => x > 50).length }
  report.perf.push(row)
  console.log(label, JSON.stringify(row))
}
await profile('desktop-fwd', 0.1, 0.65, 6500)
await profile('desktop-rev', 0.65, 0.1, 6500)
await evaluate(`scrollTo({top: 0, behavior: 'instant'})`)
await delay(9000)
report.replay = await chars()
await shot('./scene/replay-p0.png')
console.log('replay', JSON.stringify(report.replay))
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' })
await until('!!document.querySelector("#portfolio-dive")')
await delay(4000)
report.mobile = { chars: await chars(), stats: await stats() }
await shot('./scene/mobile-p0.png')
console.log('mobile', JSON.stringify(report.mobile))
await writeFile(new URL('./scene/report.json', base), JSON.stringify({ report, errors }, null, 2))
await bsend('Target.closeTarget', { targetId })
await bsend('Target.disposeBrowserContext', { browserContextId })
console.log('DONE')
process.exit(0)
