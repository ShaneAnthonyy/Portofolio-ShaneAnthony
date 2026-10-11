import {fresh,approach,activate,send,evaluate,snap,delay,errors,close} from '../scripts/dive-browser.mjs'
try {
  await fresh()
  await approach()
  await activate()
  await send('Emulation.setFocusEmulationEnabled', {enabled:false})
  await send('Page.setWebLifecycleState', {state:'frozen'})
  await delay(200)
  await send('Page.setWebLifecycleState', {state:'active'})
  await send('Emulation.setFocusEmulationEnabled', {enabled:true})
  await delay(800)
  console.log('errors',JSON.stringify(errors,null,2))
  console.log('page',await evaluate(`({hidden:document.hidden,html:document.querySelector('#root').innerHTML.slice(0,200)})`))
  console.log(await snap())
} finally {await close()}
