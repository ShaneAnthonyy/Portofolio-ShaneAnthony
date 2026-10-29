import assert from 'node:assert/strict'
import { fresh, approach, activate, until, unlocked, evaluate, delay, close } from './browser.mjs'

const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number)
  .map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)

try {
  for (const [width, height] of [[1440, 900], [390, 844]]) for (const minutes of [720, 0]) {
    await fresh({ width, height, minutes, lite: true })
    await approach(); await activate(); await until(unlocked, 25000)
    await evaluate(`document.querySelector('#projects').scrollIntoView({block:'center',behavior:'instant'}); document.querySelector('.tidal-card[data-position="0"]').click()`)
    await until(`!!document.querySelector('.slider-detail')`)
    await delay(300)
    const panel = await evaluate(`(() => {
      const el = document.querySelector('.slider-detail'), cs = getComputedStyle(el), rect = el.getBoundingClientRect();
      return { background: cs.backgroundColor, image: cs.backgroundImage, blur: cs.backdropFilter,
        overlayBlur: getComputedStyle(el.parentElement).backdropFilter, opacity: cs.opacity,
        text: getComputedStyle(el.querySelector('.case-study__paragraph')).color,
        left: rect.left, right: rect.right, bottom: rect.bottom, focused: document.activeElement === el };
    })()`)
    assert.match(panel.background, /^rgb\(/, 'Lite panel must have an opaque background')
    assert.equal(panel.image, 'none')
    assert.equal(panel.blur, 'none')
    assert.equal(panel.overlayBlur, 'none')
    assert.equal(panel.opacity, '1')
    assert.ok(panel.left >= 0 && panel.right <= width + 1 && panel.bottom <= height + 1, 'panel fits viewport')
    assert.equal(panel.focused, true)
    const a = luminance(panel.background), b = luminance(panel.text)
    const contrast = (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
    assert.ok(contrast >= 4.5, `body text contrast ${contrast.toFixed(2)}:1`)
    console.log('PASS Lite project details', width, minutes, 'opaque, no blur, fits, focused, contrast', contrast.toFixed(2) + ':1')
  }
} finally {
  await close()
}
