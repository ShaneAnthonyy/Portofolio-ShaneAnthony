import {fresh,send,evaluate,until,delay,screenshot,close} from './browser.mjs'
import {readFile,writeFile} from 'node:fs/promises'
const results=[]
try{
 await fresh();await evaluate(await readFile(new URL('instrument.js',import.meta.url),'utf8'));await until('!!window.__qa.renderer');
 await evaluate(`window.__qa.actors=()=>window.__charRigs.map(c=>({root:c.root,group:c.group,mixer:c.mixer,kind:c.kind}));window.__charRigs.forEach(c=>{c.active=false;c.group.visible=true})`)
 for(const [label,p,positions]of[
 ['original',0,[[14,-22],[-10,-42]]],
 ['side-a',0,[[12,-14],[-12,-18]]],
 ['side-b',0,[[12,-10],[-13,-12]]],
 ['side-a-elevated',.3,[[12,-14],[-12,-18]]],
 ['side-a-down',.55,[[12,-14],[-12,-18]]],
 ['side-c',0,[[14,-18],[-14,-22]]],
 ['side-c-elevated',.3,[[14,-18],[-14,-22]]],
 ['side-c-down',.55,[[14,-18],[-14,-22]]]
 ]){
 await evaluate(`scrollTo(0,document.querySelector('#portfolio-dive').offsetHeight*${p});window.__charRigs.forEach((c,i)=>{c.active=true;c.t=0;c.seq=[{clip:'idle',dur:10000}];c.group.visible=true;const pos=${JSON.stringify(positions)}[c.kind==='chicken'?0:1];c.home.pos=window.__qa.place(c.root,...pos)})`);await delay(1200);
 const bounds=await evaluate('window.__qa.bounds(true)');results.push({label,p,positions,bounds});await screenshot(`baseline/${label}.png`);console.log(label,JSON.stringify(bounds.map(b=>({kind:b.kind,rect:b.rect,pixels:b.contribution,blockers:b.centerRayBlockers}))))
 }
}finally{await writeFile(new URL('baseline/routes.json',import.meta.url),JSON.stringify(results,null,2));await close()}
