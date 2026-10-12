# Phase 05I — fish batch texture prototype report

**APPROVE FISH BATCH FOR PRODUCTION** — recommendation only. Nothing integrated. Selected file payload: **26,029,508 → 17,150,076 bytes**, saving **8,879,432 bytes (34.11%)**.

[Visual review gallery and motion player](index.html) · [Complete inventory](measurements/inventory.json) · [Exact output manifest](files.json)

## 1. OpenCode handoff and working-tree recovery

Inspected `git status --short`, `git diff --stat`, `git diff -- src/ scripts/`, Phase 05H report/converter/A-B/isolation scripts, production loaders and quality paths. No `.tmp-phase05i/` existed. Phase 05H prototype and prior phases were preserved. The handoff correctly identified seven normal models; its older report inconsistently refers to eight models and “remaining seven.” Current source and real requests confirm seven total. Koi/shrimp use JPEG base colors, and shrimp numerical maps are 512², so the earlier uniform three-PNG assumption does not generalize.

Existing tree/terrain/Sinefolis edits and all modified/untracked files were left intact. A SHA-256 comparison covers 2,000 pre-existing files, including production and previous evidence: zero changed, missing, or newly created files outside this phase, excluding the regenerated `dist/` build. See [integrity evidence](measurements/workspace-integrity.json) and `workspace-before.json`. This phase does not complete or rewrite prior phase reports.

## 2. Tooling reused

Adapted `.tmp-phase05h/convert-fisha.mjs`'s embedded-image extraction and GLB binary re-splicing into `convert.py`. Kept buffer-view indices instead of its hard-coded remap, preserved all non-image views, updated buffer byte lengths, retained actual alpha, and declared WebP properly. Reused `.tmp-phase05h/ab-fish.mjs`'s CDP `Fetch.fulfillRequest` approach and `.tmp-phase05h/isolate.mjs`'s draw/performance sampling. `browser.mjs` is a temporary adaptation of `scripts/dive-browser.mjs`, using a fresh isolated browser context and this phase's output directory. The existing replay regression was copied with only its helper import redirected. No new dependencies: Pillow 8.4.0, libwebp 1.2.1, Node 24.19.0, installed Three.js 0.186.1, existing Edge CDP and Vite preview.

## 3. Full seven-model inventory

Exact production paths are `public/aquarium/<model>.glb`; actual normal desktop sessions request `/aquarium/<model>.glb` once each. Desktop has seven model instances; mobile has five, omitting koi_b and shrimp_b. Every model has one mesh, primitive and material; three images/textures; one `TEXCOORD_0` UV attribute; no skins, animation clips or morph targets. Total unique triangles: **174,561**. Desktop instance triangle total is the same; mobile is 116,946.

| Model | Vertices | Triangles | Original texture bytes | Selected texture bytes | Dimensions: normal, base, MR | Estimated RGBA8 mip bytes |
|---|---:|---:|---:|---:|---|---:|
| fish_a | 29,170 | 20,000 | 3,878,465 | 1,522,028 | 1024x1024, 1024x1024, 1024x1024 | 16,777,212 |
| fish_b | 31,355 | 20,000 | 3,921,011 | 1,520,612 | 1024x1024, 1024x1024, 1024x1024 | 16,777,212 |
| fish_c | 28,345 | 20,000 | 3,376,427 | 1,329,212 | 1024x1024, 1024x1024, 1024x1024 | 16,777,212 |
| butterfly_koi_a | 46,394 | 35,905 | 2,444,547 | 1,616,958 | 1024x1024, 1024x1024, 1024x1024 | 16,777,212 |
| butterfly_koi_b | 45,832 | 36,703 | 2,151,691 | 1,342,449 | 1024x1024, 1024x1024, 1024x1024 | 16,777,212 |
| shrimp_a | 27,205 | 21,041 | 804,005 | 584,440 | 512x512, 1024x1024, 512x512 | 8,388,604 |
| shrimp_b | 27,341 | 20,912 | 851,612 | 631,583 | 512x512, 1024x1024, 512x512 | 8,388,604 |

