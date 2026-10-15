from pathlib import Path
import hashlib,json,difflib,subprocess,re
out=Path(__file__).resolve().parent;root=out.parent
before=json.loads((out/'workspace-before.json').read_text());changed=[];missing=[]
for name,meta in before.items():
 p=root/name
 if not p.is_file():missing.append(name)
 elif hashlib.sha256(p.read_bytes()).hexdigest()!=meta['sha256']:changed.append(name)
allowed=['src/App.jsx','src/components/AquariumDivePrototype.jsx']
assert not missing,missing
assert sorted(changed)==sorted(allowed),changed
src=(root/allowed[1]).read_text(encoding='utf-8');old=(out/'AquariumDivePrototype.jsx.before').read_text(encoding='utf-8')
blocks=[('camera keys','const KEYS =','const smooth ='),('shader preparation','    const renderFrame =','    const applyProgress ='),('camera interpolation','    const applyProgress =','    const applyCompact ='),('hills','      const hillSeg =','      const SKY_')]
checks=[]
for label,a,b in blocks[:3]:
 assert a in src and b in src and a in old and b in old,(label,a,b)
 assert src[src.index(a):src.index(b,src.index(a))]==old[old.index(a):old.index(b,old.index(a))],label
 checks.append(label+' byte-identical')
for label,a,b in [('hills','      const hillSeg =','      const hillMesh ='),('trees','      const TREE_CFG =','      if (!reduced && qState.mode')]:
 if a in src and b in src:
  assert src[src.index(a):src.index(b,src.index(a))]==old[old.index(a):old.index(b,old.index(a))],label
  checks.append(label+' byte-identical')
app=(root/allowed[0]).read_text(encoding='utf-8');appold=(out/'App.jsx.before').read_text(encoding='utf-8')
assert app.replace('              presentationReady={gateEntered}\n','')==appold
assert not any(s in src for s in ['window.__diveCamera','window.__charRigs','window.__diveStats'])
for line in difflib.unified_diff(old.splitlines(),src.splitlines()):
 if line.startswith('+')and not line.startswith('+++'):assert not re.match(r'\+\s*(//|/\*)',line),line
patch=''
for name in allowed:
 b=(out/(Path(name).name+'.before')).read_text(encoding='utf-8');a=(root/name).read_text(encoding='utf-8');patch+=''.join(difflib.unified_diff(b.splitlines(True),a.splitlines(True),fromfile=name+' before 05O',tofile=name+' after 05O'))
(out/'production-diff.patch').write_text(patch,encoding='utf-8')
(out/'measurements/preservation.json').write_text(json.dumps(dict(filesChecked=len(before),missing=missing,changed=changed,checks=checks,commentsAdded=0,assetsPreserved=True),indent=2))
print('PASS',len(before),'pre-existing files; only two authorized source files changed;',checks)
