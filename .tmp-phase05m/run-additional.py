from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parent.parent;out=root/'.tmp-phase05m';rows=[]
jobs=[('static-recheck',['node','.tmp-phase05m/check-static.mjs']),('responsive',['node','.tmp-phase05m/check-responsive.mjs']),('motion-desktop',['node','.tmp-phase05m/motion.mjs','1440','900']),('motion-mobile',['node','.tmp-phase05m/motion.mjs','390','844']),('surface-rerun',['node','.tmp-phase05m/check-surface-integration.mjs']),('arrival',['node','scripts/check-arrival.mjs']),('hero',['node','scripts/check-hero.mjs'])]
for name,cmd in jobs:
 with (out/'logs'/f'{name}.log').open('w',encoding='utf-8') as log:
  p=subprocess.Popen(cmd,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
  for line in p.stdout:log.write(line);log.flush();print(name+': '+line.rstrip(),flush=True)
  code=p.wait()
 rows.append({'command':' '.join(cmd),'exitCode':code});(out/'measurements/additional-exits.json').write_text(json.dumps(rows,indent=2));print('EXIT',name,code,flush=True)
raise SystemExit(1 if any(r['exitCode'] for r in rows) else 0)