All nodes preserve their original origin/pivot, implicit identity translation/scale, and quaternion `[0.70710688829422, 0, 0, 0.7071066498756409]`. Complete node/scenes/material/sampler records, accessor bounds and UV references are in [inventory.json](measurements/inventory.json). Loader-derived transformed bounds and clone bounds are in [loader-all.json](measurements/loader-all.json). Original geometry bounds, pivots and material assignments match every candidate exactly.

| Model | Image | Slot | Original MIME | Encoded bytes | Dimensions |
|---|---:|---|---|---:|---|
| fish_a | 0 | normalTexture | image/png | 972,348 | 1024x1024 |
| fish_a | 1 | baseColorTexture | image/png | 1,974,407 | 1024x1024 |
| fish_a | 2 | metallicRoughnessTexture | image/png | 931,710 | 1024x1024 |
| fish_b | 0 | normalTexture | image/png | 1,016,923 | 1024x1024 |
| fish_b | 1 | baseColorTexture | image/png | 1,944,808 | 1024x1024 |
| fish_b | 2 | metallicRoughnessTexture | image/png | 959,280 | 1024x1024 |
| fish_c | 0 | normalTexture | image/png | 913,715 | 1024x1024 |
| fish_c | 1 | baseColorTexture | image/png | 1,526,291 | 1024x1024 |
| fish_c | 2 | metallicRoughnessTexture | image/png | 936,421 | 1024x1024 |
| butterfly_koi_a | 0 | normalTexture | image/png | 1,051,708 | 1024x1024 |
| butterfly_koi_a | 1 | baseColorTexture | image/jpeg | 364,006 | 1024x1024 |
| butterfly_koi_a | 2 | metallicRoughnessTexture | image/png | 1,028,833 | 1024x1024 |
| butterfly_koi_b | 0 | normalTexture | image/png | 893,462 | 1024x1024 |
| butterfly_koi_b | 1 | baseColorTexture | image/jpeg | 254,557 | 1024x1024 |
| butterfly_koi_b | 2 | metallicRoughnessTexture | image/png | 1,003,672 | 1024x1024 |
| shrimp_a | 0 | normalTexture | image/png | 251,242 | 512x512 |
| shrimp_a | 1 | baseColorTexture | image/jpeg | 283,250 | 1024x1024 |
| shrimp_a | 2 | metallicRoughnessTexture | image/png | 269,513 | 512x512 |
| shrimp_b | 0 | normalTexture | image/png | 278,380 | 512x512 |
| shrimp_b | 1 | baseColorTexture | image/jpeg | 342,253 | 1024x1024 |
| shrimp_b | 2 | metallicRoughnessTexture | image/png | 230,979 | 512x512 |

All 21 images decode as RGB with alpha 255 at every pixel: zero transparent or partial-alpha pixels. All seven materials use default OPAQUE, `doubleSided: true`, and `KHR_materials_specular`; its scalar settings are retained. There are no AO/emissive/specular images or images shared across distinct glTF slots in these assets. The metallicRoughness image is still shared by the loader's roughnessMap and metalnessMap. PNGs contain sRGB/gamma/chromaticity/EXIF/DPI metadata; decoding/conversion does not apply those color transforms to numerical data.

Original SHA-256:

