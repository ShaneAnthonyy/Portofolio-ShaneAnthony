import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { fresh, send, evaluate, until, delay, close, errors, warnings, approach, activate, unlocked, screenshot } from './browser.mjs'
const out = (n, d) => writeFile(new URL(`./${n}`, import.meta.url), JSON.stringify(d, null, 2))
const rows = []
try {
  // 1. Viewport matrix: overflow + key controls (bounded, no full journey)
  for (const [w, h] of [[1920,1080],[1440,900],[1366,768],[1024,768],[768,1024],[430,932],[390,844],[375,812],[360,800],[390,500],[844,390]]) {
    await fresh({ width: w, height: h })
    await approach(); await activate(); await until(unlocked, 25000)
    await evaluate(`document.querySelector('#projects').scrollIntoView({block:'start',behavior:'instant'})`); await delay(400)
    await evaluate(`document.querySelector('#skills').scrollIntoView({block:'start',behavior:'instant'})`); await delay(400)
    const m = await evaluate(`(()=>{const o={w:${w},h:${h},overflow:document.documentElement.scrollWidth>innerWidth+1,dock:(()=>{const e=document.querySelector('.navbar__dock');if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),w:Math.round(r.width),over:r.right>innerWidth+1}})(),heroTitle:(()=>{const e=document.querySelector('.hero__title');if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),w:Math.round(r.width),over:r.right>innerWidth+1||r.x<-1}})(),legend:(()=>{const e=document.querySelector('.skills-legend');if(!e)return null;const r=e.getBoundingClientRect();const lv=[...e.querySelectorAll('.skills-legend__level')].map(x=>x.textContent.trim());return {levels:lv,current:document.querySelector('.skills-legend__current')?.textContent.trim(),over:r.right>innerWidth+1}})(),controls:[...document.querySelectorAll('.slider-control')].map(e=>({w:e.offsetWidth,h:e.offsetHeight})),canvases:document.querySelectorAll('canvas').length};return o})()`)
    rows.push(m); console.log('VP', w+'x'+h, 'overflow='+m.overflow, 'dockOver='+(m.dock&&m.dock.over), 'legend='+(m.legend&&m.legend.levels.join('/')))
    await screenshot(`./screenshots/vp-${w}x${h}.png`)
  }
  await out('./measurements/viewports.json', { rows, errors, warnings })
} finally { await close() }
