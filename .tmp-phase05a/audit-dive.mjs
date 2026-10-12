import { writeFile, mkdir } from 'node:fs/promises'
import { fresh, until, send, socket, evaluate, delay, close, errors } from '../scripts/dive-browser.mjs'

const output = new URL('./', import.meta.url)
await mkdir(output, { recursive: true })
await send('Network.enable')
await send('Performance.enable')
const bytes = new Map()
const onNet = e => {
  const m = JSON.parse(e.data)
  if (m.method === 'Network.dataReceived') bytes.set(m.params.requestId, (bytes.get(m.params.requestId) || 0) + m.params.dataLength)
  if (m.method === 'Network.responseReceived' && !m.params.response.fromDiskCache) {
    if (!bytes.has(m.params.requestId)) bytes.set(m.params.requestId, 0)
    bytes.set(m.params.requestId + '#url', m.params.response.url)
  }
}
socket.addEventListener('message', onNet)
const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]))
const quantile = (a, p) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]
const results = []

async function window3s(frac) {
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * ${frac}, behavior: 'instant'})`)
  await delay(800)
  const before = await metrics()
  const d0 = await evaluate('({...window.__t})')
  const frames = await evaluate(`new Promise(resolve => {
    const out = []; let start;
    const tick = now => { start ??= now; out.push(now); if (now - start < 3000) requestAnimationFrame(tick); else resolve(out); };
    requestAnimationFrame(tick);
  })`)
  const d1 = await evaluate('({...window.__t})')
  const after = metrics ? await metrics() : {}
  const dt = frames.slice(1).map((f, i) => f - frames[i])
  return {
    frac, frames: frames.length, medianMs: +quantile(dt, .5).toFixed(2), p95Ms: +quantile(dt, .95).toFixed(2),
    longFrames: dt.filter(t => t > 50).length,
    scriptMs: +((after.ScriptDuration - before.ScriptDuration) * 1000).toFixed(1),
    styleMs: +((after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000).toFixed(1),
    layoutMs: +((after.LayoutDuration - before.LayoutDuration) * 1000).toFixed(1),
    diveDraws: d1.dive - d0.dive, heroDraws: d1.hero - d0.hero,
  }
}

async function scenario({ width, height, lite, block, label }) {
  bytes.clear()
  await send('Network.setBlockedURLs', { urls: block || [] })
  await fresh({ width, height, lite })
  await evaluate(`new Promise(resolve => {
    window.__t = { hero: 0, dive: 0 };
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
      for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const fn = type.prototype[name];
        if (!fn || fn.__t) continue;
        const w = function(...a) {
          if (this.canvas.closest('.webgl-backdrop')) window.__t.dive++;
          if (this.canvas.closest('.hero-aquarium')) window.__t.hero++;
          return fn.apply(this, a);
        };
        w.__t = true;
        type.prototype[name] = w;
      }
    }
    resolve(true);
  })`)
  await delay(2500)
  const wins = []
  for (const frac of [0, 0.5, 0.91]) wins.push(await window3s(frac))
  const net = [...bytes.entries()].filter(([k]) => !k.endsWith('#url')).map(([id, n]) => ({ url: (bytes.get(id + '#url') || '').split('/').pop().split('?')[0], bytes: n })).filter(r => r.url && r.bytes > 0).sort((a, b) => b.bytes - a.bytes).slice(0, 14)
  results.push({ label, width, height, lite: !!lite, block: block || [], wins, net, errors: [...errors] })
  console.log('DONE', label, JSON.stringify(wins.map(w => [w.frac, w.medianMs, w.p95Ms, w.diveDraws, w.heroDraws])))
  await writeFile(new URL('audit-dive.json', output), JSON.stringify(results, null, 2))
}

try {
  await scenario({ width: 1440, height: 900, label: '1440-dive-full' })
  await scenario({ width: 1440, height: 900, block: ['*/tree.glb'], label: '1440-dive-no-trees' })
  await scenario({ width: 1440, height: 900, lite: true, label: '1440-dive-lite' })
  await scenario({ width: 390, height: 844, label: '390-dive-full' })
  await scenario({ width: 1024, height: 768, label: '1024-spot' })
} finally {
  socket.removeEventListener('message', onNet)
  await writeFile(new URL('audit-dive.json', output), JSON.stringify(results, null, 2))
  await close()
}
