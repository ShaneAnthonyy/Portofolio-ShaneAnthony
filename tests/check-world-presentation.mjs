import assert from 'node:assert/strict'
import {sampleEnvironment,environmentCSS} from '../src/animation/worldTime.js'
import {worldPresentation,underwaterColors} from '../src/animation/worldPresentation.js'

const times=[360,540,720,960,1080,1140,0],keys=Object.keys(worldPresentation(sampleEnvironment(0)).ui)
assert.equal(keys.length,10)
assert.deepEqual(worldPresentation(sampleEnvironment(0)),worldPresentation(sampleEnvironment(1440)))
for(let m=0;m<1440;m++){
 const p=worldPresentation(sampleEnvironment(m)),a=worldPresentation(sampleEnvironment(m-.001)),b=worldPresentation(sampleEnvironment(m+.001))
 assert.ok(Number(p.ui['--world-alpha'])>=.3&&Number(p.ui['--world-alpha'])<.5)
 assert.ok(Number(p.ui['--world-edge-alpha'])>=.065&&Number(p.ui['--world-edge-alpha'])<=.1)
 assert.ok(Object.values(p.ui).every(v=>!v.includes('NaN')))
 for(const key of ['water','depth','reflection'])assert.ok(p[key].split(' ').map(Number).every(v=>Number.isFinite(v)&&v>=0&&v<=255))
 for(const k of keys){const x=a.ui[k].match(/[\d.]+/g).map(Number),y=b.ui[k].match(/[\d.]+/g).map(Number);assert.ok(x.every((v,i)=>Math.abs(v-y[i])<=1),`continuous palette ${m} ${k}`)}
}
assert.equal(new Set(times.map(m=>JSON.stringify(worldPresentation(sampleEnvironment(m))))).size,7)
assert.equal(worldPresentation(sampleEnvironment(720)).ui['--world-edge-alpha'],'0.065')
assert.equal(worldPresentation(sampleEnvironment(0)).ui['--world-edge-alpha'],'0.100')
assert.ok(Number(worldPresentation(sampleEnvironment(360)).ui['--world-edge-alpha'])<.075,'bright twilight glass keeps its restrained reflection')
assert.notEqual(underwaterColors(sampleEnvironment(960)).reflection,underwaterColors(sampleEnvironment(720)).reflection)
assert.equal(underwaterColors(sampleEnvironment(0)).reflection,environmentCSS(sampleEnvironment(0).waterLight).slice(4,-1),'night water light stays unchanged')
console.log('PASS continuous underwater palette: seven distinct times, all-minute bounds, midnight and stable semantic keys')

