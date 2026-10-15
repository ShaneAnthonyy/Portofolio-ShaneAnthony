import {send,evaluate,until,delay,click,screenshot,close,errors} from './browser.mjs'
import {writeFile} from 'node:fs/promises'
const states=[]
async function record(label){const state=await evaluate(`({now:performance.now(),loading:!!document.querySelector('.loading-screen'),ready:!!document.querySelector('.loading-screen__enter'),chars:(window.__charRigs||[]).map(c=>({kind:c.kind,t:c.t,clip:c.curClip,active:c.active,visible:c.group.visible,pos:c.root.position.toArray()}))})`);states.push({label,...state});console.log(label,JSON.stringify(state))}
try {
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
 await send('Network.enable');await send('Network.clearBrowserCache')
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('shane-theme','dark')`})
 await send('Page.navigate',{url:'http://127.0.0.1:4173/'})
 await until('(window.__charRigs||[]).length===2',90000);await record('assets-loaded')
 await until(`!!document.querySelector('.loading-screen__enter')`,90000);await record('ready-overlay-held')
 await delay(10000);await record('held-ten-seconds')
 await click('.loading-screen__enter');await delay(300);await record('visible-initial');await screenshot('baseline/initial.png')
 await delay(4000);await record('initial-four-seconds')
 await evaluate(`scrollTo(0,document.querySelector('#portfolio-dive').offsetHeight*.18)`)
 for(const [label,ms]of[['walk',2500],['run',2500],['exit',4000],['golem-end',5000]]){await delay(ms);await record(label);await screenshot(`baseline/${label}.png`)}
}finally {await writeFile(new URL('baseline/timeline.json',import.meta.url),JSON.stringify({states,errors},null,2));await close()}
