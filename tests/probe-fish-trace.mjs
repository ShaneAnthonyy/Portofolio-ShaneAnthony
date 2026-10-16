import { writeFile } from 'node:fs/promises'
import { fresh, evaluate, until, delay, close, errors, warnings, approach, activate, unlocked } from './browser.mjs'
const label = process.argv[2] || 'before'
const out = (n, d) => writeFile(new URL(`./${n}`, import.meta.url), JSON.stringify(d, null, 2))
const res = {}
try {
  await fresh({ width: 390, height: 844 })
  await approach(); await activate(); await until(unlocked, 25000)
  await evaluate(`document.querySelector('#projects').scrollIntoView({block:'start',behavior:'instant'})`)
  await delay(600)
  const n = await evaluate(`document.querySelectorAll('#projects .ambient-fish-layer .fish').length`)
  const samples = []
  for (let i = 0; i < 120; i++) {
    samples.push(await evaluate(`[...document.querySelectorAll('#projects .ambient-fish-layer .fish')].map(e=>{const t=e.style.transform.replace('translate3d(','').split(',');return t.length>1?[parseFloat(t[0]),parseFloat(t[1])]:null})`))
    await delay(250)
  }
  const stats = samples[0].map((_, f) => {
    const xs = samples.map(s => s[f] && s[f][0]).filter(v => v !== null)
    let flips = 0
    for (let i = 2; i < xs.length; i++) { const a = Math.sign(xs[i-1] - xs[i-2]), b = Math.sign(xs[i] - xs[i-1]); if (a !== 0 && b !== 0 && a !== b) flips++ }
    return { fish: f, n: xs.length, minX: Math.min(...xs), maxX: Math.max(...xs), span: Math.max(...xs) - Math.min(...xs), flips30s: flips }
  })
  res.fishCount = n; res.stats = stats
  await out(`./measurements/fish-trace-${label}.json`, { res, errors, warnings })
  console.log(JSON.stringify(res))
} finally { await close() }
