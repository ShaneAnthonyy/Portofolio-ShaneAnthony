import { evaluate, send } from './browser.mjs'

// Frozen black/white glyph renders locate letter cores over the actual backdrop.
export async function renderedContrast(selector, { large = false, focus = false, pseudo = '' } = {}) {
  const metrics = await evaluate(`(async()=>{
    const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error('Missing contrast target: '+${JSON.stringify(selector)});
    const state={original:window.requestAnimationFrame,raf:window.requestAnimationFrame.bind(window),held:[],animations:document.getAnimations().filter(a=>a.playState==='running')};window.__contrastFreeze=state;
    state.animations.forEach(a=>a.pause());window.requestAnimationFrame=fn=>state.raf(now=>state.held.push(fn));
    await new Promise(resolve=>state.raf(()=>state.raf(resolve)));
    const r=el.getBoundingClientRect(),s=getComputedStyle(el,${JSON.stringify(pseudo)}||null),c=new OffscreenCanvas(1,1).getContext('2d');
    c.fillStyle=${focus?'getComputedStyle(el).outlineColor':'s.color'};c.fillRect(0,0,1,1);
    const pad=${focus?-4:2},x=Math.max(0,r.x+pad),y=Math.max(0,r.y+pad),right=Math.min(innerWidth,r.right-pad),bottom=Math.min(innerHeight,r.bottom-pad),mask=document.createElement('style');mask.id='rendered-contrast-mask';document.head.append(mask);
    return{foreground:[...c.getImageData(0,0,1,1).data],clip:{x:x+scrollX,y:y+scrollY,width:right-x,height:bottom-y,scale:1}};
  })()`)
  const captures=[]
  try {
    if (metrics.clip.width <= 0 || metrics.clip.height <= 0) throw new Error(`Contrast target outside viewport: ${selector}`)
    for (const color of focus ? ['transparent'] : ['transparent', '#fff', '#000']) {
      const rule = focus ? `${selector}{outline-color:transparent!important}` : `${selector}${pseudo},${selector} *{color:${color}!important;-webkit-text-fill-color:${color}!important;transition:none!important}`
      await evaluate(`document.getElementById('rendered-contrast-mask').textContent=${JSON.stringify(rule)}`)
      const {data}=await send('Page.captureScreenshot',{format:'png',clip:metrics.clip,captureBeyondViewport:false});captures.push(data)
    }
    const result=await evaluate(`(async()=>{
      const images=[];for(const png of ${JSON.stringify(captures)}){const b=await createImageBitmap(await(await fetch('data:image/png;base64,'+png)).blob()),c=new OffscreenCanvas(b.width,b.height),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(b,0,0);images.push(ctx.getImageData(0,0,c.width,c.height));b.close()}
      const {data,width,height}=images[0],lut=Array.from({length:256},(_,v)=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}),lum=(r,g,b)=>lut[Math.max(0,Math.min(255,Math.round(r)))]*.2126+lut[Math.max(0,Math.min(255,Math.round(g)))]*.7152+lut[Math.max(0,Math.min(255,Math.round(b)))]*.0722,fg=${JSON.stringify(metrics.foreground)},alpha=fg[3]/255;
      let peak=0;if(!${focus})for(let i=0;i<data.length;i+=4)peak=Math.max(peak,(images[1].data[i]-images[2].data[i]+images[1].data[i+1]-images[2].data[i+1]+images[1].data[i+2]-images[2].data[i+2])/765);
      const cutoff=Math.min(.9,peak*.98);let minimum=Infinity,maximum=0,brightest=0,darkest=1,pixels=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const i=(y*width+x)*4;let color;
        if(${focus}){if(!(x<3||x>width-4||y<3||y>height-4))continue;if((x<width*.25||x>width*.75)&&(y<height*.25||y>height*.75))continue;color=fg.slice(0,3)}
        else{const w=images[1].data,k=images[2].data,coverage=(w[i]-k[i]+w[i+1]-k[i+1]+w[i+2]-k[i+2])/765;if(coverage<cutoff||peak<.5)continue;color=[0,1,2].map(j=>data[i+j]+alpha*(k[i+j]+(w[i+j]-k[i+j])*fg[j]/255-data[i+j]))}
        const b=lum(data[i],data[i+1],data[i+2]),f=lum(...color),ratio=(Math.max(b,f)+.05)/(Math.min(b,f)+.05);minimum=Math.min(minimum,ratio);maximum=Math.max(maximum,ratio);brightest=Math.max(brightest,b);darkest=Math.min(darkest,b);pixels++;
      }return{minimum,maximum,brightest,darkest,imageWidth:width,imageHeight:height,pixels,peakCoverage:peak,coverageCutoff:cutoff};
    })()`)
    if(!result.pixels)throw new Error(`No rendered glyph cores: ${selector}`)
    return{selector,threshold:large||focus?3:4.5,...result,foreground:metrics.foreground,png:captures[0]}
  } finally {
    await evaluate(`(async()=>{const mask=document.getElementById('rendered-contrast-mask');if(mask){mask.textContent=${JSON.stringify(`${selector},${selector} *{transition:none!important}`)};getComputedStyle(document.querySelector(${JSON.stringify(selector)})).color;mask.remove()}const s=window.__contrastFreeze;window.requestAnimationFrame=s.original;s.held.forEach(fn=>s.raf(fn));s.animations.forEach(a=>a.play());delete window.__contrastFreeze;await new Promise(resolve=>s.raf(()=>s.raf(resolve)))})()`)
  }
}
