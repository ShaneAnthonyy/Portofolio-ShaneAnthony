import { readFile, writeFile } from 'node:fs/promises'
import { send, evaluate, close } from '../scripts/dive-browser.mjs'

const SRC = new URL('./tree-opt-150k.glb', import.meta.url)
const DST = new URL('./tree-opt-150k-1024.glb', import.meta.url)
const file = await readFile(SRC)
const jsonLen = file.readUInt32LE(12)
const json = JSON.parse(file.subarray(20, 20 + jsonLen).toString('utf8'))
const binLen = file.readUInt32LE(20 + jsonLen)
const bin = file.subarray(20 + jsonLen + 8, 20 + jsonLen + 8 + binLen)
const texOf = slot => {
  const m = json.materials[0]
  const t = slot === 'base' ? m.pbrMetallicRoughness.baseColorTexture.index
    : slot === 'mr' ? m.pbrMetallicRoughness.metallicRoughnessTexture.index : m.normalTexture.index
  const tx = json.textures[t]
  return tx.source ?? tx.extensions?.EXT_texture_webp?.source
}
const imgRange = i => {
  const bv = json.bufferViews[json.images[i].bufferView]
  return [bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength]
}
const baseImg = texOf('base')
console.log('baseColor image index', baseImg, json.images[baseImg].mimeType)
const [s, e] = imgRange(baseImg)
const webpB64 = bin.subarray(s, e).toString('base64')

await send('Page.navigate', { url: 'about:blank' })
await new Promise(r => setTimeout(r, 800))
const out = await evaluate(`(async b64 => {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const bmp = await createImageBitmap(new Blob([bin], { type: 'image/webp' }));
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  c.getContext('2d').drawImage(bmp, 0, 0, 1024, 1024);
  const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.85));
  const ab = await blob.arrayBuffer();
  return { w: bmp.width, h: bmp.height, bytes: ab.byteLength,
    b64: btoa(String.fromCharCode(...new Uint8Array(ab).slice(0, 0))) || '',
    full: Array.from(new Uint8Array(ab)).map(b => String.fromCharCode(b)).join('') };
})(${JSON.stringify(webpB64)})`, 60000)
console.log('src', out.w + 'x' + out.h, 'out bytes', out.bytes)
const newImg = Buffer.from(out.full, 'binary')
await writeFile(new URL('./basecolor-1024.webp', import.meta.url), newImg)

const bv = json.bufferViews[json.images[baseImg].bufferView]
const before = bin.subarray(0, bv.byteOffset || 0)
const after = bin.subarray((bv.byteOffset || 0) + bv.byteLength)
const pad = x => (x + 3) & ~3
const nb = Buffer.alloc(pad(before.length + newImg.length) + after.length)
before.copy(nb, 0)
newImg.copy(nb, before.length)
after.copy(nb, pad(before.length + newImg.length))
const j2 = JSON.parse(JSON.stringify(json))
j2.bufferViews[json.images[baseImg].bufferView] = { ...bv, buffer: 0, byteOffset: before.length, byteLength: newImg.length }
j2.bufferViews.forEach(b => {
  if ((b.byteOffset || 0) >= (bv.byteOffset || 0) + bv.byteLength) b.byteOffset += pad(before.length + newImg.length) - ((bv.byteOffset || 0) + bv.byteLength)
})
const jstr = Buffer.from(JSON.stringify(j2))
const jp = Buffer.alloc(pad(jstr.length), 0x20)
jstr.copy(jp)
const total = 12 + 8 + jp.length + 8 + nb.length
const glb = Buffer.alloc(total)
glb.writeUInt32LE(0x46546C67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(total, 8)
glb.writeUInt32LE(jp.length, 12); glb.writeUInt32LE(0x4E4F534A, 16); jp.copy(glb, 20)
glb.writeUInt32LE(nb.length, 20 + jp.length); glb.writeUInt32LE(0x004E4942, 24 + jp.length); nb.copy(glb, 28 + jp.length)
await writeFile(DST, glb)
console.log('wrote', (glb.length / 1048576).toFixed(2) + 'MB')
await close()
