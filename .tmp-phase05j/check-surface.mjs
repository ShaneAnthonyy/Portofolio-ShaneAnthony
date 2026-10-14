import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fresh, approach, activate, until, unlocked, send, evaluate, delay, scroll, close, errors } from './browser.mjs'

const output = new URL('./regressions/', import.meta.url)
await mkdir(output, { recursive: true })
await mkdir(new URL('preferences/', output), { recursive: true })
const stages = [0, .15, .3, .45, .6, .75, .9, 1]
const results = []
async function state() {
  return evaluate(`(() => {
    const surface = document.querySelector('.hero-surface');
    const aquarium = document.querySelector('.hero-aquarium');
    const title = document.querySelector('.hero__title');
    const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
    const about = document.querySelector('.about-bento__title');
    const r = about.getBoundingClientRect();
    return {
      y: scrollY, progress: Number(surface.dataset.progress), surfaceState: surface.dataset.surfaceState,
      surface: rect('.hero-surface'), home: rect('#home'), about: r.toJSON(),
      title: rect('.hero__title'), titleTransform: getComputedStyle(title).transform,
      clip: surface.querySelector('clipPath path').getAttribute('transform'),
      hostTransform: getComputedStyle(aquarium).transform,
      bandTransform: getComputedStyle(surface.querySelector('.hero-surface__meniscus')).transform,
      surfaceVisibility: getComputedStyle(surface).visibility,
      aquarium: {...aquarium.dataset}, canvas: !!aquarium.querySelector('canvas'),
      canvasSame: window.__surfaceCanvas === aquarium.querySelector('canvas'),
      dive: document.querySelector('.webgl-backdrop')?.dataset.renderState,
      overflow: document.documentElement.scrollWidth > innerWidth,
      activeLanding: document.querySelector('.aqua-root').dataset.landingActive,
      pointer: getComputedStyle(surface).pointerEvents,
      aboutHit: r.top > 80 && r.top < innerHeight - 30 ? about.contains(document.elementFromPoint(r.x + 30, r.y + r.height / 2)) : null,
    };
  })()`)
}
try {
  for (const [width, height] of [[375,812],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080],[390,500],[1440,540]]) {
    for (const mode of ['dark', 'light', 'lite-dark', 'lite-light', 'reduced-dark', 'reduced-light']) {
      const lite = mode.startsWith('lite'), reduced = mode.startsWith('reduced')
      await fresh({ width, height, lite, reduced, theme: mode.endsWith('light') ? 'light' : 'dark' })
      if (!reduced) {
        await approach()
        await activate()
        await until(unlocked)
      }
      await delay(300)
      const initial = await state()
      await evaluate(`window.__surfaceCanvas = document.querySelector('.hero-aquarium canvas'); true`)
      const forward = [], reverse = []
      for (const [direction, values] of [[forward, stages], [reverse, [...stages].reverse()]]) {
        for (const p of values) {
          await scroll(initial.home.height * p)
          await until(`Math.abs(Number(document.querySelector('.hero-surface').dataset.progress) - ${p}) < .003`, 3000)
          await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
          const s = await state()
          assert.ok(Math.abs(s.progress - p) < .003, `shared progress follows native scroll: expected ${p}, got ${JSON.stringify(s)}`)
          assert.ok(Math.abs(s.title.top + s.y - initial.title.top) < 1, 'Hero text scrolls naturally')
          assert.equal(s.titleTransform, initial.titleTransform, 'no typography distortion')
          assert.equal(s.pointer, 'none', 'surface does not intercept content')
          assert.equal(s.overflow, false, 'no horizontal overflow')
          assert.equal(s.activeLanding, undefined, 'no landing/snap at Hero to About')
          if (!reduced) assert.equal(s.surface.top, 0, 'environment stays in viewport')
          if (lite || reduced) assert.equal(s.canvas, false, 'static preference creates no Hero WebGL')
          if (!lite && !reduced) assert.equal(s.canvasSame, true, 'same canvas throughout boundary')
          if (p >= .9 && !reduced) {
            assert.equal(s.surfaceVisibility, 'hidden', 'surface cleared in About')
            if (!lite) assert.equal(s.aquarium.state, 'parked', 'Hero stops rendering after crossing')
          }
          if (s.aboutHit !== null) assert.equal(s.aboutHit, true, 'About heading remains accessible')
          direction.push(s)
          if (p === .45 && direction === forward && [390,1440].includes(width) && height > 600) {
            const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
            await writeFile(new URL(`preferences/${width}-${mode}.jpg`, output), Buffer.from(data, 'base64'))
          }
        }
      }
      for (let i = 0; i < stages.length; i++) {
        const a = forward[i], b = reverse.at(-1 - i)
        for (const key of ['clip', 'hostTransform', 'bandTransform', 'surfaceVisibility']) assert.equal(a[key], b[key], `exact reverse ${key}`)
      }
      results.push({ width, height, mode, forward, reverse })
      await writeFile(new URL('matrix.json', output), JSON.stringify(results, null, 2))
      await writeFile(new URL('matrix-errors.json', output), JSON.stringify(errors, null, 2))
      assert.equal(errors.length, 0, `${width} ${height} ${mode}: ` + JSON.stringify(errors))
      console.log('PASS', width, height, mode)
    }
  }
  assert.equal(errors.length, 0, 'no browser exceptions: ' + JSON.stringify(errors))
} finally {
  await writeFile(new URL('matrix-errors.json', output), JSON.stringify(errors, null, 2))
  await close()
}
