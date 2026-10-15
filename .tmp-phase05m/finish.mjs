import assert from 'node:assert/strict'
import {readFile,readdir,stat,writeFile} from 'node:fs/promises'
const out=new URL('./',import.meta.url)
const visibility=JSON.parse(await readFile(new URL('measurements/visibility-assertions.json',out),'utf8'));assert.equal(visibility.length,72)
for(const folder of ['after'])for(const file of (await readdir(new URL(folder+'/',out))).filter(f=>f.endsWith('-profile.json'))){const p=JSON.parse(await readFile(new URL(folder+'/'+file,out),'utf8'));assert.equal(p.results.length,10);for(const r of p.results){assert.equal(r.metrics.over50,0);assert.equal(r.lost,0)}}
for(const size of ['1440x900','390x844']){const result=JSON.parse(await readFile(new URL('motion/'+size+'.json',out),'utf8'));assert.ok(result.frames.length>150);assert.equal(result.errors.filter(e=>!(e.source==='network'&&e.url?.endsWith('/favicon.ico'))).length,0);for(const direction of ['forward','reverse'])for(let i=0;i<8;i++)assert.ok((await stat(new URL(`motion/${size}-${direction}-${i}.png`,out))).size>1000)}
const html=await readFile(new URL('index.html',out),'utf8');const match=html.match(/const items=(.*),state=document.querySelector/);const items=JSON.parse(match[1]);assert.equal(items.length,72)
for(const r of items)for(const name of [r.before,r.after].filter(Boolean))assert.ok((await stat(new URL(name,out))).size>1000)
for(const name of ['report.md','mobile-audit.md','production-diff.patch','measurements/workspace-integrity.json','measurements/final-checks.json'])assert.ok((await stat(new URL(name,out))).size>0)
const files=[];async function walk(folder=''){for(const entry of await readdir(new URL(folder,out),{withFileTypes:true})){const name=folder+entry.name;if(entry.isDirectory())await walk(name+'/');else if(name!=='files.json')files.push({name,bytes:(await stat(new URL(name,out))).size})}}
await walk();await writeFile(new URL('files.json',out),JSON.stringify(files,null,2));console.log('PASS final evidence and links:',files.length,'files;',files.reduce((n,f)=>n+f.bytes,0),'bytes')
const version=await fetch('http://127.0.0.1:9223/json/version').then(r=>r.json()),ws=new WebSocket(version.webSocketDebuggerUrl)
await new Promise((resolve,reject)=>{let sent=false;ws.addEventListener('open',()=>{sent=true;ws.send(JSON.stringify({id:1,method:'Browser.close'}))},{once:true});ws.addEventListener('close',resolve,{once:true});ws.addEventListener('error',e=>sent?resolve():reject(e),{once:true})});console.log('Closed owned Phase 05M diagnostic Chrome')
