from pathlib import Path
import hashlib,json,difflib
root=Path(__file__).resolve().parent.parent
out=root/'.tmp-phase05l'
before=json.loads((out/'workspace-before.json').read_text(encoding='utf-8'))
changed=[];missing=[]
for name,old in before.items():
 path=root/name
 if not path.is_file():missing.append(name);continue
 data=path.read_bytes()
 if len(data)!=old['bytes'] or hashlib.sha256(data).hexdigest()!=old['sha256']:changed.append(name)
assert not missing,missing
assert sorted(changed)==['src/App.jsx','src/components/AquariumDivePrototype.jsx'],changed
diffs=[]
for name,snapshot in [('src/App.jsx','App.jsx.before'),('src/components/AquariumDivePrototype.jsx','AquariumDivePrototype.jsx.before')]:
 a=(out/snapshot).read_text(encoding='utf-8').splitlines(keepends=True);b=(root/name).read_text(encoding='utf-8').splitlines(keepends=True)
 diffs.extend(difflib.unified_diff(a,b,fromfile=name+' (before Phase 05L)',tofile=name))
(out/'production-diff.patch').write_text(''.join(diffs),encoding='utf-8')
result={'preexistingFilesChecked':len(before),'changed':changed,'missing':missing,'allOtherPreexistingBytesPreserved':True,'treeAssets':{name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in ['public/aquarium/environment/cherry_blossom.glb','public/aquarium/environment/cherry_blossom-opt.glb']}}
(out/'measurements/workspace-integrity.json').write_text(json.dumps(result,indent=2))
print('PASS',json.dumps(result))
