import { readFile, writeFile, mkdir } from 'node:fs/promises'

const out = new URL('./', import.meta.url)
await mkdir(out, { recursive: true })
const files = [
  '../public/aquarium/environment/tree.glb',
  '../public/aquarium/lite/tree-lite.glb',
  '../public/aquarium/kelp.glb',
  '../public/aquarium/coral.glb',
  '../public/aquarium/floor.glb',
  '../public/aquarium/fish_a.glb',
]
const rows = []
for (const rel of files) {
  try {
    const buf = await readFile(new URL(rel, out))
    const magic = buf.subarray(0, 4).toString('ascii')
    const jsonLen = buf.readUInt32LE(12)
    const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
    const acc = json.accessors || []
    const counts = {}
    for (const a of acc) counts[a.type] = (counts[a.type] || 0) + 1
    let verts = 0, tris = 0
    for (const m of json.meshes || []) for (const p of m.primitives || []) {
      const pos = acc[p.attributes?.POSITION]
      if (pos) verts += pos.count
      if (p.indices != null) tris += Math.floor(acc[p.indices].count / 3)
    }
    const images = (json.images || []).map(i => ({ mime: i.mimeType, name: i.name }))
    rows.push({
      file: rel.split('/').pop(), bytes: buf.length, magic,
      meshes: (json.meshes || []).length,
      primitives: (json.meshes || []).reduce((n, m) => n + (m.primitives || []).length, 0),
      accessors: acc.length, accessorTypes: counts,
      verts, tris,
      materials: (json.materials || []).length,
      materialNames: (json.materials || []).map(m => m.name),
      doubleSided: (json.materials || []).filter(m => m.doubleSided).length,
      alphaBlend: (json.materials || []).filter(m => m.alphaMode === 'BLEND').length,
      alphaMask: (json.materials || []).filter(m => m.alphaMode === 'MASK').length,
      images: images.length, imageTypes: [...new Set(images.map(i => i.mime))],
      textures: (json.textures || []).length,
      extensionsUsed: json.extensionsUsed || [],
    })
  } catch (e) { rows.push({ file: rel.split('/').pop(), error: String(e).slice(0, 200) }) }
}
await writeFile(new URL('glb-inventory.json', out), JSON.stringify(rows, null, 2))
console.log(JSON.stringify(rows.map(r => ({ file: r.file, MB: r.bytes != null ? +(r.bytes / 1048576).toFixed(2) : null, meshes: r.meshes, prims: r.primitives, verts: r.verts, tris: r.tris, mats: r.materials, imgs: r.images, ext: r.extensionsUsed })), null, 2))
