import {writeFile} from 'node:fs/promises'
import {fresh,send,socket,evaluate,delay,close,errors} from './browser.mjs'
let trace=[];socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Tracing.dataCollected')trace.push(...m.params.value)})
const rows=[]
try{
 await fresh()
 await evaluate(`window.__staticLong=[];new PerformanceObserver(l=>window.__staticLong.push(...l.getEntries().map(e=>e.toJSON()))).observe({type:'longtask',buffered:true})`)
 for(let i=0;i<4;i++){
  await evaluate('scrollTo({top:document.querySelector("#portfolio-dive").offsetHeight*.91,behavior:"instant"})');await delay(1500)
  await evaluate('scrollTo({top:document.querySelector("#portfolio-dive").offsetHeight*.3,behavior:"instant"})');await delay(2000)
  await send('Tracing.start',{categories:'devtools.timeline,v8,blink.user_timing,gpu',transferMode:'ReportEvents'})
  const frames=await evaluate(`new Promise(resolve=>{const rows=[];let start;function tick(t){const now=performance.now();start??=now;rows.push({time:t,now});if(now-start<3000)requestAnimationFrame(tick);else resolve(rows)}requestAnimationFrame(tick)})`)
  const done=new Promise(resolve=>{const h=e=>{if(JSON.parse(e.data).method==='Tracing.tracingComplete'){socket.removeEventListener('message',h);resolve()}};socket.addEventListener('message',h)});await send('Tracing.end');await done
  const tasks=await evaluate(`window.__staticLong.filter(e=>e.startTime>=${frames[0].now}&&e.startTime<=${frames.at(-1).now})`),dt=frames.slice(1).map((f,j)=>f.now-frames[j].now).sort((a,b)=>a-b)
  rows.push({pass:i+1,frames,tasks,median:dt[Math.floor(dt.length*.5)],p95:dt[Math.floor(dt.length*.95)],max:Math.max(...dt),over50:dt.filter(d=>d>50).length});console.log('PASS static reverse-arrival observation',i+1,JSON.stringify({...rows.at(-1),frames:frames.length}))
 }
}finally{await writeFile(new URL('measurements/static-recheck.json',import.meta.url),JSON.stringify({rows,errors},null,2));await writeFile(new URL('measurements/static-recheck-trace.json',import.meta.url),JSON.stringify({traceEvents:trace}));await close()}
