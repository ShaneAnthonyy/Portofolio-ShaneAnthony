import { fresh, send, socket, delay, close } from '../scripts/dive-browser.mjs'

await send('Network.enable')
const seen = []
const onNet = e => {
  const m = JSON.parse(e.data)
  if (m.method === 'Network.responseReceived') seen.push(m.params.response.url.split('/').pop() + ' ' + m.params.response.status)
  if (m.method === 'Network.requestWillBeSent' && /grass_ground/.test(m.params.request.url)) seen.push('REQ ' + m.params.request.url.split('/').pop())
}
socket.addEventListener('message', onNet)
await send('Network.clearBrowserCache').catch(() => {})
await fresh({ width: 1440, height: 900 })
await delay(6000)
const counts = {}
seen.forEach(s => { counts[s] = (counts[s] || 0) + 1 })
console.log(JSON.stringify(counts, null, 1))
socket.removeEventListener('message', onNet)
await close()
