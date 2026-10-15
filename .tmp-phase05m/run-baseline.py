from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parent.parent
out=root/'.tmp-phase05m'
jobs=[['node','.tmp-phase05m/profile.mjs','baseline','1440','900','--gpu'],['node','.tmp-phase05m/profile.mjs','baseline','390','844','--quick','--gpu']]
results=[]
for cmd in jobs:
 name='baseline-profile-'+cmd[3]
 with (out/'logs'/f'{name}.log').open('w',encoding='utf-8') as log:
  process=subprocess.Popen(cmd,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
  for line in process.stdout:log.write(line);log.flush();print(line.rstrip(),flush=True)
  code=process.wait()
 results.append({'command':' '.join(cmd),'exitCode':code});(out/'measurements/baseline-exits.json').write_text(json.dumps(results,indent=2))
 if code:raise SystemExit(code)
