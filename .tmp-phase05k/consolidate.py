from pathlib import Path
import copy, hashlib, json, struct

root = Path(__file__).resolve().parent.parent
source = root / 'public/aquarium/environment/cherry_blossom.glb'
target = root / 'public/aquarium/environment/cherry_blossom-opt.glb'
data = source.read_bytes()
length = struct.unpack_from('<I', data, 12)[0]
doc = json.loads(data[20:20+length]); binary = data[28+length:]
assert len(doc['materials']) == 1 and not doc.get('animations') and not doc.get('skins')
assert doc['scenes'][doc.get('scene', 0)]['nodes'] == list(range(len(doc['nodes'])))

def accessor(index):
    a = doc['accessors'][index]; view = doc['bufferViews'][a['bufferView']]
    components = {'SCALAR':1, 'VEC2':2, 'VEC3':3}[a['type']]
    char, size = {5123:('H',2), 5125:('I',4), 5126:('f',4)}[a['componentType']]
    base = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [list(struct.unpack_from('<'+char*components, binary, base+i*view.get('byteStride', size*components))) for i in range(a['count'])]

positions=[]; normals=[]; uvs=[]; indices=[]
for node in doc['nodes']:
    assert not any(k in node for k in ['children','matrix','rotation','scale','skin'])
    prims = doc['meshes'][node['mesh']]['primitives']; assert len(prims) == 1
    prim = prims[0]; assert prim.get('material', 0) == 0 and prim.get('mode', 4) == 4
    assert set(prim['attributes']) == {'POSITION','NORMAL','TEXCOORD_0'}
    xyz = accessor(prim['attributes']['POSITION']); offset = len(positions)
    positions += [[v[k]+node.get('translation',[0,0,0])[k] for k in range(3)] for v in xyz]
    normals += accessor(prim['attributes']['NORMAL'])
    uvs += accessor(prim['attributes']['TEXCOORD_0'])
    indices += [row[0]+offset for row in accessor(prim['indices'])]

assert len(positions) == 648 and len(indices) == 972
result = copy.deepcopy(doc)
result['nodes'] = [{'name':'CherryBlossom','mesh':0}]
result['scenes'] = [{'name':'blockbench_export','nodes':[0]}]; result['scene'] = 0
result['meshes'] = [{'name':'CherryBlossom','primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'TEXCOORD_0':2},'indices':3,'material':0,'mode':4}]}]
result['accessors']=[]; result['bufferViews']=[]
parts=[]; cursor=0
def add_view(content, target=None):
    global cursor
    padding = (-cursor)%4
    if padding: parts.append(b'\0'*padding); cursor+=padding
    view={'buffer':0,'byteOffset':cursor,'byteLength':len(content)}
    if target: view['target']=target
    result['bufferViews'].append(view); parts.append(content); cursor+=len(content)
    return len(result['bufferViews'])-1
for values, kind, typ, components, gpu in [(positions,5126,'VEC3',3,34962),(normals,5126,'VEC3',3,34962),(uvs,5126,'VEC2',2,34962),([[v] for v in indices],5123,'SCALAR',1,34963)]:
    raw=b''.join(struct.pack('<'+('f' if kind==5126 else 'H')*components,*row) for row in values)
    view=add_view(raw,gpu)
    result['accessors'].append({'bufferView':view,'componentType':kind,'count':len(values),'type':typ,'min':[min(v[k] for v in values) for k in range(components)],'max':[max(v[k] for v in values) for k in range(components)]})
    unpacked=[struct.unpack_from('<'+('f' if kind==5126 else 'H')*components,raw,i*components*(4 if kind==5126 else 2)) for i in range(len(values))]
    assert all(list(row)==value for row,value in zip(unpacked,values)), 'No attribute quantization or changed values'
for i,image in enumerate(doc['images']):
    view=doc['bufferViews'][image['bufferView']]
    content=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
    result['images'][i]['bufferView']=add_view(content)
result['buffers']=[{'byteLength':cursor}]
encoded=json.dumps(result,separators=(',',':')).encode('utf-8'); encoded+=b' '*((-len(encoded))%4)
packed=b''.join(parts); packed+=b'\0'*((-len(packed))%4)
glb=struct.pack('<4sII',b'glTF',2,28+len(encoded)+len(packed))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(packed),0x004e4942)+packed
target.write_bytes(glb)
record={'sourceSha256':hashlib.sha256(data).hexdigest(),'optimizedSha256':hashlib.sha256(glb).hexdigest(),'sourceBytes':len(data),'optimizedBytes':len(glb),'meshesBefore':27,'meshesAfter':1,'triangles':len(indices)//3,'vertices':len(positions),'imageBytesPreserved':True,'materialsPreserved':result['materials']==doc['materials'],'uvNormalsAndWorldPositionsExact':True,'bounds':{'min':result['accessors'][0]['min'],'max':result['accessors'][0]['max']}}
(root/'.tmp-phase05k/measurements/consolidation.json').write_text(json.dumps(record,indent=2))
print(json.dumps(record,indent=2))
