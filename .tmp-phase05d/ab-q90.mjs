import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fresh, send, socket, evaluate, delay, close, errors } from '../scripts/dive-browser.mjs'

const output = new URL('./shots/', import.meta.url)
await mkdir(output, { recursive: true })
const bytes = await readFile(new URL('./nor_512_q90.webp', import.meta.url))
let active = true
socket.addEventListener('message', async e => {
  const m = JSON.parse(e.data)
  if (m.method !== 'Fetch.requestPaused') return
  if (active && /nor_gl_2k\.png$/.test(m.params.request.url)) {
    await send('Fetch.fulfillRequest', {
      requestId: m.params.requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'image/webp' }],
      body: bytes.toString('base64'),
    })
  } else await send('Fetch.continueRequest', { requestId: m.params.requestId })
})
await send('Fetch.enable', { patterns: [{ urlPattern: '*nor_gl_2k.png' }] })
await send('Network.clearBrowserCache').catch(() => {})
await fresh({ width: 1440, height: 900 })
await delay(4500)
for (const [label, frac] of [['p0', 0], ['p05', 0.5], ['p091', 0.91]]) {
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * ${frac}, behavior: 'instant'})`)
  await delay(900)
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
  await writeFile(new URL(`q90-${label}.jpg`, output), Buffer.from(data, 'base64'))
  console.log('SHOT', `q90-${label}`)
}
await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * 0.45, behavior: 'instant'})`)
await delay(600)
for (let i = 0; i < 3; i++) {
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * (0.45 + ${(i + 1) * 0.03}), behavior: 'instant'})`)
  await delay(450)
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 })
  await writeFile(new URL(`q90-motion${i}.jpg`, output), Buffer.from(data, 'base64'))
}
await send('Fetch.disable')
await close()
console.log('ERRORS', JSON.stringify(errors))
