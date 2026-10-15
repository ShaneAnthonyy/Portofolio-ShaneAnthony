from pathlib import Path
import json
out=Path(__file__).resolve().parent
pairs=[]
for folder,label,previous,old in [
 ('after-full','1440x900-normal-dark-gpu','baseline','1440x900-normal-dark'),
 ('after-mobile','390x844-normal-dark-gpu','baseline-mobile','390x844-normal-dark-gpu'),
]:
 for p in [0,15,30,45,55,62,70,80]:
  pairs.append({'label':f'{label} — P{p/100:g}','before':f'{previous}/{old}-p{p}.png','after':f'{folder}/{label}-p{p}.png'})
motion={direction:{side:[f'{folder}/motion-{direction}-{i}.png' for i in range(6)] for side,folder in [('before','critical-before'),('after','critical')]} for direction in ['forward','reverse']}
html='''<!doctype html><meta charset="utf-8"><title>Phase 05L evidence</title><style>
body{margin:24px;background:#102528;color:#e9f3ef;font:16px system-ui}h1{font-size:24px}nav{display:flex;gap:20px}a{color:#a9e2ce}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{max-width:100%;max-height:76vh;object-fit:contain;background:#081c20}figure{margin:0}figcaption{margin:8px 0}.controls{margin:24px 0;display:flex;gap:16px;align-items:center}select,button,input{font:inherit}input{flex:1}#motion{display:block;margin:auto}details{margin-top:24px}button{padding:6px 14px}</style>
<h1>Phase 05L — measured freeze correction</h1><nav><a href="report.md">Report</a><a href="measurements/performance-summary.json">Performance data</a><a href="measurements/visual-state-comparison.json">Camera / scene comparison</a><a href="production-diff.patch">Production diff</a></nav>
<p>Actual production captures in hardware accelerated Windows Chrome. Fish, plants, caustics and tree sway use live time, so their poses differ between captures. Camera matrices, render resolution and scene settings are checked separately.</p>
<div class="controls"><label>Camera state <select id="state"></select></label></div><div class="pair"><figure><figcaption>Before</figcaption><img id="before"></figure><figure><figcaption>After</figcaption><img id="after"></figure></div>
<h2>Forward / reverse motion evidence</h2><p>Six captures per direction and build, approximately 400 ms apart; complete camera trajectories are in <a href="critical-before/results.json">before</a> and <a href="critical/results.json">after</a>. This player is visual evidence, not an FPS benchmark.</p>
<div class="controls"><select id="direction"><option>forward</option><option>reverse</option></select><button id="play">Play</button><input id="frame" type="range" min="0" max="5" value="0"><span id="count"></span></div><div class="pair"><figure><figcaption>Before</figcaption><img id="motion-before"></figure><figure><figcaption>After</figcaption><img id="motion-after"></figure></div>
<script>
const pairs=PAIRS,motion=MOTION;const state=document.querySelector('#state'),before=document.querySelector('#before'),after=document.querySelector('#after');
pairs.forEach((p,i)=>state.add(new Option(p.label,i)));function compare(){const p=pairs[state.value];before.src=p.before;after.src=p.after}state.onchange=compare;compare();
const direction=document.querySelector('#direction'),frame=document.querySelector('#frame'),play=document.querySelector('#play');let timer;function show(){for(const side of ['before','after'])document.querySelector('#motion-'+side).src=motion[direction.value][side][frame.value];document.querySelector('#count').textContent=(+frame.value+1)+'/6'}direction.onchange=show;frame.oninput=show;play.onclick=()=>{if(timer){clearInterval(timer);timer=null;play.textContent='Play'}else{play.textContent='Pause';timer=setInterval(()=>{frame.value=(+frame.value+1)%6;show()},400)}};show();
</script>'''.replace('PAIRS',json.dumps(pairs)).replace('MOTION',json.dumps(motion))
(out/'index.html').write_text(html,encoding='utf-8')
print('PASS evidence gallery',len(pairs),'comparisons and 24 motion captures')
