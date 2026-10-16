from pathlib import Path
import subprocess,json
out=Path(__file__).resolve().parent
jobs=[('profile',['after','1440','900','--metrics-only']),('profile',['after','1920','1080','--quick','--metrics-only']),('profile',['after','768','1024','--quick','--metrics-only']),('profile',['after','390','844','--metrics-only']),('profile',['after','375','812','--quick','--metrics-only']),('profile',['after','1440','900','--quick','--lite','--metrics-only']),('profile',['after','390','844','--quick','--lite','--metrics-only']),('load-ab',['final-fast']),('load-ab',['final-network','--network']),('resource-audit',['after']),('mql-audit',[])]
rows=[]
for i,(name,args)in enumerate(jobs):
 with (out/'logs'/f'after-{i}-{name}.log').open('w',encoding='utf-8')as log:
  p=subprocess.Popen(['node',str(out/f'{name}.mjs'),*args],cwd=out.parent,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
  for line in p.stdout:log.write(line);log.flush();print(line.rstrip(),flush=True)
  code=p.wait()
 rows.append({'name':name,'args':args,'exitCode':code});(out/'measurements/after-exits.json').write_text(json.dumps(rows,indent=2))
 if code:raise SystemExit(code)
 if (out/'STOP').exists():print('Stopped at checkpoint',flush=True);break
