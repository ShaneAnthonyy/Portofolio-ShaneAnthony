import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {fresh,evaluate,delay,approach,activate,until,unlocked,close,errors} from './browser.mjs'

const rows=[]
async function sample(name){
 const row=await evaluate(`(()=>{
  const root=document.querySelector('.aqua-root'),backdrop=document.querySelector('.webgl-backdrop'),bubble=document.querySelector('.aqua-bubble-layer'),value=(selector,pseudo)=>Number(getComputedStyle(document.querySelector(selector),pseudo).getPropertyValue('--arrival-progress'));
  return{root:Number(root.style.getPropertyValue('--arrival-progress')),reveal:value('.hero-reveal'),home:value('#home'),water:value('.hero-arrival-water'),veil:value('.hero-arrival-water','::after'),navbar:value('.navbar__logo'),about:value('#about'),projects:value('#projects'),contact:value('#contact'),rootOptics:[...root.style].filter(k=>/bubble-.*-opacity|intro-background-blur|aqua-(sat|top-a|mid-a|deep-a|atmosphere-blur)/.test(k)),backdropBlur:backdrop.style.getPropertyValue('--intro-background-blur'),bubbleOpacity:bubble.style.getPropertyValue('--bubble-background-opacity')}
 })()`)
 rows.push({name,...row})
 for(const key of ['reveal','home','water','veil','navbar'])assert.ok(Math.abs(row[key]-row.root)<.00001,`${name} ${key} follows the exact arrival value`)
 for(const key of ['about','projects','contact'])assert.equal(row[key],0,`${name} ${key} is isolated from per-frame arrival updates`)
 assert.deepEqual(row.rootOptics,[],'bubble/backdrop optics do not invalidate the app subtree')
 assert.notEqual(row.backdropBlur,'');assert.notEqual(row.bubbleOpacity,'')
 return row
}
try{
 for(const width of [1440,393])for(const lite of [false,true]){
  await fresh({width,height:width===393?852:900,lite});await approach();await activate();await until(unlocked)
  assert.equal((await sample(`${width}-${lite}-landed`)).root,1)
  await evaluate(`document.querySelector('.hero__replay').click()`);await delay(350);await sample(`${width}-${lite}-returning`)
  await until(`!(${unlocked})&&document.querySelector('#portfolio-dive').offsetHeight>0`);assert.equal((await sample(`${width}-${lite}-returned`)).root,0)
 }
 assert.equal(errors.filter(e=>!JSON.stringify(e).includes('favicon')).length,0,JSON.stringify(errors));console.log('PASS arrival values stay exact in Hero/navbar during landing and replay while offscreen sections, bubble and backdrop updates remain isolated in desktop/mobile Normal/Lite')
}finally{await writeFile(new URL('measurements/handoff-styles.json',import.meta.url),JSON.stringify({rows,errors},null,2));await close()}
