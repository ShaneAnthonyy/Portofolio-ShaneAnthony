import assert from 'node:assert/strict'
import { createWorldTimeStore, normalizeMinutes, timelineMinutes, formatWorldTime, sampleEnvironment,
  environmentCSS, PRESETS, TIME_ANCHORS, worldTime } from '../src/animation/worldTime.js'

assert.equal(worldTime.getSnapshot().mode, 'live', 'the shared production store starts Live without subscribing a timer')
assert.equal(normalizeMinutes(-1), 1439)
assert.equal(normalizeMinutes(2880.5), .5)
assert.equal(normalizeMinutes(-1440), 0)
for (const value of [NaN, Infinity, -Infinity, '720', null, undefined, {}, []]) {
  assert.throws(() => normalizeMinutes(value), TypeError)
}
for (const value of [-1, 1441, NaN, Infinity, '0', null]) assert.throws(() => timelineMinutes(value), RangeError)
for (let offset = 0; offset <= 1440; offset++) assert.equal(timelineMinutes(offset), (offset + 300) % 1440)
assert.equal(timelineMinutes(1139), 1439)
assert.equal(timelineMinutes(1140), 0)
assert.equal(timelineMinutes(0), timelineMinutes(1440))
assert.equal(formatWorldTime(360), '06:00')
assert.equal(formatWorldTime(-1), '23:59')
assert.equal(environmentCSS([0, 1, 0]), 'rgb(0 255 0)')

const numbers = value => Object.entries(value).filter(([key]) => !['minutes', 'label'].includes(key))
  .flatMap(([, v]) => Array.isArray(v) ? v : [v])
for (let minutes = 0; minutes < 1440; minutes += .5) {
  const sample = sampleEnvironment(minutes)
  assert.ok(numbers(sample).every(Number.isFinite))
  for (const key of ['darkness', 'sunVisibility', 'moonVisibility', 'starVisibility', 'shadowFactor']) {
    assert.ok(sample[key] >= 0 && sample[key] <= 1, key)
  }
  assert.ok(Math.abs(Math.hypot(...sample.sunDirection) - 1) < 1e-12)
}
for (const boundary of [...TIME_ANCHORS.map(([minute]) => minute), 300, 1440]) {
  const a = numbers(sampleEnvironment(boundary - .0001)), b = numbers(sampleEnvironment(boundary + .0001))
  assert.ok(a.every((value, i) => Math.abs(value - b[i]) < .00001), `continuous at ${boundary}`)
}
assert.deepEqual(sampleEnvironment(0), sampleEnvironment(1440))
assert.deepEqual(sampleEnvironment(-1), sampleEnvironment(1439))
assert.notDeepEqual(sampleEnvironment(360).waterLight, sampleEnvironment(720).waterLight)

