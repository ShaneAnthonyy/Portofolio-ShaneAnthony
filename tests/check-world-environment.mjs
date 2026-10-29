import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {sampleEnvironment,environmentCSS} from '../src/animation/worldTime.js'
import {worldPresentation} from '../src/animation/worldPresentation.js'
import {fresh,send,evaluate,until,click,delay,approach,activate,unlocked,close,errors,warnings} from './browser.mjs'

const rows=[],out=new URL('measurements/world-environment/',import.meta.url)
await mkdir(out,{recursive:true})
await send('Page.addScriptToEvaluateOnNewDocument',{source:await readFile(new URL('fixtures/early.js',import.meta.url),'utf8')+`
 const commit=window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot;
 window.__environmentAppCommits=0;
 window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot=function(id,root,...args){commit(id,root,...args);const visit=f=>{if(f.stateNode?.classList?.contains('aqua-root')){let owner=f.return;while(owner&&typeof owner.type!=='function')owner=owner.return;if(owner&&owner.memoizedState!==window.__environmentAppState){window.__environmentAppState=owner.memoizedState;window.__environmentAppCommits++}}for(let c=f.child;c;c=c.sibling)visit(c)};visit(root.current)};
`})
const show=async()=>{if(!await evaluate(`!!document.querySelector('.world-time-panel')`))await click('.world-time-trigger')}
const preset=async name=>{await show();await evaluate(`[...document.querySelectorAll('[aria-label="Time presets"] button')].find(b=>b.textContent.startsWith(${JSON.stringify(name)})).click()`);await delay(100)}
const offset=async value=>{await evaluate(`(()=>{const i=document.querySelector('.world-time-panel input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${value});i.dispatchEvent(new Event('input',{bubbles:true}))})()`);await delay(80)}
const read=()=>evaluate(`(()=>{const el=document.querySelector('.world-environment'),s=el&&getComputedStyle(el),a=window.__audit.snapshot();return{opacity:Number(s?.opacity),visibility:s?.visibility,minutes:el?.dataset.minutes,owner:document.querySelector('.aqua-root').dataset.contentBackground,rect:el?.getBoundingClientRect().toJSON(),width:document.documentElement.clientWidth,height:innerHeight,
 nodes:el?.querySelectorAll('*').length,stars:el?.querySelector('.world-environment__stars path').getAttribute('d'),cloudShapes:[...el?.querySelectorAll('pattern path')||[]].map(p=>p.getAttribute('d')),phase:el?.querySelector('.world-environment__wind svg').style.transform,top:s?.getPropertyValue('--world-top').trim(),
 sun:el?.querySelector('[data-sun]').style.cssText,moon:el?.querySelector('[data-moon]').style.cssText,animations:el?.getAnimations({subtree:true}).map(a=>({state:a.playState,time:a.currentTime})),
 rootVars:[...document.documentElement.style].filter(k=>k.startsWith('--world-')),appCommits:window.__environmentAppCommits,contexts:a.contexts.map(({created,draws,connected})=>({created,draws,connected})),
 dive:document.querySelector('.webgl-backdrop')?.dataset.renderState,hero:document.querySelector('.hero-aquarium')?.dataset.state,
 overflow:document.documentElement.scrollWidth>innerWidth,theme:document.documentElement.dataset.theme,stored:localStorage.getItem('shane-theme'),
 wrappers:['main','.portfolio-sections'].map(q=>{const n=getComputedStyle(document.querySelector(q));return{transform:n.transform,filter:n.filter,contain:n.contain}})}})()`)
// Transparent UI is checked over actual screenshot pixels in check-world-presentation.
const presentation=()=>evaluate(`Object.fromEntries([...document.querySelector('#about').style].filter(k=>k.startsWith('--world-')).map(k=>[k,document.querySelector('#about').style.getPropertyValue(k)]))`)

