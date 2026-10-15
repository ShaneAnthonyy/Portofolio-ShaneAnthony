import { writeFile, mkdir } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

export { delay }
export const output = new URL('./', import.meta.url)
const cdpPort = process.env.CDP_PORT || 9223
const version = await fetch(`http://127.0.0.1:${cdpPort}/json/version`).then(r => r.json())
const browser = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((resolve,reject) => {browser.addEventListener('open',resolve,{once:true});browser.addEventListener('error',reject,{once:true})})
let bid=0
const bp=new Map()
browser.addEventListener('message',e=>{const m=JSON.parse(e.data);const p=bp.get(m.id);if(p){bp.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result)}})
const browserSend=(method,params={})=>new Promise((resolve,reject)=>{const id=++bid;bp.set(id,{resolve,reject});browser.send(JSON.stringify({id,method,params}))})
const {browserContextId}=await browserSend('Target.createBrowserContext')
const {targetId}=await browserSend('Target.createTarget',{url:'about:blank',browserContextId})
const tabs=await fetch(`http://127.0.0.1:${cdpPort}/json`).then(r=>r.json())
const tab=tabs.find(t=>t.id===targetId)
export const socket = new WebSocket(tab.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
let nextId = 0
const pending = new Map()
export const errors = []
export const warnings = []
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.consoleAPICalled') {
    const { type, args } = message.params;
    if (type === 'error') errors.push(args.map(a => a.value ?? a.description).join(' '));
    if (type === 'warning') warnings.push(args.map(a => a.value ?? a.description).join(' '));
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry)
  if (!message.id) return
  const request = pending.get(message.id)
  if (!request) return
  pending.delete(message.id)
  clearTimeout(request.timer)
  if (message.error) request.reject(new Error(JSON.stringify(message.error)))
  else request.resolve(message.result)
})
export function send(method, params = {}) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)) }, 25000)
    pending.set(id, { resolve, reject, timer })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
export async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
export async function until(expression, timeout = 20000) {
  const started = Date.now()
  do {
    if (await evaluate(expression)) return
    await delay(250)
  } while (Date.now() - started < timeout)
  throw new Error(`Condition not met: ${expression}`)
}
export async function click(selector) {
  const point = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    const r = el.getBoundingClientRect();
    return {x: r.x + r.width / 2, y: r.y + r.height / 2};
  })()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point })
}
export async function screenshot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(new URL(name, output), Buffer.from(data, 'base64'))
}
await mkdir(output, { recursive: true })
await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')

export const url = process.env.DIVE_URL || 'http://127.0.0.1:4173/'
export const unlocked = `document.querySelector('.aqua-root')?.classList.contains('is-portfolio-unlocked')`
export const active = `document.querySelector('.aqua-root')?.dataset.landingActive === 'true'`
export async function fresh({ width = 1440, height = 900, theme = 'dark', lite = false, reduced = false, mobile = width < 500 } = {}) {
  await send('Page.bringToFront')
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile })
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 1 })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] })
  const seed = await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('shane-theme', '${theme}'); localStorage.setItem('shane-performance-mode', '${lite ? 'lite' : 'normal'}')` })
  await send('Page.navigate', { url })
  await until(`!!document.querySelector('.loading-screen__enter:not(:disabled)')`, 90000)
  await evaluate('document.fonts.ready.then(() => true)')
  await click('.loading-screen__enter')
  await until(`!document.querySelector('.loading-screen')`, 10000)
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: seed.identifier })
  await delay(300)
}

export function readFrame() {
  const root = document.querySelector('.aqua-root')
  const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON() || null
  const title = document.querySelector('.hero__title')
  const tr = rect('.hero__title')
  const hero = rect('#home')
  const bottom = document.elementFromPoint(innerWidth / 2, innerHeight - 8)
  return {
    time: performance.now(), y: scrollY, vh: innerHeight, vw: innerWidth, clientW: document.documentElement.clientWidth,
    hero, titleCX: tr.x + tr.width / 2, titleCY: tr.y + tr.height / 2,
    titleOpacity: getComputedStyle(title).opacity, titleTransform: getComputedStyle(title).transform,
    dock: rect('.navbar__dock'), dockTransform: getComputedStyle(document.querySelector('.navbar__dock')).transform,
    progress: Number(root.style.getPropertyValue('--arrival-progress')),
    landing: root.dataset.landingActive === 'true', unlocked: root.classList.contains('is-portfolio-unlocked'),
    spacer: document.querySelector('#portfolio-dive')?.offsetHeight ?? null,
    scrollTweens: Number(root.dataset.magneticTween === 'true'),
    dive: document.querySelector('.webgl-backdrop')?.dataset.renderState ?? 'absent',
    aquarium: document.querySelector('.hero-aquarium')?.dataset.state,
    heroCanvas: !!document.querySelector('.hero-aquarium canvas'),
    aboutBelow: document.querySelector('#about').contains(bottom),
    controls: [document.querySelectorAll('.audio-toggle').length, document.querySelectorAll('.theme-toggle').length],
    overflow: document.body.style.overflow,
  }
}
export const snap = () => evaluate(`(${readFrame})()`)
export const scroll = top => evaluate(`window.scrollTo({top: ${top}, behavior: 'instant'})`)
export async function approach() {
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * .91, behavior: 'instant'})`)
  await delay(900)
}
export async function activate() {
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * .935, behavior: 'instant'})`)
  await until(active, 8000)
}
export async function startFrames() {
  await evaluate(`(() => {
    window.__diveFrames = [];
    const end = performance.now() + 30000;
    const sample = ${readFrame};
    const tick = () => { window.__diveFrames.push(sample()); if (performance.now() < end && !window.__stopDiveFrames) requestAnimationFrame(tick); };
    window.__stopDiveFrames = false;
    tick();
  })()`)
}
export async function stopFrames(name) {
  const frames = await evaluate(`(window.__stopDiveFrames = true, window.__diveFrames)`)
  await writeFile(new URL(name + '.json', output), JSON.stringify(frames, null, 2))
  return frames
}
export async function wheel(deltaY) {
  const { vw, vh } = await snap()
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', deltaX: 0, deltaY, x: vw / 2, y: vh / 2 })
}
export async function key(key) {
  const windowsVirtualKeyCode = { ArrowUp: 38, ArrowDown: 40, PageUp: 33, PageDown: 34, Home: 36, End: 35, Escape: 27, ' ': 32 }[key]
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode })
}
export async function close() {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  socket.close()
  await browserSend('Target.disposeBrowserContext',{browserContextId})
  browser.close()
}

