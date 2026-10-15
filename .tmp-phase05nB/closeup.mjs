import { setTimeout as delay } from 'node:timers/promises'
const CDP = 9229
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
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (!m.id) return
  const p = pend.get(m.id); if (!p) return
  pend.delete(m.id); clearTimeout(p.timer)
  m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
})
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++nid
  pend.set(id, { resolve: res, reject: rej, timer: setTimeout(() => { pend.delete(id); rej(new Error('Timeout ' + method)) }, 30000) })
  ws.send(JSON.stringify({ id, method, params }))
})
const js = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: `JSON.stringify((${expr}) ?? null)`, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('threw')
  return r.result.value === undefined ? null : JSON.parse(r.result.value)
}
const until = async (expr, timeout = 90000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) { if (await js(expr)) return; await delay(500) }
  throw new Error('timeout ' + expr)
}
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('shane-theme', 'light');` })
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' })
await until('!!document.querySelector("#portfolio-dive")')
await until('(window.__charRigs || []).length === 2')
await until(`!!document.querySelector('.loading-screen__enter:not(:disabled)')`)
await delay(500)
const pt = await js(`(() => { const r = document.querySelector('.loading-screen__enter').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...pt })
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...pt })
await until(`!document.querySelector('.loading-screen')`)
await delay(2000)
await js(`(() => {
  for (const c of window.__charRigs) {
    c.active = true
    c.t = 0.1
    c.group.visible = true
    if (c.kind === 'chicken') { c.root.position.set(-9.5, 1.2, -7); c.root.rotation.y = 2.2 }
    else { c.root.position.set(-2.5, -0.5, 6); c.root.rotation.y = 3.0 }
  }
  return true
})()`)
await delay(400)
const proj = await js(`(() => {
  const cam = window.__diveCamera
  const o = {}
  for (const c of window.__charRigs) {
    const p = c.root.position.clone().project(cam)
    o[c.kind] = [(p.x * 0.5 + 0.5) * innerWidth, (1 - (p.y * 0.5 + 0.5)) * innerHeight]
  }
  return o
})()`)
console.log('PROJ:' + JSON.stringify(proj))
const { data } = await send('Page.captureScreenshot', { format: 'png' })
await (await import('node:fs/promises')).writeFile(new URL('./scene/closeup-proof.png', import.meta.url), Buffer.from(data, 'base64'))
console.log('SHOT')
await bsend('Target.closeTarget', { targetId })
await bsend('Target.disposeBrowserContext', { browserContextId })
process.exit(0)
