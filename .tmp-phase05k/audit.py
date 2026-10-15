from pathlib import Path
import hashlib, json, subprocess

root=Path(__file__).resolve().parent.parent
out=root/'.tmp-phase05k'
load=lambda name:json.loads((out/name).read_text(encoding='utf-8'))
before=load('workspace-before.json')
changed=[];missing=[]
for rel,record in before.items():
    file=root/rel
    if not file.exists():missing.append(rel)
    elif hashlib.sha256(file.read_bytes()).hexdigest()!=record['sha256']:changed.append(rel)
assert changed==['src/components/AquariumDivePrototype.jsx'] and not missing,(changed,missing)
added=[]
for p in root.rglob('*'):
    if not p.is_file() or any(x in ('.git','node_modules','dist','.tmp-phase05k') for x in p.relative_to(root).parts):continue
    if p.relative_to(root).as_posix() not in before:added.append(p.relative_to(root).as_posix())
assert added==['public/aquarium/environment/cherry_blossom-opt.glb'],added
asset=load('measurements/consolidation.json')
for file,expected in [('public/aquarium/environment/cherry_blossom.glb',asset['sourceSha256']),('public/aquarium/environment/cherry_blossom-opt.glb',asset['optimizedSha256']),('dist/aquarium/environment/cherry_blossom-opt.glb',asset['optimizedSha256'])]:
    assert hashlib.sha256((root/file).read_bytes()).hexdigest()==expected,file
old=(out/'AquariumDivePrototype.before.jsx').read_text(encoding='utf-8')
new=(root/'src/components/AquariumDivePrototype.jsx').read_text(encoding='utf-8')
for start,end in [('const KEYS =','const smooth ='),('    const applyProgress =','    const applyCompact ='),('    const updateOutdoor =','      renderer.shadowMap.enabled ='),('    const onFrame =','  }, [])')]:
    a=old.index(start);b=old.index(end,a)
    c=new.index(start);d=new.index(end,c)
    assert old[a:b]==new[c:d],start
old_comments=[line.strip() for line in old.splitlines() if line.strip().startswith(('//','/*'))]
new_comments=[line.strip() for line in new.splitlines() if line.strip().startswith(('//','/*'))]
assert old_comments==new_comments,'source comments unchanged'
subprocess.run(['git','diff','--check'],cwd=root,check=True)
(out/'production-diff.patch').write_bytes(subprocess.run(['git','diff','--','src/components/AquariumDivePrototype.jsx'],cwd=root,capture_output=True,check=True).stdout)
result={'preExistingFiles':len(before),'modified':changed,'missing':missing,'addedByPhase':added,'userProvidedCherryUnchanged':True,'originalTreesFishTerrainAndPriorEvidenceUnchanged':True,'cameraMotionLifecycleAndSourceCommentsUnchanged':True,'publicAndDistOptimizedSha256':asset['optimizedSha256'],'gitDiffCheckExit':0}
(out/'measurements/workspace-integrity.json').write_text(json.dumps(result,indent=2))
print('PASS final workspace/asset/build-copy integrity',json.dumps(result))
