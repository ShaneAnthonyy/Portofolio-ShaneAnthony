import assert from 'node:assert/strict'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
const out=new URL('./',import.meta.url)
for(const folder of ['after-full','after-mobile','after-cold']) {
  const files=await readdir(new URL(folder+'/',out)),file=files.find(f=>f.endsWith('-profile.json'))
  const report=JSON.parse(await readFile(new URL(folder+'/'+file,out),'utf8'))
  assert.equal(report.errors.filter(e=>!(e.source==='network'&&e.url?.endsWith('/favicon.ico')&&e.text.includes('404'))).length,0)
  for(const row of report.results){assert.equal(row.metrics.over50,0);assert.equal(row.lost,0);assert.equal(row.contexts,1);assert.equal(row.events.filter(e=>/^(compileShader|linkProgram|createFramebuffer|texImage2D|texSubImage2D|bufferData)$/.test(e.name)).length,0)}
}
for(const folder of ['critical','critical-before'])for(const direction of ['forward','reverse'])for(let i=0;i<6;i++)assert.ok((await stat(new URL(`${folder}/motion-${direction}-${i}.png`,out))).size>1000)
for(const file of ['report.md','index.html','production-diff.patch','measurements/workspace-integrity.json','measurements/visual-state-comparison.json'])assert.ok((await stat(new URL(file,out))).size>0)
const entries=[]
async function walk(folder='') {for(const entry of await readdir(new URL(folder,out),{withFileTypes:true})){const name=folder+entry.name;if(entry.isDirectory())await walk(name+'/');else entries.push({name,bytes:(await stat(new URL(name,out))).size})}}
await walk();await writeFile(new URL('files.json',out),JSON.stringify(entries,null,2))
console.log('PASS final evidence checks:',entries.length,'files;',entries.reduce((a,e)=>a+e.bytes,0),'bytes')
for(const port of [9223,9224]) {
  let version
  try {version=await fetch(`http://127.0.0.1:${port}/json/version`).then(r=>r.json())} catch(e) {if(e.cause?.code==='ECONNREFUSED'){console.log('Owned diagnostic Chrome already closed',port);continue}throw e}
  const ws=new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve,reject)=>{let sent=false;ws.addEventListener('open',()=>{sent=true;ws.send(JSON.stringify({id:1,method:'Browser.close'}))},{once:true});ws.addEventListener('close',resolve,{once:true});ws.addEventListener('error',e=>sent?resolve():reject(e),{once:true})})
  console.log('Closed owned diagnostic Chrome',port)
}
