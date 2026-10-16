import { fresh, send, evaluate, until, delay, close, approach, activate, unlocked } from './browser.mjs'
const q = s => `document.querySelector(${JSON.stringify(s)})`
const featured = '.tidal-card[data-position="0"]'
const key = async k => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k }) }
try {
  await fresh()
  await approach(); await activate(); await until(unlocked, 25000)
  await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'center',behavior:'instant'})`); await delay(500)
  for (let i = 0; i < 3; i++) {
    const b = await evaluate(`Number(${q(featured)}.dataset.projectIndex)`)
    await evaluate(`${q(featured)}.focus()`)
    console.log('FOCUS', JSON.stringify(await evaluate(`document.activeElement===${q(featured)}`)))
    await key('ArrowRight')
    for (let j = 0; j < 5; j++) { await delay(400); console.log('T', i, JSON.stringify(await evaluate(`Number(${q(featured)}.dataset.projectIndex)`))) }
  }
} finally { await close() }