| Source | SHA-256 |
|---|---|
| `public/aquarium/fish_a.glb` | `bbabe123e9231089cba55b823fdef061855ece57efc252144d340700096ef54f` |
| `public/aquarium/fish_b.glb` | `7985ae1fa04c94e261fcac848e34696c993bda419e4b6d6c68ed25a56945c747` |
| `public/aquarium/fish_c.glb` | `ff829184347a5f5022e6ec6b1190779ffd31523c95788a2bc25e6ca6d5e47e11` |
| `public/aquarium/butterfly_koi_a.glb` | `0c1357bc9d72268639fc8940525ad1d7242dafbb5b51b1b7cd92322b1ffd2f2a` |
| `public/aquarium/butterfly_koi_b.glb` | `669da8a476c55a11228147be7bf56a3820d6afc995bc9cb607556e61d64c63db` |
| `public/aquarium/shrimp_a.glb` | `c33b4dc066f33c8595e176660687d5a64987ee88c093930bc2b537c68788c277` |
| `public/aquarium/shrimp_b.glb` | `f58364a48e0465e2525f7a80f4fbbdebc8ef5afe92ef778a9197fe7875b9a0f8` |

## 4. Lossless conversion method

Decode PNG bytes with Pillow without gamma conversion, encode same-size WebP losslessly, retain the original if no smaller. JPEG base colors remain byte-for-byte original. Each image buffer is replaced in-place by index; all other buffer-view payloads are byte-identical. Accessors, indices, UVs, nodes, scenes, pivots, materials and samplers are unchanged. Output chunks are aligned to four bytes with correct GLB/buffer lengths. Shared references retain their indices.

WebP images use `image/webp`; corresponding textures use `EXT_texture_webp.source`, with `EXT_texture_webp` in both `extensionsUsed` and `extensionsRequired` because these candidates carry no PNG fallback. This follows the [Khronos WebP extension specification](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Vendor/EXT_texture_webp/README.md). The installed loader supports it without modification. Unlike 05H, these candidates do not rely on a plain WebP `texture.source` outside the core image types.

## 5. q95 and q90 evaluation

After the fish_a sample passed structural and loader checks, generated the other lossless candidates, then q95. Lossy compression is applied only to PNG baseColor images for fish_a/b/c. Their normal and MR maps remain lossless. Existing JPEG base colors for koi/shrimp are already compressed and are retained; those four q95-designated candidates are byte-identical to their lossless candidates, with no lossy recompression.

q95 saves another **2,873,136 bytes** over the all-lossless batch. Selected PNG-derived base colors now total 1,070,594 bytes. q90 was deliberately not generated: q95 already gives the substantial additional saving, and further quality loss was not justified for this conservative pass. No claimed q90 measurements.

## 6. Per-model choice

fish_a: q95, orange/black/white pattern, eye and long fin detail retained. fish_b: q95, orange cap and white/gold scale detail retained. fish_c: q95, dark scales, eyes and thin tail detail retained. Both koi and both shrimp: lossless numerical maps plus unchanged JPEG baseColor; additional lossy recompression avoided. All have passed structural, clone, material and live-motion checks. No model needs exclusion.

## 7. Actual file sizes

| Model | Original bytes | Lossless bytes | q95 bytes | Selected | Selected bytes | Reduction |
|---|---:|---:|---:|---|---:|---:|
| fish_a | 4,933,884 | 3,644,688 | 2,577,616 | q95 | 2,577,616 | 47.76% |
| fish_b | 5,046,348 | 3,700,500 | 2,646,120 | q95 | 2,646,120 | 47.56% |
| fish_c | 4,405,448 | 3,110,084 | 2,358,400 | q95 | 2,358,400 | 46.47% |
| butterfly_koi_a | 4,146,564 | 3,319,108 | 3,319,108 | lossless | 3,319,108 | 19.96% |
| butterfly_koi_b | 3,840,508 | 3,031,404 | 3,031,404 | lossless | 3,031,404 | 21.07% |
| shrimp_a | 1,802,788 | 1,583,352 | 1,583,352 | lossless | 1,583,352 | 12.17% |
| shrimp_b | 1,853,968 | 1,634,076 | 1,634,076 | lossless | 1,634,076 | 11.86% |

## 8. Complete batch reduction

Original: **26,029,508 bytes** (24.82 MiB). Lossless: **20,023,212 bytes**. Selected: **17,150,076 bytes** (16.36 MiB). Saved: **8,879,432 bytes**, **34.11%**. Embedded texture bytes: 17,427,758 → 8,547,282. These are actual file sizes, representing transfer potential for these seven assets; no extrapolated whole-site or synthetic network timing claim.

