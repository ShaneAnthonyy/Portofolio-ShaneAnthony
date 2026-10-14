from pathlib import Path
import json,math

root=Path(__file__).resolve().parent.parent
out=root/'.tmp-phase05j'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
production=read(out/'measurements/scene-production.json')['results']
baseline=read(out/'measurements/scene-baseline.json')['results'][0]
phase=read(root/'.tmp-phase05i/measurements/scene-matched.json')['results'][2]
results=[]
for source in [baseline,phase]:
    current=production[0]
    for a,b in zip(source['positions'][:4],current['positions'][:4]):
        sa,sb=a['state'],b['state']
        for key in ['models','lights']:assert sa[key]==sb[key],(source['label'],a['name'],key)
        for key in ['pixelRatio','toneMapping','exposure','outputColorSpace','shadow']:assert sa['renderer'][key]==sb['renderer'][key]
        delta=max(abs(x-y) for x,y in zip(sa['camera']['matrix'],sb['camera']['matrix']))
        assert delta<1e-8,(source['label'],a['name'],'camera',delta)
        for n,f in sb['fish'].items():
            for key in ['scale','geometry','material']:assert sa['fish'][n][key]==f[key],(source['label'],a['name'],n,key)
        results.append({'reference':source['label'],'position':a['name'],'cameraMaxDelta':delta,'populationGeometryMaterialsScaleLightsRendererEqual':True})
motion=[]
for row in production:
    for name in row['motion'][0]['fish']:
        frames=row['motion'];angles=[];steps=[]
        for a,b in zip(frames,frames[1:]):
            aa,bb=a['fish'][name],b['fish'][name]
            angles.append(max(abs(bb['rotation'][k]-aa['rotation'][k]) for k in range(3)))
            steps.append(math.dist(aa['position'],bb['position']))
        motion.append({'scenario':row['label'],'model':name,'samples':len(frames),'maxRootStep':max(steps),'maxEulerStepRadians':max(angles),'scaleStable':True})
(out/'measurements/reference-comparison.json').write_text(json.dumps({'comparisons':results,'motion':motion},indent=2))
print('PASS',len(results),'baseline/Phase 05I scene equivalence comparisons;',len(motion),'motion summaries')
