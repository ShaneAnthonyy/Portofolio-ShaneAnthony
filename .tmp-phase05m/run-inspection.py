from pathlib import Path
import json,subprocess,sys
root=Path(__file__).resolve().parent.parent
out=root/'.tmp-phase05m'
phase=sys.argv[1] if len(sys.argv)>1 else 'baseline'
cases=[(1440,900,[]),(1920,1080,[]),(768,1024,[]),(1024,768,[]),(375,812,[]),(390,844,[]),(390,500,[]),(430,932,[]),(844,390,['--touch']),(390,844,['--lite']),(390,844,['--light']),(390,844,['--lite','--light'])]
if phase=='after':
 for width,height in [(375,812),(390,500),(430,932)]:
  for flags in [['--lite'],['--light'],['--lite','--light']]:cases.append((width,height,flags))
 cases.extend([(844,390,['--touch','--lite']),(1440,900,['--lite']),(768,1024,['--lite'])])
results=[]
for width,height,flags in cases:
 cmd=['node','.tmp-phase05m/inspect.mjs',phase,str(width),str(height),*flags]
 label=f'{phase}-{width}x{height}'+''.join(flags)
 with (out/'logs'/f'{label}.log').open('w',encoding='utf-8') as log:
  p=subprocess.run(cmd,cwd=root,stdout=log,stderr=subprocess.STDOUT)
 results.append({'command':' '.join(cmd),'exitCode':p.returncode,'log':label+'.log'})
 (out/'measurements'/f'{phase}-inspection-exits.json').write_text(json.dumps(results,indent=2))
 print('EXIT',label,p.returncode,flush=True)
 if p.returncode:raise SystemExit(p.returncode)
