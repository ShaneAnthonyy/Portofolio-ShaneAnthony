import { readFile, writeFile } from 'node:fs/promises'
import { fresh, evaluate, close } from '../scripts/dive-browser.mjs'

const n2b64 = (await readFile(new URL('./nor_512_lossless.webp', import.meta.url))).toString('base64')
await fresh({ width: 1440, height: 900 })
const imgs = await evaluate(`(async n2b64 => {
  const bin = Uint8Array.from(atob(n2b64), c => c.charCodeAt(0));
  const origBmp = await createImageBitmap(await (await fetch('/aquarium/terrain/grass_ground/grass_ground_nor_gl_2k.png')).blob());
  const c0 = document.createElement('canvas'); c0.width = 512; c0.height = 512;
  c0.getContext('2d').drawImage(origBmp, 0, 0, 512, 512);
  const n2Bmp = await createImageBitmap(new Blob([bin], { type: 'image/webp' }));
  const c1 = document.createElement('canvas'); c1.width = 512; c1.height = 512;
  c1.getContext('2d').drawImage(n2Bmp, 0, 0, 512, 512);
  return { ref: c0.toDataURL('image/png').slice(22), n2: c1.toDataURL('image/png').slice(22) };
})(${JSON.stringify(n2b64)})`, 120000)
await writeFile(new URL('ref512-browser.png', import.meta.url), Buffer.from(imgs.ref, 'base64'))
await writeFile(new URL('n2-as-seen.png', import.meta.url), Buffer.from(imgs.n2, 'base64'))
console.log('dumped')
await close()
