import { writeFile } from 'node:fs/promises'
import { fresh, send, evaluate, until, delay, close, errors, warnings, approach, activate, unlocked, screenshot } from './browser.mjs'
const out = (n, d) => writeFile(new URL(`./${n}`, import.meta.url), JSON.stringify(d, null, 2))
const res = {}
try {
  // Desktop parity: fish spans should match side-lane behavior unchanged (~124-130px lanes)
  await fresh({ width: 1440, height: 900 })
  await approach(); await activate(); await until(unlocked, 25000)
  await evaluate(`document.querySelector('#projects').scrollIntoView({block:'start',behavior:'instant'})`); await delay(600)
  const desk = []
  for (let i = 0; i < 40; i++) { desk.push(await evaluate(`[...document.querySelectorAll('#projects .ambient-fish-layer .fish')].map(e=>parseFloat(e.style.transform.replace('translate3d(','').split(',')[0]))`)); await delay(250) }
  const spans = desk[0].map((_, f) => { const xs = desk.map(s => s[f]); return Math.max(...xs) - Math.min(...xs) })
  res.desktop = { fishCount: desk[0].length, spans10s: spans }
  await screenshot('./screenshots/fish-desktop-1440.png')
  // Mobile overflow + layering: no page overflow, fish layer behind (z-index 0), cards interactive
  await fresh({ width: 390, height: 844 })
  await approach(); await activate(); await until(unlocked, 25000)
  await evaluate(`document.querySelector('#projects').scrollIntoView({block:'start',behavior:'instant'})`); await delay(600)
  res.mobile = await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth+1,layerZ:getComputedStyle(document.querySelector('#projects .ambient-fish-layer')).zIndex,layerPE:getComputedStyle(document.querySelector('#projects .ambient-fish-layer')).pointerEvents,fishVisible:[...document.querySelectorAll('#projects .ambient-fish-layer .fish')].map(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.bottom>0&&b.top<innerHeight})})`)
  await screenshot('./screenshots/fish-mobile-390.png')
  // Short viewport + landscape orientation spot
  for (const [w, h] of [[390,500],[844,390]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 })
    await delay(700)
    res[w+'x'+h] = await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth+1,fish:[...document.querySelectorAll('#projects .ambient-fish-layer .fish')].map(e=>parseFloat(e.style.transform.replace('translate3d(','').split(',')[0]))})`)
  }
  // Lite + reduced
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await evaluate(`document.querySelector('.lite-toggle').click()`); await delay(700)
  res.lite = await evaluate(`({perf:document.documentElement.dataset.perf,fish:document.querySelectorAll('#projects .ambient-fish-layer .fish').length})`)
  await evaluate(`document.querySelector('.lite-toggle').click()`); await delay(1100)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await delay(900)
  res.reduced = await evaluate(`({fish:document.querySelectorAll('#projects .ambient-fish-layer .fish').length})`)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await out('./measurements/fish-regression.json', { res, errors, warnings })
  console.log(JSON.stringify(res))
} finally { await close() }
