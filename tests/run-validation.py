from pathlib import Path
import subprocess,json,shutil
out=Path(__file__).resolve().parent;root=out.parent
for name in ['visual.mjs','forest.js']:shutil.copyfile(root/'.tmp-phase05q'/name,out/name)
jobs=[('loading',['final']),('journey',['eager-control','--eager-fish']),('journey',['final']),('journey',['mobile','--mobile']),('visual',['after']),('check-dive-landing',[]),('check-dive-webgl',[]),('check-dive-replay',[]),('check-dive-interruptions',[]),('check-dive-mobile',[]),('check-surface-integration',[]),('check-forest-lifecycle',[]),('check-audio',[]),('check-projects',[])]
rows=[]
for i,(name,args)in enumerate(jobs):
 with (out/'logs'/f'validation-{i}-{name}.log').open('w',encoding='utf-8')as log:
  p=subprocess.Popen(['node',str(out/f'{name}.mjs'),*args],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
  for line in p.stdout:log.write(line);log.flush();print(line.rstrip(),flush=True)
  code=p.wait()
 rows.append({'name':name,'args':args,'exitCode':code});(out/'measurements/validation-exits.json').write_text(json.dumps(rows,indent=2))
 if code and name not in ['check-projects','check-dive-mobile']:raise SystemExit(code)
 if (out/'STOP').exists():print('Stopped at checkpoint',flush=True);break
for script in ['scripts/check-arrival.mjs','scripts/check-hero.mjs','scripts/check-carousel-geometry.cjs']:
 p=subprocess.run(['node',script],cwd=root,capture_output=True,text=True);(out/'logs'/Path(script).with_suffix('.log').name).write_text(p.stdout+p.stderr,encoding='utf-8');print(p.stdout,flush=True);rows.append({'name':script,'exitCode':p.returncode})
(out/'measurements/validation-exits.json').write_text(json.dumps(rows,indent=2))
