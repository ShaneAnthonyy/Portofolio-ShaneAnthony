import { readFile, writeFile } from 'node:fs/promises'

for (const rel of ['../public/aquarium/environment/tree.glb', '../public/aquarium/lite/tree-lite.glb']) {
  const buf = await readFile(new URL(rel, import.meta.url))
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
  let binOff = 20 + jsonLen
  const binLen = buf.readUInt32LE(binOff)
  const bin = buf.subarray(binOff + 8, binOff + 8 + binLen)
  console.log('===', rel.split('/').pop())
  for (const [i, img] of (json.images || []).entries()) {
    const bv = json.bufferViews[img.bufferView]
    const bytes = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)
    let dim = '?'
    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
      dim = `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)} png`
    } else if (bytes[8] === 0x57 && bytes[9] === 0x45) {
      const tag = bytes.subarray(12, 16).toString('ascii')
      if (tag === 'VP8 ') {
        const w = bytes[26] | (bytes[27] << 8), h = bytes[28] | (bytes[29] << 8)
        dim = `${w}x${h} lossy`
      } else if (tag === 'VP8L') {
        const b = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)
        dim = `${(b & 0x3fff) + 1}x${(((b >> 14) & 0x3fff) + 1)} lossless`
      } else if (tag === 'VP8X') dim = 'extended'
    }
    const usedBy = []
    for (const [ti, t] of (json.textures || []).entries()) if (t.source === i) {
      for (const [mi, m] of (json.materials || []).entries()) {
        const p = m.pbrMetallicRoughness || {}
        if (p.baseColorTexture?.index === ti) usedBy.push(`mat${mi}.baseColor`)
        if (p.metallicRoughnessTexture?.index === ti) usedBy.push(`mat${mi}.metalRough`)
        if (m.normalTexture?.index === ti) usedBy.push(`mat${mi}.normal`)
        if (m.occlusionTexture?.index === ti) usedBy.push(`mat${mi}.occlusion`)
        if (m.emissiveTexture?.index === ti) usedBy.push(`mat${mi}.emissive`)
        if (m.specularGlossinessTexture?.index === ti) usedBy.push(`mat${mi}.specGloss`)
      }
    }
    const decoded = dim.match(/(\d+)x(\d+)/)
    const mb = decoded ? (decoded[1] * decoded[2] * 4 * 1.33 / 1048576).toFixed(1) : '?'
    console.log(`img${i} ${img.mimeType} ${dim} bytes=${(bv.byteLength / 1048576).toFixed(2)}MB decoded~${mb}MB usedBy=[${usedBy}]`)
  }
  console.log('material:', JSON.stringify(json.materials[0], (k, v) => k === 'index' || k === 'texCoord' ? v : v).slice(0, 1200))
}
