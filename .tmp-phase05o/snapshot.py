from pathlib import Path
import hashlib,json,shutil,subprocess
root=Path(__file__).resolve().parent.parent
out=Path(__file__).resolve().parent
for name in ['baseline','after','measurements','logs','motion','regressions']:(out/name).mkdir(exist_ok=True)
snapshot={}
for f in root.rglob('*'):
 rel=f.relative_to(root)
 if any(p in ['.git','node_modules','dist','.tmp-phase05o'] for p in rel.parts) or not f.is_file():continue
 data=f.read_bytes();snapshot[rel.as_posix()]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(out/'workspace-before.json').write_text(json.dumps(snapshot,indent=2))
for name in ['src/components/AquariumDivePrototype.jsx','src/App.jsx']:shutil.copyfile(root/name,out/(Path(name).name+'.before'))
for name,args in [('git-status-before.txt',['status','--short']),('git-diff-before.patch',['diff']),('git-head.txt',['rev-parse','HEAD'])]:(out/name).write_bytes(subprocess.check_output(['git',*args],cwd=root))
for name in ['browser.mjs','profile.mjs','analyze.py','check-dive-landing.mjs','check-dive-webgl.mjs','check-dive-replay.mjs','check-dive-interruptions.mjs','check-dive-mobile.mjs','check-surface-integration.mjs','check-audio.mjs','check-projects.mjs']:shutil.copyfile(root/'.tmp-phase05m'/name,out/name)
print('Preserved',len(snapshot),'files')
