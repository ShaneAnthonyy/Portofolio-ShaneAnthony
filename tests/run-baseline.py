from pathlib import Path
import subprocess,json
out=Path(__file__).resolve().parent
jobs=[('profile',['baseline','1440','900','--metrics-only']),('profile',['baseline','1920','1080','--quick','--metrics-only']),('profile',['baseline','768','1024','--quick','--metrics-only']),('profile',['baseline','390','844','--quick','--metrics-only']),('profile',['baseline','375','812','--quick','--metrics-only']),('profile',['baseline','1440','900','--quick','--lite','--metrics-only']),('profile',['baseline','390','844','--quick','--lite','--metrics-only']),('load-ab',['control']),('load-ab',['checks-off','--checks-off']),('load-ab',['lazy-fish','--lazy-fish'])]
results=[]
for i,(name,args) in enumerate(jobs):
 with (out/'logs'/f'baseline-{i}-{name}.log').open('w',encoding='utf-8') as log:
  p=subprocess.Popen(['node',str(out/f'{name}.mjs'),*args],cwd=out.parent,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
  for line in p.stdout:log.write(line);log.flush();print(line.rstrip(),flush=True)
  code=p.wait()
 results.append({'job':name,'args':args,'exitCode':code});(out/'measurements/baseline-exits.json').write_text(json.dumps(results,indent=2))
 if code:raise SystemExit(code)
 if (out/'STOP').exists():print('Stopped at checkpoint',flush=True);break
