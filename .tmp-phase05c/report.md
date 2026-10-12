# Phase 05C — Tree Integration Report

## Verdict: INTEGRATION SUCCESSFUL

## 1. Files added / modified

- ADDED `public/aquarium/environment/tree-opt-150k-1024.glb` (7,402,556 bytes,
  SHA-256 `AD8240FD3423F1CEE3C5FD2C5B7DA03991EE246C08266D6981C873C99667F247`,
  verified identical to the 05B prototype before copying).
- MODIFIED `src/components/AquariumDivePrototype.jsx:2707` — one line: normal
  tree URL `/aquarium/environment/tree.glb` → `/aquarium/environment/tree-opt-150k-1024.glb`.
  Lite branch (`tree-lite.glb`) untouched. No other source change, no comments.
- Originals `tree.glb` (`4929C476…`) and `tree-lite.glb` preserved in place.

## 2. Asset statistics (verified)

150K tris / 160758 verts · 1 mesh / 1 prim / 1 material · baseColor 1024² WebP,
normal + metalRough original 2048² · 7.06MB (−79% vs 33.25MB).

## 3. Production loading verification (real loader, no interception)

- Normal 1440: exactly one `tree-opt-150k-1024.glb` 200, **zero** `tree.glb`
  requests, zero duplicates, `errors[]` empty.
- Resource timing: duration 1499.9ms (cold, shared Dive build — includes parse;
  not a pure network number), transfer 7,402,856 bytes vs 34,861,800 before.
- Lite 1440: `tree-lite.glb` 200 only; optimized file never requested.
- Mobile 390: optimized file 200. No new WebGL contexts (2 created / 0 lost
  across suites), no disposal errors.

## 4. Visual comparison

`.tmp-phase05c/prod-1440-{0,05,091}.jpg` + `prod-390-p05.jpg` vs 05B reference
stills: tree silhouettes, foliage density, placement/scale, shading and sway
presence identical; no damage, no artifacts. Animation acknowledged (no pixel
equality gate).

## 5. Transfer comparison (browser-measured, separate from dist)

- Per-load tree bytes: 34,861,800 → 7,402,856 (−78.8%).
- `dist/` grows by ~7MB (both GLBs ship) — deployment size vs transfer reported
  separately per scope; cleanup deferred to an approved later phase.

## 6. Rendering statistics (equivalent cameras, 1440)

| Pos | 05A original draws/3s | 05C draws/3s |
|---|---|---|
| P0 | 26442 | 26208 |
| P0.5 | 26208 | 26091 |
| P0.91 | 18571 | 18246 |

Draw calls unchanged by design (1 prim/clone). Tri totals: 3.83M → 0.60M
desktop (−84%, offline evidence).

## 7. Frame times / limits

rAF still quantized 13.3/13.5ms everywhere (non-discriminating, as in 05A).
script/style deltas within noise (549/77, 580/84, 1029/138ms vs 537/72,
522/73, 903/128ms). No FPS improvement claimed — no GPU timer available.

## 8. Lite behavior

Unchanged: lite path requests `tree-lite.glb` only; lite suite passes.

## 9. Regressions (fresh, this build — all exit 0)

check-surface 48/48 · check-surface-integration 10/10 · dive-landing ·
dive-webgl · dive-replay · dive-mobile · dive-interruptions · hero · arrival.
`check-projects` not rerun (pre-existing stale iframe expectation, unrelated —
Projects untouched). GSAP timelines, scroll, navbar, music, modal untouched.

## 10. Build / tests

`npm run build` exit 0 (known >500kB chunk warning only).
`git diff --check` exit 0. `dist/aquarium/environment/` contains both
`tree.glb` and `tree-opt-150k-1024.glb`.

## 11. Issues

None. Close-up tree camera still unreachable without prod camera edits
(pre-existing 05B limitation, unchanged).

## 12. Rollback

One line: restore `/aquarium/environment/tree.glb` at
`AquariumDivePrototype.jsx:2707`, rebuild. Originals in place; evidence kept
in `.tmp-phase05b/` + `.tmp-phase05c/`.
