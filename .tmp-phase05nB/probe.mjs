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
  m.error ? p.reject(new Error(m.method + ' :: ' + JSON.stringify(m.error))) : p.resolve(m.result)
})
const send = async (tag, method, params = {}) => {
  const id = ++nid
  const out = await new Promise((res, rej) => {
    pend.set(id, { resolve: res, reject: rej, timer: setTimeout(() => { pend.delete(id); rej(new Error('Timeout ' + tag)) }, 30000) })
    ws.send(JSON.stringify({ id, method, params }))
  })
  return out
}
await send('enable', 'Page.enable')
await send('navigate', 'Page.navigate', { url: 'http://127.0.0.1:4173/' })
await delay(8000)
const r1 = await send('eval-bool', 'Runtime.evaluate', { expression: '!!document.querySelector("#portfolio-dive")', returnByValue: true })
console.log('bool:', JSON.stringify(r1.result.value))
const r2 = await send('eval-chars', 'Runtime.evaluate', { expression: '(window.__charRigs || []).length', returnByValue: true })
console.log('chars:', JSON.stringify(r2.result.value))
await bsend('Target.closeTarget', { targetId })
await bsend('Target.disposeBrowserContext', { browserContextId })
process.exit(0)
