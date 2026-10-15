import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {send,evaluate,until,delay,click,close,errors} from './browser.mjs'
const rows=[]
const record=async label=>{const s=await evaluate(`({loading:!!document.querySelector('.loading-screen'),ready:!!document.querySelector('.loading-screen__enter'),...window.__qa.snapshot()})`);rows.push({label,...s});console.log(label,JSON.stringify({time:s.now,mixers:s.mixers,loading:s.loading,actors:s.actors.map(a=>({kind:a.kind,time:a.time,position:a.position}))}));return s}
try{
 await send('Network.enable');await send('Network.clearBrowserCache');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:4173/'})
 await until(`performance.getEntriesByType('resource').some(r=>r.name.includes('BufferGeometryUtils-'))`,90000);await evaluate(await readFile(new URL('instrument.js',import.meta.url),'utf8'));await until('!!window.__qa.renderer');await record('initial-render')
 await until('window.__qa.actors().length===2',90000);await record('both-actors-loaded')
 await until(`!!document.querySelector('.loading-screen__enter')`,90000);const ready=await record('ready');await delay(10000);const held=await record('ready-held-ten-seconds');assert.equal(held.mixers,0);assert.deepEqual(held.actors,ready.actors)
 await click('.loading-screen__enter');await until('window.__qa.mixers.length===2');const entered=await record('entered');assert.ok(entered.actors.every(a=>a.time<.5));await evaluate('window.__qa.recording=true');await delay(15200);const end=await record('complete-real-time');const samples=await evaluate('(window.__qa.recording=false,window.__qa.samples)');assert.equal(end.actors.find(a=>a.kind==='chicken').visible,false);assert.ok(end.actors.find(a=>a.kind==='golem').time>14.5);rows.push({samples})
 assert.equal(await evaluate(`typeof window.__charRigs+','+typeof window.__diveCamera+','+typeof window.__diveStats`),'undefined,undefined,undefined');assert.equal(errors.filter(e=>!String(e.url).endsWith('/favicon.ico')).length,0,JSON.stringify(errors))
}finally{await writeFile(new URL('measurements/startup.json',import.meta.url),JSON.stringify({rows,errors},null,2));await close()}
