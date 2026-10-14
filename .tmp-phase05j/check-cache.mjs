import {writeFile} from 'node:fs/promises'
import {fresh,send,socket,evaluate,delay,close} from './browser.mjs'
let responses=[]
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.responseReceived'&&/grass_ground|fish_a/.test(m.params.response.url))responses.push(m.params.response)})
await send('Network.enable')
await send('Network.setCacheDisabled',{cacheDisabled:false})
await send('Network.clearBrowserCache')
const rows=[]
try{for(const label of ['cold','warm']){responses=[];await fresh();await delay(1500);rows.push({label,responses,timing:await evaluate(`performance.getEntriesByType('resource').filter(r=>/grass_ground|fish_a/.test(r.name)).map(r=>({name:r.name,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize}))`)});console.log(label,JSON.stringify(responses.map(r=>({url:r.url,status:r.status,cache:r.fromDiskCache}))))}await writeFile(new URL('./measurements/cache-diagnostic.json',import.meta.url),JSON.stringify(rows,null,2))}finally{await close()}
