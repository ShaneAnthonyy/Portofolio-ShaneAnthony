import {fresh,approach,activate,until,unlocked,active,snap,startFrames,stopFrames,delay,close,screenshot} from '../scripts/dive-browser.mjs'
try {
  await fresh()
  await approach()
  console.log('before',await snap())
  await startFrames()
  await activate()
  console.log('active',await snap())
  await until(unlocked)
  await delay(2200)
  console.log('settled',await snap())
  const frames=await stopFrames('probe')
  console.log('frames',frames.filter(f=>f.landing).length,'rangeY',Math.min(...frames.map(f=>f.titleCY)),Math.max(...frames.map(f=>f.titleCY)))
  await screenshot('probe.png')
} finally { await close() }
