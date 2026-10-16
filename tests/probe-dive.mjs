import { writeFile } from 'node:fs/promises'
import { fresh, send, evaluate, until, delay, close, errors, warnings, approach, activate, unlocked, screenshot } from './browser.mjs'
const out = (n, d) => writeFile(new URL(`./${n}`, import.meta.url), JSON.stringify(d, null, 2))
const r = {}
try {
  await fresh({ width: 1440, height: 900 })
  // Dive landing
  await approach(); await activate(); await until(unlocked, 25000)
  r.landing = await evaluate(`({unlocked:${unlocked},dive:document.querySelector('.webgl-backdrop')?.dataset.renderState,aqua:document.querySelector('.hero-aquarium')?.dataset.state})`)
  await screenshot('./screenshots/dive-hero.png')
  // Hero/About: scroll into about, check responsiveness (no stuck), text visible
  const y0 = await evaluate(`scrollY`)
  await evaluate(`document.querySelector('#about').scrollIntoView({block:'start',behavior:'instant'})`); await delay(800)
  const y1 = await evaluate(`scrollY`)
  r.heroAbout = await evaluate(`({y0:${y0},y1:scrollY,aboutVisible:(()=>{const e=document.querySelector('#about');const b=e.getBoundingClientRect();return b.top<innerHeight&&b.bottom>0})(),heroTitleOpacity:getComputedStyle(document.querySelector('.hero__title')).opacity})`)
  await screenshot('./screenshots/hero-about.png')
  // Reverse
  // Reverse (mirror check-dive-landing staging)
  await evaluate(`window.scrollTo(0, 0)`); await delay(600)
  r.reverse = await evaluate(`({y:scrollY,dive:document.querySelector('.webgl-backdrop')?.dataset.renderState})`)
  // Replay (proven sequence: reset via replay button, which restores spacer)
  await evaluate(`document.querySelector('.hero__replay').click()`)
  await until(`document.querySelector('#portfolio-dive').offsetHeight > 0`, 10000); await delay(300)
  r.replayReset = await evaluate(`({spacer:document.querySelector('#portfolio-dive').offsetHeight,unlocked:document.querySelector('.aqua-root').classList.contains('is-portfolio-unlocked')})`)
  await approach(); await activate(); await until(unlocked, 25000); await delay(1000)
  r.replay = await evaluate(`({y:scrollY,unlocked:document.querySelector('.aqua-root').classList.contains('is-portfolio-unlocked'),dive:document.querySelector('.webgl-backdrop')?.dataset.renderState})`)
  await out('./measurements/dive-hero.json', { r, errors, warnings })
  console.log(JSON.stringify(r))
} finally { await close() }
