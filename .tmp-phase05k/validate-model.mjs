import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {send,evaluate,until,close,errors,warnings} from './browser.mjs'
const out=new URL('./',import.meta.url)
try{
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:800,deviceScaleFactor:1,mobile:false})
  await send('Page.navigate',{url:'http://127.0.0.1:4175/'})
  await until('!!window.GLTFLoader')
  const result=await evaluate(`(async()=>{
    const T=THREE;const roots=[];const rows=[];
    for(const file of ['cherry_blossom.glb','cherry_blossom-opt.glb']){
      const gltf=await new GLTFLoader().loadAsync('/public/aquarium/environment/'+file),root=gltf.scene;root.updateMatrixWorld(true);roots.push(root);
      const bounds=new T.Box3().setFromObject(root);const mats=new Map(),maps=new Map();let triangles=0,vertices=0,meshes=0;const foot=[];
      root.traverse(n=>{if(!n.isMesh)return;meshes++;triangles+=n.geometry.index.count/3;vertices+=n.geometry.attributes.position.count;
        const pos=n.geometry.attributes.position,v=new T.Vector3();for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(n.matrixWorld);if(Math.abs(v.y-bounds.min.y)<1e-6)foot.push(v.toArray())}
        const m=n.material;mats.set(m.uuid,{type:m.type,color:m.color.toArray(),roughness:m.roughness,metalness:m.metalness,transparent:m.transparent,side:m.side,alphaTest:m.alphaTest,opacity:m.opacity});if(m.map)maps.set(m.map.uuid,{width:m.map.image.width,height:m.map.image.height,colorSpace:m.map.colorSpace,magFilter:m.map.magFilter,minFilter:m.map.minFilter,wrapS:m.map.wrapS,wrapT:m.map.wrapT});
      });
      rows.push({file,meshes,triangles,vertices,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},materials:[...mats.values()],textures:[...maps.values()],foot,rootRotation:root.rotation.toArray(),rootScale:root.scale.toArray(),animations:gltf.animations.length});
    }
    const r=window.__renderer=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});r.setSize(1440,800);r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.2;document.body.append(r.domElement);
    window.__renderCherry=angle=>{
      r.setScissorTest(true);const pixels=[];const stats=[];
      roots.forEach((root,i)=>{const scene=new T.Scene();scene.background=new T.Color('#284c53');scene.add(new T.HemisphereLight(0xd9f5ef,0x37595e,2.1));const light=new T.DirectionalLight(0xffead5,3.2);light.position.set(2,4,5);scene.add(light);
        const model=root.clone(true);scene.add(model);const camera=new T.PerspectiveCamera(35,.9,.01,100);camera.position.set(Math.sin(angle)*4.8,2.5,Math.cos(angle)*4.8);camera.lookAt(0,.8,0);
        r.setViewport(i*720,0,720,800);r.setScissor(i*720,0,720,800);r.render(scene,camera);stats.push({...r.info.render});const gl=r.getContext(),values=new Uint8Array(720*800*4);gl.readPixels(i*720,0,720,800,gl.RGBA,gl.UNSIGNED_BYTE,values);pixels.push(values);
      });
      let different=0,max=0,sum=0;for(let i=0;i<pixels[0].length;i++){const d=Math.abs(pixels[0][i]-pixels[1][i]);if(d)different++;max=Math.max(max,d);sum+=d}return {differentChannels:different,totalChannels:pixels[0].length,maxChannelDifference:max,meanChannelDifference:sum/pixels[0].length,stats};
    };return rows;
  })()`)
  assert.equal(result[0].triangles,324);assert.equal(result[1].triangles,324);assert.equal(result[1].meshes,1)
  for(const key of ['bounds','materials','textures','foot','rootRotation','rootScale'])assert.deepEqual(result[0][key],result[1][key],key+' preserved')
  const views=[]
  for(const [name,angle] of [['front',0],['oblique',.7],['back',Math.PI]]){
    const diff=await evaluate(`window.__renderCherry(${angle})`);assert.ok(diff.differentChannels/diff.totalChannels<.001&&diff.meanChannelDifference<.02,name+' rendered equivalence within raster edge rounding')
    const {data}=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL('comparisons/model-'+name+'.png',out),Buffer.from(data,'base64'));views.push({name,...diff})
  }
  assert.equal(errors.length,0,JSON.stringify(errors))
  await writeFile(new URL('measurements/model-validation.json',out),JSON.stringify({models:result,views,errors,warnings},null,2))
  console.log('PASS original and consolidated cherry: exact bounds, pivot, materials, UV/color maps; three rendered views within raster edge rounding',JSON.stringify(views))
}finally{await close()}