if(process.argv.includes('--browser')){
 const quick=process.argv.includes('--quick')
 const {readFile,writeFile,mkdir}=await import('node:fs/promises')
 const {fresh,send,evaluate,until,click,delay,approach,activate,unlocked,close,errors,warnings}=await import('./browser.mjs')
 const {renderedContrast}=await import('./rendered-contrast.mjs')
 const out=new URL('measurements/world-presentation/',import.meta.url),rows=[],failures=[]
 await mkdir(out,{recursive:true})
 await send('Page.addScriptToEvaluateOnNewDocument',{source:await readFile(new URL('fixtures/early.js',import.meta.url),'utf8')})
 const setTime=async m=>{
  if(!await evaluate(`!!document.querySelector('.world-time-panel')`))await click('.world-time-trigger')
  await evaluate(`(()=>{const i=document.querySelector('.world-time-panel input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${(m-300+1440)%1440});i.dispatchEvent(new Event('input',{bubbles:true}))})()`);await delay(150);await click('.world-time-panel__head button')
 }
 let shot=0,context={}
 const check=async(selector,options={})=>{
  const {png,...r}=await renderedContrast(selector,options),filename=`contrast-${String(++shot).padStart(4,'0')}.png`;await writeFile(new URL(filename,out),Buffer.from(png,'base64'));rows.push({kind:'contrast',...context,filename,...r});if(r.minimum<r.threshold){failures.push({...context,selector,minimum:r.minimum,threshold:r.threshold});console.log('FAIL actual contrast',context.minutes,selector,r.minimum.toFixed(2),'requires',r.threshold)}
 }
 try{
  for(const width of quick?[1440]:[1440,390])for(const mode of quick?['normal']:['normal','lite','reduced']){
   await fresh({width,height:width===390?844:900,legacyTheme:'light',lite:mode==='lite',reduced:mode==='reduced'})
   if(mode!=='reduced'){await approach();await activate();await until(unlocked)}
   const palette=[]
   for(const minutes of times){
    context={width,mode,minutes}
    await setTime(minutes)
    if(mode==='reduced')assert.equal(await evaluate(`[...document.querySelectorAll('[data-world-ui]')].flatMap(e=>e.getAnimations({subtree:true})).filter(a=>a instanceof CSSTransition&&a.playState==='running').length`),0,'Reduced Motion has no palette color transitions')
    await evaluate(`scrollTo({top:0,behavior:'instant'})`);await delay(900);await check('.hero__title',{large:true});await check('.hero__role');await check('.navbar__logo');if(width===1440)await check('.navbar__link')
    await evaluate(`document.querySelector('#about').scrollIntoView({behavior:'instant'})`);await delay(950)
    const state=await evaluate(`(()=>{const el=document.querySelector('#about'),s=getComputedStyle(document.querySelector('.about-card--intro')),n=getComputedStyle(document.querySelector('.navbar')),env=document.querySelector('.world-environment');return{ui:[...el.style].filter(k=>k.startsWith('--world-')).map(k=>[k,el.style.getPropertyValue(k)]),theme:document.documentElement.dataset.theme,stored:localStorage.getItem('shane-theme'),alpha:s.backgroundColor,blur:s.backdropFilter,edge:s.borderTopColor,navAlpha:n.backgroundColor,navBlur:n.backdropFilter,optics:getComputedStyle(env,'::after').backgroundImage,heads:[...document.querySelectorAll('.about-bento__head,.section__rail,.projects__head')].map(e=>getComputedStyle(e).backgroundImage),rootVars:[...document.documentElement.style].filter(k=>k.startsWith('--world-'))}})()`)
    assert.equal(state.theme,undefined);assert.equal(state.stored,null);assert.deepEqual(state.rootVars,[]);assert.ok(state.optics.includes('linear-gradient'));assert.ok(state.heads.every(v=>v==='none'))
    assert.deepEqual(Object.fromEntries(state.ui),worldPresentation(sampleEnvironment(minutes)).ui)
    if(mode==='normal'){assert.ok(state.alpha.startsWith('rgba('));assert.ok(Math.abs(Number(state.alpha.match(/[\d.]+/g).at(-1))-Number(worldPresentation(sampleEnvironment(minutes)).ui['--world-alpha']))<.005,'approved glass opacity is preserved');assert.equal(state.blur,'blur(6px)');assert.equal(state.navBlur,'blur(8px)')}
    else{assert.ok(state.alpha.startsWith('rgb('));assert.equal(state.blur,'none');assert.equal(state.navBlur,'none')}
    if(minutes===0){const edge=Number(state.edge.match(/[\d.]+/g).at(-1));assert.ok(edge>.2&&edge<.23,'moonlit card edge is reflective without an opaque outline')}
    const transitions=await evaluate(`Object.fromEntries(['.navbar','.navbar__link','.guide-btn','.depth-zone__skill','.about-card--intro','.contact__copy'].map(selector=>{const s=getComputedStyle(document.querySelector(selector));return[selector,{properties:s.transitionProperty,durations:s.transitionDuration}]}))`)
    if(mode==='normal'){
     for(const selector of ['.navbar','.navbar__link','.guide-btn','.depth-zone__skill'])assert.ok(!/color|background|shadow/.test(transitions[selector].properties),'sampled palette must not restart native color tweens: '+selector)
     assert.equal(transitions['.navbar__link'].properties,'transform');assert.equal(transitions['.navbar__link'].durations,'0.18s')
     assert.equal(transitions['.about-card--intro'].properties,'opacity, transform');assert.equal(transitions['.about-card--intro'].durations,'0.6s, 0.6s')
     assert.equal(transitions['.contact__copy'].properties,'transform');assert.equal(transitions['.contact__copy'].durations,'0.15s')
    }
    rows.push({kind:'transitions',...context,transitions})
    assert.equal(await evaluate(`document.querySelectorAll('[aria-label*="Switch to light"],[aria-label*="Switch to dark"]').length`),0)
    palette.push({minutes,state})
    await check('.about-bento__title',{large:true})
    await evaluate(`document.querySelector('.about-intro__lead').scrollIntoView({block:'center',behavior:'instant'})`);await delay(850);await check('.about-intro__lead');await check('.about-intro__accent')
    if(width===1440){await check('.about-identity__location');await click('.navbar__link');await delay(850);await check('.navbar__link.is-active')}
    await evaluate(`document.querySelector('.about-toolkit__head').scrollIntoView({block:'center',behavior:'instant'})`);await delay(850);await check('.about-toolkit__head');await check('.about-chip')
    await evaluate(`document.querySelector('.about-edu__meta').scrollIntoView({block:'center',behavior:'instant'})`);await delay(950);await check('.about-edu__meta')
    await evaluate(`document.querySelector('#projects').scrollIntoView({behavior:'instant'})`);await delay(950)
    await evaluate(`document.querySelector('.slider-control').scrollIntoView({block:'center',behavior:'instant'})`);await delay(120)
    await check('.slider-control');await check('.slider-counter')
    await evaluate(`document.querySelector('.tidal-card[data-position="0"]').click()`);await until(`!!document.querySelector('.slider-detail')`);await delay(450)
    await evaluate(`document.querySelector('.case-study__paragraph').scrollIntoView({block:'center',behavior:'instant'})`);await check('.case-study__paragraph')
    assert.equal(await evaluate(`document.body.style.overflow`),'hidden');await click('.slider-detail__close');await until(`!document.querySelector('.slider-detail')`)
    await evaluate(`document.querySelector('#skills').scrollIntoView({behavior:'instant'})`);await delay(800);await check('#skills .section__sub');await check('.skills-legend__current')
    await click('.guide-btn');await until(`!!document.querySelector('#skills-guide')`);await delay(150);await check('.guide-pop__list');await click('.guide-pop__close')
    await evaluate(`document.querySelector('.cabinet-record__meta').scrollIntoView({block:'center',behavior:'instant'})`);await delay(850);await check('.cabinet-record__meta')
    await evaluate(`document.querySelector('.contact__form input[name="name"]').scrollIntoView({block:'center',behavior:'instant'})`);await delay(850);await check('.contact__form input[name="name"]',{pseudo:'::placeholder'})
    await evaluate(`document.querySelector('.contact__copy').scrollIntoView({block:'center',behavior:'instant'})`);await delay(850);await check('.contact__value')
    // Start Tab in Contact; offscreen Skills focus can otherwise scroll the sample away.
    await evaluate(`document.querySelector('.contact__copy').focus({preventScroll:true})`)
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
    await evaluate(`document.querySelector('.contact__copy').focus({preventScroll:true});document.querySelector('.contact__copy').scrollIntoView({block:'center',behavior:'instant'})`);await delay(150);assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('.contact__copy')).outlineStyle`),'none');await check('.contact__copy',{focus:true})
    await evaluate(`document.querySelector('#footer').scrollIntoView({block:'end',behavior:'instant'})`);await delay(850);await check('.footer__inner p:last-child')
   }
   if(mode==='normal'){
    await evaluate(`document.querySelector('#about').scrollIntoView({behavior:'instant'})`);await delay(450)
    await click('.world-time-trigger')
    const rate=await evaluate(`new Promise(resolve=>{
      const about=document.querySelector('#about'),footer=document.querySelector('.footer'),input=document.querySelector('.world-time-panel input'),set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set,c={about:0,footer:0},start=performance.now();let step=0;
      const observer=new MutationObserver(records=>{if(records.some(r=>r.target===about))c.about++;if(records.some(r=>r.target===footer))c.footer++});observer.observe(about,{attributes:true,attributeFilter:['style']});observer.observe(footer,{attributes:true,attributeFilter:['style']});
      function tick(){set.call(input,step<=60?step*24:(120-step)*24);input.dispatchEvent(new Event('input',{bubbles:true}));if(++step<=120)requestAnimationFrame(tick);else setTimeout(()=>{observer.disconnect();resolve({...c,elapsed:performance.now()-start,rootVars:[...document.documentElement.style,...document.body.style,...document.querySelector('.aqua-root').style].filter(k=>k.startsWith('--world-'))})},140)}requestAnimationFrame(tick)
    })`)
    assert.ok(rate.about>5&&rate.about<=Math.ceil(rate.elapsed/80)+4,'palette writes are coalesced');assert.equal(rate.footer,0,'offscreen palette stays parked');assert.deepEqual(rate.rootVars,[])
    rows.push({kind:'rate',width,...rate});await click('.world-time-panel__head button')
    await evaluate(`document.querySelector('#skills').scrollIntoView({behavior:'instant'})`);await delay(500)
    const hit=await evaluate(`(()=>{const a=[...document.querySelectorAll('.fish-hit')];for(let i=0;i<a.length;i++){const r=a[i].getBoundingClientRect();if(r.x>=0&&r.right<=innerWidth&&r.y>100&&r.bottom<innerHeight)return{i,x:r.x+r.width/2,y:r.y+r.height/2}}return null})()`)
    assert.ok(hit,'a Skills fish is available for interaction')
    if(width===390){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hit.x,y:hit.y,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
    else await click(`.fish-hit:nth-child(${hit.i+1})`)
    await until(`!!document.querySelector('.specimen-panel')`);await click('.specimen-panel__close');await until(`!document.querySelector('.specimen-panel')`)
    await evaluate(`document.querySelectorAll('.fish-hit')[${hit.i}].focus({preventScroll:true})`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await until(`!!document.querySelector('.specimen-panel')`);await click('.specimen-panel__close')
    rows.push({kind:'skills',width,touch:width===390,keyboard:true})
   }
   rows.push({kind:'palette',width,mode,palette});console.log('CHECKED adaptive underwater UI',width,mode,'seven hours, glass, headings, navbar, portals and actual contrast')
  }
  assert.equal(failures.length,0,JSON.stringify(failures))
  assert.equal(errors.filter(e=>!JSON.stringify(e).includes('favicon')).length,0,JSON.stringify(errors))
 }finally{await writeFile(new URL('results.json',out),JSON.stringify({rows,errors,warnings},null,2));await close()}
}
