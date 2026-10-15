# Phase 05K — cherry blossom forest environment

Date: 2026-10-15, Asia/Bangkok. **CHERRY BLOSSOM FOREST INTEGRATION SUCCESSFUL.** Integrated and tested in the local production build. No external deployment or new phase was performed.

The AquariumDive environment now uses cherry blossom exclusively, with six desktop trees and three gentle rear hills. Normal and Lite use the same 28,576-byte consolidated model. Original tree assets and the user-provided Blockbench export remain intact.

[Visual gallery and motion player](index.html) · [Workspace integrity](measurements/workspace-integrity.json) · [Output manifest](files.json)

## 1. Cherry blossom GLB statistics

The user export is valid GLB 2 from Blockbench 5.2.2, **51,832 bytes**, 27 meshes/primitives, **648 vertices / 324 triangles**, one material, one embedded PNG, no animations or skins. All accessors and buffer views are in range; UVs are finite and within 0–1. The reported export scale of 16 results in measured scene bounds **[-1.0625, 0, -1] → [1.0625, 1.5625, 1.0625]**: width 2.125, height 1.5625, depth 2.0625. The model is Y-up, root rotation zero and root scale one. The trunk base is at Y=0, centered on the source origin. Existing fit-scale safeguards accept it without changing their thresholds.

Created `public/aquarium/environment/cherry_blossom-opt.glb`, **28,576 bytes**, one mesh/primitive, the same vertices/triangles and bounds. Static node translations are baked into positions; normals, UVs, index order and cube faces are preserved. The editable export is unchanged. See [inventory](measurements/asset-inventory.json), [consolidation](measurements/consolidation.json), and [actual Three.js loading/rendering](measurements/model-validation.json).

SHA-256:

- Original: `7f0d41c9034b9daa9cfdb77317b1f3e5f0ec8088b95f14478c1a5d1b529ae28c`
- Production variant: `33ba013518320765a7de6152ad541b7f0c67fc5c199595c0318d62e79d8634a2`

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
| 1440 / Normal / dark | 6 | 1,944 | 1 / 1 / 1 |
| 1440 / Normal / light | 6 | 1,944 | 1 / 1 / 1 |
| 390 / Normal / dark | 2 | 648 | 1 / 1 / 1 |
| 1440 / Lite / dark | 4 | 1,296 | 1 / 1 / 1 |
| 390 / Lite / dark | 2 | 648 | 1 / 1 / 1 |
| 768 / Normal / dark | 4 | 1,296 | 1 / 1 / 1 |
| 768 / Lite / dark | 3 | 972 | 1 / 1 / 1 |

Desktop uses six, tablet four, mobile two. Lite uses four/three/two. Placement is deterministic across independent normal/light reloads. Existing mesh cloning shares resources rather than uploading per-tree copies.

## 6. Desktop forest composition

Two smaller near trees frame the aquarium; four staggered mid/far trees create small rear groups with clear gaps. The center remains open. Sizes and yaw vary without random regeneration or rows. Fit-scale remains uniform, preserving the model silhouette.

| Tree | X | Z | Existing fit multiplier | Yaw radians |
|---|---:|---:|---:|---:|
| left near | -18 | -19 | 4.8 | 0.2 |
| right near | 18 | -23 | 4.5 | 2.5 |
| left mid | -29 | -32 | 5.4 | 1.4 |
| right mid | 12 | -40 | 4.4 | 3.6 |
| left far | -9 | -38 | 3.6 | 0.7 |
| right far | 31 | -43 | 4.8 | 2.0 |

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
| baseline-1440-normal-dark | `tree-opt-150k-1024.glb` | 200 | 7,402,556 | 7,402,835 |
| baseline-390-normal-dark | `tree-opt-150k-1024.glb` | 200 | 7,402,556 | 7,402,835 |
| baseline-1440-lite-dark | `tree-lite.glb` | 200 | 7,375,276 | 7,375,555 |
| final-1440-normal-dark | `cherry_blossom-opt.glb` | 200 | 28,576 | 28,851 |
| final-1440-normal-light | `cherry_blossom-opt.glb` | 200 | 28,576 | 28,851 |
| final-390-normal-dark | `cherry_blossom-opt.glb` | 200 | 28,576 | 28,851 |
| final-1440-lite-dark | `cherry_blossom-opt.glb` | 200 | 28,576 | 28,851 |
| final-390-lite-dark | `cherry_blossom-opt.glb` | 200 | 28,576 | 28,851 |
| final-768-normal-dark | `cherry_blossom-opt.glb` | 200 | 28,576 | 28,851 |
| final-768-lite-dark | `cherry_blossom-opt.glb` | 200 | 28,576 | 28,851 |

