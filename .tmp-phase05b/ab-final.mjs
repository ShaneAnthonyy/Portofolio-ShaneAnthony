import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fresh, send, socket, evaluate, delay, close, errors } from '../scripts/dive-browser.mjs'

const output = new URL('./shots/', import.meta.url)
await mkdir(output, { recursive: true })
const bytes1024 = await readFile(new URL('./tree-opt-150k-1024.glb', import.meta.url))
let active = bytes1024
socket.addEventListener('message', async e => {
  const m = JSON.parse(e.data)
  if (m.method !== 'Fetch.requestPaused') return
  if (/\/tree\.glb$/.test(m.params.request.url)) {
    await send('Fetch.fulfillRequest', {
      requestId: m.params.requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'model/gltf-binary' }],
      body: active.toString('base64'),
    })
  } else await send('Fetch.continueRequest', { requestId: m.params.requestId })
})
await send('Fetch.enable', { patterns: [{ urlPattern: '*/tree.glb' }] })
await send('Network.clearBrowserCache').catch(() => {})
await fresh({ width: 1440, height: 900 })
await delay(4000)
const timing = await evaluate(`(performance.getEntriesByType('resource').find(e => e.name.endsWith('tree.glb')) || {})`)
for (const [label, frac] of [['p0', 0], ['p05', 0.5], ['p091', 0.91]]) {
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * ${frac}, behavior: 'instant'})`)
  await delay(900)
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
  await writeFile(new URL(`opt-150k-1024-${label}.jpg`, output), Buffer.from(data, 'base64'))
  console.log('SHOT', label)
}
await evaluate(`new Promise(res => {
  window.__t = { dive: 0 };
  for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) for (const n of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']) {
    const fn = type.prototype[n]; if (!fn || fn.__t) continue;
    const w = function(...a) { if (this.canvas.closest('.webgl-backdrop')) window.__t.dive++; return fn.apply(this, a); };
    w.__t = true; type.prototype[n] = w;
  }
  res(true);
})`)
await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * 0.5, behavior: 'instant'})`)
await delay(800)
const d0 = await evaluate('window.__t.dive')
await delay(3000)
const d1 = await evaluate('window.__t.dive')
console.log('DRAWS3S', d1 - d0, 'RESTIMING', JSON.stringify({ duration: timing.duration, transferSize: timing.transferSize }))
await writeFile(new URL('../ab-final.json', output), JSON.stringify({ draws3s: d1 - d0, timing: { duration: timing.duration, transferSize: timing.transferSize }, errors }, null, 2))
await send('Fetch.disable')
await close()
console.log('ERRORS', JSON.stringify(errors))
