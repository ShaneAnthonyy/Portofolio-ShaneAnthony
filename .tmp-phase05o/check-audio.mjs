import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {fresh,send,evaluate,until,delay,click,close,errors,warnings} from './browser.mjs'
const results=[]
await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__phaseAudio=[];const OriginalAudio=window.Audio;window.Audio=new Proxy(OriginalAudio,{construct(target,args){const audio=Reflect.construct(target,args);window.__phaseAudio.push(audio);return audio}})`})
try {
  await fresh()
  const audio=()=>evaluate(`(()=>{const a=window.__phaseAudio[0];return a?{src:a.currentSrc,paused:a.paused,time:a.currentTime,loop:a.loop,volume:a.volume,ready:a.readyState,error:a.error?.code||null,count:window.__phaseAudio.length}:null})()`)
  await click('.audio-toggle');await until('window.__phaseAudio[0]?.currentTime>0.1',20000)
  const playing=await audio();await delay(1000);const advanced=await audio()
  assert.equal(playing.paused,false);assert.equal(playing.loop,true);assert.equal(playing.volume,.3);assert.ok(advanced.time>playing.time);assert.equal(advanced.error,null)
  await click('.audio-toggle');await delay(150);const paused=await audio();assert.equal(paused.paused,true)
  await click('.audio-toggle');await until('!window.__phaseAudio[0].paused');assert.equal((await audio()).count,1)
  await click('.audio-toggle');results.push({playing,advanced,paused,resumeReusesElement:true});console.log('PASS real audio play, advancing position, pause, resume, loop and single element')
  await writeFile(new URL('./measurements/audio.json',import.meta.url),JSON.stringify({results,errors,warnings},null,2))
}finally{await close()}
