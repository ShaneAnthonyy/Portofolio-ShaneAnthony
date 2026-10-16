import { fresh, send, evaluate, until, delay, close, approach, activate, unlocked } from './browser.mjs'
const q = s => `document.querySelector(${JSON.stringify(s)})`
const featured = '.tidal-card[data-position="0"]'
const key = async k => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k }) }
try {
  await fresh()
  await approach(); await activate(); await until(unlocked, 25000)
  await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'center',behavior:'instant'})`); await delay(500)
  const id0 = await evaluate(`(()=>{const f=${q(featured)};f.focus();return f.dataset.projectIndex})()`)
  await key('ArrowRight')
  await until(`Number(${q(featured)}.dataset.projectIndex)===${(Number(id0) + 1) % 6}`, 20000); await delay(300)
  console.log(JSON.stringify(await evaluate(`({newFeatured:${q(featured)}.dataset.projectIndex,focusIdx:document.activeElement?.dataset?.projectIndex,focusOnNew:document.activeElement===${q(featured)},focusInBody:document.activeElement===document.body})`)))
} finally { await close() }
