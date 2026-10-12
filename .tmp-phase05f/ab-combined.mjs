import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fresh, send, socket, evaluate, delay, close, errors } from '../scripts/dive-browser.mjs'

const output = new URL('./shots/', import.meta.url)
await mkdir(output, { recursive: true })
const MAPS = {
  'diff_2k.jpg': './diff_1024_q90.webp',
  'rough_2k.png': './rough_1024_lossless.webp',
  'ao_2k.jpg': './ao_1024_lossless.webp',
}
const blobs = {}
for (const [k, f] of Object.entries(MAPS)) blobs[k] = (await readFile(new URL(f, import.meta.url))).toString('base64')
socket.addEventListener('message', async e => {
  const m = JSON.parse(e.data)
  if (m.method !== 'Fetch.requestPaused') return
  const hit = Object.keys(blobs).find(k => m.params.request.url.endsWith(k))
  if (hit) {
    await send('Fetch.fulfillRequest', {
      requestId: m.params.requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'image/webp' }],
      body: blobs[hit],
    })
  } else await send('Fetch.continueRequest', { requestId: m.params.requestId })
})
await send('Fetch.enable', { patterns: [{ urlPattern: '*grass_ground_*' }] })
await send('Network.clearBrowserCache').catch(() => {})
await fresh({ width: 1440, height: 900 })
await delay(4500)
for (const [label, frac] of [['p0', 0], ['p05', 0.5], ['p091', 0.91]]) {
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * ${frac}, behavior: 'instant'})`)
  await delay(900)
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
  await writeFile(new URL(`combo-${label}.jpg`, output), Buffer.from(data, 'base64'))
  console.log('SHOT', `combo-${label}`)
}
const H = `document.querySelector('#portfolio-dive').offsetHeight`
await evaluate(`window.scrollTo({top: ${H} * 0.40, behavior: 'instant'})`)
await delay(600)
for (let i = 0; i < 5; i++) {
  await evaluate(`window.scrollTo({top: ${H} * (0.40 + ${(i + 1) * 0.025}), behavior: 'instant'})`)
  await delay(450)
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 })
  await writeFile(new URL(`combo-fwd${i}.jpg`, output), Buffer.from(data, 'base64'))
}
for (let i = 0; i < 5; i++) {
  await evaluate(`window.scrollTo({top: ${H} * (0.525 - ${(i + 1) * 0.025}), behavior: 'instant'})`)
  await delay(450)
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 })
  await writeFile(new URL(`combo-rev${i}.jpg`, output), Buffer.from(data, 'base64'))
}
console.log('MOTION fwd+rev done')
await send('Fetch.disable')
await close()
console.log('ERRORS', JSON.stringify(errors))
