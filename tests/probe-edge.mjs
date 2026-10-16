import { writeFile } from 'node:fs/promises'
import { fresh, send, evaluate, until, delay, close, errors, warnings, approach, activate, unlocked, screenshot } from './browser.mjs'
const out = (n, d) => writeFile(new URL(`./${n}`, import.meta.url), JSON.stringify(d, null, 2))
const r = {}
try {
  for (const [w, h] of [[1440,900],[390,844]]) {
    await fresh({ width: w, height: h })
    await approach(); await activate(); await until(unlocked, 25000)
    const m = await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth+1,unlocked:${unlocked},canvases:document.querySelectorAll('canvas').length,legend:[...document.querySelectorAll('.skills-legend__level')].map(x=>x.textContent.trim())})`)
    r[w+'x'+h] = m; console.log('EDGE', w+'x'+h, JSON.stringify(m))
    await screenshot(`./screenshots/edge-${w}x${h}.png`)
  }
  await out('./measurements/edge.json', { r, errors, warnings })
} finally { await close() }
