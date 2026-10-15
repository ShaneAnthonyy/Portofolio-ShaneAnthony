from pathlib import Path
import json

out=Path(__file__).resolve().parent
load=lambda label:json.loads((out/'measurements'/f'{label}.json').read_text(encoding='utf-8'))
pairs=[('baseline-1440-normal-dark','four-1440-normal-dark'),('baseline-1440-normal-dark','six-1440-normal-dark'),('baseline-1440-normal-dark','final-1440-normal-dark'),('baseline-390-normal-dark','final-390-normal-dark'),('baseline-1440-lite-dark','final-1440-lite-dark')]
results=[]
for a,b in pairs:
    left,right=load(a),load(b)
    for before,after in zip(left['positions'],right['positions']):
        x,y=before['snapshot'],after['snapshot']
        assert before['name']==after['name']
        for key in ['camera','lights','canvases']:
            assert x[key]==y[key],(a,b,before['name'],key)
        for key in ['pixelRatio','exposure','toneMapping','shadow','gpu']:
            assert x['renderer'][key]==y['renderer'][key],(a,b,key)
        assert x['terrain']['vertices']==y['terrain']['vertices'] and x['terrain']['triangles']==y['terrain']['triangles']
        results.append({'before':a,'after':b,'position':before['name'],'cameraLightsCanvasAndRendererSettingsUnchanged':True,'terrainTopologyUnchanged':True})
dark,light=load('final-1440-normal-dark'),load('final-1440-normal-light')
assert [t['position'] for t in dark['positions'][0]['snapshot']['trees']]==[t['position'] for t in light['positions'][0]['snapshot']['trees']],'deterministic placement across independent loads'
for p in (out/'measurements').glob('final-*-dark.json'):
    row=json.loads(p.read_text())
    requests=row['requests'];tree=[r for r in requests if '/cherry_blossom-opt.glb' in r['url']]
    assert len(tree)==1 and not any('/tree-opt-' in r['url'] or r['url'].endswith('/tree-lite.glb') or r['url'].endswith('/tree.glb') for r in requests)
    expected=['fish_a','fish_b','fish_c','butterfly_koi_a','shrimp_a']+(['butterfly_koi_b','shrimp_b'] if row['width']>=720 else [])
    for name in expected:
        path='/aquarium/'+('lite/' if row['lite'] and name.startswith('fish_') else '')+name+('' if row['lite'] else '-opt')+'.glb'
        assert sum(r['url'].endswith(path) for r in requests)==1,(row['label'],path)
    terrain=['grass_ground_lite.jpg'] if row['lite'] else ['grass_ground_diff_1024.webp','grass_ground_nor_gl_512.webp','grass_ground_rough_1024.webp','grass_ground_ao_1024.webp']
    for name in terrain:
        assert sum(r['url'].endswith('/'+name) for r in requests)==1,(row['label'],name)
    for position in row['positions']:
        s=position['snapshot'];assert not s['contextLost']
        assert s['uniqueGeometries']==s['uniqueMaterials']==s['uniqueTextures']==1
(out/'measurements/scene-comparison.json').write_text(json.dumps({'comparisons':results,'deterministicPlacementAcrossReloads':True,'productionTreeFishTerrainRequestsCorrect':True},indent=2))
print('PASS',len(results),'equivalent camera/lighting/topology comparisons; deterministic placement; production tree/fish/terrain requests')
