import assert from 'node:assert/strict'
import { send, evaluate, delay } from 'file:///C:/CODE/ReactWeb/.tmp-phase04b/browser.mjs'
const q = (s) => `document.querySelector(${JSON.stringify(s)})`
const result = { checks: [] }
const pass = (t) => { result.checks.push(t); console.log('PASS', t) }
async function until(expr, timeout = 20000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    if (await evaluate(expr)) return
    await delay(200)
  }
  throw new Error('TIMEOUT ' + expr)
}
const snap = () => evaluate(`(() => {
  const root = document.querySelector('.aqua-root');
  const t = document.querySelector('.hero__title');
  const tr = t ? t.getBoundingClientRect() : null;
  const dock = document.querySelector('.navbar__dock');
  const heroAq = document.querySelector('.hero-aquarium');
  return {
    y: Math.round(scrollY),
    unlocked: root.classList.contains('is-portfolio-unlocked'),
    tO: tr ? getComputedStyle(t).opacity : null,
    tY: tr ? getComputedStyle(t).transform : null,
    heroCanvas: !!document.querySelector('.hero-aquarium canvas'),
    heroState: heroAq?.dataset?.state || 'none',
    dockT: dock ? getComputedStyle(dock).transform : 'none',
  };
})()`)
async function wheel(dy, n, gap) {
  for (let i = 0; i < n; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', deltaX: 0, deltaY: dy, x: 720, y: 450 })
    await delay(gap)
  }
}
async function wheelUntilUnlock(dy, gap, maxTicks) {
  for (let i = 0; i < maxTicks; i++) {
    await wheel(dy, 1, gap)
    if (await evaluate(`document.querySelector('.aqua-root').classList.contains('is-portfolio-unlocked')`)) return true
  }
  return false
}
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
async function freshDive() {
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' })
  await delay(7000)
  await evaluate(`document.querySelector('.loading-screen__enter')?.click()`)
  await delay(1500)
}
await freshDive()
await evaluate(`window.scrollTo(0, 3260)`)
await delay(900)
let s = await snap()
console.log('approach: ' + JSON.stringify(s))
assert.ok(s.heroCanvas === true, 'hero canvas pre-warmed before unlock')
assert.equal(s.tO, '1', 'no entrance replay opacity dip pre-handoff')
pass('Pre-warm initializes hero canvas early; no premature entrance')
await wheel(60, 3, 150)
const my0 = (await snap()).y
await wheel(60, 2, 150)
const my1 = await snap()
console.log(`assist-window: y=${my0}->${my1.y} unlocked=${my1.unlocked}`)
assert.ok(my1.unlocked || my1.y - my0 - 120 > 80, 'magnetic assist contributes travel beyond raw input')
pass('Magnetic assist engages and advances scroll on its own')
if (my1.unlocked) {
  await freshDive()
  await delay(400)
  await evaluate(`window.scrollTo(0, 3260)`)
  await delay(900)
  await wheel(60, 2, 150)
}
await wheel(-300, 3, 120)
await delay(1200)
const r1 = await snap()
await delay(800)
const r2 = await snap()
assert.ok(!r2.unlocked && Math.abs(r2.y - r1.y) < 4, 'reverse input cancels assist, no lock, still diving')
pass('Reverse wheel cancels magnetic assist safely')
await wheelUntilUnlock(200, 150, 10)
await delay(1200)
s = await snap()
assert.ok(Math.abs(s.y) <= 2 && s.dockT === 'none', `landed y=${s.y} dock=${s.dockT}`)
pass('Forward resume completes landing at 0 with dock settled')
for (let r = 0; r < 2; r++) {
  await evaluate(`document.querySelector('.hero__replay')?.click()`)
  await delay(2500)
  const st = await snap()
  assert.ok(!st.unlocked, `replay ${r}: back to dive`)
  await wheelUntilUnlock(400, 120, 14)
  await delay(1000)
}
s = await snap()
assert.ok(Math.abs(s.y) <= 2, `replay landing y=${s.y}`)
pass('Dive Again resets and recompletes twice with clean landing')
console.log(JSON.stringify({ checks: result.checks }))
process.exit(0)
