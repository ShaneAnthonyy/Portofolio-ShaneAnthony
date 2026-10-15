import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fresh, send, evaluate, until, delay, close, errors, warnings } from './browser.mjs'
const motionOnly = process.argv.includes('--motion-only')
const out = new URL(motionOnly ? './critical-before/' : './critical/', import.meta.url), results = []
await mkdir(out, {recursive:true})
async function attach() {
  await evaluate(`(async()=>{
    const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('BufferGeometryUtils-')&&n.endsWith('.js'));
    const mod=await import(url),T=Object.values(mod).find(v=>v&&typeof v==='object'&&v.Object3D&&v.WebGLRenderer),original=T.Object3D.prototype.onBeforeRender;
    const p=window.__critical={draws:0};T.Object3D.prototype.onBeforeRender=function(renderer,scene,camera,...args){if(renderer.domElement.closest('.webgl-backdrop')&&scene.children.some(n=>n.name==='HilltopGround')){p.renderer=renderer;p.scene=scene;p.camera=camera;p.draws++}return original.call(this,renderer,scene,camera,...args)};
    window.__criticalState=()=>{if(!p.scene)return null;const ground=p.scene.getObjectByName('HilltopGround'),trees=ground.children.filter(g=>{let found=false;g.traverse(n=>{if(n.isMesh&&n.geometry.attributes.position.count===648)found=true});return found});return {camera:p.camera.position.toArray(),trees:trees.filter(n=>n.visible).length,treeIds:trees.map(n=>n.uuid),draws:p.draws,programs:p.renderer.info.programs.length,textures:p.renderer.info.memory.textures,canvas:[p.renderer.domElement.width,p.renderer.domElement.height],root:document.querySelector('.aqua-root').className,overflow:document.documentElement.scrollWidth>innerWidth};};
  })()`)
  await until('!!window.__criticalState()')
}
const state=()=>evaluate('window.__criticalState()')
const progress=async p=>{await evaluate(`scrollTo({top:document.querySelector('#portfolio-dive').offsetHeight*${p},behavior:'instant'})`);await delay(1100)}
async function image(name){const {data}=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(name+'.png',out),Buffer.from(data,'base64'))}
try {
  for (const [width,height,theme,lite] of motionOnly ? [] : [[768,1024,'dark',false],[1024,768,'light',false],[1920,1080,'dark',false],[1440,540,'light',false],[390,320,'dark',true]]) {
    await fresh({width,height,theme,lite});await attach()
    const initial=await state(),expected=width<720?2:width<1100?4:6
    assert.equal(initial.trees,expected);assert.equal(initial.overflow,false)
    const poses=[]
    for(const p of [.15,.3,.55,.65,.8,.55,.3,0]) {await progress(p);const s=await state();assert.ok(s.camera.every(Number.isFinite));assert.equal(s.trees,expected);assert.equal(s.programs,initial.programs,'no new program at dissolve crossing');assert.equal(s.textures,initial.textures,'no late texture allocation');poses.push({p,...s})}
    await image(`${width}x${height}-${theme}-${lite?'lite':'normal'}`)
    results.push({width,height,theme,lite,initial,poses});console.log('PASS critical range forward/reverse',width,height,theme,lite?'Lite':'Normal')
  }
  await fresh();await attach();await progress(.45)
  if (!motionOnly) {
  const initial=await state(),beforeHidden=initial.draws
  await send('Emulation.setFocusEmulationEnabled',{enabled:false});await send('Page.setWebLifecycleState',{state:'frozen'});await delay(500);await send('Page.setWebLifecycleState',{state:'active'});await send('Emulation.setFocusEmulationEnabled',{enabled:true});await until('!document.hidden');await delay(200)
  const resumed=await state();await delay(300);assert.ok((await state()).draws>resumed.draws);assert.deepEqual(resumed.treeIds,initial.treeIds)
  const resizes=[]
  for(const [width,height,count]of [[390,844,2],[768,1024,4],[1440,900,6]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(600);await progress(.55);const s=await state();assert.equal(s.trees,count);assert.deepEqual(s.treeIds,initial.treeIds);resizes.push(s)}
  results.push({lifecycle:{beforeHidden,resumed,resizes}});console.log('PASS visibility resume and resize in affected range')
  }
  await progress(.3)
  await evaluate(`(()=>{const p=window.__critical;p.motion=[];p.record=true;function tick(t){if(!p.record)return;p.motion.push({time:t,scrollY,camera:p.camera.position.toArray()});requestAnimationFrame(tick)}requestAnimationFrame(tick)})()`)
  for(const [direction,distance]of [['forward',-1500],['reverse',1500]]){
    const movement=send('Input.synthesizeScrollGesture',{x:700,y:400,yDistance:distance,speed:450,gestureSourceType:'mouse',preventFling:true})
    for(let i=0;i<6;i++){await delay(400);await image(`motion-${direction}-${i}`)}
    await movement;await delay(700)
  }
  const motion=await evaluate('(window.__critical.record=false,window.__critical.motion)');assert.ok(motion.length>100)
  results.push({motion});assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS captured forward/reverse motion frames and camera trajectory')
} finally {await writeFile(new URL('results.json',out),JSON.stringify({results,errors,warnings},null,2));await close()}
