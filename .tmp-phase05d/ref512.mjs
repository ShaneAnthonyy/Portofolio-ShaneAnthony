import { readFile, writeFile } from 'node:fs/promises'
import { fresh, send, evaluate, close } from '../scripts/dive-browser.mjs'

const n2b64 = (await readFile(new URL('./nor_512_lossless.webp', import.meta.url))).toString('base64')
await fresh({ width: 1440, height: 900 })
const stats = await evaluate(`(async n2b64 => {
  const bin = Uint8Array.from(atob(n2b64), c => c.charCodeAt(0));
  const res = await fetch('/aquarium/terrain/grass_ground/grass_ground_nor_gl_2k.png');
  const origBlob = await res.blob();
  const origBmp = await createImageBitmap(origBlob);
  const c0 = document.createElement('canvas'); c0.width = 512; c0.height = 512;
  c0.getContext('2d', { colorSpace: 'srgb' }).drawImage(origBmp, 0, 0, 512, 512);
  const ref = c0.getContext('2d').getImageData(0, 0, 512, 512).data;
  const n2Bmp = await createImageBitmap(new Blob([bin], { type: 'image/webp' }));
  const c1 = document.createElement('canvas'); c1.width = 512; c1.height = 512;
  c1.getContext('2d', { colorSpace: 'srgb' }).drawImage(n2Bmp, 0, 0, 512, 512);
  const cand = c1.getContext('2d').getImageData(0, 0, 512, 512).data;
  let maxAbs = 0, sumAbs = 0, maxAng = 0, sumAng = 0, gt1 = 0, n = 0;
  for (let i = 0; i < ref.length; i += 4) {
    let ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0;
    for (let k = 0; k < 3; k++) {
      const d = Math.abs(ref[i + k] - cand[i + k]);
      if (d > maxAbs) maxAbs = d;
      sumAbs += d;
      ax += 0; 
    }
    const vax = ref[i] / 255 * 2 - 1, vay = ref[i+1] / 255 * 2 - 1, vaz = ref[i+2] / 255 * 2 - 1;
    const vbx = cand[i] / 255 * 2 - 1, vby = cand[i+1] / 255 * 2 - 1, vbz = cand[i+2] / 255 * 2 - 1;
    const la = Math.hypot(vax, vay, vaz), lb = Math.hypot(vbx, vby, vbz);
    const ang = Math.acos(Math.min(1, Math.max(-1, (vax*vbx + vay*vby + vaz*vbz) / Math.max(la * lb, 1e-9)))) * 180 / Math.PI;
    if (ang > maxAng) maxAng = ang;
    sumAng += ang;
    if (ang > 1) gt1++;
    n++;
  }
  return { src: [origBmp.width, origBmp.height], maxAbs, meanAbs: sumAbs / (n * 3), maxAngDeg: maxAng, meanAngDeg: sumAng / n, fracAngGt1deg: gt1 / n };
})(${JSON.stringify(n2b64)})`, 120000)
console.log(JSON.stringify(stats))
await writeFile(new URL('ref512.json', import.meta.url), JSON.stringify(stats, null, 2))
await close()
