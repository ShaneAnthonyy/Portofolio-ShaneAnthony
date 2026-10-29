import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {sampleEnvironment} from '../src/animation/worldTime.js'
import {createMinecraftSky} from '../src/scenes/minecraftSky.js'

const sky=createMinecraftSky(sampleEnvironment(720)),ids=[sky.geometry.uuid,sky.material.uuid]
assert.equal(sky.material.transparent,false)
assert.equal(sky.material.depthWrite,false)
assert.equal(sky.material.toneMapped,false)
assert.equal(sky.mesh.renderOrder,1000)
assert.equal(sky.geometry.parameters.radius,90)
assert.equal(Object.values(sky.material.uniforms).some(u=>u.value?.isTexture),false)
for(let m=0;m<=1440;m++){
  const sample=sampleEnvironment(m);sky.update(sample)
  for(const name of ['uSun','uMoon'])assert.ok(Math.abs(sky.material.uniforms[name].value.length()-1)<1e-12)
  for(const name of ['Sun','Moon']){
    const u=sky.material.uniforms,direction=u['u'+name].value,right=u['u'+name+'Right'].value,up=u['u'+name+'Up'].value
    assert.ok(Math.abs(right.length()-1)<1e-12&&Math.abs(up.length()-1)<1e-12)
    assert.ok(Math.abs(direction.dot(right))<1e-12&&Math.abs(direction.dot(up))<1e-12&&Math.abs(right.dot(up))<1e-12)
  }
  for(const name of ['uSunVisible','uMoonVisible','uStars'])assert.ok(sky.material.uniforms[name].value>=0&&sky.material.uniforms[name].value<=1)
  assert.deepEqual([sky.geometry.uuid,sky.material.uuid],ids)
}
const state=minutes=>{sky.update(sampleEnvironment(minutes));return Object.entries(sky.material.uniforms).filter(([name])=>name!=='uCloudOffset').flatMap(([,u])=>u.value.toArray?.()??[u.value])}
for(const boundary of [0,300,360,720,1080,1440]){
  const a=state(boundary-.0001),b=state(boundary+.0001)
  assert.ok(a.every((v,i)=>Math.abs(v-b[i])<.0001),`sky continuous at ${boundary}`)
}
assert.deepEqual(state(0),state(1440))
sky.update(sampleEnvironment(720));const noon=sky.material.uniforms.uSun.value.y
sky.update(sampleEnvironment(360));assert.ok(noon>sky.material.uniforms.uSun.value.y)
assert.equal(sky.material.uniforms.uSunVisible.value,.5)
sky.update(sampleEnvironment(0));assert.equal(sky.material.uniforms.uMoonVisible.value,1)
assert.equal(sky.material.uniforms.uSunVisible.value,0)
const phase=()=>sky.material.uniforms.uCloudOffset.value.x
const wind=()=>sky.material.uniforms.uCloudOffset.value.y
const distance=(a,b)=>((a-b+192)%128)-64
const expectedPhase=m=>(((m-720)/1440*128)%128+128)%128
for(const direction of [1,-1]){
  let previous
  for(let i=0;i<=1440;i++){
    const minutes=direction===1?i:1440-i
    sky.update(sampleEnvironment(minutes))
    assert.ok(Math.abs(phase()-expectedPhase(minutes))<1e-10,'cloud time position is deterministic')
    if(previous!==undefined)assert.ok(Math.abs(distance(phase(),previous)-direction*128/1440)<1e-10,'forward/reverse displacement is continuous through wrapping')
    previous=phase()
  }
}
sky.update(sampleEnvironment(300));const firstPhase=phase()
sky.update(sampleEnvironment(1740));assert.equal(phase(),firstPhase,'05:00 endpoints share the same arrangement')
const held=sampleEnvironment(720)
sky.update(held);const beforeWind=wind()
for(let i=0;i<100;i++)sky.update(held,1,1.6,.01)
assert.ok(Math.abs(distance(wind(),beforeWind)-.03)<1e-10,'ambient seconds advance even with a cached time sample')
const frozenWind=wind();sky.update(held);assert.equal(wind(),frozenWind,'zero delta freezes ambient wind for Lite/static paths')
const beforeMode=phase()+wind()
sky.update(sampleEnvironment(0),1,1.6,0,'live')
assert.ok(Math.abs(distance(phase()+wind(),beforeMode))<1e-10,'Manual to Live preserves the combined cloud position')
sky.update(sampleEnvironment(0),1,1.6,0,'manual');const resumed=phase()+wind()
assert.ok(Math.abs(distance(resumed,beforeMode))<1e-10,'Live to Manual has no cloud jump')
const loopWind=wind()
for(let i=0;i<100000;i++)sky.update(held,1,1.6,.1)
assert.ok(Math.abs(distance(wind(),loopWind)-44)<1e-7,'long-running wind wraps without losing phase')
assert.ok(wind()>=0&&wind()<128)
sky.geometry.dispose();sky.material.dispose()
console.log('PASS deterministic sky: fixed resources, celestial continuity, reversible periodic clouds, mode continuity and bounded ambient wind')

