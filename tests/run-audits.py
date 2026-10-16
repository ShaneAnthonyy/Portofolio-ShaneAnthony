from pathlib import Path
import subprocess,json
out=Path(__file__).resolve().parent
jobs=[('resource-audit',['baseline']),('projects-audit',[]),('check-projects',[]),('load-ab',['network-control','--network']),('load-ab',['network-lazy-fish','--network','--lazy-fish'])]
rows=[]
for i,(name,args)in enumerate(jobs):
 with (out/'logs'/f'audit-{name}-{i}.log').open('w',encoding='utf-8')as log:
  p=subprocess.Popen(['node',str(out/f'{name}.mjs'),*args],cwd=out.parent,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
  for line in p.stdout:log.write(line);log.flush();print(line.rstrip(),flush=True)
  code=p.wait()
 rows.append({'name':name,'args':args,'exitCode':code});(out/'measurements/audit-exits.json').write_text(json.dumps(rows,indent=2))
 if code and name!='check-projects':raise SystemExit(code)
 if (out/'STOP').exists():print('Stopped at checkpoint',flush=True);break
