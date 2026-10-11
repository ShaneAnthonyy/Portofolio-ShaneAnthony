import assert from 'node:assert/strict'
import { send, evaluate, delay, fresh, snap as frame, close, startFrames, stopFrames } from './dive-browser.mjs'
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
  await fresh({ width: 390, height: 844 })
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
await freshDive()
await startFrames()
await delay(400)
for (let i = 0; i < 14; i++) {
  await touchSwipe([[195, 700], [195, 620], [195, 540], [195, 460], [195, 380]], 60)
  await delay(250)
  if (await evaluate(`document.querySelector('.aqua-root').classList.contains('is-portfolio-unlocked')`)) break
}
await until(`document.querySelector('.aqua-root').classList.contains('is-portfolio-unlocked')`)
await delay(1000)
let s = await snap()
const mobileFrames = await stopFrames('mobile-touch')
assert.ok(mobileFrames.some(f => f.landing), 'touch journey actually activates magnetic landing')
assert.ok(Math.abs(s.y) <= 2, `mobile lands y=${s.y}`)
assert.ok(Math.abs(s.titleCY - s.vh / 2) <= 80, `mobile hero placed cy=${s.titleCY}`)
pass('Mobile touch journey lands centered without overshoot')
await fresh({ reduced: true })
s = await snap()
assert.ok(s.unlocked && Math.abs(s.y) <= 2, `reduced-motion lands y=${s.y}`)
let state = await frame()
assert.ok(Math.abs(state.titleCX - state.clientW / 2) < 1 && Math.abs(state.hero.top) < 1, 'reduced Hero alignment')
assert.equal(state.scrollTweens, 0, 'reduced motion has no scroll tween')
assert.equal(state.heroCanvas, false, 'reduced motion does not initialize Hero WebGL')
assert.equal(state.dockTransform, 'none', 'reduced dock settled immediately')
assert.equal(state.dive, 'absent', 'reduced motion bypasses Dive renderer')
await evaluate(`window.scrollTo({top: 600, behavior: 'instant'})`)
await delay(300)
assert.ok((await frame()).y >= 590, 'normal scrolling remains available after reduced landing')
await evaluate(`document.querySelector('.hero__replay').click()`)
await delay(100)
assert.equal((await frame()).y, 0, 'reduced replay returns immediately to Hero')
pass('Reduced motion completes with immediate correct landing')
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
console.log(JSON.stringify({ checks: result.checks }))
await close()
process.exit(0)
