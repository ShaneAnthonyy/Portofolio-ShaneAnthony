from pathlib import Path
import hashlib,json,difflib
root=Path(__file__).resolve().parent.parent;out=root/'.tmp-phase05m'
before=json.loads((out/'workspace-before.json').read_text());changed=[];missing=[]
for name,old in before.items():
 p=root/name
 if not p.is_file():missing.append(name);continue
 data=p.read_bytes()
 if len(data)!=old['bytes'] or hashlib.sha256(data).hexdigest()!=old['sha256']:changed.append(name)
assert not missing,missing
assert changed==['src/components/AquariumDivePrototype.jsx'],changed
name=changed[0];old=(out/'AquariumDivePrototype.jsx.before').read_text(encoding='utf-8');new=(root/name).read_text(encoding='utf-8')
def block(s,a,b):return s[s.index(a):s.index(b,s.index(a))]
for start,end in [('const KEYS =','const FISH_BACKDROP_SCALE'),('    const renderFrame =','    const compactTrees =')]:
 oldend='    const applyCompact =' if 'compactTrees' in end else end
 assert block(old,start,oldend)==block(new,start,end),'camera/render/preparation block changed'
assert block(old,'      const hillSeg =','      const hillUV =')==block(new,'      const hillSeg =','      const hillUV ='),'hills changed'
patch=''.join(difflib.unified_diff(old.splitlines(keepends=True),new.splitlines(keepends=True),fromfile=name+' (before Phase 05M)',tofile=name))
assert not any(line.startswith('+') and ('//' in line or '/*' in line) for line in patch.splitlines() if not line.startswith('+++')),'added source comment'
(out/'production-diff.patch').write_text(patch,encoding='utf-8')
result={'preexistingFilesChecked':len(before),'changed':changed,'missing':missing,'otherPreexistingBytesPreserved':True,'phase05LRenderPreparationCameraAndAppPreserved':True,'hillsPreserved':True}
(out/'measurements/workspace-integrity.json').write_text(json.dumps(result,indent=2));print('PASS',json.dumps(result))
