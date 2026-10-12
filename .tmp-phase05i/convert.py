from pathlib import Path
from PIL import Image, ImageChops, ImageStat, features
import argparse, copy, hashlib, io, json, struct

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / '.tmp-phase05i'
MODELS = ['fish_a','fish_b','fish_c','butterfly_koi_a','butterfly_koi_b','shrimp_a','shrimp_b']
sha = lambda b: hashlib.sha256(b).hexdigest()

def read_glb(path):
    raw = path.read_bytes()
    magic, version, size = struct.unpack_from('<III', raw)
    assert (magic, version, size) == (0x46546c67, 2, len(raw))
    jl, jt = struct.unpack_from('<II', raw, 12)
    bl, bt = struct.unpack_from('<II', raw, 20 + jl)
    assert jt == 0x4e4f534a and bt == 0x004e4942
    j = json.loads(raw[20:20+jl])
    b = raw[28+jl:28+jl+bl]
    assert len(b) == bl and len(j['buffers']) == 1
    assert j['buffers'][0]['byteLength'] <= bl
    for v in j['bufferViews']:
        assert v.get('buffer', 0) == 0 and v.get('byteOffset', 0) + v['byteLength'] <= bl
    return raw, j, b

def view(j,b,i):
    v = j['bufferViews'][i]
    return b[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]

def usages(j):
    result = [[] for _ in j['images']]
    def walk(obj, path):
        if isinstance(obj, dict):
            for k,v in obj.items():
                if k.endswith('Texture') and isinstance(v,dict) and 'index' in v:
                    t=j['textures'][v['index']]
                    index=t.get('source', t.get('extensions',{}).get('EXT_texture_webp',{}).get('source'))
                    result[index].append({'slot':k,'path':path+'.'+k,'texture':v['index'],'texCoord':v.get('texCoord',0)})
                else: walk(v,path+'.'+k)
        elif isinstance(obj,list):
            for i,v in enumerate(obj): walk(v,path+f'[{i}]')
    walk(j.get('materials',[]),'materials')
    return result

