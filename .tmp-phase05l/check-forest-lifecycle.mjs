import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {fresh,send,socket,evaluate,until,delay,click,close,errors,approach,activate,unlocked} from './browser.mjs'
const requests=[],checks=[]
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.requestWillBeSent'&&m.params.request.url.endsWith('/cherry_blossom-opt.glb'))requests.push(m.params.request.url)})
await send('Network.enable')
const state=()=>evaluate(`(()=>{const p=window.__forestLife;if(!p.ground)return null;const trees=p.ground.children.filter(g=>{let found=false;g.traverse(n=>{if(n.isMesh&&n.geometry.attributes.position.count===648)found=true});return found});return {ids:trees.map(n=>n.uuid),visible:trees.filter(n=>n.visible).length,groundVisible:p.ground.visible,draws:p.draws,dive:document.querySelector('.webgl-backdrop')?.dataset.renderState}})()`)
const pass=text=>{checks.push(text);console.log('PASS',text)}
try{
  await fresh()
  await evaluate(`(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('BufferGeometryUtils-')&&n.endsWith('.js'));const m=await import(url),T=Object.values(m).find(v=>v&&typeof v==='object'&&v.Object3D&&v.WebGLRenderer),original=T.Object3D.prototype.onBeforeRender;const p=window.__forestLife={draws:0};T.Object3D.prototype.onBeforeRender=function(renderer,scene,camera,...args){if(renderer.domElement.closest('.webgl-backdrop')){const ground=scene.children.find(n=>n.name==='HilltopGround');if(ground)p.ground=ground;if(this.geometry?.attributes?.position?.count===648)p.draws++}return original.call(this,renderer,scene,camera,...args)}})()`)
  await until('!!window.__forestLife.ground');const initial=await state();assert.equal(initial.visible,6)
  await approach();await activate();await until(unlocked,25000);await until(`document.querySelector('.webgl-backdrop')?.dataset.renderState==='paused'`,20000)
  const before=await state();await delay(600);const parked=await state();assert.equal(parked.draws,before.draws);assert.equal(parked.groundVisible,false);pass('forest stops drawing under parked Hero')
  await click('.lite-toggle');await until("document.documentElement.dataset.perf==='lite'");await delay(350);assert.equal((await state()).visible,4)
  await click('.hero__replay');await until(`!(${unlocked})`);await delay(2300);assert.equal((await state()).visible,4);assert.deepEqual((await state()).ids,initial.ids);const replayBefore=(await state()).draws;await delay(300);assert.ok((await state()).draws>replayBefore);pass('Lite replay resumes four resident cherry clones without reload')
  await approach();await activate();await until(unlocked,25000);await delay(600);await click('.lite-toggle');await until("document.documentElement.dataset.perf==='normal'");await delay(250);assert.equal((await state()).visible,6)
  await click('.hero__replay');await until(`!(${unlocked})`);await delay(2300);assert.equal((await state()).visible,6);pass('normal replay restores six trees using the same clone identities')
  for(const [width,height,expected] of [[390,844,2],[768,1024,4],[1440,900,6]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(700);assert.equal((await state()).visible,expected,width+' visible trees');assert.deepEqual((await state()).ids,initial.ids)}
  pass('live resize limits visible forest to 2 / 4 / 6 without rebuilding resources')
  assert.equal(requests.length,1,'single tree GLB request across modes, replays and resizes');assert.equal(errors.filter(e=>!(e.source==='network'&&e.url?.endsWith('/favicon.ico')&&e.text.includes('404'))).length,0,JSON.stringify(errors))
  await writeFile(new URL('measurements/forest-lifecycle.json',import.meta.url),JSON.stringify({checks,initial,parked,final:await state(),requests,errors},null,2))
}finally{await close()}
