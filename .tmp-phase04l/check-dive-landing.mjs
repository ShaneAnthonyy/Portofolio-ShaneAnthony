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
  const title = document.querySelector('.hero__title');
  const tr = title ? title.getBoundingClientRect() : null;
  const hero = document.querySelector('#home');
  const hr = hero ? hero.getBoundingClientRect() : null;
  const dock = document.querySelector('.navbar__dock');
  const Aqua = window.__gsapTickCount;
  return {
    y: Math.round(scrollY),
    unlocked: root.classList.contains('is-portfolio-unlocked'),
    titleCX: tr ? Math.round(tr.x + tr.width / 2) : null,
    titleCY: tr ? Math.round(tr.y + tr.height / 2) : null,
    heroTop: hr ? Math.round(hr.top) : null,
    heroH: hr ? Math.round(hr.height) : null,
    dockT: dock ? getComputedStyle(dock).transform : 'none',
    vh: innerHeight, vw: innerWidth,
    belowFold: (() => { const el = document.elementFromPoint(Math.round(innerWidth / 2), innerHeight - 8); const about = document.querySelector('#about'); return about ? about.contains(el) : null })(),
  };
})()`)
async function key(k, code) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: code || k })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: code || k })
}
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' })
await delay(7000)
await evaluate(`document.querySelector('.loading-screen__enter')?.click()`)
await delay(1500)
await evaluate(`window.scrollTo(0, 0)`)
await delay(600)
async function wheel(dy, n, gap) {
  for (let i = 0; i < n; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', deltaX: 0, deltaY: dy, x: 720, y: 450 })
    await delay(gap)
  }
}
await wheel(300, 10, 150)
const staged = await snap()
console.log('staged: ' + JSON.stringify(staged))
for (let i = 0; i < 12; i++) {
  await wheel(120, 1, 150)
  const s = await snap()
  if (s.unlocked) break
}
const frames = []
for (let i = 0; i < 20; i++) {
  await delay(120)
  frames.push(await snap())
}
frames.forEach((f, i) => console.log(`t${i}: y=${f.y} unlocked=${f.unlocked} titleCY=${f.titleCY} aboutBelow=${f.belowFold}`))
const settled = frames[frames.length - 1]
assert.equal(settled.unlocked, true, 'unlocks')
assert.ok(Math.abs(settled.y) <= 2, `rests at scroll 0, got ${settled.y}`)
const ys = frames.map(f => f.y)
assert.ok(ys.every((v, i) => i === 0 || v <= ys[i - 1] + 2), 'no upward correction after landing')
assert.ok(Math.abs(settled.titleCX - settled.vw / 2) <= 8, `headline centered, cx=${settled.titleCX}`)
assert.ok(Math.abs(settled.titleCY - settled.vh / 2) <= 60, `headline vertically placed, cy=${settled.titleCY}`)
assert.equal(settled.belowFold, false, 'no About content at viewport bottom')
assert.equal(settled.dockT, 'none', `dock transform cleared, got ${settled.dockT}`)
pass('Magnetic landing: precise stop at 0, centered hero, dock settled, no About exposure')
const s1 = await snap()
await delay(2000)
const s2 = await snap()
assert.deepEqual({ y: s1.y, t: s1.titleCY }, { y: s2.y, t: s2.titleCY }, 'settled frame stable, no post correction')
pass('Settled frame stable over 2s')
console.log(JSON.stringify({ checks: result.checks }))
process.exit(0)
