from pathlib import Path
import json
out=Path(__file__).resolve().parent
rows=[]
for before,after,old,new in [
 ('baseline','after-full','1440x900-normal-dark','1440x900-normal-dark-gpu'),
 ('baseline-mobile','after-mobile','390x844-normal-dark-gpu','390x844-normal-dark-gpu'),
]:
 for p in [0,15,30,45,55,62,70,80]:
  a=json.loads((out/before/f'{old}-p{p}.json').read_text());b=json.loads((out/after/f'{new}-p{p}.json').read_text())
  assert a['camera']==b['camera'],(before,after,p,'camera')
  for key in ['pixelRatio','width','height']:
   assert a['renderer'][key]==b['renderer'][key],(before,after,p,key)
  rows.append({'before':before,'after':after,'p':p/100,'identicalCameraMatricesProjectionAndResolution':True})
for label in ['final-1440-normal-dark','final-390-normal-dark','final-1440-normal-light','final-390-lite-dark']:
 a=json.loads((out.parent/'.tmp-phase05k/measurements'/f'{label}.json').read_text());b=json.loads((out/'measurements'/f'{label}.json').read_text())
 for x,y in zip(a['positions'],b['positions']):
  assert x['name']==y['name']
  x,y=x['snapshot'],y['snapshot']
  for key in ['camera','lights','canvases','terrain']:
   assert x[key]==y[key],(label,key)
  for key in ['pixelRatio','exposure','toneMapping','shadow']:
   assert x['renderer'][key]==y['renderer'][key],(label,key)
  assert [(t['position'],t['scale'],t['triangles']) for t in x['trees']]==[(t['position'],t['scale'],t['triangles']) for t in y['trees']],label
  rows.append({'before':'Phase 05K approved final','after':label,'identicalCameraLightsTerrainTreePlacementAndQuality':True})
(out/'measurements/visual-state-comparison.json').write_text(json.dumps(rows,indent=2))
print('PASS',len(rows),'equivalent camera, forest, terrain, lighting and renderer comparisons')
