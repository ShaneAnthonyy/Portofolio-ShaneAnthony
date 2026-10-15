from pathlib import Path
import subprocess,json,os
root=Path(__file__).resolve().parent.parent
out=root/'.tmp-phase05l'
jobs=[
 ('after-mobile',['node','.tmp-phase05l/profile.mjs','after-mobile','390','844','--gpu'],None),
 ('baseline-untraced',['node','.tmp-phase05l/profile.mjs','baseline-untraced','1440','900','--quick','--gpu','--no-trace'],'http://127.0.0.1:4176/'),
 ('after-untraced',['node','.tmp-phase05l/profile.mjs','after-untraced','1440','900','--quick','--gpu','--no-trace'],None),
 ('critical',['node','.tmp-phase05l/check-critical.mjs'],None),
 ('scene-desktop',['node','.tmp-phase05l/scene.mjs','final','1440'],None),
 ('scene-mobile',['node','.tmp-phase05l/scene.mjs','final','390'],None),
 ('scene-light',['node','.tmp-phase05l/scene.mjs','final','1440','--light'],None),
 ('scene-lite',['node','.tmp-phase05l/scene.mjs','final','390','--lite'],None),
 ('regressions',['python','.tmp-phase05l/run-regressions.py'],None),
]
results=[]
for name,cmd,url in jobs:
 env=os.environ.copy()
 if url:env['DIVE_URL']=url
 else:env.pop('DIVE_URL',None)
 with (out/'logs'/f'{name}.log').open('w',encoding='utf-8') as log:
  p=subprocess.Popen(cmd,cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
  for line in p.stdout:
   log.write(line);log.flush()
   if line.startswith(('PASS','EXIT')) or 'Error' in line or 'Assertion' in line:print(name+': '+line.rstrip(),flush=True)
  code=p.wait()
 results.append({'name':name,'command':' '.join(cmd),'url':url or 'http://127.0.0.1:4173/','exitCode':code,'log':f'logs/{name}.log'})
 (out/'measurements/validation.json').write_text(json.dumps(results,indent=2))
 print('EXIT',name,code,flush=True)
raise SystemExit(1 if any(r['exitCode'] for r in results) else 0)
