import {Matrix4,Vector3} from 'three'
import {readFile,writeFile} from 'node:fs/promises'
const source=new URL('./',import.meta.url)
const current=JSON.parse(await readFile(new URL('measurements/scene-production.json',source))).results[0].positions.find(p=>p.name==='fish-heavy').state
const reference=JSON.parse(await readFile(new URL('../.tmp-phase05i/measurements/scene-matched.json',source))).results[2].positions.find(p=>p.name==='fish-heavy').state
const rows=[]
for(const [label,state] of [['approved',reference],['integrated',current]]){
  const camera=new Matrix4().fromArray(state.camera.matrix).invert(),projection=new Matrix4().fromArray(state.camera.projection)
  for(const [name,fish] of Object.entries(state.fish)){
    const points=[]
    for(let i=0;i<8;i++){const v=new Vector3(...[0,1,2].map(k=>fish.worldBounds[(i>>k)&1?'max':'min'][k]));v.applyMatrix4(camera).applyMatrix4(projection);points.push({x:(v.x+1)*state.width/2,y:(1-v.y)*state.height/2})}
    const rect=[Math.floor(Math.min(...points.map(p=>p.x))-12),Math.floor(Math.min(...points.map(p=>p.y))-12),Math.ceil(Math.max(...points.map(p=>p.x))+12),Math.ceil(Math.max(...points.map(p=>p.y))+12)]
    rows.push({label,name,rect})
  }
}
await writeFile(new URL('measurements/visual-crops.json',source),JSON.stringify(rows,null,2))
