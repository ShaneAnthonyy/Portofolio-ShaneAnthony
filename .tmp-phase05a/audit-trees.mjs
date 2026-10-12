import { writeFile, mkdir } from 'node:fs/promises'
import { fresh, approach, activate, until, unlocked, send, socket, evaluate, delay, scroll, close, errors } from '../scripts/dive-browser.mjs'

const output = new URL('./', import.meta.url)
await mkdir(output, { recursive: true })
await send('Network.enable')
const net = []
const onNet = e => {
  const m = JSON.parse(e.data)
  if (m.method === 'Network.responseReceived') net.push(m.params.response)
  if (m.method === 'Network.loadingFinished') {
    const r = net.find(r => r.requestId === m.params.requestId)
    if (r) r.encodedBytes = m.params.encodedDataLength
  }
}
socket.addEventListener('message', onNet)
const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]))
const quantile = (a, p) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]
const results = []

async function scenario({ width, height, lite, blockTrees, label }) {
  net.length = 0
  if (blockTrees) {
    await send('Network.setBlockedURLs', { urls: ['*/tree.glb', '*/tree-lite.glb'] })
  } else {
    await send('Network.setBlockedURLs', { urls: [] })
  }
  await fresh({ width, height, lite })
  await send('Performance.enable')
  const draws = await evaluate(`new Promise(resolve => {
    window.__t = { hero: 0, dive: 0 };
    const seen = new WeakSet();
    let tris = 0;
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
  await approach()
  await activate()
  await until(unlocked)
  await delay(1500)
  const before = await metrics()
  const frames = await evaluate(`new Promise(resolve => {
    const out = []; let start;
    const tick = now => {
      start ??= now;
      out.push({ t: now, y: scrollY });
      if (now - start < 5000) requestAnimationFrame(tick); else resolve(out);
    };
    requestAnimationFrame(tick);
  })`)
  const after = await metrics()
  const dt = frames.slice(1).map((f, i) => f.t - frames[i].t)
  const counts = await evaluate('({...window.__t})')
  const treeBytes = net.filter(r => /tree(-lite)?\.glb/.test(r.url)).map(r => ({ url: r.url.split('/').pop(), mime: r.mimeType, wire: r.encodedBytes }))
  const big = net.filter(r => (r.encodedBytes || 0) > 500000).map(r => ({ url: r.url.split('/').pop(), wire: r.encodedBytes })).slice(0, 12)
  results.push({
    label, width, height, lite: !!lite, blockTrees: !!blockTrees,
    frames: frames.length, medianMs: +quantile(dt, .5).toFixed(2), p95Ms: +quantile(dt, .95).toFixed(2),
    longFrames: dt.filter(t => t > 50).length,
    scriptMs: +((after.ScriptDuration - before.ScriptDuration) * 1000).toFixed(1),
    layoutMs: +((after.LayoutDuration - before.LayoutDuration) * 1000).toFixed(1),
    styleMs: +((after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000).toFixed(1),
    draws: counts, treeBytes, big, errors: [...errors],
  })
  console.log('DONE', label, JSON.stringify(results.at(-1)))
  await writeFile(new URL('audit-results.json', output), JSON.stringify(results, null, 2))
}

try {
  await scenario({ width: 1440, height: 900, label: '1440-normal-full' })
  await scenario({ width: 1440, height: 900, blockTrees: true, label: '1440-normal-no-trees' })
  await scenario({ width: 1440, height: 900, lite: true, label: '1440-lite' })
  await scenario({ width: 390, height: 844, label: '390-normal-full' })
  await scenario({ width: 390, height: 844, lite: true, label: '390-lite' })
  await scenario({ width: 768, height: 1024, label: '768-spot' })
  await scenario({ width: 1920, height: 1080, label: '1920-spot' })
} finally {
  socket.removeEventListener('message', onNet)
  await writeFile(new URL('audit-results.json', output), JSON.stringify(results, null, 2))
  await close()
}
