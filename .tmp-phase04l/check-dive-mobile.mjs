import assert from 'node:assert/strict'
import { send, evaluate, delay } from 'file:///C:/CODE/ReactWeb/.tmp-phase04b/browser.mjs'
const q = (s) => `document.querySelector(${JSON.stringify(s)})`
const result = { checks: [] }
const pass = (t) => { result.checks.push(t); console.log('PASS', t) }
async function until(expr, timeout = 25000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    if (await evaluate(expr)) return
    await delay(250)
  }
  throw new Error('TIMEOUT ' + expr)
}
const snap = () => evaluate(`(() => {
  const root = document.querySelector('.aqua-root');
  const t = document.querySelector('.hero__title');
  const tr = t ? t.getBoundingClientRect() : null;
  return { y: Math.round(scrollY), unlocked: root.classList.contains('is-portfolio-unlocked'), titleCY: tr ? Math.round(tr.y + tr.height / 2) : null, vh: innerHeight };
})()`)
async function freshDive() {
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' })
  await delay(7000)
  await evaluate(`document.querySelector('.loading-screen__enter')?.click()`)
  await delay(1500)
}
async function touchSwipe(points, gap) {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points[0][0], y: points[0][1], id: 1 }] })
  for (let i = 1; i < points.length; i++) {
    await delay(gap)
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: points[i][0], y: points[i][1], id: 1 }] })
  }
  await delay(gap)
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
await freshDive()
await delay(400)
for (let i = 0; i < 14; i++) {
  await touchSwipe([[195, 700], [195, 620], [195, 540], [195, 460], [195, 380]], 60)
  await delay(250)
  if (await evaluate(`document.querySelector('.aqua-root').classList.contains('is-portfolio-unlocked')`)) break
}
await until(`document.querySelector('.aqua-root').classList.contains('is-portfolio-unlocked')`)
await delay(1000)
let s = await snap()
assert.ok(Math.abs(s.y) <= 2, `mobile lands y=${s.y}`)
assert.ok(Math.abs(s.titleCY - s.vh / 2) <= 80, `mobile hero placed cy=${s.titleCY}`)
pass('Mobile touch journey lands centered without overshoot')
await send('Emulation.setTouchEmulationEnabled', { enabled: false })
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
await freshDive()
await delay(400)
await evaluate(`window.scrollTo(0, 3000)`)
await delay(800)
await evaluate(`window.scrollTo(0, 3550)`)
await delay(800)
s = await snap()
assert.ok(s.unlocked && Math.abs(s.y) <= 2, `reduced-motion lands y=${s.y}`)
pass('Reduced motion completes with immediate correct landing')
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
console.log(JSON.stringify({ checks: result.checks }))
process.exit(0)
