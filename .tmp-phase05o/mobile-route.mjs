import{fresh,evaluate,until,delay,screenshot,close}from'./browser.mjs'
import{readFile,writeFile}from'node:fs/promises'
const rows=[]
try{
 await fresh({width:390,height:844,beforeEnter:async()=>{await evaluate(await readFile(new URL('instrument.js',import.meta.url),'utf8'));await until('!!window.__qa.renderer')}});await evaluate(`scrollTo(0,document.querySelector('#portfolio-dive').offsetHeight*.55)`);await delay(900);
 await evaluate(`const a=window.__qa.actors().find(a=>a.kind==='golem');window.__golem=a;window.__set=a.root.position.set;a.root.position.set=function(){return this}`)
 for(const[x,z]of[[-3,-18],[-1,-18],[1,-16],[2,-16],[2.5,-17]]){
  await evaluate(`window.__golem.root.position.set=window.__set;window.__qa.place(window.__golem.root,${x},${z});window.__golem.root.position.set=function(){return this}`);await delay(200);const bounds=await evaluate('window.__qa.bounds(true)');rows.push({x,z,bounds});await screenshot(`after/mobile-route-${x}-${z}.png`);console.log(x,z,JSON.stringify(bounds.find(b=>b.kind==='golem')))
 }
}finally{await writeFile(new URL('measurements/mobile-route.json',import.meta.url),JSON.stringify(rows,null,2));await close()}