## 9. Alpha, color and material accuracy

Pillow checks compare all RGBA channel values. Browser checks upload the actual GLTFLoader ImageBitmaps to WebGL, read pixels from a framebuffer and compare channels. Every lossless map matches all original sampled channels exactly. q95 numerical maps and alpha also match exactly. `map.colorSpace` remains sRGB; numerical maps remain untagged/linear data. Every channel actually used by normal, roughness and metalness sampling was checked. Loader material JSON, side, opacity, transparency, alphaTest, texture filters/wrap/UV channel, flipY, offsets and repeats match.

No meaningful alpha exists to drop or threshold. Fine fin/tail silhouette gaps come from the original geometry; they remain present. No material adjustments were used to conceal compression changes. Close-up side/oblique/reverse inspections found no new halos, missing fins, changed sorting, conspicuous color bleeding or specular shift. q95 is not pixel-identical, and slight texture differences remain visible in numerical comparisons.

## 10. GLB and loader compatibility

All seven originals plus fourteen candidate files load through the installed Three.js GLTFLoader: **21 loads passed**. The incremental sample also passed. Structural checks verify GLB header/chunk lengths, buffer ranges, unchanged non-image bytes, material/geometry JSON and finite bounds. Every candidate matches original mesh attributes, triangle counts, world bounds and translated/rotated deep-clone bounds. No production loader changes. Evidence: per-model `measurements/*-lossless.json`, `*-q95.json`, [loader-all.json](measurements/loader-all.json).

## 11. Visual comparisons

[Open the gallery](index.html). `comparisons/models/<model>-side|oblique|reverse.png` contains original, lossless and q95 side by side under a controlled supplementary model viewer. These are close-up checks, separate from the real scene. Actual AquariumDive captures cover P0, P0.5, P0.91 and fish-heavy P0.3, desktop 1440×900; original and selected mobile captures use 390×844 CSS pixels and DPR 2 (renderer cap 1.5).

The first live P0.91 captures were too early in camera easing, which an explicit equivalence check detected; they remain as preliminary evidence. `comparisons/matched-desktop-*` waits for a stable camera. [Matched equivalence checks](measurements/equivalence-matched.json) confirm equal camera matrices, lights, renderer settings, model population, materials and scale at all four positions. Fish poses and time-driven water effects remain live and unsynchronized; no pixel-identical live-scene claim. Mobile composition remains equivalent to its original baseline, including existing compact framing.

## 12. Swimming motion

Each of nine live scenarios includes four seconds of per-rAF root transforms plus six timestamp-associated browser captures, with [motion strips and frame player](index.html). All expected models move, retain scale, have finite transforms and remain below the 0.08-world-unit per-sampled-frame displacement guard. No visible jumps/discontinuities were observed. Shrimp continue their existing walk/pause/turn behavior. Existing clone behavior was tested separately; no new animation system or time control was introduced. Temporal jitter below these sampling/visual limits cannot be ruled out.

## 13. Combined selected batch

One isolated CDP context substitutes all seven selected files via response MIME `model/gltf-binary` at the existing URLs. Every expected response is HTTP 200, every model is present with the original geometry/material/scale, and each URL loads once. Desktop selected, mobile selected and light-mode selected scenes pass. Handoff lands at scroll zero with a settled navbar; Dive Again returns and completes again without reloading fish. Zero context losses, request failures or application exceptions. Interception is disabled and the disposable browser context is closed after each diagnostic process.

## 14. Normal and Lite compatibility