Normal tree content drops **7,402,556 → 28,576 bytes (99.61%)**; former Lite content was 7,375,276 bytes. All three old tree files remain in public and dist for rollback. The only new production file created by this task adds 28,576 deployment bytes; the user-provided 51,832-byte source export was already present. Deployment storage is separate from visitor transfer. Tests use local cold-cache HTTP; no WAN/CDN loading-speed claim is made. Replay performs no additional tree download.

## 11. Rendering, textures and timing

Measured at equivalent P0 camera states. Raw JSON also contains P0.5/P0.91/P0.3. Whole-Dive counts intercept actual GL draw commands and triangle counts, including scene render passes; tree counts use main-pass mesh callbacks. These are submitted triangles, not visible screen pixels. CPU ScriptDuration is measured over the 2.5-second live sample.

| Scenario | Trees | Whole Dive draws/rAF | Submitted triangles/rAF | Tree main draws/rAF | Script ms / 2.5 s | Median / p95 rAF ms | Frames >50 ms |
|---|---:|---:|---:|---:|---:|---|---:|
| baseline-1440-normal-dark | 4 | 117 | 929347 | 4 | 469.2 | 13.30 / 13.50 | 0 |
| four-1440-normal-dark | 4 | 117 | 330643 | 4 | 428.4 | 13.30 / 13.50 | 0 |
| six-1440-normal-dark | 6 | 119 | 331291 | 6 | 488.7 | 13.30 / 13.40 | 0 |
| baseline-390-normal-dark | 1 | 92 | 385796 | 1 | 408.1 | 13.30 / 13.50 | 0 |
| baseline-1440-lite-dark | 4 | 94 | 773631 | 4 | 355.8 | 13.30 / 13.50 | 0 |
| final-1440-normal-dark | 6 | 119 | 331291 | 6 | 502.0 | 13.30 / 13.40 | 0 |
| final-1440-normal-light | 6 | 119 | 331291 | 6 | 451.4 | 13.30 / 13.40 | 0 |
| final-390-normal-dark | 2 | 93 | 236444 | 2 | 399.2 | 13.30 / 13.50 | 0 |
| final-1440-lite-dark | 4 | 94 | 295839 | 4 | 438.3 | 13.30 / 13.50 | 0 |
| final-390-lite-dark | 2 | 70 | 201640 | 2 | 268.6 | 13.30 / 13.40 | 0 |
| final-768-normal-dark | 4 | 109 | 330607 | 4 | 417.4 | 13.30 / 13.50 | 0 |
| final-768-lite-dark | 3 | 85 | 295479 | 3 | 324.0 | 13.30 / 13.50 | 0 |

The tree now has one shared 128² RGBA image. Estimated RGBA8 texture storage with full mip chains is **87,380 bytes (~85.3 KiB)** versus **50,331,644 bytes (~48 MiB)** for the former normal tree, or **4,194,300 bytes (~4 MiB)** for the former Lite tree. This is a dimensions/format estimate, not measured driver allocation; it excludes geometry, render targets, CPU images and other assets. Runtime dimensions and sharing are recorded in the scene snapshots. No new WebGL contexts or context losses were observed.

GPU: ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 (0x00001F11) Direct3D11 vs_5_0 ps_5_0, D3D11). rAF remains quantized near 13.3 ms. Script observations vary and include instrumentation; baseline probes predate the added fish-pose assertions. There is no isolated GPU-present timing or decode benchmark, and no FPS/CPU-speed improvement is claimed. The measured gains are tree transfer size, submitted geometry, and estimated tree texture storage. `readyObservedMs` includes deliberate settling and is not a startup-duration metric.

## 12. Visual and motion evidence

[Gallery](index.html) contains before/four-tree/final views at P0/P0.5/P0.91/P0.3, desktop daylight and night, 390 mobile, 768 tablet, Lite variants, original/consolidated model views, and five-frame motion sequences with a player. Diagnostic wide forest overviews use a temporary inspection camera solely for capture; all journey screenshots use the unchanged production camera.

Reviewed canopy layers, pink/lavender pattern, dark trunks, scale, spacing, depth, trunk contact, fish readability, transitions and subtle sway. No old tree silhouettes, missing textures, excessive clipping, floating trunks or new movement discontinuities were observed. P0.91 intentionally transitions toward the existing sky view; forest visibility follows the approved cinematic sequence.

## 13. Exact files modified

