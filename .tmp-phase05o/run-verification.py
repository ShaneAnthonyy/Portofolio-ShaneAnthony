from pathlib import Path
import subprocess,json,sys,os
out=Path(__file__).resolve().parent;root=out.parent
(out/'runner-pid.txt').write_text(str(os.getpid()))
jobs=[
 ('startup',['node',str(out/'startup.mjs')]),
 ('lifecycle',['node',str(out/'lifecycle.mjs')]),
 ('cinematic-dark',['node',str(out/'cinematic.mjs')]),
 ('cinematic-light',['node',str(out/'cinematic.mjs'),'--light']),
 ('cinematic-mobile',['node',str(out/'cinematic.mjs'),'--mobile']),
 ('responsive',['node',str(out/'responsive.mjs')]),
 ('perf-desktop',['node',str(out/'profile.mjs'),'perf-desktop','1440','900']),
 ('perf-inactive',['node',str(out/'profile.mjs'),'perf-inactive','1440','900','--quick','--inactive']),
 ('perf-mobile',['node',str(out/'profile.mjs'),'perf-mobile','390','844']),
 ('forest-lifecycle',['node',str(out/'check-forest-lifecycle.mjs')]),
 ('arrival',['node','scripts/check-arrival.mjs']),
 ('hero',['node','scripts/check-hero.mjs']),
 ('regressions',['python',str(out/'run-regressions.py')]),
 ('diff-check',['git','diff','--check']),
]
results=[]
start=sys.argv[1]if len(sys.argv)>1 else None
if start:
 jobs=jobs[next(i for i,(name,cmd)in enumerate(jobs)if name==start):]
 results=json.loads((out/'measurements/validation.json').read_text())
for name,cmd in jobs:
 print('START',name,flush=True)
 with (out/'logs'/f'{name}.log').open('w',encoding='utf-8')as log:
  p=subprocess.Popen(cmd,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
  (out/'child-pid.txt').write_text(str(p.pid))
  for line in p.stdout:
   log.write(line);log.flush()
   if line.startswith(('PASS','EXIT','initial-render','both-actors','ready','entered','complete-real'))or 'Error' in line:print(name+': '+line.rstrip(),flush=True)
  code=p.wait()
 results.append(dict(name=name,command=cmd,exitCode=code));(out/'measurements/validation.json').write_text(json.dumps(results,indent=2));print('EXIT',name,code,flush=True)
 if code and name!='regressions':sys.exit(code)
sys.exit(1 if any(r['exitCode'] for r in results)else 0)
