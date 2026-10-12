import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

function parseGLB(buf) {
  assert.equal(buf.subarray(0, 4).toString('ascii'), 'glTF', 'magic')
  assert.equal(buf.readUInt32LE(4), 2, 'version')
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
  const binLen = buf.readUInt32LE(20 + jsonLen)
  const bin = buf.subarray(20 + jsonLen + 8, 20 + jsonLen + 8 + binLen)
  assert.ok(20 + jsonLen + 8 + binLen <= buf.length, 'bin fits')
  return { json, bin }
}
const orig = parseGLB(await readFile(new URL('../public/aquarium/environment/tree.glb', import.meta.url)))
const imgBytes = i => {
  const bv = orig.json.bufferViews[orig.json.images[i].bufferView]
  return orig.bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)
}
for (const name of ['tree-opt-250k.glb', 'tree-opt-150k.glb']) {
  const { json, bin } = parseGLB(await readFile(new URL('./' + name, import.meta.url)))
  const prim = json.meshes[0].primitives[0]
  const P = json.accessors[prim.attributes.POSITION], I = json.accessors[prim.indices]
  const N = json.accessors[prim.attributes.NORMAL], U = json.accessors[prim.attributes.TEXCOORD_0]
  assert.ok(P.count > 100000 && Number.isFinite(P.min[0]) && Number.isFinite(P.max[2]), 'pos bounds finite')
  assert.equal(N.count, P.count, 'normal count')
  assert.equal(U.count, P.count, 'uv count')
  assert.ok(I.count / 3 > 100000, 'index count')
  assert.equal(I.componentType, 5125, 'uint32 index')
  assert.equal(json.materials.length, 1, 'one material')
  assert.equal(json.materials[0].name, 'Material.001', 'material preserved')
  assert.deepEqual(json.materials[0].pbrMetallicRoughness, orig.json.materials[0].pbrMetallicRoughness, 'pbr mapping')
  assert.equal(json.materials[0].doubleSided, true, 'doubleside')
  assert.equal((json.nodes || []).length, (orig.json.nodes || []).length, 'nodes')
  assert.deepEqual(json.scenes, orig.json.scenes, 'scene')
  for (let i = 0; i < 3; i++) {
    const bv = json.bufferViews[json.images[i].bufferView]
    const got = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)
    assert.ok(got.equals(imgBytes(i)), `image${i} byte-identical`)
  }
  for (const a of json.accessors) {
    const bv = json.bufferViews[a.bufferView]
    assert.ok((bv.byteOffset || 0) + bv.byteLength <= bin.length, 'view in range')
  }
  console.log('PASS', name, 'verts', P.count, 'tris', I.count / 3)
}
console.log('ALL VALID')
