from pathlib import Path
import bisect, collections, json, math, re, sys
from functools import lru_cache

out=Path(__file__).resolve().parent
folder=out/(sys.argv[1] if len(sys.argv)>1 else 'baseline')
source=(out/'AquariumDivePrototype.jsx.before').read_text(encoding='utf-8')
part=source[source.index('const KEYS ='):source.index('const smooth =')]
keys=[(float(p),[float(x) for x in pos.split(',')],[float(x) for x in target.split(',')]) for p,pos,target in re.findall(r'\{ p: ([\d.]+), pos: \[([^]]+)\], tgt: \[([^]]+)\]',part)]
def position(progress,aspect):
    index=0
    while index<len(keys)-2 and progress>keys[index+1][0]:index+=1
    a,b=keys[index],keys[index+1];t=max(0,min(1,(progress-a[0])/(b[0]-a[0])));e=t*t*(3-2*t)
    pos=[a[1][k]+(b[1][k]-a[1][k])*e for k in range(3)]
    target=[a[2][k]+(b[2][k]-a[2][k])*e for k in range(3)]
    if aspect<.7:
        t=max(0,min(1,(progress-.7)/.2));factor=1+.35*(1-t*t*(3-2*t));pos=[target[k]+(pos[k]-target[k])*factor for k in range(3)]
    return pos
quantile=lambda a,p:sorted(a)[int((len(a)-1)*p)] if a else None
summaries=[]
for file in sorted(folder.glob('*-profile.json')):
    report=json.loads(file.read_text());initial=json.loads(file.with_name(file.name.replace('-profile','-initial')).read_text());aspect=initial['camera']['aspect']
    samples=[position(i/2000,aspect) for i in range(1901)]
    @lru_cache(maxsize=None)
    def progress(camera):
        if not camera:return None
        x,y,z=camera
        return min(range(len(samples)),key=lambda i:(samples[i][0]-x)**2+(samples[i][1]-y)**2+(samples[i][2]-z)**2)/2000
    for row in report['results']:
        frames=row['frames'];times=[f['now'] for f in frames]
        for f in frames:f['actualP']=progress(tuple(f.get('camera') or []));f['targetP']=f['scrollY']/f['height'] if f['height'] else 1
        def closest(t):
            i=max(0,min(len(frames)-1,bisect.bisect_right(times,t)-1));return frames[i]
        slow=[];bins=collections.defaultdict(list);affected=[]
        for i,f in enumerate(frames[1:]):
            duration=f['now']-frames[i]['now'];p=frames[i]['actualP']
            if p is None:continue
            bins[round(math.floor(p*10)/10,1)].append({'dt':duration,'renderCpu':f['counts'][3],'draws':f['counts'][0],'transparent':f['counts'][2]})
            if .1<=p<=.65:affected.append(duration)
            if duration>50:
                events=[e for e in row['events'] if e['start']>=frames[i]['now'] and e['start']<f['now']]
                slow.append({'ms':duration,'actualPBefore':p,'actualPAfter':f['actualP'],'targetP':f['targetP'],'time':frames[i]['now'],'events':sorted(events,key=lambda e:e['duration'],reverse=True)[:8]})
        events=[{**e,'actualP':closest(e['start'])['actualP']} for e in row['events'] if e['duration']>2]
        tasks=[{**e,'actualP':closest(e['startTime'])['actualP']} for e in row['longTasks'] if times[0]<=e['startTime']<=times[-1]]
        loaf=[e for e in row.get('longFrames',[]) if times[0]<=e['startTime']<=times[-1]]
        trace=json.loads((folder/row['trace']).read_text())['traceEvents'] if row['trace'] else []
        marker=next((e for e in trace if e.get('name')==row['name']+'-start'),None)
        timeline=collections.defaultdict(lambda:{'count':0,'totalMs':0,'maxMs':0})
        long_trace=[]
        for e in trace:
            if e.get('ph')!='X' or (marker and (e.get('pid')!=marker['pid'] or e.get('tid')!=marker['tid'])):continue
            d=e.get('dur',0)/1000;stat=timeline[e['name']];stat['count']+=1;stat['totalMs']+=d;stat['maxMs']=max(stat['maxMs'],d)
            if d>20:long_trace.append({'name':e['name'],'ms':d,'ts':e['ts'],'args':e.get('args')})
        summary={'label':report['label'],'pass':row['name'],'metrics':row['metrics'],'range':{'targetMin':min(f['targetP'] for f in frames),'targetMax':max(f['targetP'] for f in frames),'actualMin':min(f['actualP'] for f in frames if f['actualP'] is not None),'actualMax':max(f['actualP'] for f in frames if f['actualP'] is not None)},'bins':{p:{'samples':len(v),'medianMs':quantile([x['dt'] for x in v],.5),'p95Ms':quantile([x['dt'] for x in v],.95),'maxMs':max(x['dt'] for x in v),'meanRenderCpuMs':sum(x['renderCpu'] for x in v)/len(v),'meanDraws':sum(x['draws'] for x in v)/len(v),'meanTransparentCallbacks':sum(x['transparent'] for x in v)/len(v)} for p,v in sorted(bins.items())},'slowFrames':slow,'slowGlCalls':events,'longTasks':tasks,'longAnimationFrames':loaf,'timeline':dict(sorted(timeline.items(),key=lambda kv:kv[1]['totalMs'],reverse=True)),'longTimelineEvents':sorted(long_trace,key=lambda e:e['ms'],reverse=True)[:30]}
        summary['affectedRange']={'actualPMin':.1,'actualPMax':.65,'samples':len(affected),'medianMs':quantile(affected,.5),'p95Ms':quantile(affected,.95),'maxMs':max(affected) if affected else None,'over50':sum(x>50 for x in affected),'over100':sum(x>100 for x in affected)}
        summaries.append(summary)
        print(report['label'],row['name'],json.dumps({'range':summary['range'],'metrics':row['metrics'],'slow':[{k:e[k] for k in ['ms','actualPBefore','actualPAfter','targetP']} for e in slow],'gl':events[:5],'traceTop':list(summary['timeline'].items())[:6]}),flush=True)
(folder/'analysis.json').write_text(json.dumps(summaries,indent=2))
