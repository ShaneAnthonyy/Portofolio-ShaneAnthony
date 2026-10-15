from pathlib import Path
import subprocess,json
out=Path(__file__).resolve().parent;root=out.parent
jobs=[
 ('untraced-active',['node',str(out/'profile.mjs'),'perf-untraced-active','1440','900','--quick','--no-trace','--metrics-only']),
 ('untraced-inactive',['node',str(out/'profile.mjs'),'perf-untraced-inactive-control','1440','900','--quick','--inactive','--no-trace','--metrics-only']),
 *[(name+'-analysis',['python',str(out/'analyze.py'),name])for name in ['perf-desktop','perf-inactive','perf-mobile','perf-untraced-active','perf-untraced-inactive-control']],
 ('animation-analysis',['python',str(out/'analyze-character.py')]),
 ('facing',['python',str(out/'analyze-facing.py')]),
 ('preservation',['python',str(out/'verify-preservation.py')]),
]
results=[]
for name,cmd in jobs:
 print('START',name,flush=True)
 with (out/'logs'/f'{name}.log').open('w',encoding='utf-8')as log:
  p=subprocess.Popen(cmd,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
  for line in p.stdout:
   log.write(line);log.flush()
   if line.startswith('PASS')or 'Error'in line:print(name+': '+line.rstrip(),flush=True)
  code=p.wait()
 results.append(dict(name=name,command=cmd,exitCode=code));(out/'measurements/supplemental-validation.json').write_text(json.dumps(results,indent=2));print('EXIT',name,code,flush=True)
 if code:raise SystemExit(code)
