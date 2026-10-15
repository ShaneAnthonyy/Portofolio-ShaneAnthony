import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {fresh,send,evaluate,until,delay,close,errors,warnings} from './browser.mjs'
const rows=[]
const phoneReference=JSON.parse(await readFile(new URL('after/390x844-normal-dark-visibility.json',import.meta.url),'utf8')).states[0].trees
async function attach(){await evaluate(`(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('BufferGeometryUtils-')&&n.endsWith('.js')),m=await import(url),T=Object.values(m).find(v=>v&&typeof v==='object'&&v.Object3D&&v.WebGLRenderer),original=T.Object3D.prototype.onBeforeRender;window.__responsive={};T.Object3D.prototype.onBeforeRender=function(renderer,scene,camera,...args){if(renderer.domElement.closest('.webgl-backdrop')&&scene.children.some(n=>n.name==='HilltopGround'))Object.assign(window.__responsive,{scene,camera});return original.call(this,renderer,scene,camera,...args)};window.__treeState=()=>{const p=window.__responsive;if(!p.scene)return null;const g=p.scene.getObjectByName('HilltopGround');return g.children.filter(g=>{let found=false;g.traverse(n=>{if(n.geometry?.attributes.position.count===648)found=true});return found}).map(g=>({id:g.uuid,visible:g.visible,position:g.children[0].position.toArray(),scale:g.children[0].scale.toArray()}));}})()`);await until('!!window.__treeState()')}
const state=()=>evaluate('window.__treeState()')
async function resize(width,height,mobile){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:mobile?2:1,mobile});await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});await evaluate('scrollTo({top:0,behavior:"instant"})');await delay(1200)}
try {
 await fresh();await attach();const original=await state();assert.equal(original.length,10)
 for(const [width,height,mobile,count]of [[390,844,true,2],[844,390,true,2],[390,844,true,2],[768,1024,true,6],[1440,900,false,10]]){
  await resize(width,height,mobile);const trees=await state();assert.deepEqual(trees.map(t=>t.id),original.map(t=>t.id));assert.equal(trees.filter(t=>t.visible).length,count)
  if(count===2){for(let i=0;i<2;i++)for(let k=0;k<3;k++){assert.ok(Math.abs(trees[i].position[k]-phoneReference[i].root[k])<1e-10,'mobile position and grounding match verified fresh scene');assert.ok(Math.abs(trees[i].scale[k]-phoneReference[i].scale[k])<1e-10)}}
  else for(let i=0;i<2;i++)for(let k=0;k<3;k++)assert.ok(Math.abs(trees[i].position[k]-original[i].position[k])<1e-10,'desktop placement restores exactly')
  rows.push({width,height,mobile,trees});console.log('PASS resize/rotation tree layout',width,height,count)
 }
 await fresh({width:390,height:844});await attach();const phone=await state();await resize(844,390,true);const landscape=await state();assert.equal(landscape.length,2);assert.deepEqual(landscape.map(t=>t.position),phone.map(t=>t.position));console.log('PASS phone-origin landscape retains two visible mobile placements')
 for(const [width,height]of [[375,812],[390,844],[390,500],[430,932]]){await fresh({width,height,reduced:true});assert.equal(await evaluate("!!document.querySelector('.webgl-backdrop canvas')"),false);assert.equal(await evaluate("document.querySelector('.aqua-root').classList.contains('is-portfolio-unlocked')"),true);rows.push({width,height,reduced:true,diveBypassed:true});console.log('PASS Reduced Motion bypass',width,height)}
 assert.equal(errors.filter(e=>!(e.source==='network'&&e.url?.endsWith('/favicon.ico'))).length,0,JSON.stringify(errors))
}finally{await writeFile(new URL('measurements/responsive-lifecycle.json',import.meta.url),JSON.stringify({rows,errors,warnings},null,2));await close()}
