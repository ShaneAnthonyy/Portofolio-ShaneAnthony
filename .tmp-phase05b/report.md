# Phase 05B — Optimized Tree Prototype Report

Prototype-only. No production file modified. Originals preserved
(`tree.glb` SHA256 `4929C476…`, `tree-lite.glb` `B87246D3…`).

## 1. Original statistics

`tree.glb` 33.25MB · 706582 verts / 957316 tris · 1 mesh / 1 prim /
1 material (`Material.001`, opaque, DoubleSide) · 3× WebP 2048²
(baseColor 0.17MB, normal 0.50MB, metalRough 0.06MB) · interleaved
POSITION+NORMAL+UV (stride 32) + UINT32 index · `EXT_texture_webp`,
`KHR_materials_specular` only.

## 2. Candidate statistics

| Candidate | File | Tris | Verts | Textures | GPU tex (est) |
|---|---|---|---|---|---|
| original | 33.25MB | 957316 | 706582 | 3× 2048² WebP | ~64MB |
| tree-opt-250k.glb | 10.74MB (−68%) | 250000 | 234459 | passthrough, byte-identical | ~64MB |
| tree-opt-150k.glb | 7.35MB (−78%) | 150000 | 160758 | passthrough, byte-identical | ~64MB |
| **tree-opt-150k-1024.glb** | **7.06MB (−79%)** | 150000 | 160758 | baseColor 1024² WebP q85; normal/mr untouched 2048² | **~48MB** |
| tree-lite.glb (existing) | 7.03MB | 119772 | 149845 | 3× 512² PNG (1.08MB wire) | ~4MB |

Desktop scene totals: 3.83M → 0.60M tris (−84%) with the 150K winner.

## 3. Approaches

- **Geometry:** installed `three` `SimplifyModifier` (meshopt, attribute-weighted,
  normals/UVs preserved, zero new deps). Targets hit exactly (250000/150000).
  First attempt silently corrupted by the interleaved vertex buffer (stride 32);
  caught by validation, redone stride-aware. Dead geometry stripped from the BIN
  (first build was 42MB — larger than source).
- **Textures:** baseColor only → 1024² WebP via isolated Edge canvas (zero installs).
  Normal/metalRough deliberately kept at 2048² — canvas 2D round-trips linear data
  destructively and no linear-correct tooling was approved. BaseColor transfer
  barely moved (0.17→0.21MB — the original was already heavily compressed);
  the win is GPU (21.3→5.3MB).
- **Compression (Meshopt/Draco/KTX2):** evaluated, not applied — transfer-only
  (Meshopt) or needs loader wiring + transcode measurement (KTX2); kept
  separately measurable per scope. No KTX2 loader changes made.

## 4. Compatibility verification

- Structural: magic/version/chunk fit, accessor counts, finite bounds, UINT32
  index, 1 material with identical PBR mapping, DoubleSide, node/scene
  preservation, image bytes byte-identical (geo-only), carried views in range —
  `validate.mjs` ALL VALID.
- Runtime: all candidates load + render in the real Three.js preview via
  CDP-intercept A/B with **zero browser errors**; placement/sway code untouched
  and functioning (trees appear at all 4 placements, correct scale/position).

## 5. Visual comparison (`.tmp-phase05b/shots/`, 15 stills)

P0 / P0.5 / P0.91 at 1440 for original, 250K, 150K, 150K-1024, lite:
silhouette, branch structure, foliage density, lighting response
indistinguishable at every captured distance (trees are dark mid/background
elements). No cracks, shimmer, transparency or lighting artifacts in any
candidate. Close-up camera unreachable without touching production camera code
— stated limitation; nearest view is the P0.5 tank close-up.

## 6. Measured improvements / limits

- Transfer: −79% file bytes (33.25→7.06MB). CDP-injected timings are NOT
  presented as network benchmarks per instructions; byte sizes are the evidence.
- Decode/load wall time: not isolated (injected responses + shared Dive build);
  stated as unmeasured.
- Rendering: draw calls unchanged by design (1 prim/clone → same 4 calls);
  P0.5 draws 26442 vs 26208 full-original — consistent. Tri reduction −84%
  implies vertex-load relief but **no GPU timer proof exists** — not claimed.
- Texture GPU: ~64→~48MB (baseColor quartered).

## 7. Artifacts

None observed. 150K chosen over 250K on measured size (−34% smaller, −40%
fewer tris) with zero visible difference — not on tri count alone.

## 8. Files created (all under `.tmp-phase05b/`)

`decimate.mjs`, `validate.mjs`, `tex1024.mjs`, `ab-visual.mjs`, `ab-final.mjs`,
`tree-opt-250k.glb`, `tree-opt-150k.glb`, `tree-opt-150k-1024.glb`,
`basecolor-1024.webp`, `shots/` (15 JPGs), `shots.json`, `ab-final.json`.

## 9. Recommendation

**APPROVE OPTIMIZED TREE FOR PRODUCTION — `tree-opt-150k-1024.glb`.**
Trade-offs: normal/mr stay 2048² (~48MB GPU; KTX2/sharp follow-up can take
the rest); close-up fidelity inferred, not directly imaged.
Rollback: originals untouched; integration is a URL swap at
`AquariumDivePrototype.jsx:2707` + delete variant. No integration performed —
awaiting approval (no 05C started).