if(process.argv.includes('--browser')){
  const {fresh,evaluate,send,click,delay,until,close,errors,warnings,approach,activate,unlocked}=await import('./browser.mjs')
  const rows=[],out=new URL('./measurements/minecraft-sky/',import.meta.url)
  await mkdir(out,{recursive:true})
  await send('Page.addScriptToEvaluateOnNewDocument',{source:await readFile(new URL('./fixtures/early.js',import.meta.url),'utf8')})
  const scene=`window.__audit.renderers.find(m=>m.scene?.deref()?.getObjectByName('HilltopGround')).scene.deref()`
  const read=()=>evaluate(`(()=>{const s=${scene},sky=s.getObjectByName('WorldSky'),m=sky.children[0],u=m.material.uniforms,
    title=s.children.find(n=>n.isGroup&&n.children.some(c=>c.geometry?.type==='TextGeometry')),
    lettering=title?.children.find(n=>n.material?.isMeshStandardMaterial);return {
    children:sky.children.length,name:m.name,geometry:m.geometry.uuid,material:m.material.uuid,
    transparent:m.material.transparent,uniforms:u?Object.fromEntries(Object.entries(u).filter(([k])=>k!=='uCloudOffset').map(([k,u])=>[k,u.value.toArray?.()??u.value])):null,
    cloudOffset:u?.uCloudOffset.value.toArray(),
    terrain:s.getObjectByName('HilltopGround').children[0].geometry.uuid,
    title:lettering?{geometry:lettering.geometry.uuid,emission:lettering.material.emissiveIntensity,scale:title.scale.toArray()}:null,
    repeat:s.getObjectByName('HilltopGround').children[0].material.map.repeat.toArray(),
    resources:window.__audit.contexts.map(c=>({...c.created})),programs:window.__audit.snapshot().renderers.map(r=>r.info?.programs),
    loads:performance.getEntriesByType('resource').filter(r=>/sky-(morning|night)\.png/.test(r.name)).map(r=>r.name),
    losses:window.__audit.events.filter(e=>e.name==='contextlost').length}})()`)
  const open=async()=>{if(!await evaluate(`!!document.querySelector('.world-time-panel')`))await click('.world-time-trigger')}
  const preset=async name=>{await open();await evaluate(`Array.from(document.querySelectorAll('[aria-label="Time presets"] button')).find(b=>b.textContent.startsWith(${JSON.stringify(name)})).click()`);await delay(80)}
  const offset=async value=>{await open();await evaluate(`(()=>{const input=document.querySelector('.world-time-panel input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${value});input.dispatchEvent(new Event('input',{bubbles:true}))})()`);await delay(80)}
  try{
    for(const width of [1440,390])for(const lite of [false,true]){
      await fresh({width,height:width===390?844:900,lite})
      await evaluate(`scrollTo({top:document.querySelector('#portfolio-dive').offsetHeight*.8,behavior:'instant'})`);await delay(1200)
      await evaluate(`scrollTo({top:0,behavior:'instant'})`);await delay(1000)
      let cloudPixels
      // Exercise the actual shader with the existing renderer, without test textures/targets.
      cloudPixels=await evaluate(`(()=>{
        const meta=window.__audit.renderers.find(m=>m.scene?.deref()?.getObjectByName('HilltopGround')),s=meta.scene.deref(),r=meta.ref.deref(),camera=meta.camera.deref(),m=s.getObjectByName('MinecraftSky'),u=m.material.uniforms.uCloudOffset.value,
          saved=u.clone(),target=r.getRenderTarget(),gl=r.getContext(),width=r.domElement.width,height=r.domElement.height;
        const render=phase=>{u.set(phase,0);r.render(m,camera);const bytes=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes};
        const changed=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])n++;return n};
        try{r.setRenderTarget(null);const first=render(0),moved=render(1),wrapped=render(128),reversed=render(0),before=render(127.9999),after=render(.0001);
          return {pixels:width*height,moved:changed(first,moved),periodic:changed(first,wrapped),reversed:changed(first,reversed),seam:changed(before,after)};
        }finally{u.copy(saved);r.setRenderTarget(target);r.render(s,camera)}
      })()`)
      assert.ok(cloudPixels.moved>0,'cloud displacement visibly translates the rendered field')
      assert.ok(cloudPixels.periodic<=Math.max(2,cloudPixels.pixels*.00001),'shader field repeats after a complete phase')
      assert.equal(cloudPixels.reversed,0,'reversing returns identical cloud pixels')
      assert.ok(cloudPixels.seam<cloudPixels.pixels*.005,'subpixel wrap crossing has no cloud teleportation')
      const initial=await read()
      assert.deepEqual(initial.repeat,[124,124]);assert.equal(initial.losses,0)

      assert.equal(initial.children,1);assert.equal(initial.name,'MinecraftSky');assert.equal(initial.transparent,false);assert.equal(initial.loads.length,0)
      const titleEmission={}
      for(let cycle=0;cycle<3;cycle++)for(const [name,minutes]of [['Sunrise',360],['Daytime',720],['Sunset',1080],['Night',0]]){
        await preset(name);const state=await read(),sample=sampleEnvironment(minutes)
        assert.deepEqual(state.uniforms.uTop,sample.skyZenith)
        assert.deepEqual(state.uniforms.uHorizon,sample.skyLine)
        assert.equal(state.uniforms.uStars,sample.starVisibility)
        assert.equal(state.geometry,initial.geometry);assert.equal(state.material,initial.material)
        assert.equal(state.terrain,initial.terrain);assert.deepEqual(state.resources,initial.resources)
        assert.deepEqual(state.programs,initial.programs)
        assert.equal(state.title.geometry,initial.title.geometry)
        assert.deepEqual(state.title.scale,initial.title.scale,'time keeps title typography and dimensions')
        titleEmission[name]=state.title.emission
      }
      assert.ok(titleEmission.Night>titleEmission.Daytime,'night title has an adaptive emission floor')
      for(const minutes of [420,480,570,630,960,1020,1290,1350]){
        await offset((minutes-300+1440)%1440)
        const framing=await evaluate(`(()=>{
          const meta=window.__audit.renderers.find(m=>m.scene?.deref()?.getObjectByName('HilltopGround')),s=meta.scene.deref(),camera=meta.camera.deref(),
            sky=s.getObjectByName('MinecraftSky'),u=sky.material.uniforms,title=s.children.find(n=>n.isGroup&&n.children.some(c=>c.geometry?.type==='TextGeometry')),
            mesh=title.children.find(n=>n.material?.isMeshStandardMaterial),box=mesh.geometry.boundingBox;
          s.updateMatrixWorld(true);
          const bounds=points=>({left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.max(...points.map(p=>p.y)),bottom:Math.min(...points.map(p=>p.y))});
          const corners=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(box.min.clone().set(x,y,z).applyMatrix4(mesh.matrixWorld).project(camera));
          const bodies=[];for(const name of ['Sun','Moon']){if(u['u'+name+'Visible'].value<.01)continue;const points=[],size=name==='Sun'?.021:.020;
            for(const x of [-1,1])for(const y of [-1,1])points.push(u['u'+name].value.clone().addScaledVector(u['u'+name+'Right'].value,x*size).addScaledVector(u['u'+name+'Up'].value,y*size).normalize().multiplyScalar(90).project(camera));bodies.push({name,...bounds(points)})}
          return {title:bounds(corners),bodies}
        })()`)
        for(const body of framing.bodies)assert.ok(body.right<framing.title.left||body.left>framing.title.right||body.top<framing.title.bottom||body.bottom>framing.title.top,`${body.name} clears title at ${minutes} minutes: ${JSON.stringify(framing)}`)
      }
      await offset(0);const first=await read();await offset(1440);const last=await read();assert.deepEqual(first.uniforms,last.uniforms)
      assert.equal(first.cloudOffset[0],last.cloudOffset[0],'both 05:00 endpoints have the same cloud time phase')
      assert.ok(Math.abs(distance(last.cloudOffset[1],first.cloudOffset[1]))<.02,'endpoint input never resets ambient phase')
      const cloudMotion=[]
      for(const offsets of [Array.from({length:25},(_,i)=>60+i*30),Array.from({length:25},(_,i)=>780-i*30),[1139,1140,1141,1439,1440,0,1]]){
        for(const value of offsets){await offset(value);const current=await read();assert.ok(Math.abs(current.cloudOffset[0]-expectedPhase((300+value)%1440))<1e-10);cloudMotion.push({offset:value,phase:current.cloudOffset})}
      }
      await preset('Daytime');const idleStart=await read();await delay(800);const idleEnd=await read()
      const drift=distance(idleEnd.cloudOffset[1],idleStart.cloudOffset[1])
      if(lite)assert.equal(drift,0,'Lite disables ambient wind')
      else assert.ok(drift>.01&&drift<.04,'Normal gently drifts with fixed Manual time')
      await evaluate(`Array.from(document.querySelectorAll('[aria-label="Time mode"] button')).find(b=>b.textContent==='Live').click()`);await delay(60)
      const live=await read()
      assert.ok(Math.abs(distance(live.cloudOffset[0]+live.cloudOffset[1],idleEnd.cloudOffset[0]+idleEnd.cloudOffset[1]))<.02,'Manual to Live does not teleport clouds')
      await evaluate(`Array.from(document.querySelectorAll('[aria-label="Time mode"] button')).find(b=>b.textContent==='Manual').click()`);await delay(60)
      const manual=await read()
      assert.ok(Math.abs(distance(manual.cloudOffset[0]+manual.cloudOffset[1],live.cloudOffset[0]+live.cloudOffset[1]))<.02,'Live to Manual keeps cloud position')
      await offset(1139);const beforeMidnight=await read();await offset(1140);const midnight=await read()
      assert.ok(Math.abs(beforeMidnight.uniforms.uMoon[0]-midnight.uniforms.uMoon[0])<.004)
      await offset(1439);const beforeFive=await read();await offset(1440);const five=await read()
      assert.ok(Math.abs(beforeFive.uniforms.uSun[0]-five.uniforms.uSun[0])<.004)
      await evaluate(`new Promise(resolve=>{let count=0;const input=document.querySelector('.world-time-panel input'),set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;function frame(){set.call(input,(count*47)%1441);input.dispatchEvent(new Event('input',{bubbles:true}));if(++count<120)requestAnimationFrame(frame);else requestAnimationFrame(resolve)}requestAnimationFrame(frame)})`)
      assert.deepEqual((await read()).resources,initial.resources,'continuous manual scrubbing allocates nothing')
      await click('.world-time-panel__head button')
      // Count actual sky draws per complete existing renderer path.
      const draws=await evaluate(`(async()=>{const s=${scene},m=s.getObjectByName('MinecraftSky'),r=window.__audit.renderers.find(m=>m.scene?.deref()===s).ref.deref(),record=[];
        m.onBeforeRender=function(renderer){record.push(renderer.getRenderTarget()===null?'screen':'target')};
        const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),results=[];
        for(const p of [0,.42,.55,.70]){scrollTo({top:document.querySelector('#portfolio-dive').offsetHeight*p,behavior:'instant'});await wait(900);record.length=0;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));results.push({p,draws:record.slice()})}
        m.onBeforeRender=()=>{};return results})()`)
      for(const row of draws){assert.ok(row.draws.length>0);assert.equal(row.draws.includes('screen'),lite||row.p<.62)}
      await evaluate(`scrollTo({top:0,behavior:'instant'})`);await delay(500)
      const freezeStart=await read()
      await send('Emulation.setFocusEmulationEnabled',{enabled:false});await send('Page.setWebLifecycleState',{state:'frozen'});await delay(1500)
      await send('Page.setWebLifecycleState',{state:'active'});await send('Emulation.setFocusEmulationEnabled',{enabled:true});await delay(100)
      const freezeEnd=await read()
      assert.ok(Math.abs(distance(freezeEnd.cloudOffset[1],freezeStart.cloudOffset[1]))<.02,'tab resume does not catch up ambient wall time')
      await approach();await activate();await until(unlocked);await evaluate(`scrollTo({top:0,behavior:'instant'})`)
      await until(`document.querySelector('.webgl-backdrop').dataset.renderState==='paused'`)
      const parked=await read();await preset('Daytime');await delay(250)
      assert.deepEqual((await read()).cloudOffset,parked.cloudOffset,'time input never wakes parked cloud motion')
      await click('.world-time-panel__head button');await click('.hero__replay');await until(`!(${unlocked})`);await delay(2300)
      const replayed=await read()
      assert.equal(replayed.geometry,initial.geometry,'replay reuses sky resources')
      assert.ok(Math.abs(distance(replayed.cloudOffset[1],parked.cloudOffset[1]))<.2,'replay resumes the wind phase without reset')
      assert.ok(Math.abs(replayed.cloudOffset[0]-expectedPhase(720))<1e-10)
      await evaluate(`(()=>{window.__skyDisposed=[];const m=(${scene}).getObjectByName('MinecraftSky');for(const r of [m.geometry,m.material])r.addEventListener('dispose',()=>window.__skyDisposed.push(r.uuid))})()`)
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
      await until(`window.__skyDisposed.length===2`)
      assert.equal(new Set(await evaluate('window.__skyDisposed')).size,2)
      rows.push({width,lite,initial,cloudPixels,cloudMotion,drift,live,manual,freezeStart,freezeEnd,parked,replayed,draws,disposal:await evaluate('window.__skyDisposed')})
    }
    await fresh({width:390,height:844,reduced:true})
    assert.equal(await evaluate(`document.querySelectorAll('.webgl-backdrop canvas,.hero-aquarium canvas').length`),0)
    await preset('Night');assert.equal(await evaluate(`document.querySelector('.world-time-panel output').value`),'00:00')
    const failure=await send('Page.addScriptToEvaluateOnNewDocument',{source:`const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args)}`})
    const errorCount=errors.length
    await fresh({width:390,height:844})
    assert.equal(await evaluate(`document.querySelectorAll('.webgl-backdrop canvas,.hero-aquarium canvas').length`),0)
    await preset('Daytime');assert.equal(await evaluate(`document.querySelector('.world-time-panel output').value`),'12:00')
    await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:failure.identifier})
    const expectedFailureErrors=errors.splice(errorCount)
    assert.ok(expectedFailureErrors.every(e=>String(e).includes('Error creating WebGL context.')))
    rows.push({reducedAndFailureFallback:true,expectedFailureErrors})
    const applicationErrors=errors.filter(e=>!(e?.source==='network'&&e.url?.endsWith('/favicon.ico')&&e.text?.includes('404')))
    assert.equal(applicationErrors.length,0,JSON.stringify(applicationErrors))
    console.log(`PASS sky browser production: desktop/mobile Normal/Lite, allocation stability, two-pass coverage, exact disposal and static fallbacks`)
  }finally{await writeFile(new URL('production.json',out),JSON.stringify({rows,errors,warnings},null,2));await close()}
}
