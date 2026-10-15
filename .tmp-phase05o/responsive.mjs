import assert from 'node:assert/strict'
import {writeFile,readFile,mkdir} from 'node:fs/promises'
import {fresh,send,evaluate,until,delay,screenshot,close,errors} from './browser.mjs'
const rows=[],viewports=[[1440,900],[1920,1080],[768,1024],[1024,768],[375,812],[390,844],[390,500]],out=new URL('after/responsive/',import.meta.url)
await mkdir(out,{recursive:true})
try{
 for(const [width,height]of viewports)for(const mode of ['dark','light','lite-dark','lite-light','reduced','reduced-light']){
  const reduced=mode.startsWith('reduced'),lite=mode.startsWith('lite'),label=`${width}x${height}-${mode}`,row={width,height,mode,states:[]};
  await fresh({width,height,theme:mode.endsWith('light')?'light':'dark',lite,reduced,beforeEnter:reduced?undefined:async()=>{await evaluate(await readFile(new URL('instrument.js',import.meta.url),'utf8'));await until('!!window.__qa.renderer')}})
  if(reduced){assert.equal(await evaluate(`document.querySelectorAll('.webgl-backdrop canvas,.hero-aquarium canvas').length`),0);row.omitted=true;await screenshot(`after/responsive/${label}.png`)}
  else{
   assert.equal(await evaluate('window.__qa.actors().length'),lite?0:2)
   for(const p of [0,.3,.55]){
    await evaluate(`scrollTo(0,document.querySelector('#portfolio-dive').offsetHeight*${p})`);await delay(1000)
    const s=await evaluate('window.__qa.snapshot()');const bounds=await evaluate('window.__qa.bounds(false)');row.states.push({p,...s,bounds});await screenshot(`after/responsive/${label}-p${p}.png`)
   }
   const counts=await evaluate(`(()=>{const ground=window.__qa.scene.getObjectByName('HilltopGround');return {trees:ground.children.filter(g=>{let tree=false;g.traverse(n=>{if(n.geometry?.attributes.position.count===648)tree=true});return tree&&g.visible}).length,overflow:document.documentElement.scrollWidth-innerWidth}})()`);assert.ok(counts.overflow<=0);assert.equal(counts.trees,width<720?(lite?2:3):width<1100?(lite?4:8):lite?6:14);row.counts=counts
  }
  row.characterResources=await evaluate(`performance.getEntriesByType('resource').filter(r=>/chicken_jockey|golem_animated/.test(r.name)).map(r=>r.name)`);assert.equal(row.characterResources.length,reduced||lite?0:2)
  rows.push(row);await writeFile(new URL('measurements/responsive.json',import.meta.url),JSON.stringify({rows,errors},null,2));console.log('PASS',label,row.states.map(s=>s.bounds.map(b=>[b.kind,Math.round(b.rect.left),Math.round(b.rect.right)])))
 }
}finally{await writeFile(new URL('measurements/responsive.json',import.meta.url),JSON.stringify({rows,errors},null,2));await close()}