Normal desktop: seven originals versus seven selected candidates; normal mobile: five originals versus five selected candidates. Desktop/mobile Lite: **zero substitutions**, original `/aquarium/lite/fish_a/b/c.glb` requests preserved. Crucially, current Lite sessions also load original normal-path koi and shrimp (desktop both pairs; mobile only *_a). This is existing behavior and was preserved. Any future integration must gate the new koi/shrimp URLs to normal mode to honor the unchanged-Lite requirement. Normal/mobile selected replay and desktop Lite replay pass. Dark/light normal checks pass. No physical iPhone Safari or Android testing was performed.

## 15. Rendering statistics and limits

At P0.3, one mesh/main-pass draw per visible model: seven desktop, five mobile. Original/lossless/q95 desktop observed 117 whole-Dive GL draw calls per sampled rAF, seven of which were fish main-pass callbacks; other passes and environment rendering contribute the remainder. This is more precise than the prior rough “ten draws” estimate at unspecified positions.

| Scenario | Samples | Median rAF ms | p95 ms | Script ms / 4 s | Dive draws / rAF | Fish main draws / rAF |
|---|---:|---:|---:|---:|---|---|
| desktop-original | 296 | 13.30 | 13.50 | 1460.6 | 117 | 7 |
| desktop-lossless | 301 | 13.30 | 13.50 | 1157.8 | 117 | 7 |
| desktop-q95 | 301 | 13.30 | 13.50 | 1688.9 | 117 | 7 |
| desktop-selected | 295 | 13.30 | 13.50 | 1329.5 | 117 | 7 |
| mobile-original | 301 | 13.30 | 13.50 | 1492.5 | 92 | 5 |
| mobile-selected | 301 | 13.30 | 13.50 | 1161.3 | 92 | 5 |
| desktop-lite | 301 | 13.30 | 13.50 | 1184.7 | 94 | 7 |
| mobile-lite | 301 | 13.30 | 13.50 | 862.3 | 69 | 5 |
| desktop-light-selected | 299 | 13.30 | 13.40 | 1578.7 | 117 | 7 |

These are instrumented browser/main-thread samples on an NVIDIA RTX 2060 via ANGLE D3D11, not physical-device or GPU-present benchmarks. The initial selected-desktop regression briefly overlapped a second isolated replay test; use the sequential original/lossless/q95 A/B runs for comparable timing. Scene callbacks/WebGL wrappers themselves add overhead. No FPS or JS speed improvement is claimed; the similar 13.3 ms median is display/rAF pacing, and script deltas are noisy.

Unchanged dimensions imply unchanged estimated uncompressed RGBA8 texture memory: **100,663,268 bytes** (~96 MiB) for all 21 unique images with full mip chains. This is an estimate, not measured driver allocation; ignores geometry, render targets, source ImageBitmaps and driver overhead. Mobile's smaller population and Lite's runtime caps differ from this batch estimate. WebP here is a download encoding, not GPU block compression. Geometry/draw counts do not decrease. Loader timings in JSON combine local fetch, decode and parse and are not an isolated decode benchmark. CDP fulfilled responses do not measure genuine wire transfer or cold-network benefit.

## 16. Errors, warnings and exit codes

Final loader, A/B, selected desktop/mobile/Lite/light, handoff/replay and matched-camera runs: zero browser exceptions, resource failures or context losses. The existing warning `THREE.WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.` appears in original and candidate normal scenes; it is retained in logs, not suppressed. No new candidate warnings.

Actual completed commands: `npm run build` exit 0 (10.85 s; existing >500 kB chunk warning); inventory and both conversion stages exit 0; sample loader final exit 0; all-candidate loader exit 0; `scene-ab.mjs ab` exit 0; `scene-ab.mjs regression` exit 0; `scene-ab.mjs matched` exit 0; existing `check-hero.mjs` and `check-arrival.mjs` exit 0; copied existing `check-dive-replay.mjs` exit 0 with all five assertions/groups passed.

