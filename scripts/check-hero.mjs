import assert from 'node:assert/strict'
import { fishPose } from '../src/scenes/heroAquarium.js'

for (const [width, height, compact] of [[25.6, 16, false], [9, 19.5, true], [19.5, 16, true]]) {
  for (let i = 0; i < (compact ? 3 : 6); i++) {
    for (let time = 0; time <= 600; time += 0.5) {
      const p = fishPose(i, time, width, height, compact)
      const next = fishPose(i, time + 0.001, width, height, compact)
      assert.ok(Object.values(p).every(Number.isFinite))
      assert.ok(Math.abs(p.x) + p.scale * 1.2 < width / 2, 'Fish stays inside horizontal framing')
      assert.ok(Math.abs(p.y) + p.scale * 1.2 < height / 2, 'Fish stays inside vertical framing')
      if (compact) assert.ok(Math.abs(p.y) > height * 0.22, 'Portrait fish stay above/below the text')
      else assert.ok(Math.abs(p.x) > width * 0.25 || Math.abs(p.y) > height * 0.17, 'Desktop fish avoid central text')
      const tangent = Math.atan2(next.y - p.y, next.x - p.x)
      assert.ok(Math.cos(tangent - p.angle) > 0.9999, 'Heading follows the swimming path')
    }
  }
}
console.log('Hero fish paths: framing, center clearance, and orientation passed.')
