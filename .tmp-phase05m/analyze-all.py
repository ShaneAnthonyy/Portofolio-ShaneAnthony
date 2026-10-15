from pathlib import Path
import subprocess
root=Path(__file__).resolve().parent.parent
for phase in ['baseline','after']:
 with (root/'.tmp-phase05m/logs'/f'{phase}-analysis.log').open('w',encoding='utf-8') as log:
  p=subprocess.run(['python','.tmp-phase05m/analyze.py',phase],cwd=root,stdout=log,stderr=subprocess.STDOUT)
 print('EXIT analysis',phase,p.returncode,flush=True)
 if p.returncode:raise SystemExit(p.returncode)
