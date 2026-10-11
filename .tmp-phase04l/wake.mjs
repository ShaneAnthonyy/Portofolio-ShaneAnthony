import {send,evaluate,socket} from '../scripts/dive-browser.mjs'
await send('Page.setWebLifecycleState', { state: 'active' })
await send('Emulation.setFocusEmulationEnabled', { enabled: true })
console.log(await evaluate('document.visibilityState'))
socket.close()