- Modified `src/components/AquariumDivePrototype.jsx`: tree URL, deterministic placement/count limits, localized rear heights, terrain sampling and trunk seating. [Exact source diff](production-diff.patch).
- Added `public/aquarium/environment/cherry_blossom-opt.glb` (28,576 bytes).
- User-provided/untracked `public/aquarium/environment/cherry_blossom.glb` preserved unchanged (51,832 bytes).
- Temporary diagnostics, reports and captures under `.tmp-phase05k/`, enumerated with sizes/hashes in [files.json](files.json).
- `dist/` regenerated by the production build.

The audit compared **2,355 pre-existing files**: only the intended JSX changed, none disappeared, and the only new production asset created was the consolidated GLB. Original trees, fish, terrain textures, all prior evidence and every other source file are unchanged. No dependencies/configuration or source comments were added.

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
| `node .tmp-phase05k/check-dive-landing.mjs` | 0 | [check-dive-landing](logs/check-dive-landing.log) |
| `node .tmp-phase05k/check-dive-webgl.mjs` | 0 | [check-dive-webgl](logs/check-dive-webgl.log) |
| `node .tmp-phase05k/check-dive-replay.mjs` | 0 | [check-dive-replay](logs/check-dive-replay.log) |
| `node .tmp-phase05k/check-dive-interruptions.mjs` | 0 | [check-dive-interruptions](logs/check-dive-interruptions.log) |
| `node .tmp-phase05k/check-dive-mobile.mjs` | 0 | [check-dive-mobile](logs/check-dive-mobile.log) |
| `node .tmp-phase05k/check-surface-integration.mjs` | 0 | [check-surface-integration](logs/check-surface-integration.log) |
| `node .tmp-phase05k/check-audio.mjs` | 0 | [check-audio](logs/check-audio.log) |
| `node .tmp-phase05k/check-projects.mjs` | 1 | [check-projects](logs/check-projects.log) |
| `python .tmp-phase05k/audit.py` | 0 | [Workspace integrity](measurements/workspace-integrity.json) |
| `git diff --check` | 0 | No whitespace errors |

Projects passed all 192 responsive/project/theme/performance layout combinations, then exited 1 at the known `all transient transforms cleared` timing assertion after rapid input. Its code/assertions were preserved. The aggregate regression runner consequently exited 1; this is not an all-green suite.

Existing regressions were reused with browser-context/output plumbing redirected into this phase. Behavioral assertions remain unchanged. Coverage includes initialization, progression, magnetic landing/navbar docking, Hero handoff, surface transitions, reverse navigation, two replays, hidden/visible lifecycle, live light/Lite switching, Reduced Motion, native mobile touch/resize, audio play/pause/resume, and Projects layout. The full earlier 48-case surface matrix was not repeated; the existing surface integration and required desktop/tablet/mobile/preference checks were used.

Final scene runs recorded no browser exceptions, failed resources, GLTFLoader errors or WebGL context losses. The pre-existing Three.js PCFSoftShadowMap fallback warning remains in normal mode. Early temporary validation attempts exited 1 on an overly strict old-tree buffer-length check, exact zero-pixel raster equality, and the detected trunk-corner gap; each cause was investigated. The new export itself is valid; original legacy tree metadata remains untouched. Final model/terrain/scene checks above all exit 0. Existing regression assertions were not relaxed.

## 15. Remaining limitations

Validated Edge with an RTX 2060 and desktop/mobile/tablet emulation on localhost; physical Safari/Android and remote hosting were not tested. Eight trees were not evaluated. Timing instrumentation is observational and cannot prove FPS gains. Placement remains consistent with the existing mounted-population approach described above. Distant night foliage is deliberately subdued by the approved lighting, and the sky takeover hides the environment late in the journey. The known Projects timing failure remains outside this phase.

## 16. Rollback

All old assets remain at their original URLs. To restore the pre-phase environment, reverse only [production-diff.patch](production-diff.patch) after checking for later edits, or restore the tree/count/hill/seating hunks from `AquariumDivePrototype.before.jsx`. This restores normal `tree-opt-150k-1024.glb`, Lite `tree-lite.glb`, original four/one placements and prior terrain. Rebuild and rerun loading, replay and mode checks. Do not reset unrelated changes or delete any original GLBs; cleanup still requires separate approval. Keeping the new files is safe because inactive URLs are not downloaded.

## 17. Final verdict

**CHERRY BLOSSOM FOREST INTEGRATION SUCCESSFUL.** The approved cinematic experience is preserved while the rear environment uses the user's low-poly cherry model, six spaced desktop trees, conservative compact variants and three gentle hills. Real production loading, materials, geometry sharing, grounded sway, actual scene/motion checks, build and relevant regressions support the result, with the documented Projects timing limitation. No unrelated runtime optimization or subsequent phase was started.
