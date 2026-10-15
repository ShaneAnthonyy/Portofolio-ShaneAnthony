import assert from 'node:assert/strict'
import { send, evaluate, delay, fresh, approach, activate, startFrames, stopFrames, close } from './browser.mjs'
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
await fresh()
await evaluate(`window.scrollTo(0, 0)`)
await delay(600)
await approach()
const staged = await snap()
console.log('staged: ' + JSON.stringify(staged))
await startFrames()
await activate()
await until(`document.querySelector('.aqua-root').classList.contains('is-portfolio-unlocked')`)
const frames = []
for (let i = 0; i < 20; i++) {
  await delay(120)
  frames.push(await snap())
}
const settled = frames[frames.length - 1]
assert.equal(settled.unlocked, true, 'unlocks')
assert.ok(Math.abs(settled.y) <= 2, `rests at scroll 0, got ${settled.y}`)
const ys = frames.map(f => f.y)
assert.ok(ys.every((v, i) => i === 0 || v <= ys[i - 1] + 2), 'no forward drift after landing')
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
const motion = await stopFrames('desktop-landing')
const animated = motion.filter(f => f.landing)
assert.ok(animated.length >= 5, 'sampled actual magnetic frames')
assert.ok(animated.every(f => f.spacer === 0 && (f.scrollTweens === 1 || f.progress === 1 && f.y === 0 && f.scrollTweens === 0 && f.dockTransform === 'none')), 'one scroll owner during travel; a finished tween may wait for the React unlock commit only at the exact settled geometry')
assert.ok(motion.every(f => Math.abs(f.hero.top) < 1 && Math.abs(f.titleCY - motion[0].titleCY) < 1), 'Hero geometry continuous across collapse and unlock')
assert.ok(animated.every((f, i) => !i || f.y <= animated[i - 1].y + 1), 'magnetic scroll decelerates toward zero without overshoot')
assert.ok(motion.filter(f => f.unlocked).every(f => f.y === 0 && f.scrollTweens === 0), 'no corrective scrolling after unlock')
pass('Actual animation frames preserve Hero geometry across early collapse and completion')
console.log(JSON.stringify({ checks: result.checks }))
await close()
process.exit(0)
