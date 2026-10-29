import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { fresh, send, socket, evaluate, until, delay, click, close, errors, warnings, approach, activate, unlocked } from './browser.mjs'

const rows=[],requests=[]
await send('Network.enable')
socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url)})
await send('Page.addScriptToEvaluateOnNewDocument',{source:await readFile(new URL('fixtures/early.js',import.meta.url),'utf8')})
async function sample(name){const row=await evaluate(`(()=>{const p=window.__audit,meta=p.renderers.find(m=>m.scene?.deref()&&m.ref.deref()?.domElement.isConnected),r=meta?.ref.deref(),ground=meta?.scene.deref()?.getObjectByName('HilltopGround'),g=ground?.children[0];return {canvasCount:document.querySelectorAll('.webgl-backdrop canvas,.hero-aquarium canvas').length,terrain:g?{id:g.geometry.uuid,vertices:g.geometry.attributes.position.count,map:g.material.map.uuid,width:g.material.map.image.width,repeat:g.material.map.repeat.toArray()}:null,memory:r?{...r.info.memory}:null,programs:r?.info.programs.length,mixers:p.snapshot().mixers,draws:p.contexts[0]?.draws,mode:document.documentElement.dataset.perf}})()`);rows.push({name,...row});return row}
try{
  await fresh({width:390,height:844})
  await evaluate(`scrollTo({top:document.querySelector('#portfolio-dive').offsetHeight*.45,behavior:'instant'})`)
  await until('window.__audit.mixers.length===2')
  await evaluate(`scrollTo({top:0,behavior:'instant'})`)
  await delay(1000)
  const initial=await sample('initial'),ids=initial.mixers.map(m=>m.root).sort();assert.deepEqual(initial.terrain.repeat,[124,124])
  const shadowState=()=>evaluate(`(()=>{const scene=window.__audit.renderers.find(m=>m.scene?.deref()?.getObjectByName('HilltopGround')).scene.deref();return ['StandContactShadow','SignContactShadow'].map(name=>{const m=scene.getObjectByName(name);return {name,geometry:m.geometry.uuid,material:m.material.uuid,map:m.material.map.uuid,parentVisible:m.parent.visible,opacity:m.material.opacity}})})()`)
  const originalShadows=await shadowState();assert.equal(originalShadows[0].map,originalShadows[1].map)
  await evaluate(`(()=>{const meta=window.__audit.renderers.find(m=>m.scene?.deref()?.getObjectByName('HilltopGround')),r=meta.ref.deref(),key=meta.scene.deref().children.find(n=>n.isDirectionalLight),map=key.shadow.map,depth=map.depthTexture,gl=r.getContext(),handle=r.properties.get(depth).__webglTexture;window.__keyCleanup={target:0,depth:0,id:map.texture.uuid};map.addEventListener('dispose',()=>window.__keyCleanup.target++);depth.addEventListener('dispose',()=>window.__keyCleanup.depth++);window.__readKeyCleanup=()=>({...window.__keyCleanup,sameMap:key.shadow.map?.texture.uuid===map.texture.uuid,alive:gl.isTexture(handle),lost:gl.isContextLost()})})()`)
  await evaluate(`(()=>{const scene=window.__audit.renderers.find(m=>m.scene?.deref()?.getObjectByName('HilltopGround')).scene.deref();window.__shadowDisposed=[];const a=scene.getObjectByName('StandContactShadow'),b=scene.getObjectByName('SignContactShadow');for(const r of [a.geometry,b.geometry,a.material,b.material,a.material.map])r.addEventListener('dispose',()=>window.__shadowDisposed.push(r.uuid))})()`)
  for(let i=1;i<=3;i++){
    await approach();await activate();await until(unlocked,25000)
    await until(`document.querySelector('.webgl-backdrop')?.dataset.renderState==='paused'`)
    const parked=await sample(`parked-${i}`);await delay(500);const held=await sample(`held-${i}`)
    assert.ok((await shadowState()).every(s=>!s.parentVisible))
    assert.equal(parked.draws,held.draws)
    assert.deepEqual(parked.mixers,held.mixers)
    await click('.hero__replay');await until(`!(${unlocked})`);await delay(2300)
    const resumed=await sample(`replay-${i}`)
    assert.deepEqual(resumed.mixers.map(m=>m.root).sort(),ids)
    assert.deepEqual(resumed.terrain,initial.terrain)
    assert.deepEqual((await shadowState()).map(({parentVisible,opacity,...s})=>s),originalShadows.map(({parentVisible,opacity,...s})=>s))
    assert.equal((await shadowState())[1].parentVisible,false)
    const key=await evaluate('window.__readKeyCleanup()');assert.deepEqual([key.target,key.depth,key.sameMap,key.alive,key.lost],[0,0,true,true,false]);rows.push({name:`key-replay-${i}`,...key})
  }
  const replayCounts=rows.filter(r=>r.name.startsWith('replay-')).map(r=>r.memory)
  assert.ok(replayCounts.every(r=>r.geometries===replayCounts[0].geometries&&r.textures===replayCounts[0].textures))
  assert.equal(requests.filter(url=>url.endsWith('/minecraft_grass_v2.png')).length,1)
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await until('window.__shadowDisposed.length===5')
  const disposal=await evaluate('window.__shadowDisposed');assert.equal(new Set(disposal).size,5)
  rows.push({name:'live-reduced-shadow-disposal',disposed:disposal})
  const key=await evaluate('window.__readKeyCleanup()');assert.deepEqual([key.target,key.depth,key.alive,key.lost],[1,1,false,true]);rows.push({name:'key-final-disposal',...key})
  const liteStart=requests.length
  await fresh({width:390,height:844,lite:true})
  await delay(1000)
  const lite=await sample('fresh-lite')
  assert.equal(lite.terrain.width,20);assert.deepEqual(lite.terrain.repeat,[124,124])
  assert.equal(lite.mixers.length,0)
  assert.equal(requests.slice(liteStart).filter(url=>/golem|chicken_jockey/.test(url)).length,0)
  const reducedStart=requests.length
  await fresh({width:390,height:844,reduced:true})
  const reduced=await sample('fresh-reduced')
  assert.equal(reduced.canvasCount,0)
  assert.equal(reduced.mixers.length,0)
  assert.equal(requests.slice(reducedStart).filter(url=>/minecraft_grass_v2|golem|chicken_jockey/.test(url)).length,0)
  assert.equal(errors.length,0,JSON.stringify(errors))
  console.log('PASS three mobile replays reuse terrain, tile, and both mixers; parked scene stops drawing and advancing mixers; fresh Lite skips characters; Reduced Motion skips WebGL and grass')
}finally{
  await writeFile(new URL('measurements/ground-lifecycle.json',import.meta.url),JSON.stringify({rows,requests,errors,warnings},null,2))
  await close()
}
