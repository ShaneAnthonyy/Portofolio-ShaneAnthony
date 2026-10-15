import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {fresh,send,socket,evaluate,until,delay,close,errors,warnings} from './browser.mjs'
const phase=process.argv[2]||'baseline',width=+(process.argv[3]||390),height=+(process.argv[4]||844),lite=process.argv.includes('--lite'),light=process.argv.includes('--light')
const label=`${width}x${height}-${lite?'lite':'normal'}-${light?'light':'dark'}`,out=new URL(`./${phase}/`,import.meta.url)
await mkdir(out,{recursive:true});const requests=[];await send('Network.enable')
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.responseReceived'&&m.params.response.url.includes('cherry_blossom'))requests.push(m.params.response)})
const result={phase,width,height,lite,light,states:[]}
try {
 await fresh({width,height,lite,theme:light?'light':'dark',mobile:width<500||process.argv.includes('--touch')})
 await evaluate(`(async()=>{
  const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('BufferGeometryUtils-')&&n.endsWith('.js')),m=await import(url),T=Object.values(m).find(v=>v&&typeof v==='object'&&v.Object3D&&v.WebGLRenderer),original=T.Object3D.prototype.onBeforeRender;
  const p=window.__trees={T};T.Object3D.prototype.onBeforeRender=function(renderer,scene,camera,...args){if(renderer.domElement.closest('.webgl-backdrop')&&scene.children.some(n=>n.name==='HilltopGround'))Object.assign(p,{renderer,scene,camera});return original.call(this,renderer,scene,camera,...args)};
  window.__treeSnapshot=(pixels=false)=>{
   const {renderer,scene,camera,T}=p;if(!renderer)return null;const ground=scene.getObjectByName('HilltopGround');const groups=ground.children.filter(g=>{let tree=false;g.traverse(n=>{if(n.geometry?.attributes.position.count===648)tree=true});return tree});
   const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)),gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,read=()=>{const a=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,a);return a};
   const shadowUpdate=renderer.shadowMap.autoUpdate;if(pixels){renderer.render(scene,camera);renderer.shadowMap.autoUpdate=false}const base=pixels?read():null;
   const trees=groups.map(group=>{const root=group.children[0],box=new T.Box3().setFromObject(group),points=[];group.traverse(n=>{if(!n.isMesh)return;const a=n.geometry.attributes.position;for(let i=0;i<a.count;i++)if(a.getY(i)>.6)points.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(n.matrixWorld).project(camera))});
    const xs=points.map(v=>(v.x+1)*innerWidth/2),ys=points.map(v=>(1-v.y)*innerHeight/2),rect={left:Math.min(...xs),top:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)},clip={left:Math.max(0,rect.left),right:Math.min(innerWidth,rect.right),top:Math.max(0,rect.top),bottom:Math.min(innerHeight,rect.bottom)};
    let contribution=null;if(pixels&&group.visible){group.visible=false;renderer.render(scene,camera);const removed=read();group.visible=true;let count=0,leafCount=0,minX=w,minY=h,maxX=-1,maxY=-1;for(let i=0;i<base.length;i+=4){if(Math.max(...[0,1,2].map(k=>Math.abs(base[i+k]-removed[i+k])))<4)continue;count++;const x=(i/4)%w,y=h-1-Math.floor(i/4/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);if(x/w*innerWidth>=clip.left&&x/w*innerWidth<=clip.right&&y/h*innerHeight>=clip.top&&y/h*innerHeight<=clip.bottom)leafCount++}contribution={changedPixels:count,canopyRegionChangedPixels:leafCount,cssPixelArea:count/(w/innerWidth)/(h/innerHeight),bounds:count?{left:minX/w*innerWidth,top:minY/h*innerHeight,right:maxX/w*innerWidth,bottom:maxY/h*innerHeight}:null};}
    return {visible:group.visible,rootVisible:root.visible,meshCulled:!frustum.intersectsBox(box),root:root.position.toArray(),world:root.getWorldPosition(new T.Vector3()).toArray(),scale:root.scale.toArray(),rotation:root.rotation.toArray(),worldBounds:{min:box.min.toArray(),max:box.max.toArray()},canopy:rect,clippedCanopy:clip,clippedArea:Math.max(0,clip.right-clip.left)*Math.max(0,clip.bottom-clip.top),contribution};
   });
   if(pixels){renderer.render(scene,camera);renderer.shadowMap.autoUpdate=shadowUpdate}
   return {trees,camera:{position:camera.position.toArray(),matrix:camera.matrixWorld.toArray(),projection:camera.projectionMatrix.toArray(),aspect:camera.aspect},fog:{density:scene.fog.density,color:scene.fog.color.toArray()},groundVisible:ground.visible,renderer:{pixelRatio:renderer.getPixelRatio(),canvas:[w,h],programs:renderer.info.programs.length},loadedResources:performance.getEntriesByType('resource').filter(r=>r.name.includes('cherry_blossom')).map(r=>r.toJSON())};
  };
 })()`)
 await until('!!window.__treeSnapshot()')
 const candidate=process.argv.find(a=>a.startsWith('--candidate='))?.split('=')[1]
 if(candidate){const configs=JSON.parse(await readFile(new URL(candidate,import.meta.url),'utf8'));await evaluate(await readFile(new URL('./reposition.js',import.meta.url),'utf8'));await evaluate(`window.__repositionTrees(${JSON.stringify(configs)})`)}
 for(const p of [0,.5,.91]){
  await evaluate(`scrollTo({top:document.querySelector('#portfolio-dive').offsetHeight*${p},behavior:'instant'})`);await delay(1800)
  const state=await evaluate(`window.__treeSnapshot(${p<.62})`);const {data}=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(`${label}-p${p}.png`,out),Buffer.from(data,'base64'));result.states.push({p,...state})
  console.log('AUDIT',phase,label,p,JSON.stringify(state.trees.map(t=>({visible:t.visible,culled:t.meshCulled,canopy:t.canopy,contribution:t.contribution}))))
 }
 result.requests=requests;result.errors=errors;result.warnings=warnings
} finally {await writeFile(new URL(label+'-visibility.json',out),JSON.stringify(result,null,2));await close()}
