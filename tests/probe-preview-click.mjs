import { fresh, send, evaluate, until, delay, close, approach, activate, unlocked } from './browser.mjs'
const q = s => `document.querySelector(${JSON.stringify(s)})`
const featured = '.tidal-card[data-position="0"]', next = '[aria-label="Show next project"]'
try {
  await fresh()
  await approach(); await activate(); await until(unlocked, 25000)
  await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'center',behavior:'instant'})`); await delay(500)
  const before = await evaluate(`Number(${q(featured)}.dataset.projectIndex)`)
  const info = await evaluate(`(()=>{const el=document.querySelector('.tidal-card[data-position="1"]');el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},top:top?top.className+'#'+top.id+'<'+top.parentElement?.className:'none'}})()`)
  console.log('BEFORE', before, JSON.stringify(info))
  await delay(150)
  const point = await evaluate(`(()=>{const el=document.querySelector('.tidal-card[data-position="1"]');const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point })
  await delay(300)
  console.log('AFTER-CLICK', await evaluate(`({active:Number(${q(featured)}.dataset.projectIndex),dialog:!!document.querySelector('[role=dialog]'),moving:!!${q('.tidal-stage')}.dataset.moving})`))
  // Try keyboard-safe alternative: real React onClick via evaluate .click()
  await evaluate(`document.querySelector('.tidal-card[data-position="1"]').click()`)
  await delay(300)
  console.log('AFTER-JSCLICK', await evaluate(`({active:Number(${q(featured)}.dataset.projectIndex),dialog:!!document.querySelector('[role=dialog]')})`))
} finally { await close() }
