import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {fresh,send,socket,evaluate,until,delay,close,errors,warnings,approach,activate,unlocked} from './browser.mjs'
const out=new URL('./',import.meta.url)
const inventory=JSON.parse(await readFile(new URL('../.tmp-phase05i/measurements/inventory.json',out))).models
const names=inventory.map(r=>r.name)
const mode=process.argv[2]||'ab'
const mapping=Object.fromEntries(inventory.map(r=>[r.vertices,r.name]))
let requests=[],failures=[],responses=[],allResponses=[],finished=new Map(),extra=new Map()
const fishURL=url=>/\/(fish_[abc]|butterfly_koi_[ab]|shrimp_[ab])(-opt)?\.glb$/.test(url)
socket.addEventListener('message',e=>{
  const m=JSON.parse(e.data),p=m.params
  if(m.method==='Network.requestWillBeSent'&&fishURL(p.request.url))requests.push({url:p.request.url,id:p.requestId,time:p.timestamp})
  if(m.method==='Network.responseReceived'){
    allResponses.push({url:p.response.url,status:p.response.status})
    if(fishURL(p.response.url))responses.push({id:p.requestId,url:p.response.url,status:p.response.status,mime:p.response.mimeType,fromDiskCache:p.response.fromDiskCache||false,fromServiceWorker:p.response.fromServiceWorker||false,headers:p.response.headers,timing:p.response.timing,time:p.timestamp})
  }
  if(m.method==='Network.loadingFinished')finished.set(p.requestId,{encodedDataLength:p.encodedDataLength,time:p.timestamp})
  if(m.method==='Network.responseReceivedExtraInfo')extra.set(p.requestId,{statusCode:p.statusCode,headers:p.headers})
  if(m.method==='Network.loadingFailed')failures.push(p)
})
await send('Network.enable',{maxTotalBufferSize:300000000,maxResourceBufferSize:20000000})
await send('Network.setCacheDisabled',{cacheDisabled:false})
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
async function scenario(label,{width=1440,height=900,lite=false,theme='dark',original=false,warm=false,replay=false}={}){
  requests=[];responses=[];allResponses=[];failures=[];finished.clear();extra.clear();const errorStart=errors.length,warningStart=warnings.length
  if(!warm)await send('Network.clearBrowserCache')
  const started=Date.now()
  await fresh({width,height,lite,theme});await instrument();await delay(2500)
  const expected=width<720?names.filter(n=>!['butterfly_koi_b','shrimp_b'].includes(n)):names
  const row={label,width,height,lite,theme,original,warm,readyObservedMs:Date.now()-started,positions:[],motion:[],metrics:[],checks:[]}
  for(const [name,p] of [['p0',0],['p05',.5],['p091',.91],['fish-heavy',.3]]){
    await position(p);const state=await evaluate('window.__fishSnapshot()');assert.deepEqual(state.models,[...expected].sort(),label+' model population');assert.equal(state.overflow,false)
    for(const [n,f] of Object.entries(state.fish)){assert.ok([...f.position,...f.scale,...f.worldBounds.min,...f.worldBounds.max].every(Number.isFinite),n+' finite transforms');assert.equal(f.geometry.triangles,inventory.find(r=>r.name===n).triangles)}
    await shot(`comparisons/${label}-${name}.png`);row.positions.push({name,p,state})
  }
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
  row.requests=[...requests];row.responses=[...responses];row.environment=allResponses.filter(r=>/tree.*glb|grass_ground/.test(r.url));row.failures=[...failures];row.errors=errors.slice(errorStart);row.warnings=warnings.slice(warningStart);row.contextLost=await evaluate('window.__contextLost')
  row.unexpectedErrors=row.errors.filter(e=>!(e.source==='network'&&e.url==='http://127.0.0.1:4173/favicon.ico'&&e.text.includes('404')));assert.equal(row.unexpectedErrors.length,0,JSON.stringify(row.unexpectedErrors));assert.equal(row.contextLost.length,0,'context loss');assert.equal(row.failures.length,0,JSON.stringify(row.failures));assert.ok(row.warnings.every(w=>w==='THREE.WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.'),JSON.stringify(row.warnings))
  assert.equal(requests.length,expected.length,'no extra or duplicate fish requests')
  for(const n of expected){
    const path=`/aquarium/${lite&&n.startsWith('fish_')?'lite/':''}${n}${!lite&&!original?'-opt':''}.glb`
    assert.equal(requests.filter(r=>new URL(r.url).pathname===path).length,1,path+' loads once')
    const response=responses.find(r=>new URL(r.url).pathname===path);assert.ok(response&&response.status===200,path+' HTTP 200')
    response.finish=finished.get(response.id);response.extra=extra.get(response.id)
    const body=await send('Network.getResponseBody',{requestId:response.id});const bytes=Buffer.from(body.body,body.base64Encoded?'base64':'utf8')
    response.bodyBytes=bytes.length;response.sha256=createHash('sha256').update(bytes).digest('hex')
    const disk=await readFile(new URL('../public'+path,out));assert.equal(response.sha256,createHash('sha256').update(disk).digest('hex'),path+' served body hash')
  }
  row.resourceTiming=await evaluate(`performance.getEntriesByType('resource').filter(e=>/\\/(fish_[abc]|butterfly_koi_[ab]|shrimp_[ab])(-opt)?\\.glb$/.test(e.name)).map(e=>({url:e.name,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize,duration:e.duration,fetchStart:e.fetchStart,responseEnd:e.responseEnd}))`)
  row.transfer={bodyBytes:responses.reduce((a,r)=>a+r.bodyBytes,0),cdpEncodedBytes:responses.reduce((a,r)=>a+(r.finish?.encodedDataLength||0),0),resourceTransferBytes:row.resourceTiming.reduce((a,r)=>a+r.transferSize,0),resourceEncodedBodyBytes:row.resourceTiming.reduce((a,r)=>a+r.encodedBodySize,0)}
  if(!lite)assert.ok(row.environment.some(r=>r.url.endsWith('/tree-opt-150k-1024.glb')),'optimized tree requested')
  if(!lite)for(const file of ['diff_1024','nor_gl_512','rough_1024','ao_1024'])assert.ok(row.environment.some(r=>r.url.endsWith('/grass_ground_'+file+'.webp')&&(r.status===200||(warm&&r.status===304))),'optimized terrain '+file)
  results.push(row);await writeFile(new URL(`measurements/scene-${mode}.json`,out),JSON.stringify({results,errors,warnings},null,2));console.log('PASS',label,expected.length+' models',JSON.stringify({transfer:row.transfer,metrics:row.metrics}))
}
await mkdir(new URL('comparisons/',out),{recursive:true});await mkdir(new URL('motion/',out),{recursive:true})
try{
  if(mode==='baseline')await scenario('baseline-desktop-cold',{original:true})
  else {
    await scenario('desktop-cold',{replay:true})
    await scenario('desktop-warm',{warm:true})
    await scenario('mobile-normal',{width:390,height:844,replay:true})
    await scenario('desktop-lite',{lite:true,replay:true})
    await scenario('mobile-lite',{width:390,height:844,lite:true})
    await scenario('desktop-light',{theme:'light'})
  }
}finally{await writeFile(new URL(`measurements/scene-${mode}-errors.json`,out),JSON.stringify({errors,warnings,failures},null,2));await close()}
