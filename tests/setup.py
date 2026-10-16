from pathlib import Path
import json,hashlib,shutil,subprocess,gzip
from PIL import Image
root=Path(__file__).resolve().parent.parent
out=Path(__file__).resolve().parent
for folder in ['baseline','after','loading','measurements','logs','screenshots','regressions']:(out/folder).mkdir(exist_ok=True)
files=[p for folder in ['src','public'] for p in (root/folder).rglob('*') if p.is_file()]+[root/n for n in ['package.json','package-lock.json','vite.config.js','index.html']]
manifest={p.relative_to(root).as_posix():{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files}
(out/'source-before.json').write_text(json.dumps(manifest,indent=2))
for name in ['AquariumDivePrototype.jsx','Projects.jsx','HeroAquarium.jsx','Skills.jsx']:shutil.copyfile(root/'src/components'/name,out/(name+'.before'))
shutil.copyfile(root/'src/App.jsx',out/'App.jsx.before')
for name,args in [('git-status-before.txt',['status','--short']),('git-diff-before.patch',['diff']),('git-diff-stat-before.txt',['diff','--stat']),('git-head.txt',['rev-parse','HEAD'])]:(out/name).write_bytes(subprocess.check_output(['git',*args],cwd=root))
for name in ['browser.mjs','instrument.js','profile.mjs','analyze.py','check-dive-landing.mjs','check-dive-webgl.mjs','check-dive-replay.mjs','check-dive-interruptions.mjs','check-dive-mobile.mjs','check-surface-integration.mjs','check-audio.mjs','check-projects.mjs','check-forest-lifecycle.mjs']:
 shutil.copyfile(root/'.tmp-phase05q'/name,out/name)
source='\n'.join(p.read_text(encoding='utf-8',errors='replace') for p in (root/'src').rglob('*') if p.is_file() and p.suffix in ['.js','.jsx','.css'])+'\n'+(root/'index.html').read_text(encoding='utf-8')
assets=[]
for p in files:
 if not any(part in ['public','assets'] for part in p.relative_to(root).parts) or p.name=='.gitkeep':continue
 rel=p.relative_to(root).as_posix();row={'path':rel,'bytes':p.stat().st_size,'type':p.suffix.lower(),'sha256':manifest[rel]['sha256'],'sourceLiteralReference':('/'+rel.removeprefix('public/')) in source if rel.startswith('public/') else p.name in source,'filenameMention':p.name in source}
 try:
  with Image.open(p) as im:row.update(width=im.width,height=im.height,decodedRGBABytes=im.width*im.height*4)
 except Exception:pass
 assets.append(row)
(out/'asset-inventory-static.json').write_text(json.dumps(assets,indent=2))
print('Preserved',len(manifest),'source/assets/config files; inventory',len(assets),'assets')
for row in sorted(assets,key=lambda r:r['bytes'],reverse=True)[:16]:print(row['bytes'],row['path'],row.get('width'),row.get('height'))
