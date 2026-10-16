(()=>{
 const p=window.__qa,T=p.T;
 p.forest=()=>p.scene.getObjectByName('HilltopGround').children.filter(g=>g.getObjectByName('GreenTree')||g.getObjectByName('CherryBlossom'));
 p.forestState=()=>p.forest().map(g=>{const mesh=g.getObjectByName('GreenTree')||g.getObjectByName('CherryBlossom'),root=g.children[0],box=new T.Box3().setFromObject(g),v=new T.Vector3(),xs=[],ys=[],feet=[],a=mesh.geometry.attributes.position;let minY=Infinity;for(let i=0;i<a.count;i++)minY=Math.min(minY,a.getY(i));
  for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);if(a.getY(i)<=minY+.0001)feet.push(v.toArray());v.project(p.camera);xs.push((v.x+1)*innerWidth/2);ys.push((1-v.y)*innerHeight/2)}
  return {kind:mesh.name,id:g.uuid,visible:g.visible,position:root.position.toArray(),scale:root.scale.x,yaw:root.rotation.y,geometry:mesh.geometry.uuid,material:mesh.material.uuid,feet,box:{min:box.min.toArray(),max:box.max.toArray()},rect:{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)}}});
 p.greenPixels=()=>{const r=p.renderer,gl=r.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,read=()=>{const a=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,a);return a},shadow=r.shadowMap.autoUpdate;
  r.setRenderTarget(null);r.render(p.scene,p.camera);r.shadowMap.autoUpdate=false;const base=read(),out=[];
  for(const g of p.forest().filter(g=>g.visible&&g.getObjectByName('GreenTree'))){g.visible=false;r.render(p.scene,p.camera);const removed=read();g.visible=true;let pixels=0;for(let i=0;i<base.length;i+=4)if(Math.max(Math.abs(base[i]-removed[i]),Math.abs(base[i+1]-removed[i+1]),Math.abs(base[i+2]-removed[i+2]))>=4)pixels++;out.push({id:g.uuid,pixels,cssArea:pixels/(w/innerWidth)/(h/innerHeight)})}
  r.render(p.scene,p.camera);r.shadowMap.autoUpdate=shadow;return out};
})()