let date = new Date(2026, 9, 25, 12, 34, 30, 500), id = 0
const timers = new Map(), frames = new Map(), events = new Map()
const page = new EventTarget(), view = new EventTarget()
page.hidden = false
const host = {
  document: page, window: view,
  setTimeout: fn => { timers.set(++id, fn); return id }, clearTimeout: key => timers.delete(key),
  requestAnimationFrame: fn => { frames.set(++id, fn); return id }, cancelAnimationFrame: key => frames.delete(key),
}
for (const target of [page, view]) {
  const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target)
  target.addEventListener = (name, fn) => { events.set(fn, name); add(name, fn) }
  target.removeEventListener = (name, fn) => { events.delete(fn); remove(name, fn) }
}
const run = queue => { const work = [...queue.values()]; queue.clear(); work.forEach(fn => fn()) }
const store = createWorldTimeStore({ now: () => date, host })
assert.equal(timers.size, 0, 'idle store has no timer')
assert.equal(store.getSnapshot().mode, 'live')
assert.ok(Math.abs(store.getSnapshot().minutes - (754 + 30.5 / 60)) < 1e-10)
assert.equal(store.getSnapshot(), store.getSnapshot(), 'stable cached snapshot')
assert.ok(Object.isFrozen(store.getSnapshot().environment.waterLight))
let notifications = 0
const unsubscribe = store.subscribe(() => notifications++)
const unsubscribeScene = store.subscribe(() => {})
assert.equal(timers.size, 1)
date = new Date(2026, 9, 25, 13, 0, 15)
run(timers)
assert.equal(store.getSnapshot().minutes, 780.25)
assert.equal(notifications, 1)
store.setMode('manual')
const manual = store.getSnapshot()
date = new Date(2026, 9, 25, 22, 0)
run(timers); view.dispatchEvent(new Event('focus'))
assert.equal(store.getSnapshot(), manual, 'manual clock remains fixed on focus')
assert.equal(timers.size, 0)
for (const [name, value] of Object.entries(PRESETS)) {
  store.setPreset(name)
  assert.equal(store.getSnapshot().minutes, value)
  assert.equal(store.getSnapshot().mode, 'manual')
}
assert.throws(() => store.setPreset('invalid'), RangeError)
assert.throws(() => store.setMode('invalid'), RangeError)
assert.throws(() => store.setManual(Infinity), TypeError)
const before = notifications
for (let offset = 0; offset <= 1440; offset++) store.setTimeline(offset)
assert.equal(frames.size, 1, 'all input events share one scheduled frame')
assert.equal(notifications, before)
run(frames)
assert.equal(notifications, before + 1)
assert.equal(store.getSnapshot().sliderOffset, 1440)
assert.equal(store.getSnapshot().minutes, 300)
store.setTimeline(0); run(frames)
assert.equal(store.getSnapshot().sliderOffset, 0, 'distinct first endpoint')
store.setTimeline(1139); run(frames)
assert.equal(store.getSnapshot().minutes, 1439)
store.setTimeline(1140); run(frames)
assert.equal(store.getSnapshot().minutes, 0)
store.setMode('live')
assert.equal(store.getSnapshot().minutes, 1320)
page.hidden = true; page.dispatchEvent(new Event('visibilitychange'))
assert.equal(timers.size, 0, 'hidden Live clock suspends')
date = new Date(2026, 9, 26, 0, 0, 30)
page.hidden = false; page.dispatchEvent(new Event('visibilitychange'))
assert.equal(store.getSnapshot().minutes, .5, 'visible clock uses a fresh local Date')
assert.equal(timers.size, 1)
unsubscribe()
assert.equal(timers.size, 1, 'scene keeps Live clock independent of controller')
store.setTimeline(40)
unsubscribeScene()
assert.equal(timers.size, 0)
assert.equal(frames.size, 0)
assert.equal(events.size, 0)
const stopped = notifications
const idleSnapshot = store.getSnapshot()
date = new Date(2026, 9, 26, 2, 15)
run(timers); run(frames); view.dispatchEvent(new Event('focus')); page.dispatchEvent(new Event('visibilitychange'))
assert.equal(notifications, stopped, 'teardown prevents subsequent notification')
assert.equal(store.getSnapshot(), idleSnapshot, 'both event listeners are removed after the last unsubscribe')
unsubscribe(); unsubscribeScene()
const again = store.subscribe(() => notifications++)
assert.equal(store.getSnapshot().minutes, 135, 'first returning subscriber immediately resamples the local clock')
store.dispose(); again()
assert.equal(events.size, 0)
assert.equal(timers.size, 0)
assert.throws(() => store.subscribe(() => {}), /disposed/)
const disposed = store.getSnapshot()
store.setManual(720)
assert.equal(store.getSnapshot(), disposed)
console.log('PASS World Time: normalization, full timeline, presets, continuous sampler, controlled Live clock, coalescing, visibility and lifecycle')

if (process.argv.includes('--browser')) await import('./world-time-browser.mjs')
