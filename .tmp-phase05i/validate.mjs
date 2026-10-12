import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {send,evaluate,until,close,errors,warnings} from './browser.mjs'
const sample=process.argv.includes('--sample')
const inventory=JSON.parse(await readFile(new URL('./measurements/inventory.json',import.meta.url)))
const models=sample?['fish_a']:inventory.models.map(r=>r.name)
const variants=sample?['original','lossless']:['original','lossless','q95']
const output=new URL('./comparisons/models/',import.meta.url)
await mkdir(output,{recursive:true})
const results=[]
try {
  await send('Emulation.setDeviceMetricsOverride',{width:1320,height:500,deviceScaleFactor:1,mobile:false})
  await send('Page.navigate',{url:'http://127.0.0.1:4175/'})
  await until('!!window.GLTFLoader')
  await evaluate(`window.__models=[];window.__pixels=[];window.__pixelGL=document.createElement('canvas').getContext('webgl2')`)
  for(const name of models) {
    await evaluate('window.__models=[];window.__pixels=[]')
    const rows=[]
    for(const variant of variants) {
      const url=variant==='original'?`/public/aquarium/${name}.glb`:`/.tmp-phase05i/candidates/${variant}/${name}.glb`
      const row=await evaluate(`(async()=>{
        const {THREE,GLTFLoader}=window;
        const started=performance.now(); const gltf=await new GLTFLoader().loadAsync(${JSON.stringify(url)}); const loadMs=performance.now()-started;
        const root=gltf.scene;root.updateMatrixWorld(true); window.__models.push(root);
        const box=new THREE.Box3().setFromObject(root);const meshes=[];const textures=[];const pixels=[];
        root.traverse(n=>{
          if(!n.isMesh)return;
          meshes.push({name:n.name,matrix:n.matrix.toArray(),world:n.matrixWorld.toArray(),triangles:n.geometry.index.count/3,attributes:Object.fromEntries(Object.entries(n.geometry.attributes).map(([k,a])=>[k,{count:a.count,itemSize:a.itemSize,normalized:a.normalized}])),morph:n.morphTargetInfluences||null});
          for(const mat of Array.isArray(n.material)?n.material:[n.material]) {
            for(const slot of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','specularColorMap','specularIntensityMap']) {
              const t=mat[slot];if(!t)continue;
              const gl=window.__pixelGL, tx=gl.createTexture(),fb=gl.createFramebuffer();gl.bindTexture(gl.TEXTURE_2D,tx);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,t.image);gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tx,0);
              if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete pixel framebuffer');
              const values=new Uint8Array(t.image.width*t.image.height*4);gl.readPixels(0,0,t.image.width,t.image.height,gl.RGBA,gl.UNSIGNED_BYTE,values);gl.deleteFramebuffer(fb);gl.deleteTexture(tx);
              pixels.push(values);textures.push({slot,width:t.image.width,height:t.image.height,colorSpace:t.colorSpace,flipY:t.flipY,premultiplyAlpha:t.premultiplyAlpha,wrapS:t.wrapS,wrapT:t.wrapT,magFilter:t.magFilter,minFilter:t.minFilter,channel:t.channel,offset:t.offset.toArray(),repeat:t.repeat.toArray(),rotation:t.rotation});
            }
          }
        });
        const comparisons=pixels.map((values,i)=>{const original=window.__pixels[0]?.[i]||values;const max=[0,0,0,0],sum=[0,0,0,0];for(let k=0;k<values.length;k++){const c=k%4,d=Math.abs(values[k]-original[k]);max[c]=Math.max(max[c],d);sum[c]+=d;}return {slot:textures[i].slot,max,mean:sum.map(s=>s/(values.length/4))}});
        window.__pixels.push(pixels);
        const clone=root.clone(true);clone.position.set(1,2,3);clone.rotation.set(.1,.2,.3);clone.updateMatrixWorld(true);const cb=new THREE.Box3().setFromObject(clone);
        return {loadMs,meshes,textures,comparisons,bounds:{min:box.min.toArray(),max:box.max.toArray()},cloneBounds:{min:cb.min.toArray(),max:cb.max.toArray()},animations:gltf.animations.length,materials:gltf.parser.json.materials};
      })()`)
      row.variant=variant
      assert.ok([...row.bounds.min,...row.bounds.max,...row.cloneBounds.min,...row.cloneBounds.max].every(Number.isFinite))
      if(rows.length) {
        for(const key of ['meshes','textures','bounds','cloneBounds','animations','materials'])assert.deepEqual(row[key],rows[0][key],`${name}/${variant}/${key}`)
        for(const diff of row.comparisons) {
          assert.equal(diff.max[3],0,`${name} alpha`)
          if(variant==='lossless'||diff.slot!=='map')assert.deepEqual(diff.max,[0,0,0,0],`${name}/${variant}/${diff.slot} sampled pixels`)
        }
      }
      rows.push(row)
    }
    results.push({name,variants:rows,pass:true})
    if(!sample) {
      await evaluate(`(()=>{
        const T=THREE;
        if(window.__renderer){window.__renderer.dispose();window.__renderer.domElement.remove()}
        const r=window.__renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(1320,500);r.setPixelRatio(1);r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.2;document.body.append(r.domElement);
        window.__renderModels=(angle)=>{
          r.setScissorTest(true);
          window.__models.forEach((root,i)=>{
            const scene=new T.Scene();scene.background=new T.Color('#234944');scene.add(new T.HemisphereLight(0xd9f5ef,0x37595e,2.1));const key=new T.DirectionalLight(0xffead5,3.2);key.position.set(2,4,5);scene.add(key);
            const obj=root.clone(true), box=new T.Box3().setFromObject(obj), center=box.getCenter(new T.Vector3()), size=box.getSize(new T.Vector3());obj.position.sub(center);scene.add(obj);
            const radius=size.length()/2, camera=new T.PerspectiveCamera(35,440/500,.001,1000),d=radius/Math.sin(35*Math.PI/360)*1.12;camera.position.set(Math.sin(angle)*d,.1*d,Math.cos(angle)*d);camera.lookAt(0,0,0);
            r.setViewport(i*440,0,440,500);r.setScissor(i*440,0,440,500);r.render(scene,camera);
          })
        }
      })()`)
      for(const [label,angle] of [['side',0],['oblique',.65],['reverse',Math.PI]]) {
        await evaluate(`window.__renderModels(${angle})`)
        const {data}=await send('Page.captureScreenshot',{format:'png'})
        await writeFile(new URL(`${name}-${label}.png`,output),Buffer.from(data,'base64'))
      }
    }
    console.log('PASS',name,'loader, bounds, clone, material, browser sampled channels')
    await writeFile(new URL(`./measurements/loader-${sample?'sample':'all'}.json`,import.meta.url),JSON.stringify({results,errors,warnings},null,2))
    await evaluate(`window.__models.forEach(root=>root.traverse(n=>{if(n.isMesh){n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material]){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose()}}}));window.__models=[];window.__pixels=[]`)
  }
  assert.equal(errors.length,0,JSON.stringify(errors))
} finally {await close()}
