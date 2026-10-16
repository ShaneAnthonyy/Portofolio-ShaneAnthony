import assert from 'node:assert/strict'
import { send, evaluate, delay, fresh, approach, activate, close, snap as frame } from './browser.mjs'
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
async function freshDive() {
  await fresh()
}
await freshDive()
await approach()
let s = await snap()
console.log('approach: ' + JSON.stringify(s))
assert.ok(s.heroCanvas === true && s.heroState === 'prewarmed', 'hero canvas pre-warmed without continuous rendering before unlock')
assert.equal(s.tO, '1', 'no entrance replay opacity dip pre-handoff')
pass('Pre-warm initializes hero canvas early; no premature entrance')
await activate()
const my0 = await frame()
await delay(100)
const my1 = await frame()
assert.ok(my1.progress > my0.progress && my1.y < my0.y, 'magnetic assist advances the scene and approaches scroll zero without input')
pass('Magnetic assist engages and advances scroll on its own')
await wheel(-300, 3, 120)
await delay(1200)
const r1 = await snap()
await delay(800)
const r2 = await snap()
assert.ok(!r2.unlocked && Math.abs(r2.y - r1.y) < 4, 'reverse input cancels assist, no lock, still diving')
pass('Reverse wheel cancels magnetic assist safely')
await approach()
await activate()
await until(`document.querySelector('.aqua-root').classList.contains('is-portfolio-unlocked')`)
await delay(1200)
s = await snap()
assert.ok(Math.abs(s.y) <= 2 && s.dockT === 'none', `landed y=${s.y} dock=${s.dockT}`)
pass('Forward resume completes landing at 0 with dock settled')
for (let r = 0; r < 2; r++) {
  await evaluate(`document.querySelector('.hero__replay')?.click()`)
  await until(`document.querySelector('#portfolio-dive').offsetHeight > 0`)
  const st = await snap()
  assert.ok(!st.unlocked, `replay ${r}: back to dive`)
  await approach()
  await activate()
  await until(`document.querySelector('.aqua-root').classList.contains('is-portfolio-unlocked')`)
  await delay(1000)
}
s = await snap()
assert.ok(Math.abs(s.y) <= 2, `replay landing y=${s.y}`)
pass('Dive Again resets and recompletes twice with clean landing')
console.log(JSON.stringify({ checks: result.checks }))
await close()
process.exit(0)
