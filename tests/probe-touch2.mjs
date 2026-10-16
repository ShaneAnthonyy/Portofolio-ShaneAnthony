import { writeFile } from 'node:fs/promises'
import { fresh, send, evaluate, until, delay, close, errors, warnings, approach, activate, unlocked } from './browser.mjs'
const out = (n, d) => writeFile(new URL(`./${n}`, import.meta.url), JSON.stringify(d, null, 2))
const q = s => `document.querySelector(${JSON.stringify(s)})`
const featured = '.tidal-card[data-position="0"]'
const state = () => evaluate(`({active:Number(${q(featured)}.dataset.projectIndex),moving:!!${q('.tidal-stage')}.dataset.moving,dragging:!!${q('.tidal-stage')}.dataset.dragging,y:Math.round(scrollY)})`)
const log = []
try {
  await fresh({ width: 390, height: 844 })
  await approach(); await activate(); await until(unlocked, 25000)
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'start',behavior:'instant'})`); await delay(500)
  log.push(['settled-initial', await state()])
  const touch = async points => { for (let i = 0; i < points.length; i++) { await send('Input.dispatchTouchEvent', { type: i ? 'touchMove' : 'touchStart', touchPoints: [{ x: points[i][0], y: points[i][1] }] }); await delay(30) } await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) }
  await touch([[310,280],[280,282],[220,283],[160,285],[80,285]])
  for (let i = 0; i < 6; i++) { await delay(400); log.push(['swipe-wait-' + i, await state()]) }
  await touch([[190,450],[190,410],[192,330],[191,260],[190,200]])
  for (let i = 0; i < 4; i++) { await delay(400); log.push(['vert-wait-' + i, await state()]) }
  await out('./measurements/touch-trace.json', { log, errors, warnings })
  console.log(JSON.stringify(log))
} finally { await send('Emulation.setTouchEmulationEnabled', { enabled: false }); await close() }
