from pathlib import Path

root=Path(__file__).resolve().parent.parent
out=root/'.tmp-phase05j'
s=(root/'.tmp-phase05i/scene-ab.mjs').read_text(encoding='utf-8')
s=s.replace("import assert from 'node:assert/strict'","import assert from 'node:assert/strict'\nimport {createHash} from 'node:crypto'")
s=s.replace("new URL('./measurements/inventory.json',out)","new URL('../.tmp-phase05i/measurements/inventory.json',out)")
a=s.index('const candidates={}');b=s.index("await send('Performance.enable')",a)
s=s[:a]+'''let requests=[],failures=[],responses=[],allResponses=[],finished=new Map(),extra=new Map()
const fishURL=url=>/\\/(fish_[abc]|butterfly_koi_[ab]|shrimp_[ab])(-opt)?\\.glb$/.test(url)
socket.addEventListener('message',e=>{
  const m=JSON.parse(e.data),p=m.params
  if(m.method==='Network.requestWillBeSent'&&fishURL(p.request.url))requests.push({url:p.request.url,id:p.requestId,time:p.timestamp})
  if(m.method==='Network.responseReceived'){
    allResponses.push({url:p.response.url,status:p.response.status})
    if(fishURL(p.response.url))responses.push({id:p.requestId,url:p.response.url,status:p.response.status,mime:p.response.mimeType,fromDiskCache:p.response.fromDiskCache||false,fromServiceWorker:p.response.fromServiceWorker||false,headers:p.response.headers,timing:p.response.timing,time:p.timestamp})
  }
  if(m.method==='Network.loadingFinished')finished.set(p.requestId,{encodedDataLength:p.encodedDataLength,time:p.timestamp})
  if(m.method==='Network.responseReceivedExtraInfo')extra.set(p.requestId,{statusCode:p.statusCode,headers:p.headers})
  if(m.method==='Network.loadingFailed')failures.push(p)
})
await send('Network.enable',{maxTotalBufferSize:300000000,maxResourceBufferSize:20000000})
await send('Network.setCacheDisabled',{cacheDisabled:false})
'''+s[b:]
s=s.replace("selected=null,replay=false,stillsOnly=false", "original=false,warm=false,replay=false")
s=s.replace("  selection=selected;requests=[];responses=[];substitutions=[];failures=[];const errorStart=errors.length,warningStart=warnings.length", "  requests=[];responses=[];allResponses=[];failures=[];finished.clear();extra.clear();const errorStart=errors.length,warningStart=warnings.length\n  if(!warm)await send('Network.clearBrowserCache')\n  const started=Date.now()")
s=s.replace("const row={label,width,height,lite,theme,selection:selected,positions:[],motion:[],metrics:[],checks:[]}", "const row={label,width,height,lite,theme,original,warm,readyObservedMs:Date.now()-started,positions:[],motion:[],metrics:[],checks:[]}")
s='\n'.join(line for line in s.splitlines() if 'if(stillsOnly)' not in line)+'\n'
s=s.replace("row.substitutions=[...substitutions];", "row.environment=allResponses.filter(r=>/tree.*glb|grass_ground/.test(r.url));")
a=s.index('  for(const n of expected){const path=');b=s.index('  results.push(row);',a)
s=s[:a]+'''  assert.equal(requests.length,expected.length,'no extra or duplicate fish requests')
  for(const n of expected){
    const path=`/aquarium/${lite&&n.startsWith('fish_')?'lite/':''}${n}${!lite&&!original?'-opt':''}.glb`
    assert.equal(requests.filter(r=>new URL(r.url).pathname===path).length,1,path+' loads once')
    const response=responses.find(r=>new URL(r.url).pathname===path);assert.ok(response&&response.status===200,path+' HTTP 200')
    response.finish=finished.get(response.id);response.extra=extra.get(response.id)
    const body=await send('Network.getResponseBody',{requestId:response.id});const bytes=Buffer.from(body.body,body.base64Encoded?'base64':'utf8')
    response.bodyBytes=bytes.length;response.sha256=createHash('sha256').update(bytes).digest('hex')
    const disk=await readFile(new URL('../public'+path,out));assert.equal(response.sha256,createHash('sha256').update(disk).digest('hex'),path+' served body hash')
  }
  row.resourceTiming=await evaluate(`performance.getEntriesByType('resource').filter(e=>/\\\\/(fish_[abc]|butterfly_koi_[ab]|shrimp_[ab])(-opt)?\\\\.glb$/.test(e.name)).map(e=>({url:e.name,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize,duration:e.duration,fetchStart:e.fetchStart,responseEnd:e.responseEnd}))`)
  row.transfer={bodyBytes:responses.reduce((a,r)=>a+r.bodyBytes,0),cdpEncodedBytes:responses.reduce((a,r)=>a+(r.finish?.encodedDataLength||0),0),resourceTransferBytes:row.resourceTiming.reduce((a,r)=>a+r.transferSize,0),resourceEncodedBodyBytes:row.resourceTiming.reduce((a,r)=>a+r.encodedBodySize,0)}
  if(!lite)assert.ok(row.environment.some(r=>r.url.endsWith('/tree-opt-150k-1024.glb')),'optimized tree requested')
  if(!lite)for(const file of ['diff_1024','nor_gl_512','rough_1024','ao_1024'])assert.ok(row.environment.some(r=>r.url.endsWith('/grass_ground_'+file+'.webp')&&r.status===200),'optimized terrain '+file)
'''+s[b:]
s=s.replace("JSON.stringify(row.metrics))", "JSON.stringify({transfer:row.transfer,metrics:row.metrics}))")
a=s.index('try{\n  if(mode===');s=s[:a]+'''try{
  if(mode==='baseline')await scenario('baseline-desktop-cold',{original:true})
  else {
    await scenario('desktop-cold',{replay:true})
    await scenario('desktop-warm',{warm:true})
    await scenario('mobile-normal',{width:390,height:844,replay:true})
    await scenario('desktop-lite',{lite:true,replay:true})
    await scenario('mobile-lite',{width:390,height:844,lite:true})
    await scenario('desktop-light',{theme:'light'})
  }
}finally{await writeFile(new URL(`measurements/scene-${mode}-errors.json`,out),JSON.stringify({errors,warnings,failures},null,2));await close()}
'''
s=s.replace("assert.equal(row.errors.length,0,JSON.stringify(row.errors))", "row.unexpectedErrors=row.errors.filter(e=>!(e.source==='network'&&e.url==='http://127.0.0.1:4173/favicon.ico'&&e.text.includes('404')));assert.equal(row.unexpectedErrors.length,0,JSON.stringify(row.unexpectedErrors))")
s=s.replace("r.status===200),'optimized terrain '", "(r.status===200||(warm&&r.status===304))),'optimized terrain '")
(out/'scene-production.mjs').write_text(s,encoding='utf-8')
for name in ['check-dive-landing','check-dive-webgl','check-dive-replay','check-dive-interruptions','check-dive-mobile','check-surface-integration','check-surface']:
    source=(root/'scripts'/f'{name}.mjs').read_text(encoding='utf-8')
    source=source.replace("'./dive-browser.mjs'","'./browser.mjs'")
    source=source.replace("../.tmp-phase04m/","./regressions/")
    source=source.replace("../.tmp-phase04l/","./regressions/")
    (out/f'{name}.mjs').write_text(source,encoding='utf-8')
print('Adapted existing scene and regression harnesses; no CDP interception')
