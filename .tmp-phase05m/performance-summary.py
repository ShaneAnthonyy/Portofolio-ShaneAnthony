from pathlib import Path
import json
out=Path(__file__).resolve().parent;rows=[]
for phase in ['baseline','after']:
 for row in json.loads((out/phase/'analysis.json').read_text()):
  rows.append({'phase':phase,'label':row['label'],'pass':row['pass'],'affectedRange':row['affectedRange'],'wholeRun':row['metrics'],'earlyScene':row['bins'].get('0.2'),'longTasks':len(row['longTasks'])})
  if phase=='after':assert row['metrics']['over50']==0,(row['label'],row['pass'])
 for file in (out/phase).glob('*-profile.json'):
  r=json.loads(file.read_text())
  assert not [e for e in r['errors'] if not(e.get('source')=='network' and e.get('url','').endswith('/favicon.ico'))],r['errors']
  for p in r['results']:
   assert p['lost']==0 and p['contexts']==1
   assert not [e for e in p['events'] if e['name'] in ['linkProgram','compileShader','createFramebuffer','texImage2D','texSubImage2D','bufferData']],(phase,p['name'],'late initialization')
(out/'measurements/performance-summary.json').write_text(json.dumps(rows,indent=2))
for phase in ['baseline','after']:
 for label in sorted(set(r['label'] for r in rows if r['phase']==phase)):
  a=[r for r in rows if r['phase']==phase and r['label']==label];m=[r['affectedRange'] for r in a]
  print(phase,label,'passes',len(a),'affected median',min(x['medianMs'] for x in m),max(x['medianMs'] for x in m),'p95',max(x['p95Ms'] for x in m),'max',max(x['maxMs'] for x in m),'early scene',a[0]['earlyScene'])
print('PASS',len(rows),'measured passes; no late initialization/context loss')
