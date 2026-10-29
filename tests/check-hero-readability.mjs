import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {fresh,evaluate,delay,setWorldTime,approach,activate,until,unlocked,close,errors} from './browser.mjs'
import {renderedContrast} from './rendered-contrast.mjs'

const rows=[]
try{
 for(const width of [1440,390]){
  await fresh({width,height:width===390?844:900});await approach();await activate();await until(unlocked)
  await evaluate(`scrollTo({top:0,behavior:'instant'})`);await delay(900)
  const before=await evaluate(`document.querySelector('.hero__title').getBoundingClientRect().toJSON()`)
  for(const minutes of [360,540,720,960,1080,1140,0]){
   await setWorldTime(minutes)
   for(const [selector,large]of [['.hero__title',true],['.hero__role',false]]){
    const {png,...r}=await renderedContrast(selector,{large});rows.push({width,minutes,...r})
    assert.ok(r.minimum>=(large?3.2:4.5),`${width} ${minutes} ${selector}: ${r.minimum}`)
   }
   assert.deepEqual(await evaluate(`document.querySelector('.hero__title').getBoundingClientRect().toJSON()`),before,'time changes do not move the title')
  }
  const replay=await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('.hero__replay'));return{background:s.backgroundColor,border:s.borderTopWidth,shadow:s.boxShadow}})()`)
  assert.equal(replay.background,'rgba(0, 0, 0, 0)');assert.equal(replay.border,'0px');assert.equal(replay.shadow,'none')
 }
 assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS Hero title >=3.2:1 and subtitle >=4.5:1 at all seven times on desktop/mobile; stable layout and frameless replay')
}finally{await writeFile(new URL('measurements/hero-readability.json',import.meta.url),JSON.stringify({rows,errors},null,2));await close()}
