import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {fresh,send,evaluate,until,delay,close,errors} from './browser.mjs'
const width=+(process.argv[2]||390),height=+(process.argv[3]||844),label=`${width}x${height}`,out=new URL('./motion/',import.meta.url)
try{
 await fresh({width,height})
 await evaluate(`(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('BufferGeometryUtils-')&&n.endsWith('.js')),m=await import(url),T=Object.values(m).find(v=>v&&typeof v==='object'&&v.Object3D&&v.WebGLRenderer),original=T.Object3D.prototype.onBeforeRender;const p=window.__motion={frames:[]};T.Object3D.prototype.onBeforeRender=function(renderer,scene,camera,...args){if(renderer.domElement.closest('.webgl-backdrop')&&scene.children.some(n=>n.name==='HilltopGround')){p.scene=scene;p.camera=camera}return original.call(this,renderer,scene,camera,...args)}})()`)
 await until('!!window.__motion.scene')
 const distance=await evaluate('document.querySelector("#portfolio-dive").offsetHeight*.5')
 await evaluate('scrollTo({top:document.querySelector("#portfolio-dive").offsetHeight*.2,behavior:"instant"})');await delay(1200)
 await evaluate(`(()=>{const p=window.__motion,g=p.scene.getObjectByName('HilltopGround');p.roots=g.children.filter(g=>{let found=false;g.traverse(n=>{if(n.geometry?.attributes.position.count===648)found=true});return found}).filter(g=>g.visible).map(g=>g.children[0]);p.record=true;function sample(t){if(!p.record)return;p.frames.push({time:t,camera:p.camera.position.toArray(),trees:p.roots.map(r=>({position:r.position.toArray(),rotation:r.rotation.toArray()}))});requestAnimationFrame(sample)}requestAnimationFrame(sample)})()`)
 for(const [direction,sign]of [['forward',-1],['reverse',1]]){
  const movement=send('Input.synthesizeScrollGesture',{x:width*.5,y:height*.5,yDistance:distance*sign,speed:Math.round(distance/3),gestureSourceType:'mouse',preventFling:true})
  movement.catch(()=>{})
  for(let i=0;i<8;i++){await delay(350);const{data}=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(`${label}-${direction}-${i}.png`,out),Buffer.from(data,'base64'))}
  await movement;await delay(700)
 }
 const frames=await evaluate('(window.__motion.record=false,window.__motion.frames)');assert.ok(frames.length>150)
 for(let i=0;i<frames[0].trees.length;i++){const poses=frames.map(f=>f.trees[i]);assert.ok(poses.every(p=>p.position.every((v,k)=>v===poses[0].position[k])));assert.ok(poses.some(p=>p.rotation[0]!==poses[0].rotation[0]));assert.ok(poses.every(p=>Math.abs(p.rotation[0])<=.009001&&Math.abs(p.rotation[2])<=.006001))}
 await writeFile(new URL(label+'.json',out),JSON.stringify({frames,errors},null,2));console.log('PASS forward/reverse motion frames and rooted sway',label)
}finally{await close()}
