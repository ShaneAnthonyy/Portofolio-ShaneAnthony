import assert from 'node:assert/strict'
import {readFile, writeFile, mkdir} from 'node:fs/promises'
import {sampleEnvironment} from '../src/animation/worldTime.js'
import {renderedContrast} from './rendered-contrast.mjs'
import {fresh, evaluate, send, until, click, delay, close, approach, activate, unlocked, output, errors, warnings} from './browser.mjs'

const out = new URL('measurements/world-time/', output)
await mkdir(out, {recursive:true})
const rows = []
const lightingOnly = process.argv.includes('--lighting-only')
await send('Page.addScriptToEvaluateOnNewDocument', {source:
  await readFile(new URL('fixtures/early.js', import.meta.url), 'utf8') + `
  const previousCommit = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot;
  window.__worldAppCommits = 0;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = function(id,root,...args) {
    previousCommit(id,root,...args);
    const visit = fiber => {
      if (fiber.stateNode?.classList?.contains('aqua-root')) {
        let owner=fiber.return; while(owner && typeof owner.type!=='function')owner=owner.return;
        if(owner && owner.memoizedState!==window.__lastWorldAppState){window.__lastWorldAppState=owner.memoizedState;window.__worldAppCommits++}
      }
      for(let child=fiber.child;child;child=child.sibling)visit(child);
    };visit(root.current);
  };
`})

async function screenshot(name) {
  const {data} = await send('Page.captureScreenshot', {format:'png'})
  await writeFile(new URL(`${name}.png`,out), Buffer.from(data,'base64'))
}
const preset = async name => {
  await evaluate(`Array.from(document.querySelectorAll('[aria-label="Time presets"] button')).find(button=>button.textContent.startsWith(${JSON.stringify(name)})).click()`)
  await delay(100)
}
const showController = async () => {
  if (!await evaluate(`!!document.querySelector('.world-time-panel')`)) await click('.world-time-trigger')
  await until(`!!document.querySelector('.world-time-panel input')`)
}
const setOffset = async offset => {
  await evaluate(`(()=>{const input=document.querySelector('.world-time-panel input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${offset});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))})()`)
  await delay(100)
}
const read = () => evaluate(`(()=>{
  const audit=window.__audit,meta=audit.renderers.find(m=>m.scene?.deref()?.getObjectByName('HilltopGround'));
  const scene=meta?.scene.deref(),ground=scene?.getObjectByName('HilltopGround').children[0];
  const ambient=scene?.children.find(n=>n.isAmbientLight), key=scene?.children.find(n=>n.isDirectionalLight);
  return {contexts:audit.contexts.length,appCommits:window.__worldAppCommits,
    theme:document.documentElement.dataset.theme,stored:localStorage.getItem('shane-theme'),
    waterLightCSS:document.querySelector('.hero-surface')?.style.getPropertyValue('--surface-light'),
    posterMinutes:document.querySelector('.hero-aquarium')?.dataset.worldTime,
    output:document.querySelector('.world-time-panel output')?.value,
    offset:document.querySelector('.world-time-panel input')?.value,
    ambient:ambient?.intensity,key:key?.intensity,exposure:meta?.ref.deref()?.toneMappingExposure,
    fog:scene?.fog.color.toArray(),grass:ground?{repeat:ground.material.map.repeat.toArray(),geometry:ground.geometry.uuid,tint:ground.material.color.toArray()}:null,
    resources:audit.snapshot().contexts.map(({created,deleted,connected,lost})=>({created,deleted,connected,lost})),
    renderers:audit.snapshot().renderers.map(({id,connected,info})=>({id,connected,memory:info?.memory,programs:info?.programs})),
    hero:window.__worldHero?{time:window.__worldHero.uniforms?.uTime.value,darkness:window.__worldHero.uniforms?.uDark.value,deep:window.__worldHero.uniforms?.uDeep.value.toArray()}:null,
  }
})()`)