Diagnostic corrections were not hidden: initial sample exited 1 because the temporary server returned 403 for favicon (fixed in the temporary server); first scene attempt exited 1 due an erroneous Promise invocation in temporary measurement code; second exited 1 on the original scene's pre-existing shadow warning before baseline warning handling was calibrated. The first camera-equivalence check exited 1 because P0.91 had not settled. Final checks retain strict zero-error/context-loss assertions and reject any warning other than the explicitly observed original warning. Earlier diagnostic error JSON remains under `measurements/`. No existing production or regression assertion was weakened.

## 17. Exact temporary outputs

Everything new is under `.tmp-phase05i/`. [files.json](files.json) enumerates every generated file, byte count and SHA-256 except its own self-hash. Main files: `convert.py`, `browser.mjs`, `server.mjs`, `validate.mjs`, `scene-ab.mjs`, `inspect-scene.mjs`, `check-dive-replay.mjs`, `write-report.py`, `report.md`, `index.html`, `workspace-before.json`, `git-status-before.txt`, `production-diff-before.patch`, `git-head.txt`; fourteen `candidates/lossless|q95/<model>.glb`; measurements; controlled model/actual-scene PNGs; motion PNGs and strips. No earlier-phase evidence was overwritten.

## 18. Candidate hashes

Paths below are relative to `candidates/`. [candidate-hashes.json](measurements/candidate-hashes.json) records all fourteen candidates, including the four duplicate q95/lossless pairs.

| Selected candidate | SHA-256 |
|---|---|
| `q95/fish_a.glb` | `90cf080fd11e7691009f82fcfe77c49acb593d042c2fae09681fed4ccd14c120` |
| `q95/fish_b.glb` | `a686a41cc346b2e831a1f7e654c7e55769504fe01c79eb1bab189f3d457585e2` |
| `q95/fish_c.glb` | `ed08ac72a256f658f32ade82c96c3cd439b55c1879d195bbdb866f5893811c9d` |
| `lossless/butterfly_koi_a.glb` | `4dc7281c6c9a4c6c5084210dcb8b520397eb687fc29b4a6c389a0b91199b39f6` |
| `lossless/butterfly_koi_b.glb` | `699a5038ed3338ce17fa9d45d7e46a39ea6b90f6f1f6ace501a29280d1294fe4` |
| `lossless/shrimp_a.glb` | `dd6fdbe03cbb010be14e265873cbad983be107d69e79baa83305e4b4a3973349` |
| `lossless/shrimp_b.glb` | `d703b64c667ac689ea067eef9c3583fa4a115894d764d91141bd2fc233012a8c` |

## 19. Deferred runtime work

Unchanged: `useFishDrift` scheduling while mounted, hidden fish `swimOne` updates, per-tick shrimp allocation/subtree work, animation timing/paths, scene parking, React behavior, WebGL handoff and GSAP transitions. These remain later runtime-phase opportunities. No Phase 05J work started.

## 20. Recommended production integration, pending separate authorization

Copy only the seven selected files to new versioned production filenames; retain originals. Verify their hashes against this report. Change only normal-mode asset selection to those URLs; keep Lite's three fish and shared original koi/shrimp URLs intact. Reuse the current loader, sampling, materials and movement without runtime patches. Repeat normal/mobile/Lite requests, handoff/replay and build checks on the real URLs; measure real cold transfer/decode only after serving the candidates normally. The diagnostic WebP extension is already supported by the installed loader, but other target browsers should receive their own compatibility check before broad deployment.

## 21. Rollback

No production rollback is currently needed. For a later integration, revert only the seven normal-mode URL choices to their recorded original paths/hashes. Original GLBs remain available. Do not revert tree/terrain/Sinefolis work or delete the prototype evidence. Versioned filenames avoid replacing cached files in-place.

## 22. Final verdict

**APPROVE FISH BATCH FOR PRODUCTION**, within the tested Edge desktop/emulated-mobile scope and the noted timing/device limits. Select q95 fish_a/b/c and lossless koi_a/b plus shrimp_a/b with their existing JPEG base colors. The batch is ready for review and a separately authorized production integration. This phase stops at prototypes and evidence.
