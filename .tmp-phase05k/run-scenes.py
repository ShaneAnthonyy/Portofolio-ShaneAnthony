from pathlib import Path
import json, subprocess

out=Path(__file__).resolve().parent
cases=[['final','1440'],['final','1440','--light'],['final','390'],['final','1440','--lite'],['final','390','--lite'],['final','768'],['final','768','--lite']]
results=[]
for args in cases:
    label='-'.join(args)
    with (out/'logs'/f'{label}.log').open('w',encoding='utf-8') as log:
        process=subprocess.Popen(['node',str(out/'scene.mjs'),*args],cwd=out.parent,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
        for line in process.stdout:
            log.write(line);log.flush();print(line.rstrip(),flush=True)
        code=process.wait()
    results.append({'command':'node .tmp-phase05k/scene.mjs '+' '.join(args),'exitCode':code,'log':'logs/'+label+'.log'})
    (out/'measurements/final-commands.json').write_text(json.dumps(results,indent=2))
    if code:raise SystemExit(code)
