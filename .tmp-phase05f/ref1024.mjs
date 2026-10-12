import { readFile, writeFile } from 'node:fs/promises'
import { fresh, evaluate, close } from '../scripts/dive-browser.mjs'

const files = {
  diff: ['./diff_1024_lossless.webp', './diff_1024_q90.webp'],
  rough: ['./rough_1024_lossless.webp'],
  ao: ['./ao_1024_lossless.webp'],
}
const urls = {
  diff: '/aquarium/terrain/grass_ground/grass_ground_diff_2k.jpg',
  rough: '/aquarium/terrain/grass_ground/grass_ground_rough_2k.png',
  ao: '/aquarium/terrain/grass_ground/grass_ground_ao_2k.jpg',
}
const b64 = {}
for (const [k, arr] of Object.entries(files)) b64[k] = arr.map(f => readFile(new URL(f, import.meta.url)).then(b => b.toString('base64')))
for (const k of Object.keys(b64)) b64[k] = await Promise.all(b64[k])
await fresh({ width: 1440, height: 900 })
const stats = await evaluate(`(async (b64, urls) => {
  const out = {}
  for (const k of Object.keys(urls)) {
    const origBmp = await createImageBitmap(await (await fetch(urls[k])).blob())
    const c0 = document.createElement('canvas'); c0.width = 1024; c0.height = 1024
    c0.getContext('2d').drawImage(origBmp, 0, 0, 1024, 1024)
    const ref = c0.getContext('2d').getImageData(0, 0, 1024, 1024).data
    out[k] = { src: [origBmp.width, origBmp.height], cands: [] }
    for (const b of b64[k]) {
      const bin = Uint8Array.from(atob(b), c => c.charCodeAt(0))
      const bmp = await createImageBitmap(new Blob([bin], { type: 'image/webp' }))
      const c1 = document.createElement('canvas'); c1.width = 1024; c1.height = 1024
      c1.getContext('2d').drawImage(bmp, 0, 0, 1024, 1024)
      const cand = c1.getContext('2d').getImageData(0, 0, 1024, 1024).data
      const ch = k === 'rough' ? [1] : [0, 1, 2]
      let maxAbs = 0, sumAbs = 0, n = 0
      for (let i = 0; i < ref.length; i += 4) for (const k2 of ch) {
        const d = Math.abs(ref[i + k2] - cand[i + k2])
        if (d > maxAbs) maxAbs = d
        sumAbs += d; n++
      }
      out[k].cands.push({ maxAbs, meanAbs: sumAbs / n })
    }
  }
  return out
})(${JSON.stringify(b64)}, ${JSON.stringify(urls)})`, 180000)
console.log(JSON.stringify(stats, null, 1))
await writeFile(new URL('ref1024.json', import.meta.url), JSON.stringify(stats, null, 2))
await close()