// Snapshot existing scene objects; this instrumentation never enters the bundle.
async function lighting() {
  return evaluate(`(async()=>{
    const meta=window.__audit.renderers.find(m=>m.scene?.deref()?.getObjectByName('HilltopGround')),
      scene=meta.scene.deref(),r=meta.ref.deref(),camera=meta.camera.deref(),
      lights=scene.children.filter(n=>n.isLight),key=lights.find(n=>n.isDirectionalLight),sky=scene.getObjectByName('MinecraftSky'),
      ground=scene.getObjectByName('HilltopGround'),g=ground.children[0].geometry;
    const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a.buffer.slice(a.byteOffset,a.byteOffset+a.byteLength)))).join(',');
    const height=(x,z)=>{const a=g.attributes.position,n=g.parameters.widthSegments,gx=Math.min(n,Math.max(0,(x/120+.5)*n)),gz=Math.min(n,Math.max(0,(z/120+.5)*n)),ix=Math.min(n-1,Math.floor(gx)),iz=Math.min(n-1,Math.floor(gz)),fx=gx-ix,fz=gz-iz,i=iz*(n+1)+ix,A=a.getY(i),B=a.getY(i+n+1),C=a.getY(i+n+2),D=a.getY(i+1);return ground.position.y+(fx+fz<=1?A+(B-A)*fz+(D-A)*fx:C+(D-C)*(1-fz)+(B-C)*(1-fx))};
    scene.updateMatrixWorld(true);
    const shadows=[];
    for(const name of ['StandContactShadow','SignContactShadow']){
      const m=scene.getObjectByName(name),p=m.geometry.attributes.position,c=m.geometry.attributes.color,
        v=key.position.clone(),deltas=[],rgb=new Float32Array(c.count*3);
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);deltas.push(v.y-height(v.x,v.z));rgb.set([c.getX(i),c.getY(i),c.getZ(i)],i*3)}
      const centers=[];for(let i=40;i<p.count;i+=81)centers.push(v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld).toArray());
      shadows.push({name,ids:[m.geometry.uuid,m.material.uuid,m.material.map.uuid],core:await hash(p.array.slice(243)),rgb:await hash(rgb),uv:await hash(m.geometry.attributes.uv.array),index:await hash(m.geometry.index.array),
        cores:Array.from(c.array.slice(324)).filter((_,i)=>i%4===3),alpha:c.getW(40),centers,
        min:Math.min(...deltas),max:Math.max(...deltas),versions:[p.version,c.version],ranges:[p.updateRanges.length,c.updateRanges.length],visible:m.parent.visible});
    }
    const direction=uniform=>sky.localToWorld(uniform.value.clone().multiplyScalar(sky.geometry.parameters.radius)).sub(key.target.position).normalize().toArray();
    return {key:key.position.toArray(),target:key.target.position.toArray(),color:key.color.toArray(),
      lights:lights.map(n=>({type:n.type,intensity:n.intensity,position:n.position.toArray(),layers:n.layers.mask})),cameraLayers:camera.layers.mask,
      sun:direction(sky.material.uniforms.uSun),moon:direction(sky.material.uniforms.uMoon),visibility:[sky.material.uniforms.uSunVisible.value,sky.material.uniforms.uMoonVisible.value],wind:sky.material.uniforms.uCloudOffset.value.y,
      map:{enabled:r.shadowMap.enabled,id:key.shadow.map?.texture.uuid,size:key.shadow.mapSize.toArray(),bounds:[key.shadow.camera.left,key.shadow.camera.right,key.shadow.camera.bottom,key.shadow.camera.top,key.shadow.camera.near,key.shadow.camera.far],bias:key.shadow.bias,normalBias:key.shadow.normalBias,intensity:key.shadow.intensity,auto:r.shadowMap.autoUpdate&&key.shadow.autoUpdate},
      shadows,memory:{...r.info.memory},programs:r.info.programs.length,created:window.__audit.snapshot().contexts[0].created};
  })()`)
}
async function checkLighting() {
  const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-5,`${label}: ${a} vs ${b}`)
  for(const width of [1440,390])for(const lite of [false,true]){
    await fresh({width,height:width===390?844:900,lite})
    await evaluate(`scrollTo({top:document.querySelector('#portfolio-dive').offsetHeight*.8,behavior:'instant'})`);await delay(1100)
    await evaluate(`scrollTo({top:0,behavior:'instant'})`);await delay(1100)
    await showController();await preset('Daytime')
    const initial=await lighting(),samples=[]
    for(const minutes of [360,540,720,960,1080,1140,0]){
      await setOffset((minutes-300+1440)%1440)
      const s=await lighting(),env=sampleEnvironment(minutes),a=s.lights
      for(const [i,value]of [[0,env.ambientIntensity],[1,env.hemiIntensity],[2,env.keyIntensity],[3,env.fillIntensity]])near(a[i].intensity,value,'actual intensity slot '+i)
      assert.deepEqual(s.target,[0,0,0]);assert.deepEqual(a[3].position,[4,6,5]);assert.equal(s.cameraLayers,1)
      near(Math.hypot(...s.key),30,'key radius')
      const weights=[.5*s.visibility[0],.15*s.visibility[1]],x=s.sun[0]*weights[0]+s.moon[0]*weights[1],z=s.sun[2]*weights[0]+s.moon[2]*weights[1],h=Math.hypot(x,z),kh=Math.hypot(s.key[0],s.key[2])
      near(s.key[0]/kh,x/h,'projected world X bearing');near(s.key[2]/kh,z/h,'projected world Z bearing')
      assert.equal(s.map.enabled,!lite)
      for(const field of ['bounds','size','bias','normalBias'])assert.deepEqual(s.map[field],initial.map[field],'fixed map '+field)
      if(!lite){assert.deepEqual(s.map.bounds,[-48,48,-48,48,1,60]);assert.deepEqual(s.map.size,[1024,1024]);near(s.map.bias,-.0005,'bias');near(s.map.normalBias,.02,'normal bias')}
      near(s.map.intensity,env.shadowFactor,'mapped strength');assert.equal(s.map.auto,true)
      assert.equal(s.map.id,initial.map.id);assert.deepEqual(s.created,initial.created);assert.deepEqual(s.memory,initial.memory);assert.equal(s.programs,initial.programs)
      for(let i=0;i<2;i++){
        const patch=s.shadows[i],original=initial.shadows[i]
        for(const field of ['ids','core','rgb','uv','index'])assert.deepEqual(patch[field],original[field],patch.name+' retained '+field)
        assert.ok(patch.cores.every(alpha=>Math.abs(alpha-.82)<1e-6),'all five core alphas remain 0.82')
        near(patch.alpha,(i===0?.2:.17)-(i===0?.14:.12)*env.darkness,'broad alpha')
        assert.ok(patch.min>.0039&&patch.max<.0041,'triangle terrain clearance')
        const anchor=i===0?original.centers.slice(1).reduce((sum,p)=>sum.map((v,j)=>v+p[j]/4),[0,0,0]):original.centers[1]
        const dx=patch.centers[0][0]-anchor[0],dz=patch.centers[0][2]-anchor[2]
        assert.ok(dx*s.key[0]+dz*s.key[2]<0,'broad shadow opposes actual light')
      }
      assert.equal(s.shadows[1].visible,width>=720,'responsive sign policy')
      if(minutes===720||minutes===0){const expected=env.keyColor;s.color.forEach((v,i)=>near(v,expected[i],'neutral day/cool night'))}
      samples.push({minutes,...s})
    }
    await preset('Daytime');const held=await lighting();await delay(500);const later=await lighting()
    assert.deepEqual(later.shadows.map(p=>p.versions),held.shadows.map(p=>p.versions),'cloud wind does not rewrite shadows')
    if(!lite)assert.notEqual(held.wind,later.wind)
    const continuity=[]
    for(const offset of [0,1440,1139,1140,1141,59,60,61,779,780,781,60,780,420,1140]){await setOffset(offset);continuity.push({offset,key:(await lighting()).key})}
    assert.deepEqual(continuity[0].key,continuity[1].key,'both 05:00 endpoints have identical light pose')
    for(const [i,j]of [[2,3],[3,4],[5,6],[6,7],[8,9],[9,10]])assert.ok(Math.hypot(...continuity[i].key.map((v,k)=>v-continuity[j].key[k]))<2,'continuous horizon/midnight pose')
    await setOffset(0)
    const travel=await evaluate(`new Promise(resolve=>{
      const input=document.querySelector('.world-time-panel input'),set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set,
        scene=window.__audit.renderers.find(m=>m.scene?.deref()?.getObjectByName('HilltopGround')).scene.deref(),key=scene.children.find(n=>n.isDirectionalLight),poses=[],
        offsets=[...new Set([...Array.from({length:181},(_,i)=>i*8),...Array.from({length:81},(_,i)=>20+i),...Array.from({length:81},(_,i)=>740+i)])].sort((a,b)=>a-b),path=offsets.concat(offsets.slice(0,-1).reverse());
      let step=0,maxRanges=0;
      function frame(){set.call(input,path[step]);input.dispatchEvent(new Event('input',{bubbles:true}));poses.push(key.position.toArray());
        for(const name of ['StandContactShadow','SignContactShadow'])for(const attr of ['position','color'])maxRanges=Math.max(maxRanges,scene.getObjectByName(name).geometry.attributes[attr].updateRanges.length);
        if(++step<path.length)requestAnimationFrame(frame);else requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({poses,maxRanges,path})));
      }requestAnimationFrame(frame);
    })`)
    rows.push({lighting:true,width,lite,samples,continuity,travel})
    assert.ok(travel.maxRanges<=1,'hidden buffers retain at most one merged dirty range')
    for(let i=2;i<travel.poses.length;i++)assert.ok(Math.hypot(...travel.poses[i].map((v,k)=>v-travel.poses[i-1][k]))<8,'forward/reverse celestial handoff stays continuous: '+JSON.stringify({i,previous:travel.poses[i-1],pose:travel.poses[i]}))
    const final=await lighting();assert.deepEqual(final.created,initial.created);assert.equal(final.programs,initial.programs)
    assert.deepEqual(final.shadows.map(p=>p.core),initial.shadows.map(p=>p.core))
    console.log('PASS projected lighting and contact shadows',width,lite?'Lite':'Normal')
  }
}

