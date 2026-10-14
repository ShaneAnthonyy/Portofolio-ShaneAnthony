from pathlib import Path
from PIL import Image,ImageDraw
import hashlib,json,subprocess

root=Path(__file__).resolve().parent.parent
out=root/'.tmp-phase05j'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
manifest=read(out/'measurements/integration-manifest.json')
inventory=read(root/'.tmp-phase05i/measurements/inventory.json')['models']
baseline=read(out/'measurements/scene-baseline.json')['results'][0]
prod=read(out/'measurements/scene-production.json')['results']
reg=read(out/'measurements/regressions.json')
comparisons=read(out/'measurements/reference-comparison.json')
assert len(prod)==6 and len(reg)==8
assert all(not r['unexpectedErrors'] and not r['failures'] and not r['contextLost'] for r in prod)
assert all(r['exitCode']==0 for r in reg if r['name']!='check-projects')
project=next(r for r in reg if r['name']=='check-projects')
projectlog=(out/project['log']).read_text(encoding='utf-8')
if project['exitCode']:assert '192 responsive/project/theme/performance combinations' in projectlog,'Review the Projects failure before deciding success'
before=read(out/'workspace-before.json')
changed=[];missing=[]
for rel,record in before.items():
    p=root/rel
    if not p.exists():missing.append(rel)
    elif hashlib.sha256(p.read_bytes()).hexdigest()!=record['sha256']:changed.append(rel)
assert changed==['src/components/AquariumDivePrototype.jsx'] and not missing,(changed,missing)
added=[]
for p in root.rglob('*'):
    if not p.is_file() or any(x in ('.git','node_modules','dist','.tmp-phase05j') for x in p.relative_to(root).parts):continue
    rel=p.relative_to(root).as_posix()
    if rel not in before:added.append(rel)
assert set(added)=={r['production'] for r in manifest},added
(out/'measurements/workspace-integrity.json').write_text(json.dumps({'preExistingFiles':len(before),'modified':changed,'missing':missing,'addedProductionFiles':added,'priorEvidenceAndAllOtherFilesUnchanged':True,'preExistingDeletionPreserved':'src/assets/project-banners/devpath/.gitkeep'},indent=2))
original=sum(r['bytes'] for r in inventory);optimized=sum(r['bytes'] for r in manifest);cold=prod[0];warm=prod[1]
assert cold['transfer']['bodyBytes']==optimized==17150076 and baseline['transfer']['bodyBytes']==original==26029508
size_rows=[];hash_rows=[];network_rows=[];metrics_rows=[];mode_rows=[]
for r in manifest:
    old=next(x for x in inventory if x['name']==r['model'])
    b=next(x for x in baseline['responses'] if x['url'].endswith(r['originalUrl']))
    c=next(x for x in cold['responses'] if x['url'].endswith(r['optimizedUrl']))
    w=next(x for x in warm['responses'] if x['url'].endswith(r['optimizedUrl']))
    size_rows.append(f"| {r['model']} | {r['variant']} | {old['bytes']:,} | {r['bytes']:,} | {100*(1-r['bytes']/old['bytes']):.2f}% |")
    hash_rows.append(f"| `{r['production']}` | `{r['sha256']}` |")
    network_rows.append(f"| `{r['optimizedUrl']}` | {c['status']} | {b['finish']['encodedDataLength']:,} | {c['finish']['encodedDataLength']:,} | {w['finish']['encodedDataLength']:,} | {w['extra']['statusCode']} |")
for r in [baseline,*prod]:
    m=r['metrics'];metrics_rows.append(f"| {r['label']} | {m['frames']} | {m['medianMs']:.2f} | {m['p95Ms']:.2f} | {m['scriptMs']:.1f} | {','.join(map(str,m['observedDrawsPerRaf']))} | {','.join(map(str,m['observedFishMainDrawsPerRaf']))} |")
    mode_rows.append(f"| {r['label']} | {len(r['requests'])} | {r['transfer']['bodyBytes']:,} | {r['transfer']['cdpEncodedBytes']:,} | {len(r['errors'])} | {len(r['contextLost'])} |")
