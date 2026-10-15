import assert from 'node:assert/strict'
import {writeFile,readFile,mkdir} from 'node:fs/promises'
import {fresh,send,socket,evaluate,until,delay,screenshot,click,close,errors,warnings} from './browser.mjs'
const mobile=process.argv.includes('--mobile'),light=process.argv.includes('--light'), stationary=process.argv.includes('--stationary')||mobile,label=mobile?'mobile':stationary?'stationary':light?'light':'dark',folder=`after/${label}`
await mkdir(new URL(folder+'/',import.meta.url),{recursive:true})
const result={label,states:[],errors,warnings},writes=[];let recording=false,index=0
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Page.screencastFrame'){send('Page.screencastFrameAck',{sessionId:m.params.sessionId}).catch(()=>{});if(recording){const name=`${folder}/frame-${String(index++).padStart(4,'0')}.jpg`;writes.push(writeFile(new URL(name,import.meta.url),Buffer.from(m.params.data,'base64')));(result.motion??=[]).push({name,...m.params.metadata})}}})
async function capture(name,pixels=true){const s=await evaluate('window.__qa.snapshot()'),bounds=pixels?await evaluate('window.__qa.bounds(true)'):null;result.states.push({name,...s,bounds});await screenshot(`${folder}/${name}.png`);console.log(name,JSON.stringify(s.actors.map(a=>({kind:a.kind,time:a.time,position:a.position,actions:a.actions.filter(a=>a.weight>.01)}))),JSON.stringify(bounds?.map(b=>({kind:b.kind,rect:b.rect,area:b.contribution?.bodyCSSArea}))))}
try{
 await fresh({width:mobile?390:1440,height:mobile?844:900,theme:light?'light':'dark',beforeEnter:async()=>{
  await evaluate(await readFile(new URL('instrument.js',import.meta.url),'utf8'));await until('!!window.__qa.renderer');result.ready=await evaluate('window.__qa.snapshot()');await delay(10000);result.held=await evaluate('window.__qa.snapshot()');assert.equal(result.held.mixers,0,'No mixer clock advances behind loading overlay');
 }})
 result.enter=await evaluate('window.__qa.snapshot()');await evaluate('window.__qa.recording=true');
 result.terrain=await evaluate(`(()=>{const g=window.__qa.scene.getObjectByName('HilltopGround').children[0].geometry;return {segments:g.parameters.widthSegments,heights:Array.from({length:g.attributes.position.count},(_,i)=>g.attributes.position.getY(i))}})()`)
 if(mobile){await evaluate(`scrollTo(0,document.querySelector('#portfolio-dive').offsetHeight*.55)`);await until('window.__qa.mixers.length===2')}
 await send('Page.startScreencast',{format:'jpeg',quality:80,maxWidth:1440,maxHeight:900,everyNthFrame:8});recording=true
 const t0=await evaluate('performance.now()');
 await evaluate(`window.__qa.cameraMotion=${!stationary};window.__qa.move=()=>{const t=Math.max(0,...window.__qa.mixers.map(m=>m.time));if(window.__qa.cameraMotion)scrollTo(0,document.querySelector('#portfolio-dive').offsetHeight*Math.min(.55,Math.max(0,(t-.5)*.1375)));if(t<15.5)requestAnimationFrame(window.__qa.move)};requestAnimationFrame(window.__qa.move)`)
 for(const [name,t]of[['initial-idle',.5],['idle-to-walk',2.04],['first-walk',3],['walk-to-run',4.54],['run-crossing',5.8],['run-left',6.8],['exit-edge',7.2],['after-exit',8.6],['long-idle',10],['second-walk-start',11.04],['second-walk',12],['second-walk-end',14.2],['settled',15]]){
  await until(`Math.max(0,...window.__qa.mixers.map(m=>m.time))>=${t}`,30000);await capture(name,['initial-idle','run-crossing','second-walk'].includes(name))
 }
 recording=false;await send('Page.stopScreencast');await Promise.all(writes);result.samples=await evaluate('(window.__qa.recording=false,window.__qa.samples)');
 assert.equal(result.samples.at(-1).actors.length,2);assert.equal(result.samples.at(-1).mixers,2);
 assert.ok(result.states.find(s=>s.name==='after-exit').actors.find(a=>a.kind==='chicken').visible===false);
 assert.ok(result.samples.filter(s=>s.actors.find(a=>a.kind==='golem')?.actions.some(a=>a.clip==='walk'&&a.running)).length>0)
}finally{await Promise.allSettled(writes);await writeFile(new URL(`${folder}/timeline.json`,import.meta.url),JSON.stringify(result,null,2));await close()}
