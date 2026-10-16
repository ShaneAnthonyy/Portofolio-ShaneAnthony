import { fresh, send, evaluate, until, delay, close, approach, activate, unlocked } from './browser.mjs'
const q = s => `document.querySelector(${JSON.stringify(s)})`
const featured = '.tidal-card[data-position="0"]'
try {
  await fresh()
  await approach(); await activate(); await until(unlocked, 25000)
  await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'center',behavior:'instant'})`); await delay(500)
  const p = await evaluate(`(()=>{const r=${q(featured)}.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p })
  await delay(60)
  for (let i = 1; i <= 6; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', clickCount: 0, x: p.x - 320 * i / 6, y: p.y })
    await delay(40)
    if (i === 3 || i === 6) console.log('MOVE', i, JSON.stringify(await evaluate(`({dragging:!!${q('.tidal-stage')}.dataset.dragging,cursor:getComputedStyle(${q(featured)}).cursor})`)))
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: p.x - 320, y: p.y })
  await delay(1500)
  console.log('REL', JSON.stringify(await evaluate(`({active:Number(${q(featured)}.dataset.projectIndex),dragging:!!${q('.tidal-stage')}.dataset.dragging})`)))
} finally { await close() }
