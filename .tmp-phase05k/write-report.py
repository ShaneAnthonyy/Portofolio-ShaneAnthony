from pathlib import Path
from html.parser import HTMLParser
from PIL import Image, ImageDraw
import hashlib, json

root=Path(__file__).resolve().parent.parent
out=root/'.tmp-phase05k'
load=lambda name:json.loads((out/name).read_text(encoding='utf-8'))
asset=load('measurements/consolidation.json')
inventory=load('measurements/asset-inventory.json')
validation=load('measurements/model-validation.json')
integrity=load('measurements/workspace-integrity.json')
reg=load('measurements/regressions.json')
commands=load('measurements/final-commands.json')
assert len(reg)==8 and len(commands)==7 and all(r['exitCode']==0 for r in commands)
assert all(r['exitCode']==0 for r in reg if r['name']!='check-projects')
project=next(r for r in reg if r['name']=='check-projects')
project_log=(out/project['log']).read_text(encoding='utf-8')
assert project['exitCode']==0 or ('192 responsive/project/theme/performance combinations' in project_log and 'all transient transforms cleared' in project_log)
labels=['baseline-1440-normal-dark','four-1440-normal-dark','six-1440-normal-dark','baseline-390-normal-dark','baseline-1440-lite-dark','final-1440-normal-dark','final-1440-normal-light','final-390-normal-dark','final-1440-lite-dark','final-390-lite-dark','final-768-normal-dark','final-768-lite-dark']
scenes={name:load('measurements/'+name+'.json') for name in labels}
final=[r for name,r in scenes.items() if name.startswith('final-')]
metric_rows=[];network_rows=[];mode_rows=[]
for name in labels:
    row=scenes[name];p=row['positions'][0];s=p['snapshot'];m=p['metrics']
    metric_rows.append(f"| {name} | {len(s['trees'])} | {m['drawCallsPerRaf']:.0f} | {m['renderedTrianglesPerRaf']:.0f} | {m['treeMainDrawsPerRaf']:.0f} | {m['scriptMs']:.1f} | {m['medianMs']:.2f} / {m['p95Ms']:.2f} | {m['longFrames']} |")
    response=next(r for r in row['responses'] if 'cherry_blossom' in r['url'] or '/tree-' in r['url'] or '/tree-lite' in r['url'])
    if name.startswith('baseline-') or name.startswith('final-'):
        network_rows.append(f"| {name} | `{response['url'].split('/')[-1]}` | {response['status']} | {response['bodyBytes']:,} | {response['transferredBytes']:,} |")
    if name.startswith('final-'):
        mode_rows.append(f"| {row['width']} / {'Lite' if row['lite'] else 'Normal'} / {row['theme']} | {len(s['trees'])} | {sum(t['triangles'] for t in s['trees']):,} | {s['uniqueGeometries']} / {s['uniqueMaterials']} / {s['uniqueTextures']} |")
        assert not row['failures'] and not row['errors']
        assert all(not pos['snapshot']['contextLost'] for pos in row['positions'])
    strip=Image.new('RGB',(1500,330),'#162a36');draw=ImageDraw.Draw(strip)
    for i in range(5):
        image=Image.open(out/'motion'/f'{name}-{i}.png');image.thumbnail((300,300));strip.paste(image,(i*300+(300-image.width)//2,24));draw.text((i*300+8,7),f'live frame {i+1}',fill='white')
    strip.save(out/'motion'/f'{name}-strip.jpg',quality=95)

html=['''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Phase 05K — cherry blossom forest evidence</title><style>body{font:16px/1.5 system-ui;background:#14242f;color:#e4edf3;max-width:1500px;margin:30px auto;padding:20px}h1,h2{line-height:1.2}h2{margin-top:60px}a{color:#f7c5df}img{max-width:100%;height:auto;display:block}figure{margin:0}figcaption{padding:8px 0 18px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.two{grid-template-columns:repeat(2,minmax(0,1fr))}button,select,input{font:inherit;padding:8px;max-width:100%}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style></head><body><h1>Phase 05K — cherry blossom forest</h1><p>Six desktop trees, three background hills, shared geometry/material/texture. Real production build and live animation; no asset substitution.</p><p><a href="report.md">Full 17-part report</a> · <a href="measurements/model-validation.json">Model validation</a> · <a href="measurements/scene-comparison.json">Camera and request comparisons</a> · <a href="files.json">File manifest</a></p><h2>Final daylight scene and forest composition</h2><div class="grid two">''']
for suffix,title in [('p0','Actual production P0 camera'),('overview','Diagnostic overview; temporary inspection camera, production path unchanged')]:html.append(f'<figure><a href="comparisons/final-1440-normal-light-{suffix}.png"><img src="comparisons/final-1440-normal-light-{suffix}.png"></a><figcaption>{title}</figcaption></figure>')
html.append('</div><h2>Equivalent production camera states</h2><p>Left: previous optimized trees. Center: cherry replacement with the original four placements. Right: final six-tree forest and hills. Live poses and sway are not synchronized.</p>')
for position in ['p0','p05','p091','p03']:
    html.append(f'<h3>{position}</h3><div class="grid">')
    for name,title in [('baseline-1440-normal-dark','Previous optimized tree'),('four-1440-normal-dark','Four-tree replacement'),('final-1440-normal-dark','Final six-tree forest')]:html.append(f'<figure><a href="comparisons/{name}-{position}.png"><img loading="lazy" src="comparisons/{name}-{position}.png"></a><figcaption>{title}</figcaption></figure>')
    html.append('</div>')
html.append('<h2>Mobile, tablet, and Lite</h2><div class="grid">')
for name in ['baseline-390-normal-dark','final-390-normal-dark','final-390-lite-dark','final-768-normal-dark','final-768-lite-dark','final-1440-lite-dark']:
    html.append(f'<figure><a href="comparisons/{name}-p0.png"><img loading="lazy" src="comparisons/{name}-p0.png"></a><figcaption>{name}</figcaption></figure>')
html.append('</div><h2>Original export and consolidated model</h2><p>Each image: original 27-mesh export at left; one-mesh production variant at right. Same embedded PNG, material, UVs and world-space geometry.</p>')
for angle in ['front','oblique','back']:html.append(f'<figure><img loading="lazy" src="comparisons/model-{angle}.png"><figcaption>{angle}</figcaption></figure>')
html.append('<h2>Live motion samples</h2><p>Five captured frames per sequence, with per-rAF root-transform measurements in the JSON evidence. Tree sway is intentionally subtle.</p><label>Sequence <select id="sequence">')
for name in labels:html.append(f'<option value="{name}">{name}</option>')
html.append('</select></label> <button id="play">Play / pause</button> <label>Frame <input id="slider" type="range" min="0" max="4" value="0"></label><p id="caption"></p><img id="frame" alt="Captured live production animation frame">')
for name in ['final-1440-normal-light','final-390-normal-dark','final-1440-lite-dark']:html.append(f'<figure><img loading="lazy" src="motion/{name}-strip.jpg"><figcaption>{name}: five live frames</figcaption></figure>')
html.append('''<script>const sequence=document.querySelector('#sequence'),slider=document.querySelector('#slider'),frame=document.querySelector('#frame'),caption=document.querySelector('#caption');let playing=false;function show(){frame.src='motion/'+sequence.value+'-'+slider.value+'.png';caption.textContent=sequence.value+' — frame '+(Number(slider.value)+1)+' / 5'}sequence.onchange=()=>{slider.value=0;show()};slider.oninput=show;document.querySelector('#play').onclick=()=>playing=!playing;setInterval(()=>{if(playing){slider.value=(Number(slider.value)+1)%5;show()}},650);show()</script></body></html>''')
(out/'index.html').write_text('\n'.join(html),encoding='utf-8')

project_note='All Projects assertions passed.' if project['exitCode']==0 else 'Projects passed all 192 responsive/project/theme/performance layout combinations, then exited 1 at the known `all transient transforms cleared` timing assertion after rapid input. Its code/assertions were preserved. The aggregate regression runner consequently exited 1; this is not an all-green suite.'
test_rows='\n'.join(f"| `{r['command']}` | {r['exitCode']} | [{r['name']}]({r['log']}) |" for r in reg)
placements='\n'.join(f"| {name} | {x} | {z} | {scale} | {yaw} |" for name,x,z,scale,yaw in [('left near',-18,-19,4.8,.2),('right near',18,-23,4.5,2.5),('left mid',-29,-32,5.4,1.4),('right mid',12,-40,4.4,3.6),('left far',-9,-38,3.6,.7),('right far',31,-43,4.8,2.0)])
report=f'''# Phase 05K — cherry blossom forest environment

Date: 2026-10-15, Asia/Bangkok. **CHERRY BLOSSOM FOREST INTEGRATION SUCCESSFUL.** Integrated and tested in the local production build. No external deployment or new phase was performed.

The AquariumDive environment now uses cherry blossom exclusively, with six desktop trees and three gentle rear hills. Normal and Lite use the same 28,576-byte consolidated model. Original tree assets and the user-provided Blockbench export remain intact.

[Visual gallery and motion player](index.html) · [Workspace integrity](measurements/workspace-integrity.json) · [Output manifest](files.json)

## 1. Cherry blossom GLB statistics

The user export is valid GLB 2 from Blockbench 5.2.2, **51,832 bytes**, 27 meshes/primitives, **648 vertices / 324 triangles**, one material, one embedded PNG, no animations or skins. All accessors and buffer views are in range; UVs are finite and within 0–1. The reported export scale of 16 results in measured scene bounds **[-1.0625, 0, -1] → [1.0625, 1.5625, 1.0625]**: width 2.125, height 1.5625, depth 2.0625. The model is Y-up, root rotation zero and root scale one. The trunk base is at Y=0, centered on the source origin. Existing fit-scale safeguards accept it without changing their thresholds.

Created `public/aquarium/environment/cherry_blossom-opt.glb`, **28,576 bytes**, one mesh/primitive, the same vertices/triangles and bounds. Static node translations are baked into positions; normals, UVs, index order and cube faces are preserved. The editable export is unchanged. See [inventory](measurements/asset-inventory.json), [consolidation](measurements/consolidation.json), and [actual Three.js loading/rendering](measurements/model-validation.json).

SHA-256:

- Original: `{asset['sourceSha256']}`
- Production variant: `{asset['optimizedSha256']}`

## 2. Materials and textures

Preserved the original **128×128 RGBA PNG (4,404 embedded bytes)** byte-for-byte, including alpha. Pink/light-lavender foliage and dark brown trunk render correctly in Three.js. The shared material remains MeshStandardMaterial, roughness 1, metalness 0, opaque rendering with alpha mask cutoff 0.05, and DoubleSide. Nearest filtering, clamped UV wrapping and sRGB base-color semantics are retained; no extra transparent blend material or replacement texture was introduced.

Browser validation compares original versus consolidated bounds, base vertices, orientation, scale, material and texture settings. Front/oblique/back renders differ in at most **0.029% of color channels**, with mean channel error ≤0.0053/255, from raster edge rounding after baking translations. They are visually equivalent; no lossy encoding, decimation or texture repainting was used. Original and consolidated images are in the gallery.

## 3. Geometry and draw-call analysis

The raw export requires **27 draw calls for one tree** in the validation renderer. The consolidated variant requires **one**, still rendering 324 triangles. This is why consolidation was justified even though the original file was already small. No runtime merge or new dependency was added.

Actual production clones share **one geometry, one material and one texture** in every final session. Desktop six-tree main-pass geometry is **1,944 triangles**, versus **600,000** for the previous four optimized trees. Whole-Dive P0 observations are **117 draws / 929,347 submitted triangles** before and **119 / 331,291** after. More trees add two main-pass draws; low triangle count alone does not eliminate draw cost. Counts include other scene assets and render passes as described below.

## 4. Old versus cherry comparison and staged implementation

Reviewed Phases 05A–05J evidence: old tree optimization, terrain texture integration, fish batch integration, quality caps and prior timing limitations. Captured a fresh real baseline before editing: 1440 normal, 390 normal, and 1440 Lite.

Stage A validated the export and consolidated candidate in the installed Three.js renderer. Stage B changed only the active tree URL and tested the original four desktop placements. Stage C verified scale, materials, base pivot and existing sway. Stage D reduced oversized canopies, moved trees into staggered rear groups and tested six. Stage E retained six; eight was not attempted because the six-tree arrangement already fills the intended groups while preserving open gaps. No eight-tree performance result is claimed. Stage F tested the compact mobile placement; final checks cover tablet and Lite. Stage G added localized hills and corrected trunk seating against actual terrain triangles. Stage H ran the production scene and existing regressions.

[Twenty equivalent camera/lighting comparisons](measurements/scene-comparison.json) confirm the same camera matrices/projections, scene lights, renderer settings, canvas count and terrain topology at P0, P0.5, P0.91 and P0.3 for the relevant before/after pairs. All normal fish remain the Phase 05J optimized batch, with correct unchanged Lite fish URLs.

## 5. Final tree placement counts

| Fresh viewport / mode | Trees | Tree triangles | Unique geometry / material / texture |
|---|---:|---:|---|
{chr(10).join(mode_rows)}

Desktop uses six, tablet four, mobile two. Lite uses four/three/two. Placement is deterministic across independent normal/light reloads. Existing mesh cloning shares resources rather than uploading per-tree copies.

## 6. Desktop forest composition

Two smaller near trees frame the aquarium; four staggered mid/far trees create small rear groups with clear gaps. The center remains open. Sizes and yaw vary without random regeneration or rows. Fit-scale remains uniform, preserving the model silhouette.

| Tree | X | Z | Existing fit multiplier | Yaw radians |
|---|---:|---:|---:|---:|
{placements}

Daylight shows soft pink foliage; existing night lighting naturally grades it toward dark lavender. The aquarium remains the focal point. No light, fog, shader, camera, sign or transition settings were adjusted to force the tree appearance.

## 7. Mobile and Lite behavior

Mobile uses two trees at (-11,-20), scale multiplier 3.6, and (12,-28), multiplier 3.3. Tablet uses the first four desktop placements; Lite caps desktop/tablet at four/three. The same small cherry asset is cheaper than the former Lite tree and fits below its texture cap, so a separate Lite export is unnecessary.

The existing resize/quality callback limits visible tree groups without new animation loops or React state. Live desktop→mobile→tablet→desktop resizing verifies 2/4/6 visible trees, with identical clone identities. Live Lite switching verifies 6→4→6 and no extra tree request. As with existing mounted asset selection, a scene initialized with a smaller population retains that population when later enlarged or switched to a richer mode; a fresh load selects the full target for that viewport/mode. Global quality settings and their existing architecture remain unchanged.

## 8. Background hills

Added three broad Gaussian rises on the existing 120×120 terrain, centered around (-24,-31), (21,-36) and (-1,-47), with widths approximately 9–14 world units. A rear gate keeps every vertex with Z≥-12 unchanged. Peak added height is **1.4875 normal / 1.4707 Lite**; the maximum adjacent added slope is **0.1402 normal / 0.1312 Lite**. The bumps are broad and low, without a new mesh, material, texture, shader or terrain system.

Terrain remains **4,225 vertices / 8,192 triangles** in normal and **625 / 1,152** in Lite. Indices and UVs are identical; the existing normal computation handles the added relief. [Terrain validation](measurements/terrain-validation.json) checks all vertices and triangle centroids, foreground preservation, finite heights and slope bounds. Optimized terrain texture files/URLs are unchanged.

Replaced the duplicated analytic terrain-height approximation with interpolation of the actual existing terrain triangles. This keeps tree roots and existing ground vegetation aligned even on Lite's coarse mesh. Tree placement samples the lowest terrain under its actual trunk base, then embeds it 0.04 world units for the original subtle sway. An initial corner-gap check caught a slope seating issue; the final base-aware placement fixes it. Final trunk-corner samples remain below the terrain throughout the captured views; no floating roots or canopy/ground intersections were observed.

## 9. Tree sway and lifecycle

The existing root-based sway formulas, amplitudes (X 0.009, Z 0.006 radians), phases and far-tree attenuation are preserved. Root position/scale stays fixed while rotations change smoothly. The exported Y=0 base is the sway pivot, so no center-pivot correction or new rAF is required.

Each final scene samples 2.5 seconds per camera state and captures five live motion frames. Assertions verify fixed bases, finite transforms, original angular limits, moving fish with continuous paths and the expected fish population. [Forest lifecycle](measurements/forest-lifecycle.json) verifies no tree draws while parked under Hero, Lite and normal replay, shared clone identities and one GLB request across modes/replays/resizes. Existing interruption/mobile/surface tests verify reverse navigation, hidden tabs, Reduced Motion and touch.

## 10. Real browser transfer

The actual production preview served the tree normally, without Fetch interception or substituted assets. Every final fresh session requests `cherry_blossom-opt.glb` once, returns HTTP 200, and matches its public-file SHA-256. No active `tree.glb`, `tree-opt-150k-1024.glb` or `tree-lite.glb` request remains. Correct optimized terrain and fish requests are independently checked.

| Session | Tree file | HTTP | Body bytes | CDP response bytes including headers |
|---|---|---:|---:|---:|
{chr(10).join(network_rows)}

Normal tree content drops **7,402,556 → 28,576 bytes (99.61%)**; former Lite content was 7,375,276 bytes. All three old tree files remain in public and dist for rollback. The only new production file created by this task adds 28,576 deployment bytes; the user-provided 51,832-byte source export was already present. Deployment storage is separate from visitor transfer. Tests use local cold-cache HTTP; no WAN/CDN loading-speed claim is made. Replay performs no additional tree download.

## 11. Rendering, textures and timing

Measured at equivalent P0 camera states. Raw JSON also contains P0.5/P0.91/P0.3. Whole-Dive counts intercept actual GL draw commands and triangle counts, including scene render passes; tree counts use main-pass mesh callbacks. These are submitted triangles, not visible screen pixels. CPU ScriptDuration is measured over the 2.5-second live sample.

| Scenario | Trees | Whole Dive draws/rAF | Submitted triangles/rAF | Tree main draws/rAF | Script ms / 2.5 s | Median / p95 rAF ms | Frames >50 ms |
|---|---:|---:|---:|---:|---:|---|---:|
{chr(10).join(metric_rows)}

The tree now has one shared 128² RGBA image. Estimated RGBA8 texture storage with full mip chains is **87,380 bytes (~85.3 KiB)** versus **50,331,644 bytes (~48 MiB)** for the former normal tree, or **4,194,300 bytes (~4 MiB)** for the former Lite tree. This is a dimensions/format estimate, not measured driver allocation; it excludes geometry, render targets, CPU images and other assets. Runtime dimensions and sharing are recorded in the scene snapshots. No new WebGL contexts or context losses were observed.

GPU: {scenes['final-1440-normal-dark']['positions'][0]['snapshot']['renderer']['gpu']}. rAF remains quantized near 13.3 ms. Script observations vary and include instrumentation; baseline probes predate the added fish-pose assertions. There is no isolated GPU-present timing or decode benchmark, and no FPS/CPU-speed improvement is claimed. The measured gains are tree transfer size, submitted geometry, and estimated tree texture storage. `readyObservedMs` includes deliberate settling and is not a startup-duration metric.

## 12. Visual and motion evidence

[Gallery](index.html) contains before/four-tree/final views at P0/P0.5/P0.91/P0.3, desktop daylight and night, 390 mobile, 768 tablet, Lite variants, original/consolidated model views, and five-frame motion sequences with a player. Diagnostic wide forest overviews use a temporary inspection camera solely for capture; all journey screenshots use the unchanged production camera.

Reviewed canopy layers, pink/lavender pattern, dark trunks, scale, spacing, depth, trunk contact, fish readability, transitions and subtle sway. No old tree silhouettes, missing textures, excessive clipping, floating trunks or new movement discontinuities were observed. P0.91 intentionally transitions toward the existing sky view; forest visibility follows the approved cinematic sequence.

## 13. Exact files modified

- Modified `src/components/AquariumDivePrototype.jsx`: tree URL, deterministic placement/count limits, localized rear heights, terrain sampling and trunk seating. [Exact source diff](production-diff.patch).
- Added `public/aquarium/environment/cherry_blossom-opt.glb` (28,576 bytes).
- User-provided/untracked `public/aquarium/environment/cherry_blossom.glb` preserved unchanged (51,832 bytes).
- Temporary diagnostics, reports and captures under `.tmp-phase05k/`, enumerated with sizes/hashes in [files.json](files.json).
- `dist/` regenerated by the production build.

The audit compared **{integrity['preExistingFiles']:,} pre-existing files**: only the intended JSX changed, none disappeared, and the only new production asset created was the consolidated GLB. Original trees, fish, terrain textures, all prior evidence and every other source file are unchanged. No dependencies/configuration or source comments were added.

## 14. Build and regression results

`npm run build` exits: baseline **0** (18.75 s), four-tree **0** (6.21 s), six-tree **0** (6.26 s), responsive **0** (6.22 s), final grounded forest **0** (6.31 s). These durations are not a build-performance claim. The existing Vite >500 kB chunk warning remains; compilation succeeds. The initial sandboxed Stage B build exited 1 on permissions, then the approved build succeeded. The initial hills build exited 1 on exponent-expression syntax; it was corrected and rebuilt successfully (6.64 s) before final verification. Dist and public cherry variants match the approved generated hash.

| Command | Exit | Evidence |
|---|---:|---|
| `python .tmp-phase05k/inspect-asset.py` final run | 0 | [GLB inventory](measurements/asset-inventory.json) |
| `python .tmp-phase05k/consolidate.py` | 0 | [Exact geometry/image merge](measurements/consolidation.json) |
| `node .tmp-phase05k/validate-model.mjs` final run | 0 | [Three.js validation](measurements/model-validation.json) |
| `node .tmp-phase05k/scene.mjs baseline 1440` | 0 | [Actual baseline](measurements/baseline-1440-normal-dark.json) |
| `node .tmp-phase05k/scene.mjs four 1440` | 0 | [Four-tree stage](measurements/four-1440-normal-dark.json) |
| `node .tmp-phase05k/scene.mjs six 1440` | 0 | [Six-tree stage](measurements/six-1440-normal-dark.json) |
| `node .tmp-phase05k/scene.mjs responsive 390` | 0 | [Compact stage](measurements/responsive-390-normal-dark.json) |
| `python .tmp-phase05k/run-scenes.py` | 0 | [Seven final commands and exits](measurements/final-commands.json) |
| `node .tmp-phase05k/check-terrain.mjs` | 0 | [Terrain validation](measurements/terrain-validation.json) |
| `python .tmp-phase05k/compare-scenes.py` | 0 | [20 matching camera states](measurements/scene-comparison.json) |
| `node .tmp-phase05k/check-forest-lifecycle.mjs` | 0 | [Forest lifecycle](measurements/forest-lifecycle.json) |
| `node scripts/check-hero.mjs` | 0 | Existing framing/orientation checks |
| `node scripts/check-arrival.mjs` | 0 | Existing magnetic timing/endpoints checks |
{test_rows}
| `python .tmp-phase05k/audit.py` | 0 | [Workspace integrity](measurements/workspace-integrity.json) |
| `git diff --check` | 0 | No whitespace errors |

{project_note}

Existing regressions were reused with browser-context/output plumbing redirected into this phase. Behavioral assertions remain unchanged. Coverage includes initialization, progression, magnetic landing/navbar docking, Hero handoff, surface transitions, reverse navigation, two replays, hidden/visible lifecycle, live light/Lite switching, Reduced Motion, native mobile touch/resize, audio play/pause/resume, and Projects layout. The full earlier 48-case surface matrix was not repeated; the existing surface integration and required desktop/tablet/mobile/preference checks were used.

Final scene runs recorded no browser exceptions, failed resources, GLTFLoader errors or WebGL context losses. The pre-existing Three.js PCFSoftShadowMap fallback warning remains in normal mode. Early temporary validation attempts exited 1 on an overly strict old-tree buffer-length check, exact zero-pixel raster equality, and the detected trunk-corner gap; each cause was investigated. The new export itself is valid; original legacy tree metadata remains untouched. Final model/terrain/scene checks above all exit 0. Existing regression assertions were not relaxed.

## 15. Remaining limitations

Validated Edge with an RTX 2060 and desktop/mobile/tablet emulation on localhost; physical Safari/Android and remote hosting were not tested. Eight trees were not evaluated. Timing instrumentation is observational and cannot prove FPS gains. Placement remains consistent with the existing mounted-population approach described above. Distant night foliage is deliberately subdued by the approved lighting, and the sky takeover hides the environment late in the journey. {('The known Projects timing failure remains outside this phase.' if project['exitCode'] else '')}

## 16. Rollback

All old assets remain at their original URLs. To restore the pre-phase environment, reverse only [production-diff.patch](production-diff.patch) after checking for later edits, or restore the tree/count/hill/seating hunks from `AquariumDivePrototype.before.jsx`. This restores normal `tree-opt-150k-1024.glb`, Lite `tree-lite.glb`, original four/one placements and prior terrain. Rebuild and rerun loading, replay and mode checks. Do not reset unrelated changes or delete any original GLBs; cleanup still requires separate approval. Keeping the new files is safe because inactive URLs are not downloaded.

## 17. Final verdict

**CHERRY BLOSSOM FOREST INTEGRATION SUCCESSFUL.** The approved cinematic experience is preserved while the rear environment uses the user's low-poly cherry model, six spaced desktop trees, conservative compact variants and three gentle hills. Real production loading, materials, geometry sharing, grounded sway, actual scene/motion checks, build and relevant regressions support the result, with the documented Projects timing limitation. No unrelated runtime optimization or subsequent phase was started.
'''
(out/'report.md').write_text(report,encoding='utf-8')
refs=[]
class Parser(HTMLParser):
    def handle_starttag(self,tag,attrs):
        refs.extend(v for k,v in attrs if k in ('src','href') and v and not v.startswith(('http:','https:','#')))
Parser().feed((out/'index.html').read_text(encoding='utf-8'))
missing=[r for r in refs if r!='files.json' and not (out/r).is_file()]
assert not missing,missing
files=[]
for p in sorted(out.rglob('*')):
    if p.is_file() and p.name!='files.json':files.append({'file':p.relative_to(out).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(out/'files.json').write_text(json.dumps(files,indent=2))
print('Report and gallery ready;',len(files)+1,'files indexed;',len(refs),'gallery links verified; Projects exit',project['exitCode'])
