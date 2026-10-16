import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { fresh, approach, activate, until, unlocked, send, evaluate, delay, scroll, click, close, errors } from './browser.mjs'

const checks = []
const note = name => { checks.push(name); console.log('PASS', name) }
const p = value => evaluate(`window.scrollTo({top: document.querySelector('#home').offsetHeight * ${value}, behavior: 'instant'})`)
const canvas = `!!document.querySelector('.hero-aquarium canvas')`
const state = () => evaluate(`({ p: Number(document.querySelector('.hero-surface').dataset.progress), hero: document.querySelector('.hero-aquarium').dataset.state, dive: document.querySelector('.webgl-backdrop')?.dataset.renderState, canvases: document.querySelectorAll('canvas').length, overflow: document.documentElement.scrollWidth > innerWidth })`)
try {
  await fresh()
  await approach()
  await activate()
  await until(unlocked)
  await until(canvas)
  await evaluate(`(() => {
    window.__surfaceCanvas = document.querySelector('.hero-aquarium canvas');
    window.__surfaceDraws = {hero: 0, dive: 0};
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
      for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const draw = type.prototype[name]; if (!draw) continue;
        type.prototype[name] = function(...args) {
          if (this.canvas.closest('.hero-aquarium')) window.__surfaceDraws.hero++;
          if (this.canvas.closest('.webgl-backdrop')) window.__surfaceDraws.dive++;
          return draw.apply(this, args);
        };
      }
    }
  })()`)
  for (let i = 0; i < 8; i++) {
    await p(i % 2 ? .25 : .34)
    await delay(90)
  }
  assert.equal(await evaluate(`window.__surfaceCanvas === document.querySelector('.hero-aquarium canvas')`), true)
  note('handoff hysteresis preserves the same canvas through eight crossings')

  await p(.95)
  await delay(250)
  const before = await evaluate('({...window.__surfaceDraws})')
  await delay(650)
  const after = await evaluate('({...window.__surfaceDraws})')
  assert.equal(after.hero, before.hero)
  assert.ok(after.dive > before.dive)
  note('settled About renders Dive only; retained Hero has zero draw calls')

  await p(.45)
  await delay(100)
  const clip = await evaluate(`document.querySelector('.hero-surface clipPath path').getAttribute('transform')`)
  await click('.theme-toggle')
  await delay(250)
  assert.equal(await evaluate(`document.querySelector('.hero-surface clipPath path').getAttribute('transform')`), clip)
  note('live theme switch preserves crossing position')

  await click('.lite-toggle')
  await until(`!(${canvas})`)
  assert.equal((await state()).hero, 'poster')
  await p(.95)
  await click('.lite-toggle')
  await until(canvas)
  await delay(250)
  assert.equal((await state()).hero, 'parked')
  note('live Lite switch disposes Hero; normal mode remains parked while submerged')

  await p(.45)
  await delay(100)
  await send('Emulation.setFocusEmulationEnabled', { enabled: false })
  await send('Page.setWebLifecycleState', { state: 'frozen' })
  await send('Page.setWebLifecycleState', { state: 'active' })
  await until('document.hidden')
  const hiddenBefore = await evaluate('({...window.__surfaceDraws})')
  await delay(600)
  const hiddenAfter = await evaluate('({...window.__surfaceDraws})')
  assert.deepEqual(hiddenAfter, hiddenBefore)
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })
  await until('!document.hidden')
  await delay(200)
  assert.equal((await state()).hero, 'running')
  note('hidden tab stops both renderer draw calls and resumes in place')

  await evaluate(`Array.from(document.querySelectorAll('.navbar__link')).find(el => el.textContent === 'About').click()`)
  await delay(1400)
  assert.ok((await state()).p > .8)
  await p(.45)
  await evaluate(`Array.from(document.querySelectorAll('.navbar__link')).find(el => el.textContent === 'Projects').click()`)
  await delay(1500)
  await until(`!(${canvas})`)
  assert.equal((await state()).p, 1)
  note('About navigation and Projects navigation during crossing settle cleanly and dispose distant Hero')

  await p(1.4)
  await until(canvas)
  await delay(100)
  assert.equal((await state()).hero, 'parked')
  await evaluate(`window.__returnCanvas = document.querySelector('.hero-aquarium canvas'); true`)
  await p(.7)
  await delay(100)
  assert.match(await evaluate(`getComputedStyle(document.querySelector('.hero-aquarium')).backgroundImage`), /surface-/)
  await evaluate(`document.querySelector('.navbar__logo').click()`)
  await delay(1500)
  await until(canvas)
  assert.equal((await state()).p, 0)
  assert.equal(await evaluate(`window.__returnCanvas === document.querySelector('.hero-aquarium canvas')`), true)
  note('deep reverse prepares Hero while hidden; Home reuses that canvas with poster continuity')

  await click('.hero__replay')
  await until(`!(${unlocked})`)
  await delay(2100)
  await approach()
  await activate()
  await until(unlocked)
  assert.equal(await evaluate('scrollY'), 0)
  note('Dive Again and Phase 04L magnetic arrival remain functional')

  await p(.45)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await delay(350)
  assert.equal(await evaluate(canvas), false)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.hero-surface__scene')).clipPath`), 'none')
  await scroll(0)
  await click('.hero__replay')
  await delay(200)
  assert.equal(await evaluate('scrollY'), 0)
  note('live reduced motion clears compositing; reduced Dive Again remains immediate')

  await fresh({ width: 390, height: 844 })
  await approach()
  await activate()
  await until(unlocked)
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 680, id: 1 }] })
  for (const y of [620, 540, 460, 380]) {
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y, id: 1 }] })
    await delay(60)
  }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await delay(250)
  assert.ok((await state()).p > .15)
  assert.equal(await evaluate(`document.documentElement.style.overflow`), '')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 650, deviceScaleFactor: 2, mobile: true })
  await delay(200)
  const resized = await state()
  const expected = await evaluate(`Math.max(0, Math.min(1, -document.querySelector('#home').getBoundingClientRect().top / document.querySelector('#home').offsetHeight))`)
  assert.ok(Math.abs(resized.p - expected) < .002)
  assert.equal(resized.overflow, false)
  note('native mobile touch scroll and viewport-height resize remain continuous')
  assert.equal(errors.length, 0)
  await writeFile(new URL('./regressions/integration.json', import.meta.url), JSON.stringify({ checks, before, after, hiddenBefore, hiddenAfter, errors }, null, 2))
} finally {
  await close()
}
