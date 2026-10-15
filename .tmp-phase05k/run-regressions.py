from pathlib import Path
import json,subprocess

root=Path(__file__).resolve().parent.parent
out=root/'.tmp-phase05k'
tests=['check-dive-landing','check-dive-webgl','check-dive-replay','check-dive-interruptions','check-dive-mobile','check-surface-integration','check-audio','check-projects']
results=[]
for name in tests:
    cmd=['node',str(out/f'{name}.mjs')]
    with (out/'logs'/f'{name}.log').open('w',encoding='utf-8') as log:
        process=subprocess.Popen(cmd,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
        for line in process.stdout:
            log.write(line);log.flush()
            if line.startswith('PASS') or 'Error' in line or 'Assertion' in line:print(name+': '+line.rstrip(),flush=True)
        code=process.wait()
    results.append({'name':name,'command':f'node .tmp-phase05k/{name}.mjs','exitCode':code,'log':f'logs/{name}.log'})
    (out/'measurements/regressions.json').write_text(json.dumps(results,indent=2))
    print('EXIT',name,code,flush=True)
raise SystemExit(1 if any(r['exitCode'] for r in results) else 0)