try {
  for (const width of lightingOnly ? [] : [1440,390]) for (const theme of ['light','dark']) {
    const height=width===390?844:900, label=`production-${width}-${theme}`
    await fresh({width,height,legacyTheme:theme})
    assert.equal(await evaluate(`!!document.querySelector('.world-time-trigger')`),true)

    await evaluate(`(async()=>{
      const url=performance.getEntriesByType('resource').find(r=>r.name.includes('BufferGeometryUtils-')&&r.name.endsWith('.js')).name;
      const T=Object.values(await import(url)).find(v=>v?.Object3D&&v.WebGLRenderer),previous=T.Object3D.prototype.onBeforeRender;
      T.Object3D.prototype.onBeforeRender=function(renderer,scene,camera,geometry,material,...rest){
        if(renderer.domElement.closest('.hero-aquarium')&&material?.uniforms?.uDeep)window.__worldHero={renderer,uniforms:material.uniforms};
        return previous.call(this,renderer,scene,camera,geometry,material,...rest)
      };
    })()`)
    await evaluate(`scrollTo({top:document.querySelector('#portfolio-dive').offsetHeight*.55,behavior:'instant'})`)
    await delay(1200)
    await evaluate(`scrollTo({top:0,behavior:'instant'})`)
    await delay(1000)
    await showController()
    const bounds=await evaluate(`document.querySelector('.world-time-panel').getBoundingClientRect().toJSON()`)
    assert.ok(bounds.left>=0 && bounds.right<=width && bounds.top>=0 && bounds.bottom<=height,'popover fits viewport')
    const before=await read(), snapshots=[]
    for (const [name,time] of [['Sunrise','06:00'],['Daytime','12:00'],['Sunset','18:00'],['Night','00:00']]) {
      await preset(name)
      const state=await read()
      assert.equal(state.output,time)
      assert.equal(state.theme,undefined);assert.equal(state.stored,null)
      assert.deepEqual(state.grass.repeat,[124,124])
      assert.equal(state.grass.geometry,before.grass.geometry)
      assert.deepEqual(state.resources.map(r=>r.created),before.resources.map(r=>r.created),'time creates no GL resources')
      snapshots.push({name,...state})
      await screenshot(`${label}-${name.toLowerCase()}-front`)
    }
    assert.notEqual(snapshots[1].ambient,snapshots[3].ambient,'Dive lighting responds')
    assert.notEqual(snapshots[1].waterLightCSS,snapshots[3].waterLightCSS,'scoped Hero CSS tokens share the environment sample')
    assert.equal(await evaluate(`document.documentElement.style.getPropertyValue('--world-sky-top')`),'','scrubbing does not publish unused inheriting root tokens')
    assert.equal((await read()).appCommits,before.appCommits,'time input does not render App')
    await setOffset(1139);assert.equal((await read()).output,'23:59')
    await setOffset(1140);assert.equal((await read()).output,'00:00');assert.equal((await read()).offset,'1140')
    await setOffset(1440);assert.equal((await read()).offset,'1440');assert.equal((await read()).output,'05:00')
    await setOffset(0);assert.equal((await read()).offset,'0');assert.equal((await read()).output,'05:00')
    await evaluate(`document.querySelector('.world-time-panel input').focus()`)
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'End',code:'End',windowsVirtualKeyCode:35})
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'End',code:'End',windowsVirtualKeyCode:35})
    await delay(100);assert.equal((await read()).offset,'1440','native keyboard range input')
    const slider=await evaluate(`(()=>{const r=document.querySelector('.world-time-panel input').getBoundingClientRect();return {x:r.left+r.width*.45,y:r.top+r.height/2}})()`)
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...slider})
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:slider.x+35,y:slider.y})
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:slider.x+35,y:slider.y})
    await delay(100);assert.notEqual((await read()).offset,'1440','native pointer range input')
    if (width===390) {
      const previous=(await read()).offset
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:slider.x,y:slider.y,id:1}]})
      await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:slider.x+65,y:slider.y,id:1}]})
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
      await delay(100);assert.notEqual((await read()).offset,previous,'native touch range input')
    }
    await preset('Night')
    await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'light':'dark')}`)
    await delay(400)
    assert.equal((await read()).ambient,snapshots[3].ambient,'obsolete DOM attribute cannot override the canonical sample')
    await evaluate(`document.documentElement.removeAttribute('data-theme')`)
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
    await until(`!document.querySelector('.world-time-panel')`)
    assert.equal(await evaluate(`document.activeElement===document.querySelector('.world-time-trigger')`),true)
    await evaluate(`scrollTo({top:document.querySelector('#portfolio-dive').offsetHeight*.55,behavior:'instant'})`)
    await delay(700)
    await screenshot(`${label}-night-elevated`)
    await approach();await activate();await until(unlocked);await evaluate(`scrollTo({top:0,behavior:'instant'})`)
    await until(`!!window.__worldHero`)
    await delay(500)
    assert.equal((await read()).hero.darkness,1,'newly activated Hero uses latest Night sample')
    await showController()
    const heroStart=await read()
    await click('.world-time-panel__head button')
    const contrast=[]
    for(const selector of ['.hero__title','.hero__role','.navbar__logo','.hero__replay']){
      const {png,...result}=await renderedContrast(selector,{large:selector==='.hero__title'})
      assert.ok(result.minimum>=result.threshold,selector+' actual composited contrast '+result.minimum)
      contrast.push(result)
    }
    await showController()
    const parkedDraws=await evaluate(`window.__audit.contexts.find(c=>c.canvas.deref()?.closest('.webgl-backdrop')).draws`)
    for (const [name,time] of [['Sunrise','06:00'],['Daytime','12:00'],['Sunset','18:00'],['Night','00:00']]) {
      await preset(name);await delay(60)
      const state=await read()
      assert.equal(state.output,time)
      assert.ok(state.hero.time<100,'water clock remains animation seconds')
      assert.equal(state.contexts,heroStart.contexts)
      assert.deepEqual(state.resources.map(r=>r.created),heroStart.resources.map(r=>r.created))
      await screenshot(`${label}-${name.toLowerCase()}-hero`)
    }
    assert.equal(await evaluate(`window.__audit.contexts.find(c=>c.canvas.deref()?.closest('.webgl-backdrop')).draws`),parkedDraws,'time does not wake parked Dive')
    await click('.world-time-panel__head button')
    await evaluate(`scrollTo({top:document.querySelector('#home').offsetHeight*.95,behavior:'instant'})`)
    await until(`document.querySelector('.hero-aquarium').dataset.state==='parked'`)
    const heroParked=await evaluate(`({draws:window.__audit.contexts.find(c=>c.canvas.deref()===window.__worldHero.renderer.domElement).draws,id:window.__worldHero.renderer.domElement.dataset.worldTestId='held'})`)
    await showController();await preset('Daytime')
    assert.equal(await evaluate(`window.__audit.contexts.find(c=>c.canvas.deref()===window.__worldHero.renderer.domElement).draws`),heroParked.draws,'time does not wake parked Hero')
    await click('.world-time-panel__head button')
    await evaluate(`scrollTo({top:0,behavior:'instant'})`)
    await until(`document.querySelector('.hero-aquarium').dataset.state==='running'`)
    await delay(150)
    assert.equal((await read()).hero.darkness,0,'parked Hero applies latest day sample before rendering')
    assert.equal(await evaluate(`window.__worldHero.renderer.domElement.dataset.worldTestId`),'held','time does not remount parked Hero')
    await showController()
    await preset('Daytime')
    await click('.world-time-panel__head button')
    await click('.hero__replay')
    await until(`!(${unlocked})`);await delay(2300)
    const resumed=await read()
    assert.ok(resumed.ambient>1,'replayed Dive applies selected day before drawing')
    assert.equal(resumed.grass.geometry,before.grass.geometry)
    assert.ok(resumed.resources.filter(r=>r.connected&&!r.lost).length<=2,'replay keeps only the existing renderer owners live')
    await showController()
    await evaluate(`Array.from(document.querySelectorAll('[aria-label="Time mode"] button')).find(button=>button.textContent==='Live').click()`)
    await delay(100)
    const local=await evaluate(`new Date().getHours()*60+new Date().getMinutes()`)
    assert.ok(Math.abs(Number((await read()).posterMinutes)-local)<1.1,'Live samples device-local time')
    rows.push({label,before,snapshots,heroStart,resumed,contrast})
    console.log('PASS World Time browser',label)
  }
  await checkLighting()
  for (const reduced of [false,true]) {
    await fresh({width:390,height:844,lite:!reduced,reduced})
    await showController();await preset('Sunset')
    assert.equal((await read()).output,'18:00')
    assert.equal(await evaluate(`document.querySelector('.hero-aquarium')?.dataset.state`),'poster')
    if(reduced)assert.equal(await evaluate(`document.querySelectorAll('canvas').length`),0)
    rows.push({fallback:reduced?'reduced':'lite',...await read()})
  }
  assert.equal(errors.filter(error=>!JSON.stringify(error).includes('favicon')).length,0,'no application console errors')
} finally {
  await writeFile(new URL(`${'on'}-results.json`,out),JSON.stringify({rows,errors,warnings},null,2))
  await close()
}
