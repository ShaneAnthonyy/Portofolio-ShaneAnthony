import { readFile, writeFile } from 'node:fs/promises'
import * as THREE from 'three'
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js'

const SRC = new URL('../public/aquarium/environment/tree.glb', import.meta.url)
const OUT = new URL('./', import.meta.url)
const CTO = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }
const SZ = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }

function parseGLB(buf) {
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
  const binLen = buf.readUInt32LE(20 + jsonLen)
  const bin = buf.subarray(20 + jsonLen + 8, 20 + jsonLen + 8 + binLen)
  return { json, bin }
}
function getAcc(json, bin, i) {
  const a = json.accessors[i], bv = json.bufferViews[a.bufferView]
  const C = CTO[a.componentType], SZC = SZ[a.type]
  const base = bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0)
  const stride = bv.byteStride || 0
  if (!stride) return { arr: new C(bin.buffer, base, a.count * SZC), acc: a }
  const out = new C(a.count * SZC)
  const src = new DataView(bin.buffer, bin.byteOffset)
  const sz = C.BYTES_PER_ELEMENT
  for (let v = 0; v < a.count; v++) for (let k = 0; k < SZC; k++) {
    const off = base - bin.byteOffset + v * stride + k * sz
    out[v * SZC + k] = C === Float32Array ? src.getFloat32(off, true) : C === Uint16Array ? src.getUint16(off, true) : src.getUint32(off, true)
  }
  return { arr: out, acc: a }
}

const file = await readFile(SRC)
const { json, bin } = parseGLB(file)
const prim = json.meshes[0].primitives[0]
const pos = getAcc(json, bin, prim.attributes.POSITION)
const nor = getAcc(json, bin, prim.attributes.NORMAL)
const uv = getAcc(json, bin, prim.attributes.TEXCOORD_0)
const idx = getAcc(json, bin, prim.indices)
console.log('src verts', pos.acc.count, 'tris', idx.acc.count / 3, 'idxType', idx.acc.componentType)

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos.arr), 3))
geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor.arr), 3))
geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv.arr), 2))
geo.setIndex(new THREE.BufferAttribute(new (idx.acc.componentType === 5125 ? Uint32Array : Uint16Array)(idx.arr), 1))

const mod = new SimplifyModifier()
const origTris = idx.acc.count / 3
for (const [name, target] of [['tree-opt-250k', 250000], ['tree-opt-150k', 150000]]) {
  const remove = Math.round(pos.acc.count * (1 - target / origTris))
  const t0 = Date.now()
  const out = await mod.modify(geo.clone(), remove)
  const oTris = out.getIndex().count / 3, oVerts = out.getAttribute('position').count
  console.log(name, 'verts', oVerts, 'tris', oTris, 'in', ((Date.now() - t0) / 1000).toFixed(1) + 's')

  const p = out.getAttribute('position'), n = out.getAttribute('normal'), u = out.getAttribute('uv')
  const gch = [Buffer.from(p.array.buffer, p.array.byteOffset, p.array.byteLength),
    Buffer.from(n.array.buffer, n.array.byteOffset, n.array.byteLength),
    Buffer.from(u.array.buffer, u.array.byteOffset, u.array.byteLength),
    Buffer.from(out.getIndex().array.buffer, out.getIndex().array.byteOffset, out.getIndex().array.byteLength)]
  const goff = []
  let off = 0
  for (const c of gch) { goff.push(off); off += c.length }
  const pad = (off + 3) & ~3
  const geoBin = Buffer.alloc(pad)
  gch.forEach((c, i) => c.copy(geoBin, goff[i]))
  const bvOf = ai => json.accessors[ai].bufferView
  const geoBVIds = new Set([bvOf(prim.attributes.POSITION), bvOf(prim.attributes.NORMAL), bvOf(prim.attributes.TEXCOORD_0), bvOf(prim.indices)])
  const carry = []
  const newIndexOf = new Map()
  json.bufferViews.forEach((bv, vi) => {
    if (geoBVIds.has(vi)) return
    newIndexOf.set(vi, 4 + carry.length)
    carry.push(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength))
  })
  let coff = pad
  const cpad = []
  for (const c of carry) { cpad.push(coff); coff += (c.length + 3) & ~3 }
  const fullBin = Buffer.alloc(coff)
  geoBin.copy(fullBin, 0)
  carry.forEach((c, i) => c.copy(fullBin, cpad[i]))

  const j2 = JSON.parse(JSON.stringify(json))
  j2.bufferViews = [
    { buffer: 0, byteOffset: goff[0], byteLength: gch[0].length, target: 34962 },
    { buffer: 0, byteOffset: goff[1], byteLength: gch[1].length, target: 34962 },
    { buffer: 0, byteOffset: goff[2], byteLength: gch[2].length, target: 34962 },
    { buffer: 0, byteOffset: goff[3], byteLength: gch[3].length, target: 34963 },
    ...json.bufferViews.filter((_, vi) => !geoBVIds.has(vi)).map((bv, i) => ({ ...bv, buffer: 0, byteOffset: cpad[i], byteLength: carry[i].length })),
  ]
  const box = new THREE.Box3().setFromBufferAttribute(p)
  const setA = (ai, vi, count, extra = {}) => {
    j2.accessors[ai] = { ...j2.accessors[ai], bufferView: vi, byteOffset: 0, count, ...extra }
    if (!extra.min) { delete j2.accessors[ai].min; delete j2.accessors[ai].max }
  }
  setA(prim.attributes.POSITION, 0, oVerts, { min: box.min.toArray(), max: box.max.toArray() })
  setA(prim.attributes.NORMAL, 1, oVerts)
  setA(prim.attributes.TEXCOORD_0, 2, oVerts)
  j2.accessors[prim.indices] = { ...j2.accessors[prim.indices], bufferView: 3, byteOffset: 0, count: out.getIndex().count, componentType: 5125 }
  j2.accessors.forEach((a, ai) => {
    if (!(ai in { [prim.attributes.POSITION]: 1, [prim.attributes.NORMAL]: 1, [prim.attributes.TEXCOORD_0]: 1, [prim.indices]: 1 })) {
      a.bufferView = newIndexOf.get(a.bufferView)
    }
  })
  j2.images.forEach(im => { im.bufferView = newIndexOf.get(im.bufferView) })
  const jstr = Buffer.from(JSON.stringify(j2))
  const jpad = (jstr.length + 3) & ~3
  const jp = Buffer.alloc(jpad, 0x20)
  jstr.copy(jp)
  const total = 12 + 8 + jpad + 8 + fullBin.length
  const glb = Buffer.alloc(total)
  glb.writeUInt32LE(0x46546C67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(total, 8)
  glb.writeUInt32LE(jpad, 12); glb.writeUInt32LE(0x4E4F534A, 16); jp.copy(glb, 20)
  glb.writeUInt32LE(fullBin.length, 20 + jpad); glb.writeUInt32LE(0x004E4942, 24 + jpad); fullBin.copy(glb, 28 + jpad)
  await writeFile(new URL(name + '.glb', OUT), glb)
  console.log(name + '.glb', (glb.length / 1048576).toFixed(2) + 'MB')
}
