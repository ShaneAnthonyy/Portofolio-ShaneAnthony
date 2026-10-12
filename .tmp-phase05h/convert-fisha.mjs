import { readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const pexec = promisify(execFile)
const OUT = new URL('./', import.meta.url)
await pexec('python', ['-c', `
from PIL import Image
import io, json, struct
b = open('public/aquarium/fish_a.glb','rb').read()
jl = struct.unpack('<I',b[12:16])[0]
j = json.loads(b[20:20+jl].decode())
bo = 28 + jl
for i in range(3):
    bv = j['bufferViews'][j['images'][i]['bufferView']]
    raw = b[bo+(bv.get('byteOffset') or 0):][:bv['byteLength']]
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    im.save(f'.tmp-phase05h/fisha_img{i}.webp','WEBP',lossless=True,method=6)
print('converted')
`])
const file = await readFile(new URL('../public/aquarium/fish_a.glb', import.meta.url))
const jsonLen = file.readUInt32LE(12)
const json = JSON.parse(file.subarray(20, 20 + jsonLen).toString('utf8'))
const binLen = file.readUInt32LE(20 + jsonLen)
const bin = file.subarray(20 + jsonLen + 8, 20 + jsonLen + 8 + binLen)
const geoIds = new Set()
for (const m of json.meshes) for (const p of m.primitives) {
  const a = json.accessors
  ;[p.indices, p.attributes.POSITION, p.attributes.NORMAL, p.attributes.TEXCOORD_0].filter(x => x != null).forEach(ai => geoIds.add(a[ai].bufferView))
}
const newImgs = []
for (let i = 0; i < 3; i++) newImgs.push(await readFile(new URL(`./fisha_img${i}.webp`, OUT)))
const j2 = JSON.parse(JSON.stringify(json))
const carry = []
const newIndex = new Map()
const imgViewIds = new Set(json.images.map(im => im.bufferView))
json.bufferViews.forEach((bv, vi) => {
  if (geoIds.has(vi) || imgViewIds.has(vi)) return
  newIndex.set(vi, 1000 + carry.length)
  carry.push({ vi, bv })
})
let off = 0
const geoParts = []
const geoOff = new Map()
for (const vi of geoIds) {
  const bv = json.bufferViews[vi]
  const chunk = Buffer.from(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength))
  geoOff.set(vi, off)
  geoParts.push(chunk)
  off += (chunk.length + 3) & ~3
}
const imgOff = []
for (let i = 0; i < 3; i++) {
  imgOff.push(off)
  off += (newImgs[i].length + 3) & ~3
}
for (const { vi } of carry) {
  const ob = json.bufferViews[vi]
  const chunk = Buffer.from(bin.subarray(ob.byteOffset || 0, (ob.byteOffset || 0) + ob.byteLength))
  newIndex.set(vi, { off, len: chunk.length })
  carry[carry.findIndex(c => c.vi === vi)].chunk = chunk
  off += (chunk.length + 3) & ~3
}
const fullBin = Buffer.alloc(off)
geoParts.forEach((c, i) => c.copy(fullBin, [...geoOff.values()][i]))
newImgs.forEach((c, i) => c.copy(fullBin, imgOff[i]))
carry.forEach(c => { const m = newIndex.get(c.vi); c.chunk.copy(fullBin, m.off) })
const nbv = []
const remap = new Map()
;[...geoIds].forEach((vi, i) => { remap.set(vi, i); nbv.push({ ...json.bufferViews[vi], buffer: 0, byteOffset: [...geoOff.values()][i] }) })
json.images.forEach((im, i) => {
  remap.set(im.bufferView, 3 + i)
  nbv.push({ buffer: 0, byteOffset: imgOff[i], byteLength: newImgs[i].length })
  j2.images[i].mimeType = 'image/webp'
})
carry.forEach(c => { const m = newIndex.get(c.vi); remap.set(c.vi, nbv.length); nbv.push({ ...c.bv, buffer: 0, byteOffset: m.off, byteLength: m.len }) })
j2.bufferViews = nbv
j2.accessors.forEach(a => { a.bufferView = remap.get(a.bufferView) })
const jstr = Buffer.from(JSON.stringify(j2))
const jpad = (jstr.length + 3) & ~3
const jp = Buffer.alloc(jpad, 0x20)
jstr.copy(jp)
const total = 12 + 8 + jpad + 8 + fullBin.length
const glb = Buffer.alloc(total)
glb.writeUInt32LE(0x46546C67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(total, 8)
glb.writeUInt32LE(jpad, 12); glb.writeUInt32LE(0x4E4F534A, 16); jp.copy(glb, 20)
glb.writeUInt32LE(fullBin.length, 20 + jpad); glb.writeUInt32LE(0x004E4942, 24 + jpad); fullBin.copy(glb, 28 + jpad)
await writeFile(new URL('./fish_a-webp.glb', OUT), glb)
console.log('fish_a-webp.glb', (glb.length / 1048576).toFixed(2) + 'MB')
