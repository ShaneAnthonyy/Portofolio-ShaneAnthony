from pathlib import Path
import json,math
out=Path(__file__).resolve().parent
reports=[]
def height(x,z,t):
 n=t['segments'];gx=min(n,max(0,(x/120+.5)*n));gz=min(n,max(0,(z/120+.5)*n));ix=min(n-1,math.floor(gx));iz=min(n-1,math.floor(gz));fx=gx-ix;fz=gz-iz;i=iz*(n+1)+ix;ys=t['heights'];a,b,c,d=ys[i],ys[i+n+1],ys[i+n+2],ys[i+1]
 return a+(b-a)*fz+(d-a)*fx if fx+fz<=1 else c+(d-c)*(1-fz)+(b-c)*(1-fx)
for folder in ['dark','light','mobile']:
 p=out/'after'/folder/'timeline.json'
 if not p.exists():continue
 data=json.loads(p.read_text());samples=data.get('samples',[]);actors={}
 for kind in ['chicken','golem']:
  rows=[dict(now=s['now'],**next(a for a in s['actors']if a['kind']==kind))for s in samples]
  for row in rows:row.setdefault('time',None)
  changes=[];last=None;max_step=0;max_yaw=0;max_weight_error=0;max_ground_error=0;offset=None
  for a,b in zip(rows,rows[1:]):
   if a['time']is None or b['time']is None:continue
   dt=b['time']-a['time'];dist=math.dist(a['position'],b['position']);max_step=max(max_step,dist);max_yaw=max(max_yaw,abs(b['yaw']-a['yaw']))
   if dt>0:assert dist<(20 if kind=='chicken'else 2)*dt+.02,(folder,kind,dist,dt)
  for row in rows:
   if row['time']is None:continue
   active=[a for a in row['actions']if a['weight']>.001 and a['enabled']];primary=max(active,key=lambda a:a['weight'])['clip']if active else None
   if primary!=last:changes.append(dict(clip=primary,time=row['time'],wall=row['now']));last=primary
   max_weight_error=max(max_weight_error,abs(sum(a['weight']for a in active)-1))
   assert all(math.isfinite(v)for v in [*row['position'],row['yaw']])
   for bone in row['pose']:
    assert all(math.isfinite(v)for v in bone['p']+bone['q']);assert abs(sum(v*v for v in bone['q'])-1)<.001
   if 'terrain'in data:
    x,y,z=row['position'];h=height(x,z,data['terrain']);offset=y-h if offset is None else offset;max_ground_error=max(max_ground_error,abs(y-h-offset))
  expected=['idle','walk','run']if kind=='chicken'else['idle','walk','idle','walk','idle']
  assert [c['clip']for c in changes]==expected,(folder,kind,changes)
  assert max_weight_error<.002,(folder,kind,max_weight_error)
  if 'terrain'in data:assert max_ground_error<.002,(folder,kind,max_ground_error)
  actors[kind]=dict(changes=changes,maxRootStep=max_step,maxYawStep=max_yaw,maxWeightError=max_weight_error,maxTerrainOffsetError=max_ground_error,samples=len(rows),poseNodes=len(rows[-1]['pose']))
 reports.append(dict(folder=folder,actors=actors,motionFrames=len(data.get('motion',[])),runtimeErrors=data['errors']))
(out/'measurements/animation-analysis.json').write_text(json.dumps(reports,indent=2));print('PASS animation clocks, transition weights, finite poses, route continuity and terrain contact:',len(reports),'sequences')
