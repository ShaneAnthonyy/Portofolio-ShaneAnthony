import { fresh, send, evaluate, until, delay, close, errors, warnings, approach, activate, unlocked, screenshot } from './browser.mjs'
const q = s => `document.querySelector(${JSON.stringify(s)})`
const featured = '.tidal-card[data-position="0"]'
try {
  for (const theme of ['dark', 'light']) {
    await fresh({ width: 1440, height: 900, theme })
    await approach(); await activate(); await until(unlocked, 25000)
    await screenshot(`./screenshots/before/1440-hero-${theme}.png`)
    await evaluate(`document.querySelector('#about').scrollIntoView({block:'start',behavior:'instant'})`); await delay(700)
    await screenshot(`./screenshots/before/1440-about-${theme}.png`)
    await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'center',behavior:'instant'})`); await delay(600)
    await screenshot(`./screenshots/before/1440-carousel-${theme}.png`)
    await evaluate(`${q(featured)}.focus()`)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' })
    await until('!!document.querySelector("[role=dialog]")', 8000); await delay(600)
    await screenshot(`./screenshots/before/1440-modal-${theme}.png`)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' })
    await delay(400)
    await evaluate(`document.querySelector('#skills').scrollIntoView({block:'start',behavior:'instant'})`); await delay(600)
    await screenshot(`./screenshots/before/1440-skills-${theme}.png`)
    await evaluate(`document.querySelector('#contact').scrollIntoView({block:'start',behavior:'instant'})`); await delay(600)
    await screenshot(`./screenshots/before/1440-contact-${theme}.png`)
    console.log('THEME DONE', theme, JSON.stringify(errors))
  }
  await fresh({ width: 390, height: 844 })
  await approach(); await activate(); await until(unlocked, 25000)
  await screenshot('./screenshots/before/390-hero.png')
  await evaluate(`document.querySelector('#about').scrollIntoView({block:'start',behavior:'instant'})`); await delay(700)
  await screenshot('./screenshots/before/390-about.png')
  await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'center',behavior:'instant'})`); await delay(600)
  await screenshot('./screenshots/before/390-carousel.png')
  await evaluate(`document.querySelector('#skills').scrollIntoView({block:'start',behavior:'instant'})`); await delay(600)
  await screenshot('./screenshots/before/390-skills.png')
  console.log('MOBILE DONE', JSON.stringify(errors), JSON.stringify(warnings.slice(0, 1)))
} finally { await close() }
