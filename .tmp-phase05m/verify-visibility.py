from pathlib import Path
import json
out=Path(__file__).resolve().parent;rows=[]
for file in sorted((out/'after').glob('*-visibility.json')):
 r=json.loads(file.read_text());w,h=r['width'],r['height'];phone=w<720 or w<1100 and h<500
 count=2 if phone else (3 if r['lite'] else 6) if w<1100 else 4 if r['lite'] else 10
 assert len(r['requests'])==1 and r['requests'][0]['status']==200,file.name
 assert not [e for e in r['errors'] if not (e.get('source')=='network' and e.get('url','').endswith('/favicon.ico'))],r['errors']
 for state in r['states']:
  assert len(state['trees'])==count,(file.name,state['p'],len(state['trees']),count)
  assert state['groundVisible']
  meaningful=[]
  for t in state['trees']:
   assert t['visible'];assert t['worldBounds']['max'][2]<-2,'tree enters tank volume'
   c=t['contribution'];rect=t['clippedCanopy']
   if c:
    area=c['canopyRegionChangedPixels']/(state['renderer']['canvas'][0]/w)/(state['renderer']['canvas'][1]/h)
    if area>1500 and rect['right']-rect['left']>60 and rect['bottom']-rect['top']>35:meaningful.append({'cssCanopyPixelArea':area,'projectedCanopy':t['canopy'],'actualPixelBounds':c['bounds']})
  if phone and state['p']==0:assert len(meaningful)>=2,(file.name,'two recognizable canopy regions',meaningful)
  if w<500 and h>700 and state['p']==.5:assert len(meaningful)>=2,(file.name,'elevated canopy regions',meaningful)
  rows.append({'label':file.name,'p':state['p'],'trees':count,'meaningfulCanopies':meaningful})
 baseline=out/'baseline'/file.name
 if baseline.exists() and w!=844:
  old=json.loads(baseline.read_text())
  for a,b in zip(old['states'],r['states']):assert a['camera']==b['camera'],(file.name,'camera path changed')
  if w>=720:
   for a,b in zip(old['states'][0]['trees'],r['states'][0]['trees']):
    assert a['root']==b['root'] and a['scale']==b['scale'],(file.name,'existing placement changed')
(out/'measurements/visibility-assertions.json').write_text(json.dumps(rows,indent=2));print('PASS',len(rows),'state checks including actual two-canopy visibility and preserved cameras/desktop placements')
