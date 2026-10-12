import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fresh, send, socket, evaluate, delay, close, errors } from '../scripts/dive-browser.mjs'

const output = new URL('./shots/', import.meta.url)
await mkdir(output, { recursive: true })
const webp = await readFile(new URL('./fish_a-webp.glb', import.meta.url))
let active = false
socket.addEventListener('message', async e => {
  const m = JSON.parse(e.data)
  if (m.method !== 'Fetch.requestPaused') return
  if (active && m.params.request.url.endsWith('/fish_a.glb')) {
    await send('Fetch.fulfillRequest', {
      requestId: m.params.requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'model/gltf-binary' }],
      body: webp.toString('base64'),
    })
  } else await send('Fetch.continueRequest', { requestId: m.params.requestId })
})
await send('Fetch.enable', { patterns: [{ urlPattern: '*/fish_a.glb' }] })

for (const name of ['orig', 'webp']) {
  active = name === 'webp'
  await send('Network.clearBrowserCache').catch(() => {})
  await fresh({ width: 1440, height: 900 })
  await delay(4500)
  for (const [label, frac] of [['p0', 0], ['p05', 0.5], ['p091', 0.91]]) {
    await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * ${frac}, behavior: 'instant'})`)
    await delay(900)
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
    await writeFile(new URL(`${name}-${label}.jpg`, output), Buffer.from(data, 'base64'))
    console.log('SHOT', `${name}-${label}`)
  }
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * 0.3, behavior: 'instant'})`)
  await delay(600)
  for (let i = 0; i < 4; i++) {
    await delay(700)
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 })
    await writeFile(new URL(`${name}-swim${i}.jpg`, output), Buffer.from(data, 'base64'))
  }
  console.log('SWIM', name, 'errors:', JSON.stringify(errors))
}
await send('Fetch.disable')
await writeFile(new URL('../ab-fish.json', output), JSON.stringify({ errors }, null, 2))
await close()
console.log('ERRORS', JSON.stringify(errors))
