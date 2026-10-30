import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fresh, approach, activate, until, unlocked, setWorldTime, evaluate, send, delay, close, errors } from './browser.mjs'

const out = new URL('./measurements/lite-background-seam/', import.meta.url)
const rows = []
await mkdir(out, { recursive: true })

async function measureBoundary(width, minutes, progress, direction) {
  await evaluate(`scrollTo({top:document.querySelector('#home').offsetHeight*${progress},behavior:'instant'})`)
  await until(`Math.abs(Number(document.querySelector('.hero-surface').dataset.progress)-${progress})<.002`)
  await delay(180)
  const state = await evaluate(`(() => {
    const home=document.querySelector('#home'),env=document.querySelector('.world-environment'),replay=document.querySelector('.hero__replay');
    const s=getComputedStyle(replay),r=home.getBoundingClientRect();
    return {boundary:r.bottom,viewportWidth:document.documentElement.clientWidth,viewportHeight:innerHeight,progress:Number(document.querySelector('.hero-surface').dataset.progress),clip:document.querySelector('.hero-surface clipPath path').getAttribute('transform'),owner:document.querySelector('.aqua-root').dataset.contentBackground,environmentOpacity:Number(getComputedStyle(env).opacity),minutes:Number(env.dataset.minutes),replay:{background:s.backgroundColor,border:s.borderTopWidth,rect:replay.getBoundingClientRect().toJSON()}};
  })()`)
  assert.ok(state.boundary > 100 && state.boundary < state.viewportHeight - 20)
  const clip = { x: 0, y: await evaluate('scrollY') + state.boundary - 8, width: state.viewportWidth, height: 16, scale: 1 }
  const { data } = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false })
  const pixels = await evaluate(`(async () => {
    const bitmap=await createImageBitmap(await(await fetch('data:image/png;base64,${data}')).blob());
    const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);bitmap.close();
    const {data,width,height}=ctx.getImageData(0,0,canvas.width,canvas.height),jumps=[];
    const step=width/${state.viewportWidth},middle=Math.round(height/2);
    for(let x=Math.ceil(width*.05);x<width*.95;x+=Math.max(1,Math.round(step*3))){
      const a=((middle-Math.round(step*2))*width+x)*4,b=((middle+Math.round(step*2))*width+x)*4;
      jumps.push(Math.max(...[0,1,2].map(c=>Math.abs(data[a+c]-data[b+c]))));
    }
    jumps.sort((a,b)=>a-b);return {samples:jumps.length,median:jumps[Math.floor(jumps.length*.5)],p95:jumps[Math.floor(jumps.length*.95)],max:jumps.at(-1)};
  })()`)
  const name = `${width}-${minutes}-${direction}-${progress}.png`
  await writeFile(new URL(name, out), Buffer.from(data, 'base64'))
  rows.push({ width, expectedMinutes: minutes, expectedProgress: progress, direction, ...state, pixels, screenshot: name })
}

try {
  for (const width of [1440, 390]) {
    await fresh({ width, height: width === 390 ? 844 : 900, lite: true })
    await approach(); await activate(); await until(unlocked)
    assert.equal(await evaluate(`document.querySelector('.hero-aquarium').dataset.state`), 'poster')
    assert.equal(await evaluate(`document.querySelectorAll('.hero-aquarium canvas').length`), 0)
    for (const minutes of [360, 720, 1080, 0]) {
      await setWorldTime(minutes)
      for (const [direction, positions] of [['forward', [.45, .62]], ['reverse', [.62, .45]]]) {
        for (const progress of positions) await measureBoundary(width, minutes, progress, direction)
      }
    }
    // Exercise the existing Manual slider continuously at an exposed crossing.
    await evaluate(`document.querySelector('.world-time-trigger').click()`)
    await evaluate(`new Promise(resolve=>{const input=document.querySelector('.world-time-panel input'),set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;let n=0;const tick=()=>{set.call(input,n*35);input.dispatchEvent(new Event('input',{bubbles:true}));if(++n<40)setTimeout(tick,20);else resolve()};tick()})`)
    await evaluate(`document.querySelector('.world-time-panel__head button').click()`)
    await delay(150)
    await measureBoundary(width, 225, .45, 'manual-scrub')
  }
  const failures = rows.filter(r => r.pixels.p95 > 5 || r.pixels.median > 3)
  assert.equal(failures.length, 0, `Rendered horizontal background seam: ${JSON.stringify(failures.map(({width,minutes,progress,pixels})=>({width,minutes,progress,pixels})))}`)
  for (const row of rows) {
    assert.equal(row.owner, 'true')
    assert.equal(row.environmentOpacity, 1)
    assert.equal(row.minutes, row.expectedMinutes)
    assert.equal(row.replay.background, 'rgba(0, 0, 0, 0)')
    assert.equal(row.replay.border, '0px')
    assert.ok(Math.abs(row.progress - row.expectedProgress) < .002)
  }
  assert.equal(errors.filter(e => !JSON.stringify(e).includes('favicon')).length, 0, JSON.stringify(errors))
  console.log(`PASS ${rows.length} rendered Lite boundaries: desktop/mobile, four presets, forward/reverse and continuous Manual scrubbing`)
} finally {
  await writeFile(new URL('results.json', out), JSON.stringify({ rows, errors }, null, 2))
  await close()
}
