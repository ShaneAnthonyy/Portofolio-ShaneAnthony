from pathlib import Path
import json
out=Path(__file__).resolve().parent
items=[]
for file in sorted((out/'after').glob('*-visibility.json')):
 r=json.loads(file.read_text());label=file.name.replace('-visibility.json','')
 for state in r['states']:
  p=state['p'];name=f'{label}-p{p}.png';before=out/'baseline'/name
  items.append({'label':f'{label} — P{p:g}','after':'after/'+name,'before':'baseline/'+name if before.exists() and not label.startswith('844x390') else None,'counts':len(state['trees']),'boxes':[t['clippedCanopy'] for t in state['trees']]})
items.sort(key=lambda r:(not r['label'].startswith('390x844-normal-light'),r['label']))
html='''<!doctype html><meta charset="utf-8"><title>Phase 05M forest evidence</title><style>
body{margin:24px;background:#102528;color:#edf3ee;font:16px system-ui}a{color:#b6edd7}h1{font-size:24px}nav{display:flex;gap:18px;flex-wrap:wrap}.row{display:flex;gap:18px;align-items:center;margin:20px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{width:100%;height:72vh;object-fit:contain;background:#07161b}figcaption{padding:8px 0}select,button,input{font:inherit}input{flex:1}#note{color:#b6c8c1}</style>
<h1>Phase 05M — forest expansion and visible mobile cherry blossoms</h1><nav><a href="report.md">Full report</a><a href="mobile-audit.md">Original visibility diagnosis</a><a href="measurements/visibility-assertions.json">Actual canopy-pixel checks</a><a href="measurements/performance-summary.json">Frame data</a><a href="production-diff.patch">Exact source change</a></nav>
<p>Actual production screenshots in hardware accelerated Windows Chrome. The camera is unchanged. Daylight shows the existing pink foliage; night retains the approved lavender grading. Live-time fish, clouds, title motion and sway differ between captures.</p>
<div class="row"><label>Viewport / mode / camera <select id="state"></select></label></div><p id="note"></p><div class="pair"><figure><figcaption>Before</figcaption><img id="before"></figure><figure><figcaption>After</figcaption><img id="after"></figure></div>
<h2>Forward / reverse motion</h2><p>Eight live screenshots per direction. Original sway and fixed roots are asserted from every sampled frame. Capture playback is visual evidence; benchmark intervals were measured separately without screenshot capture.</p><div class="row"><select id="size"><option>390x844</option><option>1440x900</option></select><select id="direction"><option>forward</option><option>reverse</option></select><button id="play">Play</button><input id="frame" type="range" min="0" max="7" value="0"></div><img id="motion">
<script>
const items=ITEMS,state=document.querySelector('#state');items.forEach((r,i)=>state.add(new Option(r.label,i)));function update(){const r=items[state.value],before=document.querySelector('#before');before.hidden=!r.before;if(r.before)before.src=r.before;document.querySelector('#after').src=r.after;document.querySelector('#note').textContent=r.counts+' trees. '+(r.before?'Before/after composition; same camera matrices.':'Additional final mode/orientation check; no matched before capture displayed.')}state.onchange=update;update();
const size=document.querySelector('#size'),direction=document.querySelector('#direction'),frame=document.querySelector('#frame'),play=document.querySelector('#play');let timer;function show(){document.querySelector('#motion').src='motion/'+size.value+'-'+direction.value+'-'+frame.value+'.png'}size.onchange=show;direction.onchange=show;frame.oninput=show;play.onclick=()=>{if(timer){clearInterval(timer);timer=null;play.textContent='Play'}else{play.textContent='Pause';timer=setInterval(()=>{frame.value=(+frame.value+1)%8;show()},350)}};show();
</script>'''.replace('ITEMS',json.dumps(items))
(out/'index.html').write_text(html,encoding='utf-8');print('PASS gallery',len(items),'scene states and 32 motion captures')
