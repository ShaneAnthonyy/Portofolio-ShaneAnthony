import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {fresh,send,socket,evaluate,until,delay,click,approach,activate,unlocked,close,errors,warnings} from './browser.mjs'

const rows=[]
await send('Network.setCacheDisabled',{cacheDisabled:true})
// Capture the public React root in the test response, without a production debug API.
socket.addEventListener('message',async event=>{
 const m=JSON.parse(event.data);if(m.method!=='Fetch.requestPaused')return
 const {requestId,responseHeaders}=m.params
 try{
  const {body,base64Encoded}=await send('Fetch.getResponseBody',{requestId}),source=base64Encoded?Buffer.from(body,'base64').toString():body,pattern=/[\w$]+\.createRoot\(document\.getElementById\("root"\)\)/g
  assert.equal([...source.matchAll(pattern)].length,1,'one public application root')
  const changed=source.replace(pattern,root=>`(window.__testRoot=${root})`)
  await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:responseHeaders.filter(h=>!/^content-(length|encoding)$/i.test(h.name)),body:Buffer.from(changed).toString('base64')})
 }catch(e){errors.push(String(e));await send('Fetch.continueRequest',{requestId})}
})
await send('Fetch.enable',{patterns:[{urlPattern:'*/assets/index-*.js',requestStage:'Response'}]})
await send('Page.addScriptToEvaluateOnNewDocument',{source:await readFile(new URL('fixtures/early.js',import.meta.url),'utf8')})
await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
 const R=ResizeObserver;window.__resizeRecords=[];window.ResizeObserver=class extends R{constructor(cb){super(cb);this.meta={targets:[]};window.__resizeRecords.push(this.meta)}observe(el,...a){this.meta.targets.push(new WeakRef(el));return super.observe(el,...a)}disconnect(){this.meta.targets=[];return super.disconnect()}};
 window.__ownedDisposals={};window.__ownedSeen=new WeakSet();
 window.__recordOwned=()=>{const meta=window.__audit.renderers.find(m=>m.ref.deref()?.domElement.isConnected&&m.scene?.deref()),scene=meta.scene.deref(),resources=new Set();scene.traverse(n=>{if(n.geometry)resources.add(n.geometry);if(n.isInstancedMesh)resources.add(n);for(const m of n.material?[].concat(n.material):[]){resources.add(m);for(const t of Object.values(m))if(t?.isTexture)resources.add(t)}});for(const resource of resources){if(window.__ownedSeen.has(resource))continue;window.__ownedSeen.add(resource);const id=resource.uuid;window.__ownedDisposals[id]=0;resource.addEventListener('dispose',()=>window.__ownedDisposals[id]++)}return [...resources].map(r=>r.uuid)};
})()`})
async function sample(name){await send('HeapProfiler.collectGarbage');await delay(300);const audit=await evaluate('window.__audit.snapshot()');rows.push({name,audit});return audit}
async function released(name,ids){await until(`window.__audit.snapshot().contexts.every(c=>c.connected||c.collected||c.lost)`);const a=await sample(name);assert.equal(a.contexts.filter(c=>!c.connected&&!c.collected&&!c.lost).length,0,'no detached live contexts');const d=await evaluate('window.__ownedDisposals');for(const id of ids)assert.equal(d[id],1,'owned resource disposed exactly once: '+id);const draws=a.contexts.map(c=>c.draws);await delay(700);const held=await sample(name+'-held');assert.deepEqual(held.contexts.map(c=>c.draws),draws,'destroyed renderers never draw');assert.equal(held.renderers.filter(r=>!r.connected&&!r.collected).length,0,'disposed renderer wrappers are collectible, not retained by shared texture callbacks');assert.equal(await evaluate(`window.__resizeRecords.filter(m=>m.targets.some(r=>r.deref()?.classList.contains('webgl-backdrop'))).length`),0,'Dive ResizeObserver disconnected');return held}
try{
 await fresh();assert.ok(await evaluate('window.__testRoot?.unmount instanceof Function'))
 for(let round=0;round<3;round++){
  if(round){await click('.hero__replay');await until(`!(${unlocked})`);await delay(2200)}
  await evaluate(`scrollTo({top:document.querySelector('#portfolio-dive').offsetHeight*.55,behavior:'instant'})`);await delay(1100)
  await evaluate(`scrollTo({top:0,behavior:'instant'})`);await delay(800)
  await sample('normal-'+round);const ids=await evaluate('window.__recordOwned()')
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await until(`document.querySelectorAll('.webgl-backdrop canvas,.hero-aquarium canvas').length===0`);await released('reduced-'+round,ids)
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await until(`!!document.querySelector('.webgl-backdrop canvas')`);await delay(1400)
  const a=await sample('reentry-'+round);assert.equal(a.contexts.filter(c=>!c.collected&&!c.lost&&!c.connected).length,0)
 }
 await click('.hero__replay');await until(`!(${unlocked})`);await delay(2200)
 const diveId=(await sample('before-lite')).contexts.find(c=>c.host==='webgl-backdrop').id
 for(const mode of ['lite','normal']){await click('.lite-toggle');await delay(1600);const a=await sample(mode);assert.equal(a.contexts.find(c=>c.id===diveId).lost,false,'Lite preserves reusable Dive context');assert.equal(a.contexts.find(c=>c.id===diveId).connected,true)}
 await send('Emulation.setFocusEmulationEnabled',{enabled:false});await send('Page.setWebLifecycleState',{state:'frozen'});await delay(300);await send('Page.setWebLifecycleState',{state:'active'});await send('Emulation.setFocusEmulationEnabled',{enabled:true});await until('!document.hidden');await delay(600)
 assert.equal((await sample('resumed')).contexts.find(c=>c.id===diveId).lost,false,'tab hiding does not destroy Dive')
 await approach();await activate();await until(unlocked);await until(`document.querySelector('.webgl-backdrop').dataset.renderState==='paused'`)
 const parked=await sample('parked');await delay(500);const held=await sample('parked-held');assert.equal(parked.contexts[diveId].draws,held.contexts[diveId].draws);assert.equal(held.contexts[diveId].lost,false)
 await click('.hero__replay');await until(`!(${unlocked})`);await delay(2300);assert.equal((await sample('replay')).contexts.find(c=>c.id===diveId).connected,true)
 const ids=await evaluate('window.__recordOwned()');await evaluate('window.__testRoot.unmount();delete window.__testRoot');await until(`document.querySelector('#root').childElementCount===0`);await released('app-unmount',ids)
 await fresh();await approach();await activate();await until(unlocked);await sample('fresh-after-unmount')
 assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS three Reduced Motion roundtrips release contexts/resources exactly once; Lite, visibility, parking, replay, final app unmount and fresh re-entry')
}finally{await writeFile(new URL('measurements/context-lifecycle.json',import.meta.url),JSON.stringify({rows,errors,warnings},null,2));await close()}
