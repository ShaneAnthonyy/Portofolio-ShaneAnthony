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
const hill = r => /grass_ground_.*\.(jpg|png|webp)$/.test(r.url)

try {
  await send('Network.clearBrowserCache').catch(() => {})
  seen.length = 0
  await fresh({ width: 1440, height: 900 })
  await delay(4500)
  const timing = await evaluate(`(performance.getEntriesByType('resource').filter(e => /grass_ground_/.test(e.name)).map(e => ({ url: e.name.split('/').pop(), transfer: e.transferSize, decoded: e.decodedBodySize })))`)
  report.cold = { requests: seen.filter(hill).map(r => r.url.split('/').pop() + ' ' + r.status), timing }
  console.log('COLD', JSON.stringify(report.cold))

  const hook = `window.__t = { dive: 0 };
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) for (const n of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']) {
      const fn = type.prototype[n]; if (!fn || fn.__t) continue;
      const w = function(...a) { if (this.canvas.closest('.webgl-backdrop')) window.__t.dive++; return fn.apply(this, a); };
      w.__t = true; type.prototype[n] = w;
    }`
  await evaluate(`(async () => { ${hook} })()`)
  const wins = []
  for (const frac of [0, 0.5, 0.91]) {
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
    wins.push({ frac, medianMs: +quantile(dt, .5).toFixed(2), p95Ms: +quantile(dt, .95).toFixed(2), longFrames: dt.filter(t => t > 50).length, scriptMs: +((after.ScriptDuration - before.ScriptDuration) * 1000).toFixed(1), styleMs: +((after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000).toFixed(1), diveDraws: d1 - d0 })
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
    await writeFile(new URL(`prod-1440-${String(frac).replace('.', '')}.jpg`, output), Buffer.from(data, 'base64'))
  }
  report.cold.wins = wins
  console.log('WINS', JSON.stringify(wins.map(w => [w.frac, w.medianMs, w.p95Ms, w.diveDraws])))
  const H = `document.querySelector('#portfolio-dive').offsetHeight`
  await evaluate(`window.scrollTo({top: ${H} * 0.40, behavior: 'instant'})`)
  await delay(600)
  for (let i = 0; i < 5; i++) {
    await evaluate(`window.scrollTo({top: ${H} * (0.40 + ${(i + 1) * 0.025}), behavior: 'instant'})`)
    await delay(450)
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 })
    await writeFile(new URL(`prod-fwdf${i}.jpg`, output), Buffer.from(data, 'base64'))
  }
  for (let i = 0; i < 5; i++) {
    await evaluate(`window.scrollTo({top: ${H} * (0.525 - ${(i + 1) * 0.025}), behavior: 'instant'})`)
    await delay(450)
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 })
    await writeFile(new URL(`prod-revf${i}.jpg`, output), Buffer.from(data, 'base64'))
  }
  console.log('MOTION done')

  seen.length = 0
  await fresh({ width: 1440, height: 900 })
  await delay(4500)
  report.warm = { requests: seen.filter(hill).map(r => r.url.split('/').pop() + ' ' + r.status) }
  console.log('WARM', JSON.stringify(report.warm))

  seen.length = 0
  await fresh({ width: 1440, height: 900, lite: true })
  await delay(4000)
  report.lite = { hill: seen.filter(hill).map(r => r.url.split('/').pop() + ' ' + r.status) }
  console.log('LITE', JSON.stringify(report.lite))

  seen.length = 0
  await fresh({ width: 390, height: 844 })
  await delay(4000)
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * 0.5, behavior: 'instant'})`)
  await delay(800)
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
  await writeFile(new URL('prod-390-p05.jpg', output), Buffer.from(data, 'base64'))
  report.mobile = { requests: seen.filter(hill).map(r => r.url.split('/').pop() + ' ' + r.status) }
  console.log('MOBILE', JSON.stringify(report.mobile))
  report.errors = [...errors]
  await writeFile(new URL('integration.json', output), JSON.stringify(report, null, 2))
} finally {
  socket.removeEventListener('message', onNet)
  await close()
}
