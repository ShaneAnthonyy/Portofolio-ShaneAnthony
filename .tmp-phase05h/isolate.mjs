import { writeFile } from 'node:fs/promises'
import { fresh, send, socket, evaluate, delay, close, errors, warnings } from '../scripts/dive-browser.mjs'

await send('Network.enable')
await send('Performance.enable')
const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]))
const quantile = (a, p) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]
const out = {}
const hook = `window.__t = { dive: 0 };
  for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) for (const n of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']) {
    const fn = type.prototype[n]; if (!fn || fn.__t) continue;
    const w = function(...a) { if (this.canvas.closest('.webgl-backdrop')) window.__t.dive++; return fn.apply(this, a); };
    w.__t = true; type.prototype[n] = w;
  }`
async function window3s(frac) {
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * ${frac}, behavior: 'instant'})`)
  await delay(800)
  const before = await metrics()
  const d0 = await evaluate('window.__t.dive')
  const frames = await evaluate(`new Promise(resolve => {
    const out = []; let start;
    const tick = now => { start ??= now; out.push(now); if (now - start < 3000) requestAnimationFrame(tick); else resolve(out); };
    requestAnimationFrame(tick);
  })`)
  const d1 = await evaluate('window.__t.dive')
  const after = await metrics()
  const dt = frames.slice(1).map((f, i) => f - frames[i])
  return { frac, medianMs: +quantile(dt, .5).toFixed(2), p95Ms: +quantile(dt, .95).toFixed(2), longFrames: dt.filter(t => t > 50).length, scriptMs: +((after.ScriptDuration - before.ScriptDuration) * 1000).toFixed(1), styleMs: +((after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000).toFixed(1), diveDraws: d1 - d0 }
}
for (const [label, block] of [['full', []], ['no-fish', ['*/fish_*.glb', '*/butterfly_koi_*.glb', '*/shrimp_*.glb']]]) {
  await send('Network.setBlockedURLs', { urls: block })
  await fresh({ width: 1440, height: 900 })
  await evaluate(`(async () => { ${hook} })()`)
  await delay(4000)
  const warns = (await evaluate(`performance.getEntriesByType('resource').filter(e => /fish|koi|shrimp/i.test(e.name)).map(e => e.name.split('/').pop())`))
  out[label] = { wins: [await window3s(0), await window3s(0.5), await window3s(0.91)], fishReqs: warns, errors: [...errors], warnings: warnings.length }
  console.log('DONE', label, JSON.stringify(out[label].wins.map(w => [w.frac, w.scriptMs, w.diveDraws])), 'reqs:', JSON.stringify(warns))
}
await writeFile(new URL('./isolate.json', import.meta.url), JSON.stringify(out, null, 2))
await close()