def inventory(name):
    path=ROOT/'public/aquarium'/f'{name}.glb'
    raw,j,b=read_glb(path)
    uses=usages(j); images=[]
    for i,imdef in enumerate(j['images']):
        data=view(j,b,imdef['bufferView']); im=Image.open(io.BytesIO(data)); rgba=im.convert('RGBA')
        alpha=rgba.getchannel('A'); hist=alpha.histogram()
        images.append({'index':i,'bytes':len(data),'mime':imdef['mimeType'],'width':im.width,'height':im.height,'mode':im.mode,'sha256':sha(data),'rgbaSha256':sha(rgba.tobytes()),'alphaMinMax':alpha.getextrema(),'transparentPixels':hist[0],'partialAlphaPixels':sum(hist[1:255]),'opaquePixels':hist[255],'metadataKeys':list(im.info),'slots':uses[i],'sharedAcrossSlots':len(uses[i])>1})
    primitives=[p for m in j['meshes'] for p in m['primitives']]
    assert all(p.get('mode',4)==4 for p in primitives)
    row={'name':name,'source':path.relative_to(ROOT).as_posix(),'sha256':sha(raw),'bytes':len(raw),'meshes':len(j['meshes']),'primitives':len(primitives),'materialCount':len(j['materials']),'triangles':sum(j['accessors'][p['indices']]['count']//3 for p in primitives),'vertices':sum(j['accessors'][p['attributes']['POSITION']]['count'] for p in primitives),'images':images,'embeddedTextureBytes':sum(x['bytes'] for x in images),'textureCount':len(j['textures']),'estimatedRgba8MipBytes':sum(sum(max(1,x['width']>>l)*max(1,x['height']>>l)*4 for l in range(max(x['width'],x['height']).bit_length())) for x in images),'uvAttributes':[{k:v for k,v in p['attributes'].items() if k.startswith('TEXCOORD')} for p in primitives],'positionBounds':[{'min':j['accessors'][p['attributes']['POSITION']].get('min'),'max':j['accessors'][p['attributes']['POSITION']].get('max')} for p in primitives],'nodes':j['nodes'],'scenes':j.get('scenes'),'materials':j['materials'],'samplers':j.get('samplers',[]),'extensionsUsed':j.get('extensionsUsed',[]),'extensionsRequired':j.get('extensionsRequired',[]),'skins':len(j.get('skins',[])),'animations':len(j.get('animations',[])),'morphTargets':sum(len(p.get('targets',[])) for p in primitives)}
    return row

def diff_pixels(a,b):
    diff=ImageChops.difference(a.convert('RGBA'),b.convert('RGBA'))
    stat=ImageStat.Stat(diff)
    return {'max': [x[1] for x in diff.getextrema()], 'mean':stat.mean,'rms':stat.rms}

def convert(name, variant):
    raw,j,b=read_glb(ROOT/'public/aquarium'/f'{name}.glb')
    j2=copy.deepcopy(j); uses=usages(j); replacements={}; details=[]
    outdir=OUT/'candidates'/variant; outdir.mkdir(parents=True,exist_ok=True)
    for i,imdef in enumerate(j['images']):
        bv=imdef['bufferView']; data=view(j,b,bv); im=Image.open(io.BytesIO(data))
        rgba=im.convert('RGBA'); alpha=rgba.getchannel('A').getextrema()[0]<255
        slots={x['slot'] for x in uses[i]}
        lossy=variant=='q95' and slots=={'baseColorTexture'} and imdef['mimeType']=='image/png'
        should=imdef['mimeType']=='image/png'
        chosen=data; mime=imdef['mimeType']; strategy='original compressed image'
        if should:
            stream=io.BytesIO()
            rgba.convert('RGBA' if alpha else 'RGB').save(stream,'WEBP',lossless=not lossy,quality=95,method=6,exact=True)
            encoded=stream.getvalue()
            decoded=Image.open(io.BytesIO(encoded)).convert('RGBA')
            delta=diff_pixels(rgba,decoded)
            assert delta['max'][3]==0, f'{name}/{i}: alpha changed'
            if not lossy: assert delta['max']==[0,0,0,0], f'{name}/{i}: lossless changed pixels'
            if len(encoded)<len(data): chosen=encoded; mime='image/webp'; strategy='baseColor q95' if lossy else 'lossless WebP'
        decoded=Image.open(io.BytesIO(chosen))
        assert decoded.size==im.size
        details.append({'index':i,'strategy':strategy,'originalBytes':len(data),'bytes':len(chosen),'mime':mime,'sha256':sha(chosen),'pixelDiff':diff_pixels(im,decoded),'slots':uses[i]})
        if bv in replacements: assert replacements[bv]==chosen
        replacements[bv]=chosen; j2['images'][i]['mimeType']=mime
    for t in j2['textures']:
        i=t.get('source')
        if i is not None and j2['images'][i]['mimeType']=='image/webp':
            t.setdefault('extensions',{})['EXT_texture_webp']={'source':i}
            del t['source']
    j2['extensionsUsed']=list(dict.fromkeys(j2.get('extensionsUsed',[])+['EXT_texture_webp']))
    j2['extensionsRequired']=list(dict.fromkeys(j2.get('extensionsRequired',[])+['EXT_texture_webp']))
    parts=[]; offset=0
    for i,v in enumerate(j2['bufferViews']):
        chunk=replacements.get(i,view(j,b,i))
        v['byteOffset']=offset; v['byteLength']=len(chunk)
        padded=chunk+b'\0'*((-len(chunk))%4); parts.append(padded); offset+=len(padded)
    j2['buffers'][0]['byteLength']=offset
    binary=b''.join(parts); jb=json.dumps(j2,separators=(',',':'),ensure_ascii=False).encode('utf-8'); jb+=b' '*((-len(jb))%4)
    result=struct.pack('<III',0x46546c67,2,28+len(jb)+len(binary))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(binary),0x004e4942)+binary
    target=outdir/f'{name}.glb'; assert not target.exists(), f'Preserve existing: {target}'
    target.write_bytes(result)
    _,actual,bb=read_glb(target)
    for key in j.keys()-{'images','textures','bufferViews','buffers','extensionsUsed','extensionsRequired'}: assert actual[key]==j[key],key
    for i in range(len(j['bufferViews'])):
        if i not in replacements: assert view(j,b,i)==view(actual,bb,i),f'Buffer view {i}'
    assert actual['samplers']==j['samplers']
    record={'name':name,'variant':variant,'file':target.relative_to(ROOT).as_posix(),'bytes':len(result),'sha256':sha(result),'savedBytes':len(raw)-len(result),'reductionPercent':100*(1-len(result)/len(raw)),'embeddedTextureBytes':sum(x['bytes'] for x in details),'images':details,'structuralPass':True,'nonImageBufferBytesIdentical':True}
    (OUT/'measurements'/f'{name}-{variant}.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
    print(name,variant,len(raw),'->',len(result),f"{record['reductionPercent']:.2f}%",flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('stage',choices=['inventory','lossless','q95']); parser.add_argument('models',nargs='*'); args=parser.parse_args()
    (OUT/'measurements').mkdir(exist_ok=True)
    if args.stage=='inventory':
        rows=[inventory(n) for n in MODELS]
        (OUT/'measurements/inventory.json').write_text(json.dumps({'pillow':Image.__version__,'webp':features.version('webp'),'models':rows},indent=2),encoding='utf-8')
        for r in rows: print(r['name'],r['triangles'],[(i['mime'],i['mode'],[x['slot'] for x in i['slots']],i['alphaMinMax']) for i in r['images']])
    else:
        for name in args.models or MODELS: assert name in MODELS; convert(name,args.stage)