for r in [baseline,*prod]:
    label=r['label'];mobile=r['width']<720
    strip=Image.new('RGB',(1440,1000 if mobile else 720),'#142e36');d=ImageDraw.Draw(strip)
    for i in range(6):
        im=Image.open(out/'motion'/f'{label}-{i}.png')
        if not mobile:im=im.crop((310,160,1070,700))
        im.thumbnail((480,470 if mobile else 340));x=(i%3)*480;y=(i//3)*(500 if mobile else 360);strip.paste(im,(x,y+22));d.text((x+8,y+5),f'{label} live frame {i+1}',fill='white')
    strip.save(out/'motion'/f'{label}-strip.jpg',quality=95)
html=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phase 05J production verification</title><style>body{background:#10292e;color:#edf8f4;font:16px system-ui;max-width:1440px;margin:30px auto;padding:20px}img{max-width:100%;height:auto}figure{margin:20px 0}a{color:#8fe0cb}button,select{font:inherit;padding:8px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}figcaption{padding:8px}h2{margin-top:50px}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style><h1>Phase 05J — integrated fish batch</h1><p>Real production URLs; no asset interception. Left: original baseline. Center: approved Phase 05I prototype. Right: integrated production. Live fish poses and effects are not synchronized.</p><p><a href="report.md">Full report</a> · <a href="measurements/scene-production.json">Network and motion evidence</a> · <a href="files.json">Output manifest</a></p>']
for pos in ['p0','p05','p091','fish-heavy']:
    html.append(f'<h2>{pos}</h2><div class="grid">')
    for label,path in [('Original',f'comparisons/baseline-desktop-cold-{pos}.png'),('Approved 05I',f'../.tmp-phase05i/comparisons/matched-desktop-q95-{pos}.png'),('Integrated',f'comparisons/desktop-cold-{pos}.png')]:html.append(f'<figure><a href="{path}"><img loading="lazy" src="{path}"></a><figcaption>{label}</figcaption></figure>')
    html.append('</div>')
html.append('<h2>All seven models in the actual scene</h2><p>Nearest-neighbor enlarged crops: approved Phase 05I / integrated production. The live poses differ.</p><img loading="lazy" src="comparisons/seven-model-detail.png"><h2>Mobile comparison</h2><div class="grid">')
for label,path in [('Approved mobile','../.tmp-phase05i/comparisons/mobile-selected-fish-heavy.png'),('Integrated mobile','comparisons/mobile-normal-fish-heavy.png'),('Integrated Lite','comparisons/mobile-lite-fish-heavy.png')]:html.append(f'<figure><img loading="lazy" src="{path}"><figcaption>{label}</figcaption></figure>')
html.append('</div><h2>Live motion</h2><p>Six captured frames per sequence, with continuous per-rAF transforms in the JSON. This player is a frame sequence, not encoded video.</p><select id="sequence">'+''.join(f'<option>{r["label"]}</option>' for r in [baseline,*prod])+'</select> <button id="play">Play / pause</button><figure><img id="frame" style="max-height:750px"><figcaption id="label"></figcaption></figure>')
for r in [baseline,*prod]:html.append(f'<details><summary>{r["label"]} motion strip</summary><img loading="lazy" src="motion/{r["label"]}-strip.jpg"></details>')
html.append('<h2>Handoff, replay and preferences</h2><div class="grid">')
for r in prod:
    for pos in ['fish-heavy']+(['landed','replay'] if r.get('replay') else []):html.append(f'<figure><img loading="lazy" src="comparisons/{r["label"]}-{pos}.png"><figcaption>{r["label"]}: {pos}</figcaption></figure>')
html.append('</div><script>let index=0,playing=false;const seq=document.querySelector("#sequence"),frame=document.querySelector("#frame"),label=document.querySelector("#label");function show(){frame.src="motion/"+seq.value+"-"+index+".png";label.textContent=seq.value+" frame "+(index+1)+" / 6"}seq.onchange=()=>{index=0;show()};document.querySelector("#play").onclick=()=>playing=!playing;setInterval(()=>{if(playing){index=(index+1)%6;show()}},650);show();</script></html>')
(out/'index.html').write_text('\n'.join(html),encoding='utf-8')
project_note=('Passed all existing assertions.' if project['exitCode']==0 else 'The existing script passed all 192 responsive/project/theme/performance geometry combinations, then failed the `all transient transforms cleared` assertion after the rapid-input sequence (check-projects.mjs:59). The exact failure is retained in logs/check-projects.log. The previously documented Projects timing issue was explicitly excluded by the Phase 05J brief; neither Projects code nor its assertions were changed. The aggregate `python .tmp-phase05j/run-regressions.py` command therefore exited 1; this is not an all-green regression suite.')
test_rows='\n'.join(f"| `{r['command']}` | {r['exitCode']} | [{r['name']} log]({r['log']}) |" for r in reg)
report=f'''# Phase 05J — optimized fish production integration

Date: 2026-10-14, Asia/Bangkok. **INTEGRATION SUCCESSFUL.** All seven approved candidates are integrated into the local production build. No deployment/publishing step was requested or performed. Phase 05K was not started.

Real cold browser fish content: **{original:,} → {optimized:,} bytes**, saving **{original-optimized:,} bytes ({100*(1-optimized/original):.2f}%)**. Geometry, materials, animation code and Lite selection are preserved.

[Visual comparisons and motion player](index.html) · [Real production network/motion data](measurements/scene-production.json) · [File manifest](files.json)

## 1. Exact files changed

Modified only `src/components/AquariumDivePrototype.jsx`: one `fishSuffix` constant and seven model URL references. The new suffix is `-opt` in normal mode and empty in Lite. No movement, material, camera, lighting, quality, lifecycle or GSAP code changed. Original filenames remain unchanged.

Added seven files under `public/aquarium/`: `fish_a-opt.glb`, `fish_b-opt.glb`, `fish_c-opt.glb`, `butterfly_koi_a-opt.glb`, `butterfly_koi_b-opt.glb`, `shrimp_a-opt.glb`, `shrimp_b-opt.glb`.

All other new files are temporary diagnostics/evidence under `.tmp-phase05j/`; [files.json](files.json) lists exact paths, lengths and hashes. Existing deletion `src/assets/project-banners/devpath/.gitkeep` was preserved. The final integrity check compared {len(before):,} pre-existing files: only the intended JSX changed; no missing files, no prior evidence edits, exactly seven new production assets. `dist/` was regenerated by the build. See [workspace-integrity.json](measurements/workspace-integrity.json).

## 2. Approved candidate hashes

Each source candidate was verified before any production edit. Production and dist copies then matched the same SHA-256; real browser response bodies also matched the public copies. No conversion/recompression/re-export was performed. See [asset-integrity.json](measurements/asset-integrity.json).

| Production asset | SHA-256, equal to Phase 05I candidate |
|---|---|
{chr(10).join(hash_rows)}

## 3. Original and optimized references

Normal URLs change from `/aquarium/<model>.glb` to `/aquarium/<model>-opt.glb` for these seven names. fish_a/b/c use the approved q95 variants; the others use approved lossless candidates with their original JPEG base colors. [Integration manifest](measurements/integration-manifest.json) records every exact old/new URL and candidate path.

| Model | Selected candidate | Original content bytes | Optimized content bytes | Reduction |
|---|---|---:|---:|---:|
{chr(10).join(size_rows)}

## 4. Actual browser loading

Ran Vite's production build and actual preview at `http://127.0.0.1:4173/`, using isolated Edge CDP contexts. No Fetch interception/substitution, blocked URLs, production query flags or loader patches. Every optimized model returns HTTP 200 on cold normal loading, once per fresh desktop session. No original normal-mode fish URLs appear in that path. Mobile keeps its existing five-model composition and does not request koi_b/shrimp_b. Replay reuses the resident models without new fish requests.

The successful scene checks prove the meshes are present (not silent optional-loader fallbacks), their maps are decoded, and the real production shaders/materials render them. Full requests, HTTP headers, finish events, cache responses, timing entries and served-body hashes are in [scene-production.json](measurements/scene-production.json). The original baseline was built and measured before integration: [scene-baseline.json](measurements/scene-baseline.json).

## 5. Real transfer comparison and deployment overhead

The original cold session received {baseline['transfer']['bodyBytes']:,} body bytes and CDP recorded {baseline['transfer']['cdpEncodedBytes']:,} response bytes including headers. Integrated cold: {cold['transfer']['bodyBytes']:,} body bytes and {cold['transfer']['cdpEncodedBytes']:,} CDP bytes. Body savings are **8,879,432 bytes / 34.11%**. Resource Timing reports {cold['transfer']['resourceTransferBytes']:,} transfer bytes using its standardized header allowance; it is a separate metric from CDP's encoded response count.

| Integrated URL | Cold HTTP | Original cold CDP bytes | Integrated cold CDP bytes | Warm CDP bytes | Warm HTTP revalidation |
|---|---:|---:|---:|---:|---:|
{chr(10).join(network_rows)}

Warm session total CDP response bytes: **{warm['transfer']['cdpEncodedBytes']:,}**; Resource Timing transfer: **{warm['transfer']['resourceTransferBytes']:,}**. Four fish responses were HTTP 304 revalidations; three returned HTTP 200 and retransferred their bodies. The loader still receives the full {warm['transfer']['bodyBytes']:,}-byte batch from a mix of reused and downloaded content. Preview uses ETag/Last-Modified revalidation rather than long-lived immutable caching. This is a measured partially warm visit, not an assumed zero-byte repeat visit; the cache retention/eviction cause was not isolated. Cold sessions clear the browser cache; warm is a subsequent navigation in the same isolated context. OS disk caches and localhost are not a real WAN benchmark.

Keeping rollback originals means deployment contains {original+optimized:,} bytes for these fourteen normal-path GLBs: {original:,} original + {optimized:,} optimized. The integration adds {optimized:,} bytes to deployment storage; retained originals are {original:,} bytes of overhead relative to shipping only the optimized batch. Visitor requests do not download every file in public/dist. No cleanup was performed.

## 6. Loader and embedded WebP compatibility

Installed Three.js 0.186.1 GLTFLoader supports `EXT_texture_webp`. Approved candidates retain valid embedded image references and declare that extension in used/required lists. Production copies and HTTP bodies match the previously loader-validated candidates exactly. Real production scene tests successfully decode all normal/baseColor/metallicRoughness maps and render every model; no missing WebP, unsupported-extension or GLTFLoader failures occurred. No loader changes were needed.

## 7. Desktop/mobile visual verification

Captured actual integrated P0, P0.5, P0.91 and fish-heavy P0.3 at 1440×900 and 390×844 CSS pixels. Compared with original baseline and approved Phase 05I images. [Reference comparisons](measurements/reference-comparison.json) verify identical desktop camera matrices, lights, renderer settings, model population, geometry, material properties and scale at the four settled positions. Fish poses and animated water/environment details remain time-driven and unsynchronized; strict screenshot pixel equality is inappropriate.

Inspected all seven models in the desktop scene and five-model mobile composition, including characteristic body markings, dark fish scale detail, koi tail/fin gaps, shrimp antennae, roughness and normal response. No new halos, missing textures, silhouette changes, coloration changes or incorrect placement/scale were observed. Materials remain opaque/double-sided as approved; all original image alpha samples were opaque and candidates are unchanged from Phase 05I. Mobile retains existing compact framing and normal rendering DPR cap 1.5. Browser screenshots are emulation, not physical-device tests.

## 8. Motion and lifecycle

Each scene run samples four seconds of live per-rAF root positions/rotations/scales and captures six additional swimming frames; [gallery](index.html) includes frame strips and playback. All expected fish/shrimp move with finite transforms and unchanged scale. The original 0.08-world-unit per-sampled-frame displacement assertion passes; angular/position-step summaries are recorded. No visually apparent jumps, fin flicker or discontinuities were observed. The non-image geometry bytes and movement source are unchanged, preserving rigid transforms and existing clone semantics.

Normal dive/reverse progression, magnetic cancellation/resume, handoff, parked renderers, hidden/visible lifecycle, surface transition reverse scroll and Dive Again were exercised using existing regressions. All fish-specific cold/mobile/replay checks pass. No rAF or animation formula changes.

## 9. Lite Mode

Fresh Lite sessions request original `/aquarium/lite/fish_a.glb`, `fish_b.glb`, `fish_c.glb`; no `-opt.glb` or original normal-path fish_a/b/c are requested. As documented in Phase 05I, Lite already shares original normal-path koi/shrimp. Those URLs remain unchanged: both pairs on desktop, only *_a on mobile. This preserves counts, model choices, texture caps and existing `fishTickEvery: 2` throttling. No quality architecture change or extra normal-mode loads was introduced.

| Session | Fish requests | Content bytes available to loader | CDP transferred response bytes | Browser errors | Context loss |
|---|---:|---:|---:|---:|---:|
{chr(10).join(mode_rows)}

## 10. Geometry/material integrity

All seven GLB copies match approved hashes. Non-image buffer views, indices, vertex attributes/UVs, meshes, transforms, pivots, node/scenes, material assignments and settings, samplers and clone data are unchanged. Structural checks compare these against the originals, and runtime snapshots compare scale/material/geometry with approved Phase 05I. Desktop remains **174,561 fish triangles / seven models**; mobile remains **116,946 / five models**. Normal and Lite original assets were neither overwritten nor deleted.

## 11. Textures, GPU memory and performance limits

Twenty-one unique images for the seven-model batch. Fish and koi retain three 1024² images each; shrimp retain 512² normal/MR and 1024² baseColor. Roughness and metalness still share an image. Color maps retain sRGB, numerical maps retain linear-data semantics. Estimated uncompressed RGBA8 GPU texture storage with full mip chains remains **100,663,268 bytes (~96 MiB)** for the complete batch; this is not a driver measurement and excludes render targets, geometry, decoded CPU images and other scene assets. Mobile loads fewer models; Lite has its existing cap. WebP download encoding does not lower GPU memory or geometry/draw counts.

| Scenario | rAF samples / 4 s | Median ms | p95 ms | Main-thread Script ms | Whole Dive draws / sampled rAF | Fish main draws / rAF |
|---|---:|---:|---:|---:|---|---|
{chr(10).join(metrics_rows)}

Renderer: {cold['positions'][0]['state']['renderer']['gpu']}. Timings are instrumented browser/main-thread observations, not GPU-present frame timings or proof of FPS change. rAF is quantized near display cadence, and script/p95 observations vary between runs. No FPS, decode-speed or GPU-memory improvement is claimed. Resource timing includes HTTP transfer, not isolated GLB parsing/image decode; a separate reliable decode benchmark was not measurable without deeper runtime instrumentation. `readyObservedMs` also includes intentional settling and must not be interpreted as page load duration. The demonstrated benefit is fewer real transferred bytes, with equal scene geometry/draw counts and retained appearance/motion.

## 12. Build and diff checks

Before integration: `npm run build` exit 0, 45.16 s. After integration: `npm run build` exit 0, 18.00 s. The difference is not a build-speed optimization claim. Vite's existing >500 kB chunk warning remains; compilation succeeded. All seven `dist/aquarium/*-opt.glb` files have approved hashes, and browser requests prove the compiled application uses them. `git diff --check` exit 0. No dependencies/configuration changed.

## 13. Regression commands and exit codes

Existing diagnostic scripts were reused in `.tmp-phase05j/`, changing only browser-session/output plumbing so prior evidence stays intact. Existing behavioral assertions were retained. Projects bootstrapping uses the same isolated helper before its unchanged checks. Hero/arrival pure checks also ran unchanged from `scripts/` and exited 0.

| Command | Exit | Evidence |
|---|---:|---|
| `python .tmp-phase05j/verify-assets.py` | 0 | [Asset integrity](measurements/asset-integrity.json) |
| `node .tmp-phase05j/scene-production.mjs baseline` | 0 | [Baseline log](logs/baseline.log) |
| `node .tmp-phase05j/scene-production.mjs production` | 0 | [Production log](logs/production.log) |
| `python .tmp-phase05j/compare-scenes.py` | 0 | [Reference comparison](measurements/reference-comparison.json) |
| `node scripts/check-hero.mjs` | 0 | Hero paths/framing/orientation passed |
| `node scripts/check-arrival.mjs` | 0 | Magnetic timing/endpoints/monotonicity passed |
{test_rows}

Coverage includes initialization, optimized tree/terrain requests, fish movement, Phase 04L landing/navbar, Hero WebGL handoff, Phase 04M surface/reverse/residency, replay, dark/light, fresh desktop/mobile Lite, Reduced Motion bypass and native scrolling, real CDP touch gestures and background audio. Audio play advances currentTime, pauses/resumes, loops and reuses one element; this verifies browser playback state, not audible speaker output. Projects: {project_note}

The full 48-case Phase 04M viewport matrix was not repeated; the existing surface integration/lifecycle regression and required desktop/mobile/preferences checks cover this URL-only integration.

## 14. Errors and warnings

Successful baseline and integrated scene runs: no browser exceptions, failed fish resources, missing WebP, unsupported extension errors or WebGL context losses. Existing `THREE.WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.` warning remains in original and normal integrated scenes.

The initial original-baseline attempt exited 1 on the existing missing `/favicon.ico` HTTP 404. That response is preserved in `measurements/baseline-first-favicon-error.json` and its log; subsequent completed scene runs are clean. The temporary scene diagnostic recognizes only that exact pre-existing non-fish resource error while rejecting all new errors; console entries are retained, not suppressed. No production favicon change was made.

An initial integration diagnostic exited 1 because it required HTTP 200 for warm terrain images; the dedicated cache diagnostic confirmed legitimate HTTP 304 reuse. Only the temporary warm-cache expectation was corrected, while cold HTTP 200 assertions and existing regression assertions remain intact. Initial result/log files are retained. Projects' result and Vite warning are reported separately above rather than hidden or repaired outside scope.

## 15. Partial reversions

None. All seven optimized references remain active in normal mode. No model required fallback or a material/shader workaround.

## 16. Remaining limitations

Tested Edge desktop and mobile emulation on the local production preview, not physical iPhone Safari/Android or a remote deployment/CDN. Network bytes are real localhost transfers; durations do not predict WAN loading. Browser decode cost is not isolated. Live animations cannot produce synchronized pixel-identical A/B captures. Existing favicon, shadow warning, chunk warning and the excluded Projects timing issue are outside fish integration. Runtime opportunities (`useFishDrift`, hidden `swimOne`, shrimp allocation/subtree updates) remain deferred to separately approved Phase 05K.

## 17. Per-model rollback

For only the failing model, restore its URL to the manifest's `originalUrl`. For fish_a/b/c, use `${{fishBase}}/fish_a.glb` (or b/c) so Lite stays correct. For koi/shrimp use their original `/aquarium/<name>.glb`. Leave the suffix and other successful references intact. Rebuild and retest that model, normal/Lite loading and replay. Do not remove original GLBs or revert tree/terrain/other work. For a full batch rollback, making `fishSuffix` an empty string restores all original paths while retaining Lite's existing `fishBase`. No destructive Git operation is needed.

## 18. Verdict

**INTEGRATION SUCCESSFUL.** Seven approved, byte-identical prototypes now load from actual production URLs, reducing measured cold fish content transfer by 34.11%. Visual and live-motion checks, Lite preservation, build, geometry/material checks and relevant application regressions support the result, with the explicitly documented pre-existing Projects timing limitation. Stop here; no Phase 05K changes were made.
'''
(out/'report.md').write_text(report,encoding='utf-8')
subprocess.run(['git','diff','--check'],cwd=root,check=True)
(out/'production-diff.patch').write_bytes(subprocess.run(['git','diff','--','src/components/AquariumDivePrototype.jsx'],cwd=root,capture_output=True,check=True).stdout)
files=[]
for p in sorted(out.rglob('*')):
    if p.is_file() and p.name!='files.json':files.append({'file':p.relative_to(out).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(out/'files.json').write_text(json.dumps(files,indent=2))
print('Report ready.',original-optimized,'body bytes saved;',len(before)-1,'pre-existing files untouched;',len(files)+1,'temporary files indexed.')
