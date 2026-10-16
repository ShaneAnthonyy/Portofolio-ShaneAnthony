import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { fresh, send, evaluate, until, delay, close, errors, warnings, approach, activate, unlocked, screenshot } from './browser.mjs'
const out = (n, d) => writeFile(new URL(`./${n}`, import.meta.url), JSON.stringify(d, null, 2))
const rows = []
try {
  // Promoted from probe-viewports: retain the full viewport matrix and fail on regressions.
  for (const [w, h] of [[1920,1080],[1440,900],[1366,768],[1024,768],[768,1024],[430,932],[390,844],[375,812],[360,800],[390,500],[844,390]]) {
    await fresh({ width: w, height: h })
    await approach(); await activate(); await until(unlocked, 25000)
    await evaluate(`document.querySelector('#projects').scrollIntoView({block:'start',behavior:'instant'})`); await delay(400)
    await evaluate(`document.querySelector('#skills').scrollIntoView({block:'start',behavior:'instant'})`); await delay(400)
    const m = await evaluate(`(()=>{const o={w:${w},h:${h},overflow:document.documentElement.scrollWidth>innerWidth+1,dock:(()=>{const e=document.querySelector('.navbar__dock');if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),w:Math.round(r.width),over:r.right>innerWidth+1}})(),heroTitle:(()=>{const e=document.querySelector('.hero__title');if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),w:Math.round(r.width),over:r.right>innerWidth+1||r.x<-1}})(),legend:(()=>{const e=document.querySelector('.skills-legend');if(!e)return null;const r=e.getBoundingClientRect();const lv=[...e.querySelectorAll('.skills-legend__level')].map(x=>x.textContent.trim());return {levels:lv,current:document.querySelector('.skills-legend__current')?.textContent.trim(),over:r.right>innerWidth+1}})(),controls:[...document.querySelectorAll('.slider-control')].map(e=>({w:e.offsetWidth,h:e.offsetHeight})),canvases:document.querySelectorAll('canvas').length};return o})()`)
    rows.push(m)
    assert.equal(m.overflow, false, `${w}x${h}: page horizontal overflow`)
    assert.ok(m.dock && !m.dock.over, `${w}x${h}: navbar dock fits`)
    assert.ok(m.heroTitle && !m.heroTitle.over, `${w}x${h}: Hero title fits`)
    assert.ok(m.legend && !m.legend.over, `${w}x${h}: proficiency legend fits`)
    assert.deepEqual(m.legend.levels, ['Amateur', 'Intermediate', 'Expert'])
    assert.equal(m.legend.current, 'Current highest proficiency: Intermediate')
    assert.equal(m.controls.length, 2, `${w}x${h}: both carousel controls exist`)
    assert.ok(m.controls.every(c => c.w >= 44 && c.h >= 44), `${w}x${h}: touch targets`)
    console.log('PASS viewport', w+'x'+h, 'overflow, dock, Hero, legend and touch targets')
    await screenshot(`./screenshots/vp-${w}x${h}.png`)
  }
  assert.equal(errors.length, 0, JSON.stringify(errors))
} finally {
  await out('./measurements/viewports.json', { rows, errors, warnings })
  await close()
}
