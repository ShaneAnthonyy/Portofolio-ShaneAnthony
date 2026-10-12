import { writeFile } from 'node:fs/promises'
import { fresh, evaluate, close } from '../scripts/dive-browser.mjs'

await fresh({ width: 1440, height: 900 })
const out = await evaluate(`(async () => {
  const origBmp = await createImageBitmap(await (await fetch('/aquarium/terrain/grass_ground/grass_ground_nor_gl_2k.png')).blob());
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  c.getContext('2d').drawImage(origBmp, 0, 0, 512, 512);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const ab = await blob.arrayBuffer();
  const u = new Uint8Array(ab);
  let s = '';
  for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192));
  return { bytes: ab.byteLength, b64: btoa(s) };
})()`, 120000)
console.log('n2b bytes', out.bytes)
await writeFile(new URL('nor_512_browser.png', import.meta.url), Buffer.from(out.b64, 'base64'))
await close()
