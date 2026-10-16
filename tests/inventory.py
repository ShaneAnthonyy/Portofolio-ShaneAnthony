from pathlib import Path
from collections import defaultdict
from PIL import Image
import json,gzip,struct,io,hashlib,csv
root=Path(__file__).resolve().parent.parent;out=Path(__file__).resolve().parent
assets=json.loads((out/'asset-inventory-static.json').read_text());dependencies=defaultdict(list)
for p in (root/'public').rglob('*.gltf'):
 data=json.loads(p.read_text())
 for item in data.get('images',[])+data.get('buffers',[]):
  if 'uri'in item and not item['uri'].startswith('data:'):dependencies[(p.parent/item['uri']).relative_to(root).as_posix()].append(p.relative_to(root).as_posix())
for row in assets:
 row['gltfDependencyOf']=dependencies[row['path']]
 if row['type']!='.glb':continue
 b=(root/row['path']).read_bytes();length=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+length]);images=[]
 for image in g.get('images',[]):
  info={'name':image.get('name'),'mimeType':image.get('mimeType'),'uri':image.get('uri')}
  if 'bufferView'in image:
   view=g['bufferViews'][image['bufferView']];offset=28+length+view.get('byteOffset',0);imageBytes=b[offset:offset+view['byteLength']];info['bytes']=len(imageBytes)
   try:
    with Image.open(io.BytesIO(imageBytes))as im:info.update(width=im.width,height=im.height,rgba8EquivalentBytes=im.width*im.height*4)
   except Exception:pass
  images.append(info)
 row['glb']={'nodes':len(g.get('nodes',[])),'meshes':len(g.get('meshes',[])),'materials':len(g.get('materials',[])),'animations':[a.get('name') for a in g.get('animations',[])],'images':images,'bufferBytes':sum(v.get('byteLength',0) for v in g.get('buffers',[]))}
groups=defaultdict(list)
for r in assets:groups[r['sha256']].append(r['path'])
(out/'measurements/duplicate-assets.json').write_text(json.dumps([v for v in groups.values() if len(v)>1],indent=2))
(out/'asset-inventory.json').write_text(json.dumps(assets,indent=2))
bundles=[]
for p in (root/'dist/assets').iterdir():
 if p.suffix in ['.js','.css']:
  b=p.read_bytes();bundles.append({'path':p.relative_to(root).as_posix(),'bytes':len(b),'gzipBytes':len(gzip.compress(b,compresslevel=9)),'sha256':hashlib.sha256(b).hexdigest()})
(out/'measurements/bundles-baseline.json').write_text(json.dumps(bundles,indent=2))
print('Asset inventory',len(assets),'files',sum(r['bytes']for r in assets),'bytes; disk dist',sum(p.stat().st_size for p in (root/'dist').rglob('*')if p.is_file()),'bytes')
for r in assets:
 if r['path'] in ['public/aquarium/floor.glb','public/aquarium/environment/cherry_blossom-opt.glb','public/aquarium/environment/green_tree-opt.glb']:print(r['path'],r['bytes'],r.get('glb'))
