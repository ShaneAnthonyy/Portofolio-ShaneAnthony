from pathlib import Path
from PIL import Image
import hashlib, io, json, math, struct, subprocess

root = Path(__file__).resolve().parent.parent
out = root / '.tmp-phase05k'
for folder in ['measurements', 'comparisons', 'motion', 'logs', 'textures']:
    (out / folder).mkdir(parents=True, exist_ok=True)
source = root / 'src/components/AquariumDivePrototype.jsx'
if not (out / 'AquariumDivePrototype.before.jsx').exists():
    (out / 'AquariumDivePrototype.before.jsx').write_bytes(source.read_bytes())
    snapshot = {}
    for p in root.rglob('*'):
        if not p.is_file() or any(x in ('.git', 'node_modules', 'dist', '.tmp-phase05k') for x in p.relative_to(root).parts):
            continue
        snapshot[p.relative_to(root).as_posix()] = {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
    (out / 'workspace-before.json').write_text(json.dumps(snapshot, indent=2))
    for name, args in [('git-status-before.txt', ['status', '--short']), ('git-diff-before.patch', ['diff']), ('git-head.txt', ['rev-parse', 'HEAD'])]:
        (out / name).write_bytes(subprocess.run(['git', *args], cwd=root, check=True, capture_output=True).stdout)

def inventory(rel, extract=False):
    data = (root / rel).read_bytes()
    assert data[:4] == b'glTF' and struct.unpack_from('<II', data, 4) == (2, len(data))
    size, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4e4f534a
    doc = json.loads(data[20:20+size])
    bsize, kind = struct.unpack_from('<II', data, 20+size)
    assert kind == 0x004e4942 and 28+size+bsize == len(data)
    binary = data[28+size:]
    assert len(doc['buffers']) == 1 and 'uri' not in doc['buffers'][0]
    if extract:
        assert doc['buffers'][0]['byteLength'] <= len(binary)
    for view in doc.get('bufferViews', []):
        assert view.get('byteOffset', 0) + view['byteLength'] <= len(binary)
    vertices = triangles = primitives = 0
    uv_bounds = []
    for mesh in doc['meshes']:
        for prim in mesh['primitives']:
            assert prim.get('mode', 4) == 4
            pos = doc['accessors'][prim['attributes']['POSITION']]
            vertices += pos['count']; primitives += 1
            triangles += doc['accessors'][prim['indices']]['count']//3 if 'indices' in prim else pos['count']//3
            if extract:
                assert all(math.isfinite(v) for v in pos['min']+pos['max'])
                uv = doc['accessors'][prim['attributes']['TEXCOORD_0']]
                assert uv['count'] == pos['count'] and uv['componentType'] == 5126
                view = doc['bufferViews'][uv['bufferView']]
                base = view.get('byteOffset', 0) + uv.get('byteOffset', 0)
                values = [struct.unpack_from('<ff', binary, base+i*view.get('byteStride', 8)) for i in range(uv['count'])]
                assert all(math.isfinite(v) and -.001 <= v <= 1.001 for pair in values for v in pair)
                uv_bounds.append({'min': [min(v[k] for v in values) for k in range(2)], 'max': [max(v[k] for v in values) for k in range(2)]})
    images = []
    for i, image in enumerate(doc.get('images', [])):
        assert 'bufferView' in image and 'uri' not in image
        view = doc['bufferViews'][image['bufferView']]
        content = binary[view.get('byteOffset', 0):view.get('byteOffset', 0)+view['byteLength']]
        decoded = Image.open(io.BytesIO(content)); decoded.load()
        rgba = decoded.convert('RGBA')
        images.append({'mime': image['mimeType'], 'bytes': len(content), 'width': decoded.width, 'height': decoded.height, 'mode': decoded.mode, 'rgbaRange': rgba.getextrema(), 'estimatedRgbaMipBytes': sum(max(1, decoded.width>>level)*max(1, decoded.height>>level)*4 for level in range(int(math.log2(max(decoded.size)))+1))})
        if extract:
            rgba.save(out / 'textures' / f'cherry-{i}.png')
    result = {'file': rel, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'asset': doc['asset'], 'declaredBufferBytes': doc['buffers'][0]['byteLength'], 'actualBufferBytes': len(binary), 'meshes': len(doc['meshes']), 'primitives': primitives, 'vertices': vertices, 'triangles': triangles, 'materials': doc.get('materials', []), 'images': images, 'textures': doc.get('textures', []), 'samplers': doc.get('samplers', []), 'nodes': doc.get('nodes', []), 'scenes': doc.get('scenes', []), 'extensionsUsed': doc.get('extensionsUsed', []), 'uvBounds': uv_bounds, 'animations': len(doc.get('animations', [])), 'skins': len(doc.get('skins', []))}
    return result

rows = [inventory(rel, i == 0) for i, rel in enumerate(['public/aquarium/environment/cherry_blossom.glb', 'public/aquarium/environment/tree-opt-150k-1024.glb', 'public/aquarium/lite/tree-lite.glb'])]
(out / 'measurements/asset-inventory.json').write_text(json.dumps(rows, indent=2))
print(json.dumps([{k:r[k] for k in ['file','bytes','meshes','primitives','vertices','triangles','images','sha256']} for r in rows], indent=2))
