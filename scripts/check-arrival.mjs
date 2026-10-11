import assert from 'node:assert/strict'
import { arrivalProgress, dockProgress, magneticMotion } from '../src/animation/diveArrival.js'

assert.equal(arrivalProgress(0.93), 0)
assert.equal(arrivalProgress(1), 1)
assert.equal(dockProgress(0.24), 0)
assert.equal(dockProgress(1), 1)
for (const coarse of [false, true]) {
  for (const distance of [1, 40, 120, 320, 600]) {
    for (const velocity of [0, 120, 600, 1800, 8000]) {
      const { duration, ease } = magneticMotion(distance, velocity, coarse)
      assert.ok(duration >= 0.4 && duration <= (coarse ? 1.0 : 1.5))
      assert.equal(ease(0), 0)
      assert.equal(ease(1), 1)
      let previous = 0
      for (let i = 0; i <= 100; i++) {
        const value = ease(i / 100)
        assert.ok(value >= previous && value <= 1)
        previous = value
      }
      assert.ok((1 - ease(0.9999)) / 0.0001 < 0.001)
    }
  }
}
for (let i = 1; i <= 1000; i++) {
  assert.ok(dockProgress(i / 1000) >= dockProgress((i - 1) / 1000))
}
console.log('Arrival progress and magnetic motion: endpoints, bounded timing, monotonic travel, and zero terminal velocity passed.')
