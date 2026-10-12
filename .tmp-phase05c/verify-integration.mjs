import { writeFile, mkdir } from 'node:fs/promises'
import { fresh, send, socket, evaluate, delay, close, errors } from '../scripts/dive-browser.mjs'

const output = new URL('./', import.meta.url)
await mkdir(output, { recursive: true })
await send('Network.enable')
await send('Performance.enable')
const seen = []
const onNet = e => {
  const m = JSON.parse(e.data)
  if (m.method === 'Network.responseReceived') seen.push({ url: m.params.response.url, status: m.params.response.status })
}
socket.addEventListener('message', onNet)
const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]))
const quantile = (a, p) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]
const report = {}

async function draws3s(frac) {
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
  const after = await metrics()
  const dt = frames.slice(1).map((f, i) => f - frames[i])
  return {
    frac, frames: frames.length, medianMs: +quantile(dt, .5).toFixed(2), p95Ms: +quantile(dt, .95).toFixed(2),
    longFrames: dt.filter(t => t > 50).length,
    scriptMs: +((after.ScriptDuration - before.ScriptDuration) * 1000).toFixed(1),
    styleMs: +((after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000).toFixed(1),
    diveDraws: d1.dive - d0.dive, heroDraws: d1.hero - d0.hero,
  }
}
const hook = `window.__t = { hero: 0, dive: 0 };
  for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
    for (const n of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']) {
      const fn = type.prototype[n]; if (!fn || fn.__t) continue;
      const w = function(...a) {
        if (this.canvas.closest('.webgl-backdrop')) window.__t.dive++;
        if (this.canvas.closest('.hero-aquarium')) window.__t.hero++;
        return fn.apply(this, a);
      };
      w.__t = true; type.prototype[n] = w;
    }
  }`

try {
  seen.length = 0
  await fresh({ width: 1440, height: 900 })
  await evaluate(`(async () => { ${hook} })()`)
  await delay(4000)
  const treeReqs = seen.filter(r => /tree(-lite|-opt-150k-1024)?\.glb/.test(r.url))
  const timing = await evaluate(`(performance.getEntriesByType('resource').filter(e => /tree.*\.glb/.test(e.name)).map(e => ({ url: e.name.split('/').pop(), duration: +e.duration.toFixed(1), transfer: e.transferSize, decoded: e.decodedBodySize })))`)
  report.normal = {
    treeRequests: treeReqs.map(r => r.url.split('/').pop() + ' ' + r.status),
    origTreeHits: treeReqs.filter(r => r.url.endsWith('/tree.glb')).length,
    optHits: treeReqs.filter(r => r.url.endsWith('tree-opt-150k-1024.glb')).length,
    timing,
  }
  console.log('NORMAL', JSON.stringify(report.normal))
  const wins = []
  for (const frac of [0, 0.5, 0.91]) {
    wins.push(await draws3s(frac))
    await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * ${frac}, behavior: 'instant'})`)
    await delay(700)
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
    await writeFile(new URL(`prod-1440-${String(frac).replace('.', '')}.jpg`, output), Buffer.from(data, 'base64'))
  }
  report.normal.wins = wins
  console.log('WINS', JSON.stringify(wins.map(w => [w.frac, w.medianMs, w.p95Ms, w.diveDraws])))

  seen.length = 0
  await fresh({ width: 1440, height: 900, lite: true })
  await delay(4000)
  const liteReqs = seen.filter(r => /tree(-lite|-opt-150k-1024)?\.glb/.test(r.url))
  report.lite = {
    treeRequests: liteReqs.map(r => r.url.split('/').pop() + ' ' + r.status),
    liteHits: liteReqs.filter(r => r.url.endsWith('tree-lite.glb')).length,
    optHits: liteReqs.filter(r => r.url.endsWith('tree-opt-150k-1024.glb')).length,
  }
  console.log('LITE', JSON.stringify(report.lite))

  seen.length = 0
  await fresh({ width: 390, height: 844 })
  await delay(4000)
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * 0.5, behavior: 'instant'})`)
  await delay(800)
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
  await writeFile(new URL('prod-390-p05.jpg', output), Buffer.from(data, 'base64'))
  report.mobile = { treeRequests: seen.filter(r => /tree(-lite|-opt-150k-1024)?\.glb/.test(r.url)).map(r => r.url.split('/').pop() + ' ' + r.status) }
  console.log('MOBILE', JSON.stringify(report.mobile))
  report.errors = [...errors]
  await writeFile(new URL('integration.json', output), JSON.stringify(report, null, 2))
} finally {
  socket.removeEventListener('message', onNet)
  await close()
}
