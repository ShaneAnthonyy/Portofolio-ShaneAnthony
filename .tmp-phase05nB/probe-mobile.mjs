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
  if (r.exceptionDetails) throw new Error('threw ' + JSON.stringify(r.exceptionDetails).slice(0, 300))
  return r.result.value === undefined ? null : JSON.parse(r.result.value)
}
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' })
const t0 = Date.now()
let n = 0
while (Date.now() - t0 < 60000) {
  n = await js('(window.__charRigs || []).length')
  if (n === 2) break
  await delay(500)
}
await delay(1500)
console.log('RIGS:' + await js(`(window.__charRigs || []).map(c => JSON.stringify({ kind: c.kind, t: c.t, clip: c.curClip, active: c.active, pos: c.root.position.toArray(), seqTo: c.seq.map(s => s.to || null), home: c.home })).join(' | ')`))
console.log('HREF:' + await js('location.href'))
await bsend('Target.closeTarget', { targetId })
await bsend('Target.disposeBrowserContext', { browserContextId })
process.exit(0)
