import {fresh,evaluate,until,delay,screenshot,close}from'./browser.mjs'
import{readFile,writeFile}from'node:fs/promises'
const rows=[]
try{for(const width of[1440,390,768]){
 await fresh({width,height:width===1440?900:width===768?1024:844,beforeEnter:async()=>{await evaluate(await readFile(new URL('instrument.js',import.meta.url),'utf8'));await until('!!window.__qa.renderer')}})
 await evaluate(`scrollTo(0,document.querySelector('#portfolio-dive').offsetHeight*.55)`);await delay(1000);const s=await evaluate('window.__qa.snapshot()'),bounds=await evaluate('window.__qa.bounds(true)');rows.push({width,...s,bounds});await screenshot(`after/preflight-${width}.png`);console.log(width,JSON.stringify(bounds),JSON.stringify(s.actors.map(a=>({kind:a.kind,pose:a.pose.filter(p=>['Torso','Chicken_Body','Rider_Torso'].includes(p.name))}))))
}}finally{await writeFile(new URL('measurements/preflight.json',import.meta.url),JSON.stringify(rows,null,2));await close()}
