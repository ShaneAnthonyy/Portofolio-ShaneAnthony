import { setTimeout as delay } from 'node:timers/promises'
const CDP = 9229
const hard = process.argv.includes('--hard')
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
const consoleErrors = [], pageErrors = []
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
    consoleErrors.push(m.params.args.map(a => (a.description || a.value || '')).join(' ').slice(0, 200))
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails
    pageErrors.push(((d.exception ? d.exception.description : '?') || '').split('\n')[0])
  }
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
  const r = await send('Runtime.evaluate', { expression: `JSON.stringify(${expr})`, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('eval threw')
  return JSON.parse(r.result.value)
}
await send('Page.enable')
await send('Runtime.enable')
if (hard) { await send('Network.enable'); await send('Network.clearBrowserCache') }
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' })
const t0 = Date.now()
let dive = false, nchars = 0
while (Date.now() - t0 < 60000) {
  dive = await js('!!document.querySelector("#portfolio-dive")')
  nchars = await js('(window.__charRigs || []).length')
  if (dive && nchars === 2) break
  await delay(500)
}
await delay(3000)
const state = await js(`({
  dive: !!document.querySelector('#portfolio-dive'),
  canvases: document.querySelectorAll('canvas').length,
  chars: (window.__charRigs || []).map(c => ({ kind: c.kind, t: Math.round(c.t * 100) / 100, clip: c.curClip, active: c.active, visible: c.group.visible, pos: c.root.position.toArray().map(v => Math.round(v * 100) / 100) })),
  stats: window.__diveStats ? window.__diveStats() : null
})`)
console.log('DIVE:' + dive + ' CHARS2:' + (nchars === 2))
console.log('STATE:' + JSON.stringify(state))
console.log('CONSOLE_ERRORS:' + JSON.stringify(consoleErrors))
console.log('PAGE_ERRORS:' + JSON.stringify(pageErrors))
await bsend('Target.closeTarget', { targetId })
await bsend('Target.disposeBrowserContext', { browserContextId })
process.exit(0)
