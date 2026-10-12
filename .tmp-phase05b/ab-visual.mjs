import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fresh, until, send, socket, evaluate, delay, close, errors } from '../scripts/dive-browser.mjs'

const output = new URL('./shots/', import.meta.url)
await mkdir(output, { recursive: true })
const CANDS = {
  original: null,
  'opt-250k': await readFile(new URL('./tree-opt-250k.glb', import.meta.url)),
  'opt-150k': await readFile(new URL('./tree-opt-150k.glb', import.meta.url)),
}
let active = null
socket.addEventListener('message', async e => {
  const m = JSON.parse(e.data)
  if (m.method !== 'Fetch.requestPaused') return
  const url = m.params.request.url
  if (active && /\/tree\.glb$/.test(url)) {
    await send('Fetch.fulfillRequest', {
      requestId: m.params.requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'model/gltf-binary' }],
      body: active.toString('base64'),
    })
  } else {
    await send('Fetch.continueRequest', { requestId: m.params.requestId })
  }
})
await send('Fetch.enable', { patterns: [{ urlPattern: '*/tree.glb' }] })

const shots = []
for (const [name, bytes] of Object.entries(CANDS)) {
  active = bytes
  await send('Network.clearBrowserCache').catch(() => {})
  await fresh({ width: 1440, height: 900 })
  await delay(4000)
  const timing = await evaluate(`(performance.getEntriesByName('/aquarium/environment/tree.glb')[0] || performance.getEntriesByType('resource').find(e => e.name.endsWith('tree.glb')) || {})`)
  for (const [label, frac, w, h] of [['p0', 0, 1440, 900], ['p05', 0.5, 1440, 900], ['p091', 0.91, 1440, 900]]) {
    await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * ${frac}, behavior: 'instant'})`)
    await delay(900)
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
    const file = `${name}-${label}.jpg`
    await writeFile(new URL(file, output), Buffer.from(data, 'base64'))
    shots.push({ candidate: name, label, file, timing: { duration: timing.duration, transferSize: timing.transferSize, decodedBodySize: timing.decodedBodySize } })
    console.log('SHOT', file)
  }
}
active = null
await fresh({ width: 1440, height: 900, lite: true })
await delay(4000)
for (const [label, frac] of [['p0', 0], ['p05', 0.5], ['p091', 0.91]]) {
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * ${frac}, behavior: 'instant'})`)
  await delay(900)
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
  const file = `lite-${label}.jpg`
  await writeFile(new URL(file, output), Buffer.from(data, 'base64'))
  shots.push({ candidate: 'lite', label, file })
  console.log('SHOT', file)
}
await writeFile(new URL('../shots.json', output), JSON.stringify({ shots, errors }, null, 2))
await send('Fetch.disable')
await close()
console.log('ERRORS', JSON.stringify(errors))
