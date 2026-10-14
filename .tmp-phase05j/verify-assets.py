from pathlib import Path
import hashlib,json,struct

root=Path(__file__).resolve().parent.parent
out=root/'.tmp-phase05j'
manifest=json.loads((out/'measurements/integration-manifest.json').read_text())
hashof=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def glb(path):
    data=path.read_bytes();magic,version,size=struct.unpack_from('<III',data)
    assert (magic,version,size)==(0x46546c67,2,len(data))
    length=struct.unpack_from('<I',data,12)[0]
    return json.loads(data[20:20+length]),data[28+length:]
results=[]
for row in manifest:
    for path in [root/row['file'],root/row['production'],root/'dist'/row['optimizedUrl'].lstrip('/')]:assert hashof(path)==row['sha256'],str(path)
    original,ob=glb(root/'public'/row['originalUrl'].lstrip('/'));candidate,cb=glb(root/row['production'])
    for key in original.keys()-{'images','textures','bufferViews','buffers','extensionsUsed','extensionsRequired'}:assert original[key]==candidate[key],key
    images={im['bufferView'] for im in original['images']}
    for i,a in enumerate(original['bufferViews']):
        if i in images:continue
        b=candidate['bufferViews'][i]
        assert ob[a.get('byteOffset',0):a.get('byteOffset',0)+a['byteLength']]==cb[b.get('byteOffset',0):b.get('byteOffset',0)+b['byteLength']]
    assert 'EXT_texture_webp' in candidate['extensionsRequired']
    results.append({**row,'candidatePublicDistHashMatch':True,'geometryNodesMaterialsSamplersUnchanged':True})
before=(out/'AquariumDivePrototype.before.jsx').read_text(encoding='utf-8')
expected=before.replace("    const FISH_SOURCES = [","    const fishSuffix = qState.mode === 'lite' ? '' : '-opt'\n    const FISH_SOURCES = [",1)
for n in ['fish_a','fish_b','fish_c']:expected=expected.replace('/'+n+'.glb`','/'+n+'${fishSuffix}.glb`')
for n in ['butterfly_koi_a','butterfly_koi_b','shrimp_a','shrimp_b']:expected=expected.replace("'/aquarium/"+n+".glb'",'`/aquarium/'+n+'${fishSuffix}.glb`')
assert expected==(root/'src/components/AquariumDivePrototype.jsx').read_text(encoding='utf-8'),'Only seven references and one suffix constant may change'
(out/'measurements/asset-integrity.json').write_text(json.dumps({'models':results,'onlyApprovedSourceEdits':True},indent=2))
print('PASS seven candidate/public/dist hashes, geometry, UVs, nodes, materials, samplers and minimal source diff')
