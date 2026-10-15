import * as THREE from 'three'
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
const out=new URL('./',import.meta.url)
const before=await readFile(new URL('AquariumDivePrototype.before.jsx',out),'utf8'),after=await readFile(new URL('../src/components/AquariumDivePrototype.jsx',out),'utf8')
const create=(source,high)=>new Function('THREE','qState','poc','flog',source.slice(source.indexOf('      const hillSeg ='),source.indexOf("      const hillUV ="))+';return hillGeo;')(THREE,{runtime:{waterHigh:high}},{},()=>{})
const results=[]
for(const high of [true,false]){
  const old=create(before,high),geometry=create(after,high),a=old.attributes.position,b=geometry.attributes.position
  assert.deepEqual(geometry.index.array,old.index.array,'unchanged terrain topology');assert.deepEqual(geometry.attributes.uv.array,old.attributes.uv.array,'unchanged terrain UVs')
  let changed=0,peakAdded=0,maxAddedSlope=0
  const segments=geometry.parameters.widthSegments,stride=segments+1
  for(let i=0;i<b.count;i++){
    assert.equal(b.getX(i),a.getX(i));assert.equal(b.getZ(i),a.getZ(i));assert.ok(Number.isFinite(b.getY(i)))
    const delta=b.getY(i)-a.getY(i);assert.ok(delta>=-1e-6&&delta<1.7,'gentle positive rear relief')
    if(b.getZ(i)>=-12)assert.equal(b.getY(i),a.getY(i),'foreground and camera corridor unchanged')
    if(delta>1e-6)changed++;peakAdded=Math.max(peakAdded,delta)
    for(const next of [i%stride<segments?i+1:-1,i+stride<b.count?i+stride:-1])if(next>=0){const d=b.getY(next)-a.getY(next);maxAddedSlope=Math.max(maxAddedSlope,Math.abs(d-delta)/(120/segments))}
  }
  assert.ok(changed>0&&peakAdded>1.3&&maxAddedSlope<.16,'broad hills without cliffs')
  const terrainHeightAt=new Function('poc',after.slice(after.indexOf('      const terrainGeometry ='),after.indexOf('      const placeTreeClone ='))+';return terrainHeightAt;')({ground:{children:[{geometry}]}})
  for(let i=0;i<b.count;i++)assert.ok(Math.abs(terrainHeightAt(b.getX(i),b.getZ(i))-b.getY(i))<1e-6,'sampled grid vertex')
  for(let i=0;i<geometry.index.count;i+=3){const ids=[0,1,2].map(k=>geometry.index.getX(i+k)),avg=k=>ids.reduce((s,id)=>s+b['get'+k](id),0)/3;assert.ok(Math.abs(terrainHeightAt(avg('X'),avg('Z'))-avg('Y'))<1e-5,'sampled actual triangle centroid')}
  results.push({mode:high?'normal':'lite',vertices:b.count,triangles:geometry.index.count/3,rearVerticesChanged:changed,peakAddedHeight:peakAdded,maxAddedNeighborSlope:maxAddedSlope,foregroundUnchanged:true,topologyAndUvsUnchanged:true,allVertexAndTriangleCentroidSamplesPass:true});old.dispose();geometry.dispose()
}
await writeFile(new URL('measurements/terrain-validation.json',out),JSON.stringify(results,null,2));console.log('PASS rear hills and exact terrain seating',JSON.stringify(results))
