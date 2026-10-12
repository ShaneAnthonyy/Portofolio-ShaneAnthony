import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fresh, send, socket, evaluate, delay, close, errors } from '../scripts/dive-browser.mjs'

const output = new URL('./shots/', import.meta.url)
await mkdir(output, { recursive: true })
const CANDS = {
  original: null,
  n1: { file: './nor_2048_lossless.webp', mime: 'image/webp' },
  n2: { file: './nor_512_lossless.webp', mime: 'image/webp' },
  n2b: { file: './nor_512_browser.png', mime: 'image/png' },
}
for (const [k, v] of Object.entries(CANDS)) if (v) v.bytes = await readFile(new URL(v.file, import.meta.url))
let active = null
socket.addEventListener('message', async e => {
  const m = JSON.parse(e.data)
  if (m.method !== 'Fetch.requestPaused') return
  if (active && /nor_gl_2k\.png$/.test(m.params.request.url)) {
    await send('Fetch.fulfillRequest', {
      requestId: m.params.requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: active.mime }],
      body: active.bytes.toString('base64'),
    })
  } else await send('Fetch.continueRequest', { requestId: m.params.requestId })
})
await send('Fetch.enable', { patterns: [{ urlPattern: '*nor_gl_2k.png' }] })
const log = []
for (const [name, cand] of Object.entries(CANDS)) {
  active = cand
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
  await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * 0.45, behavior: 'instant'})`)
  await delay(600)
  for (let i = 0; i < 3; i++) {
    await evaluate(`window.scrollTo({top: document.querySelector('#portfolio-dive').offsetHeight * (0.45 + ${(i + 1) * 0.03}), behavior: 'instant'})`)
    await delay(450)
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 })
    await writeFile(new URL(`${name}-motion${i}.jpg`, output), Buffer.from(data, 'base64'))
  }
  console.log('MOTION', name)
  log.push({ candidate: name, errors: [...errors] })
}
await send('Fetch.disable')
await writeFile(new URL('../ab-normal.json', output), JSON.stringify({ log, errors }, null, 2))
await close()
console.log('ERRORS', JSON.stringify(errors))
