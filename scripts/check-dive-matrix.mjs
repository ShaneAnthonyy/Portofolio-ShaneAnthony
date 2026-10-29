import assert from 'node:assert/strict'
import { dockProgress } from '../src/animation/diveArrival.js'
import { writeFile } from 'node:fs/promises'
import { fresh, approach, activate, until, unlocked, snap, startFrames, stopFrames, delay, close, screenshot, output, errors } from './dive-browser.mjs'

const results = []
const sizes = [[375, 812], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080], [390, 500], [1440, 540]]
try {
  for (const [width, height] of sizes) {
    for (const mode of ['daytime', 'night', 'lite', 'reduced']) {
      const name = `${width}x${height}-${mode}`
      await fresh({ width, height, minutes: mode === 'night' ? 0 : 720, lite: mode === 'lite', reduced: mode === 'reduced' })
      if (mode !== 'reduced') await approach()
      const before = await snap()
      await startFrames()
      if (mode !== 'reduced') await activate()
      await until(unlocked)
      await delay(2200)
      const final = await snap()
      const frames = await stopFrames(name)
      const moving = frames.filter(f => f.landing)
      assert.ok(final.unlocked && final.y === 0 && final.scrollTweens === 0, name + ': settled at zero with no tween')
      assert.equal(final.dockTransform, 'none', name + ': dock transform cleared')
      assert.deepEqual(final.controls, [1, 1], name + ': unique shared controls')
      assert.ok(Math.abs(final.titleCX - final.hero.width / 2) < 1, name + ': headline centered')
      assert.ok(Math.abs(final.titleCY - height / 2) <= 80 && Math.abs(final.hero.top) < 1 && final.hero.height >= height - 1, name + ': Hero fills viewport')
      assert.equal(final.aboutBelow, false, name + ': no About exposure')
      if (mode === 'reduced' || mode === 'lite') assert.ok(!final.heroCanvas && final.aquarium === 'poster', name + ': static Hero poster')
      if (mode === 'reduced') assert.equal(final.dive, 'absent', name + ': no Dive renderer')
      else {
        assert.equal(final.dive, 'paused', name + ': Dive parks at landing')
        assert.ok(moving.length >= 4, name + ': measured animation frames')
        assert.ok(frames.every(f => Math.abs(f.hero.top) < 1 && Math.abs(f.titleCY - before.titleCY) < 1 && Math.abs(f.titleCX - before.titleCX) < 1), name + ': no layout jump across collapse or unlock')
        assert.ok(moving.every((f, i) => !i || f.y <= moving[i - 1].y + 1), name + ': no scroll overshoot')
        assert.ok(frames.filter(f => f.unlocked).every(f => f.y === 0 && f.scrollTweens === 0), name + ': no post-arrival correction')
        for (let i = 1; i < frames.length; i++) {
          const a = frames[i - 1], b = frames[i]
          const dt = (b.time - a.time) / 1000
          const p = dockProgress(b.progress)
          assert.ok(Math.abs(b.dock.x - (before.dock.x + (final.dock.x - before.dock.x) * p)) < 1 && Math.abs(b.dock.y - (before.dock.y + (final.dock.y - before.dock.y) * p)) < 1, name + ': dock follows measured origin and destination continuously')
          assert.ok(b.progress >= a.progress - .0001 && b.progress - a.progress <= 7.5 * dt + .005, name + ': no progress jump driving the dock')
        }
      }
      const samples = [before, ...[.2, .4, .6, .8, 1].map(p => frames.find(f => f.progress >= p) || final), final]
      const gaps = frames.slice(1).map((f, i) => f.time - frames[i].time).sort((a, b) => a - b)
      results.push({ name, samples, frameCount: frames.length, frameMedian: gaps[Math.floor(gaps.length * .5)], frameP95: gaps[Math.floor(gaps.length * .95)] })
      if (mode === 'dark' || mode === 'light' && width === 1440 || mode === 'lite' && width === 390) await screenshot(name + '.png')
      console.log('PASS', name, `Hero y=${final.hero.top}, title=(${final.titleCX},${final.titleCY}), dock=(${final.dock.x},${final.dock.y}), ${moving.length} magnetic frames`)
    }
  }
  assert.equal(errors.filter(e => typeof e !== 'string' && e.exception).length, 0, 'no runtime exceptions')
} finally {
  await writeFile(new URL('matrix.json', output), JSON.stringify({ results, errors }, null, 2))
  await close()
}
