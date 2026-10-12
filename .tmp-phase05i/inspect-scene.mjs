import {fresh,evaluate,close,errors} from './browser.mjs'
try {
  await fresh()
  console.log(JSON.stringify(await evaluate(`(async()=>{
    const url=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('BufferGeometryUtils-')&&n.endsWith('.js'));
    const mod=await import(url); const found=Object.entries(mod).filter(([k,v])=>v&&typeof v==='object').map(([k,v])=>({key:k,keys:Object.keys(v).slice(0,10),three:!!v.Object3D}));
    return {url,found,requests:performance.getEntriesByType('resource').filter(e=>/fish_[abc]|butterfly_koi|shrimp_[ab]/.test(e.name)).map(e=>e.name)};
  })()`),null,2))
  console.log('errors',JSON.stringify(errors))
}finally{await close()}
