import { fresh, evaluate, until, delay, close, approach, activate, unlocked, screenshot } from './browser.mjs'
const q = s => `document.querySelector(${JSON.stringify(s)})`
const featured = '.tidal-card[data-position="0"]'
try {
  await fresh({ width: 1440, height: 900, theme: 'dark' })
  await approach(); await activate(); await until(unlocked, 25000)
  await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'center',behavior:'instant'})`); await delay(600)
  await screenshot('./screenshots/after-1440-carousel.png')
  await evaluate(`document.querySelector('#skills').scrollIntoView({block:'start',behavior:'instant'})`); await delay(600)
  await screenshot('./screenshots/after-1440-skills.png')
  await fresh({ width: 390, height: 844 })
  await approach(); await activate(); await until(unlocked, 25000)
  await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'center',behavior:'instant'})`); await delay(600)
  await screenshot('./screenshots/after-390-carousel.png')
  console.log('AFTER-SET DONE')
} finally { await close() }
