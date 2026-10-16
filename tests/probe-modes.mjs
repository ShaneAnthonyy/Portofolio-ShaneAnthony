import { writeFile } from 'node:fs/promises'
import { fresh, send, evaluate, until, delay, close, errors, warnings, approach, activate, unlocked, screenshot } from './browser.mjs'
const out = (n, d) => writeFile(new URL(`./${n}`, import.meta.url), JSON.stringify(d, null, 2))
const r = {}
try {
  await fresh({ width: 1440, height: 900 })
  await approach(); await activate(); await until(unlocked, 25000)
  // Theme toggle + persistence
  const t0 = await evaluate(`document.documentElement.dataset.theme`)
  await evaluate(`document.querySelector('.theme-toggle').click()`); await delay(400)
  const t1 = await evaluate(`document.documentElement.dataset.theme`)
  r.theme = { before: t0, after: t1, canvases: await evaluate(`document.querySelectorAll('canvas').length`) }
  // Music toggle (no autoplay assumption: only check control state consistency)
  r.music = await evaluate(`(()=>{const b=document.querySelector('.audio-toggle');return {exists:!!b,label:b?.getAttribute('aria-label'),count:document.querySelectorAll('audio').length}})()`)
  // Lite toggle roundtrip
  const m = async () => evaluate(`({perf:document.documentElement.dataset.perf,hero:document.querySelector('.hero-aquarium')?.dataset.state,canvases:document.querySelectorAll('canvas').length})`)
  const before = await m()
  await evaluate(`document.querySelector('.lite-toggle').click()`); await delay(700)
  const lite = await m()
  await evaluate(`document.querySelector('.lite-toggle').click()`); await delay(1100)
  const back = await m()
  r.lite = { before, lite, back }
  // Reduced motion: canvases unmount, page navigable
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await delay(900)
  r.reduced = await evaluate(`({canvases:document.querySelectorAll('canvas').length,skills:!!document.querySelector('#skills .fish'),projects:!!document.querySelector('.tidal-stage'),about:(()=>{const e=document.querySelector('#about');const b=e.getBoundingClientRect();return b.height>0})()})`)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await delay(1200)
  r.reducedOff = await evaluate(`({canvases:document.querySelectorAll('canvas').length})`)
  // Keyboard + modal a11y spot: focus feature card, Enter opens dialog, Escape restores focus
  await evaluate(`document.querySelector('.tidal-stage').scrollIntoView({block:'center',behavior:'instant'})`); await delay(500)
  await evaluate(`document.querySelector('.tidal-card[data-position="0"]').focus()`)
  const f1 = await evaluate(`document.activeElement?.className`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' })
  await delay(600)
  const dlg = await evaluate(`({open:!!document.querySelector('[role=dialog]'),overflow:document.body.style.overflow,focusInDialog:document.activeElement===document.querySelector('[role=dialog]')})`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' })
  await delay(500)
  const ret = await evaluate(`({open:!!document.querySelector('[role=dialog]'),overflow:document.body.style.overflow,focusBack:document.activeElement?.classList?.contains('tidal-card')})`)
  r.modalA11y = { f1, dlg, ret }
  // Listener snapshot (informational only)
  r.listeners = await evaluate(`0`)
  const metrics = Object.fromEntries((await send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]))
  r.metrics = { listeners: metrics.JSEventListeners, heapMB: Math.round(metrics.JSHeapUsedSize / 1048576 * 10) / 10, nodes: metrics.Nodes }
  await out('./measurements/modes-a11y.json', { r, errors, warnings })
  console.log(JSON.stringify(r))
} finally { await close() }
