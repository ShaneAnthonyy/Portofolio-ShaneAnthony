from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parent.parent
out=root/'.tmp-phase05m'
jobs=[
 ('profile-desktop',['node','.tmp-phase05m/profile.mjs','after','1440','900','--gpu']),
 ('profile-mobile',['node','.tmp-phase05m/profile.mjs','after','390','844','--gpu']),
 ('inspection',['python','.tmp-phase05m/run-inspection.py','after']),
 ('scene-desktop',['node','.tmp-phase05m/scene.mjs','final','1440']),
 ('scene-mobile',['node','.tmp-phase05m/scene.mjs','final','390']),
 ('scene-light',['node','.tmp-phase05m/scene.mjs','final','1440','--light']),
 ('scene-lite',['node','.tmp-phase05m/scene.mjs','final','390','--lite']),
 ('forest-lifecycle',['node','.tmp-phase05m/check-forest-lifecycle.mjs']),
 ('regressions',['python','.tmp-phase05m/run-regressions.py']),
]
results=[]
for name,cmd in jobs:
 with (out/'logs'/f'{name}.log').open('w',encoding='utf-8') as log:
  process=subprocess.Popen(cmd,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
  for line in process.stdout:
   log.write(line);log.flush()
   if line.startswith(('PASS','EXIT')) or 'Error' in line or 'Assertion' in line:print(name+': '+line.rstrip(),flush=True)
  code=process.wait()
 results.append({'command':' '.join(cmd),'name':name,'exitCode':code});(out/'measurements/validation-exits.json').write_text(json.dumps(results,indent=2))
 print('EXIT',name,code,flush=True)
raise SystemExit(1 if any(r['exitCode'] for r in results) else 0)
