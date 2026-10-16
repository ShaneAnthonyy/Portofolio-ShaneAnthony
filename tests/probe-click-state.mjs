import { fresh, send, evaluate, until, delay, close, approach, activate, unlocked } from './browser.mjs'
const q = s => `document.querySelector(${JSON.stringify(s)})`
const featured = '.tidal-card[data-position="0"]'
const st = () => evaluate(`({active:Number(${q(featured)}.dataset.projectIndex),moving:!!${q('.tidal-stage')}.dataset.moving,dragging:!!${q('.tidal-stage')}.dataset.dragging,dialog:!!document.querySelector('[role=dialog]')})`)
try {
  await fresh()
  await approach(); await activate(); await until(unlocked, 25000)
  await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'center',behavior:'instant'})`); await delay(500)
  console.log('INIT', JSON.stringify(await st()))
  const point = await evaluate(`(()=>{const el=document.querySelector('.tidal-card[data-position="1"]');const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point })
  console.log('PRESSED', JSON.stringify(await st()))
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point })
  for (let i = 0; i < 5; i++) { await delay(400); console.log('REL+' + i, JSON.stringify(await st())) }
} finally { await close() }
