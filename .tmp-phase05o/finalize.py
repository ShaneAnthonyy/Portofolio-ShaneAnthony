from pathlib import Path
import json,hashlib,re
out=Path(__file__).resolve().parent
report=(out/'report.md').read_text(encoding='utf-8');gallery=(out/'index.html').read_text(encoding='utf-8')
assert len(re.findall(r'^\d+\. \*\*',report,re.M))==17
count=0
for file in ['after/dark/timeline.json','after/light/timeline.json','after/mobile/timeline.json','measurements/lifecycle.json']:
 for frame in json.loads((out/file).read_text())['motion']:
  assert (out/frame['name']).is_file(),frame['name'];count+=1
assert count>300
for folder in ['perf-desktop','perf-inactive','perf-mobile','perf-untraced-active','perf-untraced-inactive-control']:
 data=json.loads(next((out/folder).glob('*-profile.json')).read_text())
 assert not data['errors'],data['errors']
 assert all(r['contexts']==1 and r['lost']==0 and r['mixers']==2 for r in data['results'])
assert json.loads((out/'measurements/build.json').read_text())['exitCode']==0
files={}
for p in sorted(out.rglob('*')):
 if not p.is_file()or p.name=='files-manifest.json':continue
 data=p.read_bytes();files[p.relative_to(out).as_posix()]=dict(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
(out/'files-manifest.json').write_text(json.dumps(files,indent=2))
for target in re.findall(r'\]\(([^)]+)\)',report):assert (out/target).is_file(),target
for target in re.findall(r'(?:href|src)="([^"]+)"',gallery):assert (out/target).is_file(),target
print('PASS 17 report sections, all report/gallery links,',count,'motion frames, final profile errors/contexts/mixers and build; manifest:',len(files),'artifacts')
