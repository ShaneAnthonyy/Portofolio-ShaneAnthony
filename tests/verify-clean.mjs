import { fresh, send, evaluate, until, delay, close, errors, approach, activate, unlocked } from './browser.mjs'
const q = s => `document.querySelector(${JSON.stringify(s)})`
const featured = '.tidal-card[data-position="0"]', next = '[aria-label="Show next project"]'
const settled = () => until(`!${q('.tidal-stage')}.dataset.moving`, 15000)
const cleanResting = async () => {
  const bad = await evaluate(`(() => {
    const issues = [];
    const stage = document.querySelector('.tidal-stage');
    if (stage.dataset.moving) issues.push('stage still moving');
    const cards = [...document.querySelectorAll('.tidal-card')];
    const seenX = [];
    for (const e of cards) {
      const pos = e.dataset.position, idx = e.dataset.projectIndex;
      if (e.style.willChange) issues.push('card ' + idx + '@' + pos + ' stale willChange');
      if (e.hidden) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden') {
        if (cs.pointerEvents !== 'none') issues.push('card ' + idx + '@' + pos + ' parked but clickable');
        continue;
      }
      const m = new DOMMatrix(cs.transform);
      const pure = Math.abs(m.m11 - 1) < 0.01 && Math.abs(m.m22 - 1) < 0.01 && Math.abs(m.m33 - 1) < 0.01
        && [m.m12, m.m13, m.m21, m.m23, m.m31, m.m32].every(v => Math.abs(v) < 0.01);
      if (!pure) issues.push('card ' + idx + '@' + pos + ' residual rotation/scale: ' + cs.transform);
      const o = parseFloat(e.style.opacity || cs.opacity);
      if (!(o >= 0 && o <= 1)) issues.push('card ' + idx + '@' + pos + ' bad opacity ' + o);
      if (pos === '0' && Math.abs(o - 1) > 0.01) issues.push('featured card ' + idx + ' opacity ' + o + ' !== 1');
      seenX.push([Number(pos), e.getBoundingClientRect().x]);
    }
    const xs = seenX.map(x => x[1]);
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++)
      if (Math.abs(xs[i] - xs[j]) < 40) issues.push('cards overlap at x~' + Math.round(xs[i]));
    return issues;
  })()`)
  if (bad.length) throw new Error('DIRTY: ' + JSON.stringify(bad).slice(0, 300))
  return bad
}
try {
  await fresh()
  await approach(); await activate(); await until(unlocked, 25000)
  await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'center',behavior:'instant'})`); await delay(500)
  // Green: settled after navigation
  await evaluate(`${q(next)}.click()`); await settled(); await delay(200)
  console.log('GREEN issues:', JSON.stringify(await cleanResting()))
  // Green: interrupted + resized settle
  await evaluate(`${q(next)}.click()`); await delay(35)
  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false })
  await settled(); await delay(200)
  console.log('GREEN-RESIZE issues:', JSON.stringify(await cleanResting()))
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await settled()
  // Red: inject residual rotation + stale willChange + wrong featured opacity
  await evaluate(`${q(featured)}.style.transform='rotate(5deg)';${q(featured)}.style.willChange='transform';${q(featured)}.style.opacity='0.5'`)
  try { await cleanResting(); console.log('RED: NOT DETECTED (bad)') }
  catch (e) { console.log('RED detected:', e.message) }
  // Restore: clear injected fault, confirm cleared, then navigate
  await evaluate(`[...document.querySelectorAll('.tidal-card')].forEach(e=>e.style.removeProperty('will-change'))`)
  console.log('WC holders after clear:', await evaluate(`[...document.querySelectorAll('.tidal-card')].filter(e=>e.style.willChange).map(e=>e.dataset.projectIndex+'@'+e.dataset.position+':'+e.style.willChange)+'||moving:'+document.querySelector('.tidal-stage').dataset.moving`))
  const ab = await evaluate(`Number(${q(featured)}.dataset.projectIndex)`)
  const dbg0 = await evaluate(`({moving:!!${q('.tidal-stage')}.dataset.moving,focus:document.activeElement?.className})`)
  await evaluate(`${q('.slider-region')}.focus()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' })
  await delay(1500)
  const dbg1 = await evaluate(`({moving:!!${q('.tidal-stage')}.dataset.moving,focus:document.activeElement?.className,active:Number(${q(featured)}.dataset.projectIndex)})`)
  console.log('DBG', JSON.stringify(dbg0), JSON.stringify(dbg1))
  await settled(); await delay(200)
  const aa = await evaluate(`Number(${q(featured)}.dataset.projectIndex)`)
  console.log('RESTORE nav', ab, '->', aa)
  console.log('RESTORED issues:', JSON.stringify(await cleanResting()))
} finally { await close() }
