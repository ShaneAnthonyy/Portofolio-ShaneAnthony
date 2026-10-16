import { writeFile } from 'node:fs/promises'
import { fresh, send, evaluate, until, delay, close, errors, warnings, approach, activate, unlocked } from './browser.mjs'
const out = (n, d) => writeFile(new URL(`./${n}`, import.meta.url), JSON.stringify(d, null, 2))
const q = s => `document.querySelector(${JSON.stringify(s)})`
const featured = '.tidal-card[data-position="0"]'
const res = {}
try {
  await fresh({ width: 390, height: 844 })
  await approach(); await activate(); await until(unlocked, 25000)
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'start',behavior:'instant'})`); await delay(350)
  const touch = async points => { for (let i = 0; i < points.length; i++) { await send('Input.dispatchTouchEvent', { type: i ? 'touchMove' : 'touchStart', touchPoints: [{ x: points[i][0], y: points[i][1] }] }); await delay(25) } await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) }
  const active = () => evaluate(`Number(${q(featured)}.dataset.projectIndex)`)
  const settled = () => until(`!${q('.tidal-stage')}.dataset.moving`, 15000)
  let before = await active()
  await touch([[310,280],[280,282],[220,283],[160,285],[80,285]])
  await settled()
  res.swipe = { before, after: await active(), expect: (before + 1) % 6, modal: await evaluate('!!document.querySelector("[role=dialog]")') }
  const y0 = await evaluate(`scrollY`)
  before = await active()
  await touch([[190,450],[190,410],[192,330],[191,260],[190,200]])
  await delay(450)
  res.vertical = { scrolled: (await evaluate(`scrollY`)) > y0 + 40, activeUnchanged: (await active()) === before }
  await evaluate(`${q(featured)}.scrollIntoView({block:'center',behavior:'instant'})`); await delay(200)
  await touch([[190,350]])
  try { await until('!!document.querySelector("[role=dialog]")', 5000); res.tap = { modal: true } }
  catch { res.tap = { modal: false } }
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' })
  await delay(400)
  res.tap.closed = !(await evaluate('!!document.querySelector("[role=dialog]")'))
  await out('./measurements/touch.json', { res, errors, warnings })
  console.log(JSON.stringify(res))
} finally { await send('Emulation.setTouchEmulationEnabled', { enabled: false }); await close() }
