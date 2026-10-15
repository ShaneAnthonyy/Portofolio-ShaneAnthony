from pathlib import Path
import json,math
out=Path(__file__).resolve().parent;file=next((out/'perf-desktop').glob('*-profile.json'));d=json.loads(file.read_text());keys=[(0,[0,2.5,12]),(.3,[0,4.5,9.5]),(.55,[0,8.5,9.5]),(.75,[0,7,7.5]),(1,[0,2.5,.5])]
def camera(p):
 i=0
 while i<len(keys)-2 and p>keys[i+1][0]:i+=1
 a,b=keys[i:i+2];t=(p-a[0])/(b[0]-a[0]);e=t*t*(3-2*t)
 return[a[1][k]+(b[1][k]-a[1][k])*e for k in range(3)]
samples=[camera(i/2000)for i in range(2001)];rows=[]
for run in d['results']:
 for a,b in zip(run['frames'],run['frames'][1:]):
  if b['now']-a['now']<=50:continue
  p=min(range(len(samples)),key=lambda i:math.dist(samples[i],a['camera']))/2000
  row=dict(run=run['name'],interval=b['now']-a['now'],progress=p,start=a['now'],end=b['now'],events=[e for e in run['events']if a['now']<=e['start']<b['now']],longTasks=[t for t in run['longTasks']if t['startTime']<b['now']and t['startTime']+t['duration']>a['now']],trace=run['trace']);rows.append(row)
(out/'measurements/spikes.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
