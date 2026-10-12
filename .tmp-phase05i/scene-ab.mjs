import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {fresh,send,socket,evaluate,until,delay,close,errors,warnings,approach,activate,unlocked} from './browser.mjs'
const out=new URL('./',import.meta.url)
const inventory=JSON.parse(await readFile(new URL('./measurements/inventory.json',out))).models
const names=inventory.map(r=>r.name)
const mode=process.argv[2]||'ab'
const mapping=Object.fromEntries(inventory.map(r=>[r.vertices,r.name]))
const candidates={}
for(const variant of ['lossless','q95']) candidates[variant]=Object.fromEntries(await Promise.all(names.map(async n=>[n,(await readFile(new URL(`./candidates/${variant}/${n}.glb`,out))).toString('base64')])) )
let selection=null,requests=[],substitutions=[],failures=[],responses=[]
socket.addEventListener('message',async e=>{
  const m=JSON.parse(e.data)
  if(m.method==='Network.requestWillBeSent'&&/\/(fish_[abc]|butterfly_koi_[ab]|shrimp_[ab])\.glb$/.test(m.params.request.url))requests.push({url:m.params.request.url,id:m.params.requestId})
  if(m.method==='Network.responseReceived'&&/\/(fish_[abc]|butterfly_koi_[ab]|shrimp_[ab])\.glb$/.test(m.params.response.url))responses.push({url:m.params.response.url,status:m.params.response.status,mime:m.params.response.mimeType})
  if(m.method==='Network.loadingFailed')failures.push(m.params)
  if(m.method!=='Fetch.requestPaused')return
  try {
    const path=new URL(m.params.request.url).pathname
    const match=path.match(/^\/aquarium\/(fish_[abc]|butterfly_koi_[ab]|shrimp_[ab])\.glb$/)
    const variant=match&&selection?.[match[1]]
    if(variant){await send('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'model/gltf-binary'}],body:candidates[variant][match[1]]});substitutions.push({model:match[1],variant})}
    else await send('Fetch.continueRequest',{requestId:m.params.requestId})
  } catch(e){errors.push(String(e))}
})
await send('Network.enable')
await send('Network.setCacheDisabled',{cacheDisabled:true})
await send('Fetch.enable',{patterns:[{urlPattern:'*/aquarium/*.glb'}]})
await send('Performance.enable')
await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__contextLost=[];document.addEventListener('webglcontextlost',e=>window.__contextLost.push({time:performance.now(),className:e.target.className}),true)`})
const metrics=async()=>Object.fromEntries((await send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]))
const results=[]
async function instrument(){
  await evaluate(`(async()=>{
    const moduleUrl=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('BufferGeometryUtils-')&&n.endsWith('.js'));
    const mod=await import(moduleUrl);const T=Object.values(mod).find(v=>v&&typeof v==='object'&&v.Object3D&&v.WebGLRenderer);
    window.__fishProbe={T,objects:{},renderCount:0,draws:0,fishDraws:0};const p=window.__fishProbe; const names=${JSON.stringify(mapping)};
    const before=T.Object3D.prototype.onBeforeRender;
    T.Object3D.prototype.onBeforeRender=function(renderer,scene,camera,...args){
      if(renderer.domElement.closest('.webgl-backdrop')){
        if(this.isScene){p.renderer=renderer;p.renderCount++;}
        const name=names[this.geometry?.attributes?.position?.count];
        if(this.isMesh&&name){p.objects[name]=this;p.scene=scene;p.camera=camera;p.fishDraws++;}
      }
      return before.call(this,renderer,scene,camera,...args);
    };
    for(const type of [WebGLRenderingContext,WebGL2RenderingContext])for(const key of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
      const fn=type.prototype[key];if(!fn)continue;type.prototype[key]=function(...a){if(this.canvas.closest('.webgl-backdrop'))p.draws++;return fn.apply(this,a)};
    }
    window.__fishSnapshot=()=>{
      const {T,objects,renderer,camera,scene}=p;if(!renderer||!camera)return null;
      const all=[];scene.traverse(n=>{const name=names[n.geometry?.attributes?.position?.count];if(n.isMesh&&name)all.push(name)});
      const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
      return {time:performance.now(),mode:document.documentElement.dataset.perf,width:innerWidth,height:innerHeight,renderer:{pixelRatio:renderer.getPixelRatio(),toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,outputColorSpace:renderer.outputColorSpace,shadow:renderer.shadowMap.enabled,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null},camera:{matrix:camera.matrixWorld.toArray(),projection:camera.projectionMatrix.toArray()},lights:scene.children.filter(n=>n.isLight).map(n=>({type:n.type,color:n.color.toArray(),intensity:n.intensity})),models:all.sort(),fish:Object.fromEntries(Object.entries(objects).map(([name,n])=>{const root=n.parent;const b=new T.Box3().setFromObject(n);const m=n.material;return [name,{position:root.position.toArray(),rotation:root.rotation.toArray(),scale:root.scale.toArray(),worldBounds:{min:b.min.toArray(),max:b.max.toArray()},geometry:{vertices:n.geometry.attributes.position.count,triangles:n.geometry.index.count/3},material:{type:m.type,side:m.side,transparent:m.transparent,alphaTest:m.alphaTest,opacity:m.opacity,roughness:m.roughness,metalness:m.metalness,color:m.color.toArray(),emissive:m.emissive.toArray(),maps:['map','normalMap','roughnessMap','metalnessMap'].map(k=>({slot:k,width:m[k]?.image?.width,height:m[k]?.image?.height,colorSpace:m[k]?.colorSpace}))}}]})),draws:p.draws,fishDraws:p.fishDraws,contextLost:window.__contextLost,canvases:document.querySelectorAll('canvas').length,overflow:document.documentElement.scrollWidth>innerWidth};
    };
  })()`)
  await until('window.__fishSnapshot()?.models.length>=5',15000)
}
async function shot(rel){const {data}=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(rel,out),Buffer.from(data,'base64'))}
async function position(p){
  await evaluate(`scrollTo({top:document.querySelector('#portfolio-dive').offsetHeight*${p},behavior:'instant'})`)
  await delay(1200)
  let previous=null,stable=0
  for(let i=0;i<80;i++){
    const matrix=await evaluate('window.__fishSnapshot().camera.matrix')
    if(previous&&matrix.every((v,j)=>Math.abs(v-previous[j])<1e-8))stable++;else stable=0
    if(stable>=3)return
    previous=matrix;await delay(100)
  }
  throw new Error('Camera did not settle at '+p)
}
async function scenario(label,{width=1440,height=900,lite=false,theme='dark',selected=null,replay=false,stillsOnly=false}={}){
  selection=selected;requests=[];responses=[];substitutions=[];failures=[];const errorStart=errors.length,warningStart=warnings.length
  await fresh({width,height,lite,theme});await instrument();await delay(2500)
  const expected=width<720?names.filter(n=>!['butterfly_koi_b','shrimp_b'].includes(n)):names
  const row={label,width,height,lite,theme,selection:selected,positions:[],motion:[],metrics:[],checks:[]}
  for(const [name,p] of [['p0',0],['p05',.5],['p091',.91],['fish-heavy',.3]]){
    await position(p);const state=await evaluate('window.__fishSnapshot()');assert.deepEqual(state.models,[...expected].sort(),label+' model population');assert.equal(state.overflow,false)
    for(const [n,f] of Object.entries(state.fish)){assert.ok([...f.position,...f.scale,...f.worldBounds.min,...f.worldBounds.max].every(Number.isFinite),n+' finite transforms');assert.equal(f.geometry.triangles,inventory.find(r=>r.name===n).triangles)}
    await shot(`comparisons/${label}-${name}.png`);row.positions.push({name,p,state})
  }
  if(stillsOnly){row.errors=errors.slice(errorStart);row.warnings=warnings.slice(warningStart);row.requests=[...requests];row.substitutions=[...substitutions];assert.equal(row.errors.length,0);results.push(row);await writeFile(new URL('measurements/scene-matched.json',out),JSON.stringify({results,errors,warnings},null,2));console.log('PASS matched cameras',label);return}
  const before=await metrics()
  const motion=await evaluate(`new Promise(resolve=>{
    const frames=[];let start,previousDraws=window.__fishProbe.draws,previousFish=window.__fishProbe.fishDraws;
    function tick(now){start??=now;const p=window.__fishProbe;frames.push({time:now,draws:p.draws-previousDraws,fishDraws:p.fishDraws-previousFish,fish:Object.fromEntries(Object.entries(p.objects).map(([name,n])=>[name,{position:n.parent.position.toArray(),rotation:n.parent.rotation.toArray(),scale:n.parent.scale.toArray()}]))});previousDraws=p.draws;previousFish=p.fishDraws;if(now-start<4000)requestAnimationFrame(tick);else resolve(frames)}requestAnimationFrame(tick)
  })`)
  const after=await metrics()
  const diffs=motion.slice(1).map((f,i)=>f.time-motion[i].time).sort((a,b)=>a-b)
  row.metrics={frames:motion.length,medianMs:diffs[Math.floor(diffs.length*.5)],p95Ms:diffs[Math.floor(diffs.length*.95)],longFrames:diffs.filter(x=>x>50).length,scriptMs:(after.ScriptDuration-before.ScriptDuration)*1000,styleMs:(after.RecalcStyleDuration-before.RecalcStyleDuration)*1000,observedDrawsPerRaf:[...new Set(motion.slice(1).map(f=>f.draws))],observedFishMainDrawsPerRaf:[...new Set(motion.slice(1).map(f=>f.fishDraws))]}
  for(const n of expected){
    const poses=motion.map(f=>f.fish[n]);const scale=poses[0].scale;poses.forEach(f=>assert.deepEqual(f.scale,scale,n+' stable scale'));
    const change=poses.slice(1).some(f=>f.position.some((x,i)=>Math.abs(x-poses[0].position[i])>1e-5));assert.ok(change,n+' live movement');
    const jumps=poses.slice(1).map((f,i)=>Math.hypot(...f.position.map((v,c)=>v-poses[i].position[c])));assert.ok(Math.max(...jumps)<.08,n+' no position jumps');
    row.checks.push({model:n,moved:change,maxFrameDisplacement:Math.max(...jumps),scaleStable:true})
  }
  row.motion=motion
  for(let i=0;i<6;i++){await delay(350);const state=await evaluate('window.__fishSnapshot()');await shot(`motion/${label}-${i}.png`);row.positions.push({name:'motion-'+i,state})}
  const countBeforeReplay=requests.length
  if(replay){
    await approach();await activate();await until(unlocked,25000);await delay(1000)
    assert.ok(await evaluate(`Math.abs(scrollY)<2&&getComputedStyle(document.querySelector('.navbar__dock')).transform==='none'`),'clean hero landing')
    await shot(`comparisons/${label}-landed.png`)
    await evaluate(`document.querySelector('.hero__replay').click()`);await until(`!document.querySelector('.aqua-root').classList.contains('is-portfolio-unlocked')`);await delay(2300)
    await position(.3);assert.deepEqual((await evaluate('window.__fishSnapshot()')).models,[...expected].sort());await shot(`comparisons/${label}-replay.png`)
    await approach();await activate();await until(unlocked,25000);await delay(800);row.replay={passed:true,requestsBefore:countBeforeReplay,requestsAfter:requests.length}
    assert.equal(requests.length,countBeforeReplay,'replay reuses resident assets')
  }
  row.requests=[...requests];row.responses=[...responses];row.substitutions=[...substitutions];row.failures=[...failures];row.errors=errors.slice(errorStart);row.warnings=warnings.slice(warningStart);row.contextLost=await evaluate('window.__contextLost')
  assert.equal(row.errors.length,0,JSON.stringify(row.errors));assert.equal(row.contextLost.length,0,'context loss');assert.equal(row.failures.length,0,JSON.stringify(row.failures));assert.ok(row.warnings.every(w=>w==='THREE.WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.'),JSON.stringify(row.warnings))
  for(const n of expected){const path=`/aquarium/${lite&&n.startsWith('fish_')?'lite/':''}${n}.glb`;assert.equal(requests.filter(r=>new URL(r.url).pathname===path).length,1,path+' loads once');assert.ok(responses.some(r=>new URL(r.url).pathname===path&&r.status===200))}
  assert.equal(substitutions.length,selected?expected.length:0,'expected substitutions only')
  results.push(row);await writeFile(new URL(`measurements/scene-${mode}.json`,out),JSON.stringify({results,errors,warnings},null,2));console.log('PASS',label,expected.length+' models',JSON.stringify(row.metrics))
}
await mkdir(new URL('comparisons/',out),{recursive:true});await mkdir(new URL('motion/',out),{recursive:true})
try{
  if(mode==='ab')for(const variant of ['original','lossless','q95'])await scenario('desktop-'+variant,{selected:variant==='original'?null:Object.fromEntries(names.map(n=>[n,variant]))})
  else if(mode==='matched')for(const variant of ['original','lossless','q95'])await scenario('matched-desktop-'+variant,{stillsOnly:true,selected:variant==='original'?null:Object.fromEntries(names.map(n=>[n,variant]))})
  else if(mode==='regression'){
    const selected=JSON.parse(await readFile(new URL('./measurements/selection.json',out)))
    await scenario('desktop-selected',{selected,replay:true})
    await scenario('mobile-original',{width:390,height:844})
    await scenario('mobile-selected',{width:390,height:844,selected,replay:true})
    await scenario('desktop-lite',{lite:true,replay:true})
    await scenario('mobile-lite',{width:390,height:844,lite:true})
    await scenario('desktop-light-selected',{theme:'light',selected})
  }
}finally{await writeFile(new URL(`measurements/scene-${mode}-errors.json`,out),JSON.stringify({errors,warnings,failures},null,2));await send('Fetch.disable');await close()}