try{
 for(const width of [1440,390])for(const theme of ['light','dark'])for(const mode of ['normal','lite','reduced']){
  await fresh({width,height:width===390?844:900,legacyTheme:theme,lite:mode==='lite',reduced:mode==='reduced'})
  assert.equal(await evaluate(`document.querySelectorAll('.world-environment').length`),1)

  if(mode!=='reduced'){await approach();await activate();await until(unlocked)}
  await evaluate(`scrollTo({top:0,behavior:'instant'})`);await delay(300)
  assert.equal((await read()).opacity,0,'Hero retains its original water background')
  await evaluate(`scrollTo({top:document.querySelector('#home').offsetHeight*.15,behavior:'instant'})`);await delay(150)
  const crossing=await read();assert.ok(crossing.opacity>0&&crossing.opacity<1,'bounded forward handoff')
  await evaluate(`scrollTo({top:document.querySelector('#home').offsetHeight*.95,behavior:'instant'})`);await delay(400)
  const initial=await read();assert.equal(initial.opacity,1);assert.equal(initial.owner,'true')
  assert.deepEqual(await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('.portfolio-sections'));return [s.backgroundImage,s.backgroundColor]})()`),['none','rgba(0, 0, 0, 0)'],'legacy Lite backgrounds do not obscure the shared sky')
  assert.equal(initial.visibility,'visible');assert.equal(initial.overflow,false);assert.equal(initial.rect.width,initial.width);assert.equal(initial.rect.height,initial.height)
  assert.ok(initial.wrappers.every(s=>s.transform==='none'&&s.filter==='none'&&s.contain==='none'),'wrappers keep their original containing-block behavior')
  if(mode!=='reduced'){assert.equal(initial.dive,'paused');assert.equal(initial.hero,mode==='lite'?'poster':'parked')}
  assert.equal(await evaluate(`(()=>{const e=document.querySelector('.world-environment');return getComputedStyle(e).pointerEvents==='none'&&e.getAttribute('aria-hidden')==='true'&&!e.querySelector('canvas,button,a,input,[tabindex]')})()`),true)
  const samples=[]
  for(const [name,minutes]of [['Sunrise',360],['Daytime',720],['Sunset',1080],['Night',0]]){
   await preset(name);await until(`Number(document.querySelector('.world-environment').dataset.minutes)===${minutes}`,2000)
   const s=await read();assert.equal(Number(s.minutes),minutes);assert.equal(s.top,environmentCSS(sampleEnvironment(minutes).skyZenith))
   assert.equal(s.nodes,initial.nodes);assert.equal(s.stars,initial.stars);assert.deepEqual(s.cloudShapes,initial.cloudShapes);assert.deepEqual(s.rootVars,[])
   assert.equal(s.theme,undefined);assert.equal(s.stored,null);assert.deepEqual(s.contexts.map(c=>c.created),initial.contexts.map(c=>c.created))
   const expected=worldPresentation(sampleEnvironment(minutes)).ui
   await until(`document.querySelector('#about').style.getPropertyValue('--world-primary')===${JSON.stringify(expected['--world-primary'])}`)
   const palette=await presentation();assert.deepEqual(palette,expected)
   samples.push({name,...s,palette})
  }
  const commits=(await read()).appCommits
  for(const value of [0,1440,1139,1140,1141,420,60,780,1140]){await offset(value);assert.equal((await read()).appCommits,commits,'time never renders App')}
  await offset(0);const first=await read();await offset(1440);const last=await read()
  assert.deepEqual([last.phase,last.sun,last.moon],[first.phase,first.sun,first.moon],'both 05:00 endpoints are identical')
  if(mode==='normal'&&theme==='dark'){
   const inputStart=await read()
   await evaluate(`new Promise(resolve=>{const i=document.querySelector('.world-time-panel input'),set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;let step=0;function tick(){set.call(i,step<=180?step*8:(360-step)*8);i.dispatchEvent(new Event('input',{bubbles:true}));if(++step<=360)requestAnimationFrame(tick);else requestAnimationFrame(()=>requestAnimationFrame(resolve))}requestAnimationFrame(tick)})`)
   const inputEnd=await read();assert.equal(inputEnd.appCommits,inputStart.appCommits);assert.deepEqual(inputEnd.contexts.map(c=>c.created),inputStart.contexts.map(c=>c.created));assert.deepEqual(inputEnd.cloudShapes,inputStart.cloudShapes);assert.equal(inputEnd.nodes,inputStart.nodes)
   await offset(420);const forward=await read();await offset(600);const moved=await read();await offset(420);const reverse=await read()
   assert.notEqual(moved.phase,forward.phase);assert.deepEqual([reverse.phase,reverse.sun,reverse.moon],[forward.phase,forward.sun,forward.moon],'cloud and celestial displacement reverses exactly')
   await evaluate(`[...document.querySelectorAll('[aria-label="Time mode"] button')].find(b=>b.textContent==='Live').click()`);await delay(100)
   const live=await read(),local=await evaluate(`new Date().getHours()*60+new Date().getMinutes()+new Date().getSeconds()/60`)
   assert.ok(Math.abs(((Number(live.minutes)-local+2160)%1440)-720)<1,'environment follows device-local Live time')
   const period=live.width/2,phaseDelta=parseFloat(live.phase.slice(12))-parseFloat(reverse.phase.slice(12))
   assert.ok(Math.abs(((phaseDelta+period*1.5)%period)-period/2)<1e-3,'Manual to Live preserves visible cloud phase')
   await evaluate(`[...document.querySelectorAll('[aria-label="Time mode"] button')].find(b=>b.textContent==='Manual').click()`);await delay(100)
   const manual=await read();await delay(200);assert.equal((await read()).minutes,manual.minutes)
   rows.push({width,continuousInput:{inputStart,inputEnd,forward,moved,reverse,live,manual}})
  }
  const held=await read();await delay(300);const later=await read()
  assert.equal(held.contexts[0]?.draws,later.contexts[0]?.draws,'obscured Dive stops drawing')
  if(mode==='normal')assert.ok(later.animations.some(a=>a.state==='running'))
  else {assert.equal(later.animations.filter(a=>a.state==='running').length,0,'Lite/Reduced Motion disable ambient drift');assert.deepEqual(later.animations.map(a=>a.time),held.animations.map(a=>a.time),'static modes retain cloud phase')}
  await click('.world-time-panel__head button')
  await evaluate(`document.querySelector('#skills').scrollIntoView({behavior:'instant'})`);await delay(450)
  await click('.guide-btn');await until(`!!document.querySelector('#skills-guide')`)
  if(width===390)assert.equal(await evaluate(`document.querySelector('#skills-guide').parentElement===document.body`),true,'mobile guide stays in its body portal')
  if(width===390){const alpha=await evaluate(`(()=>{const c=new OffscreenCanvas(1,1).getContext('2d');c.fillStyle=getComputedStyle(document.querySelector('#skills-guide')).backgroundColor;c.fillRect(0,0,1,1);return c.getImageData(0,0,1,1).data[3]})()`);if(mode==='normal')assert.ok(alpha>=180&&alpha<255,'mobile guide uses strong adaptive glass');else assert.equal(alpha,255,'static modes keep the opaque guide fallback')}
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until(`!document.querySelector('#skills-guide')`)
  await evaluate(`document.querySelector('#projects').scrollIntoView({behavior:'instant'})`);await delay(450)
  const beforeModal=await read(),relativeCloudPhase=parseFloat(beforeModal.phase.slice(12))/beforeModal.width
  await evaluate(`document.querySelector('.tidal-card[data-position="0"]').click()`);await until(`!!document.querySelector('.slider-detail')`)
  await until(`(()=>{const e=document.querySelector('.world-environment');return Math.abs(parseFloat(e.querySelector('.world-environment__wind svg').style.transform.slice(12))/e.clientWidth-(${relativeCloudPhase}))<.00001})()`)
  assert.equal(await evaluate(`document.body.style.overflow`),'hidden')
  assert.equal(await evaluate(`document.activeElement.closest('.slider-detail')!==null`),true,'modal keeps focus above decorative environment')
  if(mode==='lite')assert.equal(await evaluate(`getComputedStyle(document.querySelector('.slider-detail')).backdropFilter`),'none')
  await click('.slider-detail__close');await until(`!document.querySelector('.slider-detail')`)
  if(mode==='normal'&&theme==='dark'){
   await evaluate(`document.querySelector('.contact__form input[name="name"]').scrollIntoView({block:'center',behavior:'instant'})`);await click('.contact__form input[name="name"]');await send('Input.insertText',{text:'Phase 05A check'})
   assert.equal(await evaluate(`document.querySelector('.contact__form input[name="name"]').value`),'Phase 05A check')
   await evaluate(`document.querySelector('.contact__copy').scrollIntoView({block:'center',behavior:'instant'})`);await click('.contact__copy');await until(`document.querySelector('.contact__copy').textContent==='Copied'`)
   assert.equal(await evaluate(`[...document.querySelectorAll('.contact__details a')].every(a=>a.href.startsWith('https://')&&a.target==='_blank')`),true)
  }
  await evaluate(`document.querySelector('#footer').scrollIntoView({behavior:'instant',block:'end'})`);await delay(300)
  assert.equal((await read()).opacity,1,'one environment includes Footer outside main')
  await evaluate(`scrollTo({top:0,behavior:'instant'})`);await delay(300)
  assert.equal((await read()).opacity,0,'reverse scroll restores Hero ownership')
  if(mode==='normal'&&theme==='dark'){
   await preset('Night');const inactive=await read();await preset('Daytime');assert.equal((await read()).minutes,inactive.minutes,'hidden content presentation retains data without repainting')
   await click('.world-time-panel__head button')
   await evaluate(`document.querySelector('#about').scrollIntoView({behavior:'instant'})`);await until(`Number(document.querySelector('.world-environment').dataset.minutes)===720`)
   await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await until(`!document.querySelector('.webgl-backdrop canvas')`)
   await evaluate(`document.querySelector('#about').scrollIntoView({behavior:'instant'})`);await until(`Number(getComputedStyle(document.querySelector('.world-environment')).opacity)===1`)
   assert.equal((await read()).animations.filter(a=>a.state==='running').length,0)
   await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await until(`!!document.querySelector('.webgl-backdrop canvas')`)
   await evaluate(`document.querySelector('#about').scrollIntoView({behavior:'instant'})`);await until(`Number(getComputedStyle(document.querySelector('.world-environment')).opacity)===1`)
   await evaluate(`scrollTo({top:0,behavior:'instant'})`);await until(`Number(getComputedStyle(document.querySelector('.world-environment')).opacity)===0`)
   await click('.hero__replay');await until(`!(${unlocked})`);await delay(2300)
   const replay=await read();assert.equal(replay.opacity,0);assert.notEqual(replay.dive,'paused','replay releases Dive renderer');rows.push({width,mode,replay})
  }
  rows.push({width,theme,mode,crossing,initial,samples,first,last,held,later})
  console.log('PASS shared environment',width,theme,mode)
 }
 const failure=await send('Page.addScriptToEvaluateOnNewDocument',{source:`const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args)}`}),errorCount=errors.length
await fresh({width:390,height:844});await evaluate(`document.querySelector('#about').scrollIntoView({behavior:'instant'})`);await preset('Night')
const fallback=await read();assert.equal(fallback.opacity,1);assert.equal(Number(fallback.minutes),0);assert.equal(fallback.contexts.length,0)
assert.equal(await evaluate(`document.querySelectorAll('.webgl-backdrop canvas,.hero-aquarium canvas').length`),0)
await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:failure.identifier})
const expectedFailureErrors=errors.splice(errorCount);assert.ok(expectedFailureErrors.every(e=>String(e).includes('Error creating WebGL context.')))
rows.push({failedWebGL:true,fallback,expectedFailureErrors})
 assert.equal(errors.filter(e=>!JSON.stringify(e).includes('favicon')).length,0,JSON.stringify(errors))
}finally{await writeFile(new URL(`production-results.json`,out),JSON.stringify({rows,errors,warnings},null,2));await close()}
