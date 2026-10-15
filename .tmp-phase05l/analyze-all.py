from pathlib import Path
import subprocess
root=Path(__file__).resolve().parent.parent
folders=['baseline','isolation','css-only','after','after-full','baseline-mobile','after-mobile','baseline-untraced','after-untraced','after-cold']
for folder in folders:
 with (root/'.tmp-phase05l/logs'/f'{folder}-analysis.log').open('w',encoding='utf-8') as log:
  r=subprocess.run(['python','.tmp-phase05l/analyze.py',folder],cwd=root,stdout=log,stderr=subprocess.STDOUT)
 print('EXIT analysis',folder,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
