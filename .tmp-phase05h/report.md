# Phase 05H — Fish Audit & fish_a Prototype Report

Prototype-only. No production file modified. Originals preserved.

## 1. Inventory (verified, not estimated)

| Model | Path | MB | Tris | Mesh/prim/mat | Images | Instances (desk/mob) |
|---|---|---|---|---|---|---|
| fish_a/b/c | `/aquarium/fish_?.glb` | 4.7/4.8/4.2 | 20K each | 1/1/1 | 3 PNG 1024² | 1 each (both) |
| butterfly_koi_a/b | `/aquarium/butterfly_koi_?.glb` | 4.0/3.7 | ~36K each | 1/1/1 | 3 (PNG+JPG) | 2 / 1 |
| shrimp_a/b | `/aquarium/shrimp_?.glb` | 1.7 each | ~21K each | 1/1/1 | 3 (PNG+JPG) | 2 / 1 |
| lite fish_a/b/c | `/aquarium/lite/fish_?.glb` | ~2 each | 20K | 1/1/1 | 3 PNG | same counts |

Desktop scene fish: 3×20K + 2×36K + 2×21K ≈ **174K tris (~10 draws)** vs
tree's 3.8M. Skins/animations/morphs: **0 everywhere** — all rigid,
transform-animated. Hero fish are a separate procedural system (untouched).

## 2. Transfer (measured wire, 05A confirmed)

Normal-mode fish payload ≈ 25MB (fish 13.7 + koi 7.6 + shrimp 3.5), ~80% PNG
textures. fish_a: 3.87MB PNGs inside 4.71MB file.

## 3. Animation architecture

`swimOne` (~7 sin + clamps per fish, no matrix flush) shared by fish+koi;
`walkShrimp` heavier (per-tick array alloc + `updateMatrixWorld(true)` subtree
flush per shrimp). Gated by `fishTickEvery` (1 normal / 2 lite) and snap path.
fish_a textures: normal=img0, baseColor=img1, metalRough=img2 — all RGB 1024²,
opaque (`alphaMode` absent), DoubleSide, `KHR_materials_specular`.

## 4. Lifecycle (documented for runtime phase, NOT fixed)

- Main tick parks on `pauseBackdrop` + hidden-tab correctly; reduced-motion
  runs single snap pose, no loop.
- `useFishDrift` rAF **never stops while mounted** (hidden only skips work;
  lite halves, reduced still paints no-ops).
- Hidden fish (`p≥0.94`, `visible=false`) **still receive `swimOne` updates** —
  no `doMotion` gate on visibility.
- Blocked-GLB degradation is graceful: `loadOptional` catches → temp
  cone-fish fallback + warn, no pending promises (isolation run: 0 errors).

## 5. Isolation (equivalent cameras, 1440)

| Pos | Full draws/3s | No-fish | scriptMs full→blocked |
|---|---|---|---|
| P0 | 26442 | 25312 (−4.3%) | 635→572 |
| P0.5 | 26442 | 25312 | 660→709 |
| P0.91 | 18768 | 18363 | 958→874 |

Fish cost ≈ 6 draws/frame; JS delta is noise (±10%, both directions). Blocker:
temp fallback still renders, so this understates nothing — fish rendering is
simply cheap. Animation-paused isolation unreachable non-invasively (no hooks;
reduced-motion perturbs whole app) — stated limitation.

## 6. Prototype: fish_a texture-only WebP (same 1024²)

Normal/base/metalRough PNG→lossless WebP (sRGB only on baseColor path —
byte conversion, no canvas round-trip of linear data), GLB re-spliced
(geometry bytes untouched), plain `source` textures (no EXT needed):
**4.71MB → 3.48MB (−26%)**, structure re-validated (1/1/1, 3× WebP).
Loads + renders in real Three.js with **zero errors**; stills + 4 swim frames
identical (koi patterns, fins, shrimp, lighting match; positions differ only
because fish keep swimming — animation live in both).

## 7. Assessment

- Transfer: prototype saves 1.2MB on one model (~5% of fish payload).
  Real prize needs all 8 models (~8–10MB) + lossy baseColor evaluation.
- Runtime: geometry trivial (20K), draws −6/frame potential, JS flat.
  **Geometry decimation explicitly NOT recommended** (nothing to gain).
- Approach generalizes: all fish share the 1-mesh/1-mat/3-PNG rigid pattern.

## 8. Files

`.tmp-phase05h/`: `convert-fisha.mjs`, `fish_a-webp.glb`,
`fisha_img{0,1,2}.webp`, `ab-fish.mjs`, `isolate.mjs`, `isolate.json`,
`ab-fish.json`, `shots/` (14 JPGs).

## 9. Next steps

Convert remaining 7 models with the same script pattern; evaluate lossy
baseColor (photographic content, biggest lever); then integrate all in ONE
production pass. Runtime fixes (drift rAF, hidden-fish updates, shrimp alloc)
belong to a runtime phase, not an asset phase.

## 10. Verdict

**REVISE FISH PROTOTYPE** — fish_a conversion validated as the pattern, but
production integration should wait for all-model coverage + lossy-baseColor
evidence rather than eight micro-integrations. No tooling gaps (PIL + three
suffice); no geometry work justified.
