from pathlib import Path
import json,statistics
out=Path(__file__).resolve().parent
summaries=[]
for folder in ['baseline','isolation','css-only','after','after-full','baseline-mobile','after-mobile','baseline-untraced','after-untraced','after-cold']:
 for file in (out/folder).glob('*-profile.json'):
  report=json.loads(file.read_text());passes=[]
  for row in report['results']:
   gpu=[g['ms'] for g in row.get('gpu',[]) if row['frames'][0]['now']<=g['time']<=row['frames'][-1]['now'] and g['camera'][1]>=3 and g['camera'][2]>=9.49]
   passes.append({'name':row['name'],'metrics':row['metrics'],'contexts':row['contexts'],'lost':row['lost'],'reactCommits':sum(e['name']=='ReactCommit' for e in row['events']),'initialization':{name:sum(e['name']==name for e in row['events']) for name in ['compileShader','linkProgram','createFramebuffer','renderbufferStorageMultisample','texImage2D','texSubImage2D','bufferData']},'earlyRangeGpuRenderMs':{'samples':len(gpu),'median':statistics.median(gpu) if gpu else None,'p95':sorted(gpu)[int((len(gpu)-1)*.95)] if gpu else None}})
  summaries.append({'folder':folder,'label':report['label'],'passes':passes,'errors':report['errors'],'warnings':report['warnings']})
(out/'measurements/performance-summary.json').write_text(json.dumps(summaries,indent=2))
print('PASS summarized',sum(len(r['passes']) for r in summaries),'scroll passes')
for s in summaries:
 print(s['folder'],s['label'],[(r['name'],round(r['metrics']['medianMs'],1),round(r['metrics']['p95Ms'],1),round(r['metrics']['maxMs'],1),r['initialization']['linkProgram']) for r in s['passes']])
