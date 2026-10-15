from pathlib import Path
import json,math
out=Path(__file__).resolve().parent;results=[]
for label,path in [('before','intermediate/dark-before-binding-fix.json'),('dark','after/dark/timeline.json'),('light','after/light/timeline.json'),('mobile','after/mobile/timeline.json')]:
 d=json.loads((out/path).read_text());actors={}
 for kind,axis in [('chicken',-1),('golem',1)]:
  rows=[next(a for a in s['actors']if a['kind']==kind)for s in d['samples']];dots=[]
  for a,b in zip(rows,rows[1:]):
   dx=b['position'][0]-a['position'][0];dz=b['position'][2]-a['position'][2];distance=math.hypot(dx,dz)
   if distance<.0001:continue
   dots.append((dx*axis*math.sin(b['yaw'])+dz*axis*math.cos(b['yaw']))/distance)
  actors[kind]=dict(meanForwardDot=sum(dots)/len(dots),minimumForwardDot=min(dots),samples=len(dots))
  if label!='before':assert actors[kind]['meanForwardDot']>.98,(label,kind,actors[kind])
 results.append(dict(label=label,actors=actors))
(out/'measurements/facing.json').write_text(json.dumps(results,indent=2));print('PASS both actors face their direction of travel; before/after evidence retained')
