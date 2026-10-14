import assert from 'node:assert/strict'
import {fresh,approach,activate,unlocked,send,evaluate,until,delay,close,errors,warnings} from './browser.mjs'
await fresh()
await approach()
await activate()
await until(unlocked)
async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`)
  await delay(150)
  const point = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    el.scrollIntoView({block:'center',behavior:'instant'});
    const r = el.getBoundingClientRect();
    return {x: r.x + r.width / 2, y: r.y + r.height / 2};
  })()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point })
}
const featured='.tidal-card[data-position="0"]',next='[aria-label="Show next project"]',previous='[aria-label="Show previous project"]'
const q=s=>`document.querySelector(${JSON.stringify(s)})`
const active=()=>evaluate(`Number(${q(featured)}.dataset.projectIndex)`)
const settled=()=>until(`!${q('.tidal-stage')}.dataset.moving`)
const key=async(key,code=key,modifiers=0)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,modifiers});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers})}
const result={checks:[]},pass=text=>{result.checks.push(text);console.log('PASS',text)}
const clean=async()=>assert.ok(await evaluate(`[...document.querySelectorAll('.tidal-card')].every(e=>!e.style.transform&&!e.style.opacity&&!e.style.willChange)`),'all transient transforms cleared')
try {
 await key('Escape')
 const query=q, results=[]
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
 for(const [width,height] of [[375,812],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080],[375,568],[390,320]]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false})
  for(const theme of ['light','dark']) for(const perf of ['normal','lite']) {
   await evaluate(`document.documentElement.dataset.theme='${theme}';document.documentElement.dataset.perf='${perf}'`)
   for(let project=0;project<6;project++) {
    await evaluate(`${query(next)}.click()`);await delay(50)
    const measured=await evaluate(`(()=>{const card=${query(featured)}, body=card.querySelector('.tidal-card__body'),title=card.querySelector('h3'),action=card.querySelector('.tidal-card__action');const rect=card.getBoundingClientRect(),ar=action.getBoundingClientRect();return {active:card.dataset.projectIndex,overflow:document.documentElement.scrollWidth>innerWidth,bodyOverflow:body.scrollHeight>body.clientHeight+1,titleOverflow:title.scrollHeight>title.clientHeight+1,actionFits:ar.bottom<=rect.bottom+1,featureWidth:rect.width,previewWidth:document.querySelector('.tidal-card[data-position="1"]').getBoundingClientRect().width,controls:[...document.querySelectorAll('.slider-control')].map(e=>({width:e.offsetWidth,height:e.offsetHeight})),iframes:document.querySelectorAll('.tidal-stage iframe').length}})()`)
    assert.equal(measured.overflow,false,`${width}/${theme}/${perf} horizontal overflow`)
    assert.equal(measured.bodyOverflow,false,`${width}/${theme}/${perf}/${measured.active} body overflow`)
    assert.equal(measured.titleOverflow,false,'title overflow')
    assert.ok(measured.actionFits,`${width}/${theme}/${perf}/${measured.active} action fits`)
    assert.ok(measured.controls.every(r=>r.width>=44&&r.height>=44))
    assert.equal(measured.iframes,0)
    if(width>900) assert.ok(measured.featureWidth>measured.previewWidth*3)
    results.push({width,height,theme,perf,...measured})
   }
  }
  await evaluate(`document.querySelector('#projects').scrollIntoView({block:'start',behavior:'instant'})`)
  await delay(200)
 }
 pass(`${results.length} responsive/project/theme/performance combinations`)

 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
 await delay(500)
 await evaluate(`document.documentElement.dataset.theme='dark';document.documentElement.dataset.perf='normal';${q('.tidal-stage')}.scrollIntoView({block:'center',behavior:'instant'})`)
 await delay(500)
 let before=await active()
 await evaluate(`${q(next)}.click();${q(next)}.click();${q(previous)}.click()`)
 await settled();assert.equal(await active(),before);await clean();pass('Rapid input resolves current transition and latest queued direction')
 await click('.tidal-card[data-position="1"]');await settled();assert.equal(await active(),(before+1)%6)
 assert.equal(await evaluate('!!document.querySelector("[role=dialog]")'),false);pass('Preview selects without opening modal')
 await evaluate(`${q(featured)}.focus()`);await key('ArrowRight');await settled()
 assert.ok(await evaluate(`document.activeElement===${q(featured)}`));pass('Arrow navigation transfers card focus to the new feature')
 for(let i=0;i<6;i++) {
  await evaluate(`${q(featured)}.focus()`);await key('Enter')
  await until('!!document.querySelector("[role=dialog]")')
  assert.equal(await evaluate('document.body.style.overflow'),'hidden')
  assert.ok(await evaluate('document.activeElement===document.querySelector("[role=dialog]")'))
  const links=await evaluate('[...document.querySelectorAll(".project-action")].map(e=>({href:e.href,rel:e.rel,target:e.target}))')
  assert.ok(links.length>0&&links.every(l=>/^https?:/.test(l.href)&&l.rel.includes('noopener')&&l.target==='_blank'))
  await evaluate('document.querySelector(".slider-detail__close").focus()');await key('Tab','Tab',8)
  assert.ok(await evaluate('document.activeElement===Array.from(document.querySelectorAll(".slider-detail a[href], .slider-detail button")).at(-1)'))
  await key('Tab');assert.ok(await evaluate('document.activeElement===document.querySelector(".slider-detail__close")'))
  before=await active();await key('ArrowRight');assert.equal(await active(),before)
  await key('Escape');await until('!document.querySelector("[role=dialog]")')
  assert.notEqual(await evaluate('document.body.style.overflow'),'hidden')
  assert.ok(await evaluate(`document.activeElement===${q(featured)}`))
  await key('ArrowRight');await settled()
 }
 pass('All six case studies: content, external links, scroll lock, focus trap, Escape, focus return; arrows do not navigate beneath modal')
 before=await active()
 for(let i=0;i<40;i++){await evaluate(`${q('.tidal-stage')}.dispatchEvent(new WheelEvent('wheel',{deltaX:8,deltaY:0,bubbles:true,cancelable:true}))`);await delay(20)}
 await settled();assert.equal(await active(),(before+1)%6);pass('Small trackpad deltas accumulate; one continuous gesture advances once')
 assert.equal(await evaluate(`(()=>{const e=new WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true});${q(featured)}.dispatchEvent(e);return e.defaultPrevented})()`),false)
 pass('Vertical wheel over featured content remains page scrolling')
 for(const offset of [35,250]) {
  await evaluate(`${q(next)}.click()`);await delay(offset)
  await send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:false})
  await settled();await clean()
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
 }
 await evaluate(`${q(next)}.click()`);await delay(200)
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
 await settled();await clean()
 before=await active();await evaluate(`${q(next)}.click()`);await delay(50);assert.equal(await active(),(before+1)%6);await clean()
 pass('Resize interruptions during exit and movement, and reduced-motion changes settle cleanly')
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true})
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
 await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'start',behavior:'instant'})`);await delay(350)
 const touch=async(points)=>{for(let i=0;i<points.length;i++){await send('Input.dispatchTouchEvent',{type:i?'touchMove':'touchStart',touchPoints:[{x:points[i][0],y:points[i][1]}]});await delay(25)}await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
 before=await active();await touch([[310,280],[280,282],[220,283],[160,285],[80,285]])
 await settled();assert.equal(await active(),(before+1)%6);assert.equal(await evaluate('!!document.querySelector("[role=dialog]")'),false)
 pass('Real CDP touch swipe selects next without opening modal')
 const scroll=await evaluate('scrollY');before=await active();await touch([[190,450],[190,410],[192,330],[191,260],[190,200]])
 await delay(450);assert.ok(await evaluate('scrollY')>scroll+40);assert.equal(await active(),before)
 pass('Vertical touch gesture scrolls page without selecting or opening project')
 await evaluate(`${q(featured)}.scrollIntoView({block:'center',behavior:'instant'})`);await delay(200)
  await touch([[190,350]])
  await until('!!document.querySelector("[role=dialog]")');await key('Escape')
  pass('Tap after swipe opens modal normally')
  await send('Emulation.setTouchEmulationEnabled',{enabled:false})
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
  await evaluate(`${q('.tidal-stage')}.scrollIntoView({block:'center',behavior:'instant'})`);await delay(500)
  const cursor=()=>evaluate(`getComputedStyle(${q(featured)}).cursor`)
  assert.equal(await cursor(),'pointer');pass('Resting carousel cursor is pointer')
  const drag=async(dx)=>{const p=await evaluate(`(()=>{const r=${q(featured)}.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await delay(60);for(let i=1;i<=6;i++){await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',clickCount:0,x:p.x+dx*i/6,y:p.y});await delay(40)}return p}
  before=await active();const p1=await drag(-30)
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:p1.x-30,y:p1.y})
  await settled();assert.equal(await active(),before)
  assert.equal(await evaluate(`!!${q('.tidal-stage')}.dataset.dragging`),false)
  await clean();pass('Sub-threshold drag snaps back without navigating')
  before=await active();const p=await drag(-320)
  assert.equal(await evaluate(`!!${q('.tidal-stage')}.dataset.dragging`),true)
  assert.equal(await cursor(),'grabbing')
  assert.ok(await evaluate(`new DOMMatrix(getComputedStyle(${q(featured)}).transform).m41<-50`),'featured card follows pointer')
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:p.x-320,y:p.y})
  await settled();assert.equal(await active(),(before+1)%6)
  assert.equal(await evaluate('!!document.querySelector("[role=dialog]")'),false)
  assert.equal(await evaluate(`!!${q('.tidal-stage')}.dataset.dragging`),false)
  assert.equal(await cursor(),'pointer');await clean();pass('Drag follows pointer with grabbing cursor and navigates on release without modal')
  const geom=()=>evaluate(`(()=>{const out={};[...document.querySelectorAll('.tidal-card')].filter(e=>!e.hidden).forEach(c=>{const r=c.getBoundingClientRect();const w=c.querySelector('.tidal-card__body');out[c.dataset.projectIndex]={x:Math.round(r.x),w:Math.round(r.width),o:getComputedStyle(c).opacity,wrap:w?w.offsetWidth:-1}});return out})()`)
  const sampleMorph=async(btn,dir,offs)=>{
    const b=await active(),out=b,inIdx=(b+dir+6)%6,exit=(b-dir+6)%6
    await evaluate(`${q(btn)}.click()`)
    let last=0;const frames=[]
    for(const t of offs){await delay(t-last);last=t;frames.push(await geom())}
    await settled()
    assert.equal(await active(),(b+dir+6)%6)
    const xs=frames.map(f=>f[out].x),ws=frames.map(f=>f[out].w),wr=frames.map(f=>f[out].wrap)
    const ix=frames.map(f=>f[inIdx].x),iw=frames.map(f=>f[inIdx].w),iwr=frames.map(f=>f[inIdx].wrap)
    const mono=(a,up)=>a.every((v,i)=>i===0||(up?v>=a[i-1]-2:v<=a[i-1]+2))
    assert.ok(mono(xs,dir<0)&&Math.abs(xs[xs.length-1]-xs[0])>40,'outgoing travels continuously in nav direction')
    assert.ok(mono(ix,dir<0)&&Math.abs(ix[ix.length-1]-ix[0])>40,'incoming travels continuously from the correct side')
    assert.ok(dir>0?ix[0]>ix[ix.length-1]:ix[0]<ix[ix.length-1],'incoming originates from the correct side')
    assert.ok(mono(ws,false)&&mono(wr,false),'outgoing geometry retracts monotonically')
    assert.ok(mono(iw,true)&&mono(iwr,true),'incoming geometry expands monotonically')
    assert.ok(frames.every(f=>f[out].o==='1'&&f[inIdx].o==='1'),'traveling cards never fade out mid-morph')
    assert.ok(await evaluate(`document.querySelector('[data-project-index="${exit}"]').hidden`),'exited card unmounts after travel')
    const fin=await geom()
    assert.ok(Math.abs(fin[out].x-fin[inIdx].x)>0,'final positions distinct')
    assert.equal(fin[inIdx].wrap,await evaluate(`document.querySelector('.tidal-card[data-position="0"] .tidal-card__body').offsetWidth`),'incoming panel fully emerged')
    assert.ok(await evaluate(`[...document.querySelectorAll('.tidal-card')].every(e=>!e.querySelector('.tidal-card__body').style.width)`),'no stale clip widths')
    await clean()
  }
  await sampleMorph(next,1,[105,260,525,790,945]);pass('Next morphs continuously: outgoing retracts left, incoming expands from right')
  await sampleMorph(previous,-1,[105,260,525,790,945]);pass('Previous morphs continuously: outgoing retracts right, incoming expands from left')
  before=await active();const hold=await drag(-160)
  const mid=await geom()
  assert.ok(mid[before].wrap>0,'drag partially retracts outgoing panel')
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:hold.x-160,y:hold.y})
  await settled();assert.equal(await active(),(before+1)%6);await clean();pass('Drag-hold previews partial morph and continues on release')
 console.log(JSON.stringify({...result,errors},null,2))
}finally{await send('Emulation.setTouchEmulationEnabled',{enabled:false});await close()}
