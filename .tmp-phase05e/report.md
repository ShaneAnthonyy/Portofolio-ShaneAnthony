# Phase 05E — Normal-Map Integration Report

## Verdict: INTEGRATION SUCCESSFUL

## 1. Files changed

- ADDED `public/aquarium/terrain/grass_ground/grass_ground_nor_gl_512.webp`
  (550,822 bytes, SHA-256 `4AA24586…3F2D`, verified identical to 05D N2).
- MODIFIED `src/components/AquariumDivePrototype.jsx:2038` — one suffix:
  `'nor_gl_2k.png'` → `'nor_gl_512.webp'`. No other source change, no comments.
- Original `grass_ground_nor_gl_2k.png` (`D215B1EF…`, matches 05D record)
  preserved in place, still shipped in `dist/`.

## 2. Asset verification

N2 hash + size match 05D evidence before copying; dist copy byte-identical
(550,822). 512² decodes to 512² in-browser (verified via createImageBitmap),
so the existing `cap: 512` branch correctly bypasses canvas re-encoding —
same wrap/repeat/sRGB-false/normalScale-0.6 path as before.

## 3. Production loader behavior (real loader, no interception)

- Cold 1440: `grass_ground_nor_gl_512.webp` 200, **zero** `nor_gl_2k.png`
  requests. Resource timing: 639ms (shared Dive build), transfer 551,122 bytes
  vs 24,557,731 before (−97.8%).
- Each hill map requested exactly once (no duplicates; earlier double-count was
  response-event logging).
- Warm: webp 200 (revalidated). Mobile 390: webp 304 (cache). Lite: no normal
  requests at all, `grass_ground_lite.jpg` only. `errors[]` empty.

## 4. Transfer comparison (browser-measured, separate from dist)

Per-load normal-map bytes: 24,557,731 → 551,122 (−97.8%). `dist/` grows by
~0.55MB (both files ship) — deployment overhead documented, cleanup deferred.

## 5. Visuals

`prod-1440-{0,05,091}.jpg`, `prod-390-p05.jpg`, `prod-motion{0,1,2}.jpg` match
05D refs: terrain detail, light pools, tiling, no seams. Motion diff energy
prod [9.61, 6.58] inside the 05D band (orig [9.45, 6.64]) — no shimmer
regression. Mobile tank floor correct.

## 6. Normal-map correctness

Same material slot, linear handling (`srgb: false`), repeat 8×8, normalScale
0.6, AO-UV2 untouched. Lighting response identical in A/B; no normal
inversion (would show as gross shading flip — absent).

## 7. Runtime dims / memory

512² RGBA8 + mips ≈ 1.4MB — identical to the previous runtime-downscaled
texture. GPU unchanged, as predicted. Draws/3s at P0/0.5/0.91: 26442/26091/
18341 vs 05A 26442/26208/18571 (noise). rAF still quantized; no FPS claimed.

## 8. Regressions (fresh, this build — exit codes via file logging)

surface 48/48: 0 · integration 10/10: 0 · landing: 0 · webgl: 0 · replay: 0 ·
mobile: 0 · interruptions: 0 · hero: 0 · arrival: 0 · carousel-geometry 588: 0.
Note: piping node output through `Select-Object -Last` intermittently reports
EXIT 1 with a Node.js footer (PowerShell stderr-wrapping artifact); file
redirection gives true codes (all 0). `check-projects` timing issue out of
scope per instructions.

## 9. Build

`npm run build` exit 0 (known chunk warning only). `git diff --check` exit 0.
`dist/aquarium/terrain/grass_ground/` contains both normal maps.

## 10. Limitations

Close-up ground camera unreachable non-invasively (05D limitation carries over).
Isolated decode timing not measured. Preview serves no Content-Encoding;
production CDN may differ.

## 11. Rollback

Restore `suf: 'nor_gl_2k.png'` at line 2038, rebuild, verify PNG requested.
Original in place; evidence in `.tmp-phase05d/` + `.tmp-phase05e/`.
