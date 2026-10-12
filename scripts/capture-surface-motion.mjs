import { mkdir, writeFile } from 'node:fs/promises'
import { fresh, approach, activate, until, unlocked, send, evaluate, socket, delay, close } from './dive-browser.mjs'

const output = new URL('../.tmp-phase04m/motion/', import.meta.url)
await mkdir(output, { recursive: true })
const recordings = []
try {
  for (const [width, height] of [[1440,900],[390,844]]) {
    await fresh({ width, height })
    await approach()
    await activate()
    await until(unlocked)
    await delay(900)
    const origin = await evaluate('performance.timeOrigin')
    const captures = [], acknowledgements = []
    const receive = event => {
      const message = JSON.parse(event.data)
      if (message.method !== 'Page.screencastFrame') return
      captures.push(message.params)
      acknowledgements.push(send('Page.screencastFrameAck', { sessionId: message.params.sessionId }))
    }
    socket.addEventListener('message', receive)
    await send('Page.startScreencast', { format: 'jpeg', quality: 82, maxWidth: 1200, maxHeight: 900, everyNthFrame: 1 })
    const samples = await evaluate(`new Promise(resolve => {
      const samples = []; let start;
      const height = document.querySelector('#home').offsetHeight;
      const tick = now => {
        start ??= now;
        const elapsed = now - start;
        const p = elapsed < 700 ? 0 : elapsed < 4700 ? (elapsed - 700) / 4000 : elapsed < 5400 ? 1 : elapsed < 9400 ? 1 - (elapsed - 5400) / 4000 : 0;
        scrollTo({top: p * height, behavior: 'instant'});
        samples.push({ time: now, p, y: scrollY, direction: elapsed < 5400 ? 'forward' : 'reverse' });
        if (elapsed < 10000) requestAnimationFrame(tick); else resolve(samples);
      }; requestAnimationFrame(tick);
    })`)
    await send('Page.stopScreencast')
    socket.removeEventListener('message', receive)
    await Promise.all(acknowledgements)
    const frames = []
    for (let i = 0; i < captures.length; i++) {
      const capture = captures[i]
      const time = capture.metadata.timestamp * 1000 - origin
      const sample = samples.reduce((a,b) => Math.abs(a.time - time) < Math.abs(b.time - time) ? a : b)
      const file = `${width}-${String(i).padStart(4, '0')}.jpg`
      await writeFile(new URL(file, output), Buffer.from(capture.data, 'base64'))
      frames.push({ file, time: time - samples[0].time, p: sample.p, direction: sample.direction })
    }
    recordings.push({ width, height, frames, samples })
    console.log('CAPTURED', width, frames.length, 'timestamped browser frames')
  }
  await writeFile(new URL('recordings.json', output), JSON.stringify(recordings))
  const stages = [0,.15,.3,.45,.6,.75,.9,1]
  const sampleFrames = recordings.map(r => ({ width: r.width, frames: ['forward','reverse'].flatMap(direction => stages.map(p => {
    const f = r.frames.filter(f => f.direction === direction).reduce((a,b) => Math.abs(a.p - p) < Math.abs(b.p - p) ? a : b)
    return { ...f, requested: p }
  })) }))
  await writeFile(new URL('stages.json', output), JSON.stringify(sampleFrames, null, 2))
  await writeFile(new URL('index.html', output), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Phase 04M surface motion</title><style>body{margin:32px;background:#071b26;color:#e8eff5;font:15px system-ui}button,input{margin:10px 12px 10px 0}img{display:block;max-width:100%;height:auto}.player{max-width:1100px}.player img{max-height:78vh}.film{display:flex;gap:12px;overflow:auto}figure{min-width:260px;margin:0}figure img{max-width:350px;max-height:430px}figcaption{padding:10px 0}</style><h1>Phase 04M — Surface Break</h1><p>Actual Edge screencast frames with recorded timestamps. Desktop and mobile emulation. Capture overhead is excluded from the separate performance runs.</p>${recordings.map((r,i)=>`<section class="player"><h2>${r.width} × ${r.height}</h2><button data-play="${i}">Play / pause</button><input aria-label="Recording position" data-seek="${i}" type="range" min="0" max="${r.frames.length-1}" value="0"><span data-label="${i}"></span><img data-frame="${i}" src="${r.frames[0].file}" alt="Recorded surface transition"><h3>Forward and reverse checkpoints</h3><div class="film">${sampleFrames[i].frames.map(f=>`<figure><img loading="lazy" src="${f.file}" alt="${f.direction} ${Math.round(f.requested*100)} percent"><figcaption>${f.direction} · ${Math.round(f.requested*100)}%</figcaption></figure>`).join('')}</div></section>`).join('')}<script>const recordings=${JSON.stringify(recordings.map(({frames})=>frames))};recordings.forEach((frames,i)=>{const image=document.querySelector('[data-frame="'+i+'"]'),seek=document.querySelector('[data-seek="'+i+'"]'),label=document.querySelector('[data-label="'+i+'"]');let playing=false,start=0,index=0;const show=()=>{image.src=frames[index].file;seek.value=index;label.textContent=frames[index].direction+' '+Math.round(frames[index].p*100)+'%'};const tick=now=>{if(!playing)return;while(index<frames.length-1&&frames[index+1].time<=now-start)index++;show();if(index===frames.length-1){playing=false;return}requestAnimationFrame(tick)};document.querySelector('[data-play="'+i+'"]').onclick=()=>{playing=!playing;if(playing){if(index===frames.length-1)index=0;start=performance.now()-frames[index].time;requestAnimationFrame(tick)}};seek.oninput=()=>{playing=false;index=Number(seek.value);show()};show()});</script></html>`)
} finally {
  await close()
}
