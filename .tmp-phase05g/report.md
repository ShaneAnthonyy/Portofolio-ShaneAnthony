# Phase 05G — Remaining Terrain Textures Integration Report

## Verdict: INTEGRATION SUCCESSFUL

## 1. Files added / modified

- ADDED `public/aquarium/terrain/grass_ground/grass_ground_diff_1024.webp`
  (319,080 B), `grass_ground_rough_1024.webp` (298,038 B),
  `grass_ground_ao_1024.webp` (826,304 B) — byte-identical to 05F candidates.
- MODIFIED `src/components/AquariumDivePrototype.jsx` — three suffixes only
  (lines 2037/2039/2040): `diff_2k.jpg`→`diff_1024.webp`,
  `rough_2k.png`→`rough_1024.webp`, `ao_2k.jpg`→`ao_1024.webp`.
  Normal line, loader logic, caps, sRGB flags, repeat, normalScale, AO channel,
  materials — all untouched. No comments.
- All four originals preserved in place and still shipped in `dist/`.

## 2. Asset verification

Pre-flight sizes matched 05F bytes exactly; dist copies byte-identical
(319,080 / 298,038 / 826,304). All decode 1024² in-browser (WebP native).

## 3. Production loading (real loader, no interception)

- Cold 1440: D2/R1/A1 + N2-normal + opt-tree each HTTP 200 exactly once;
  **zero** `diff_2k`/`rough_2k`/`ao_2k`/`nor_gl_2k.png`/`tree.glb` requests.
- Transfers: 319,380 + 298,338 + 826,604 + 551,122 ≈ 1.99MB vs 39,183,521
  (−94.9%). Warm/mobile: 304 revalidations. Lite: `grass_ground_lite.jpg`
  only. `errors[]` empty. No duplicates (REQ-count verified).

## 4. Transfer table (browser-measured, not dist size)

| Map | Before | After | Δ |
|---|---|---|---|
| diff | 3,787,330 | 319,380 | −91.6% |
| rough | 6,773,940 | 298,338 | −95.6% |
| ao | 4,064,520 | 826,604 | −79.7% |
| normal (05E) | 24,557,731 | 551,122 | −97.8% |
| terrain set | 39,183,521 | 1,995,444 | −94.9% |

`dist/` grows by ~2MB (originals retained for rollback) — reported separately.

## 5. Visuals

`prod-1440-{0,05,091}.jpg`, `prod-390-p05.jpg`, 10 motion frames match 05F
combined refs: diff color, rough response, AO darkening, tiling, lighting.
Motion energies fwd [15.75, 13.17, 10.14, 7.7] / rev [10.33, 13.19, 15.74,
15.37] vs 05F [15.61, 13.08, 10.25, 7.72] / [10.15, 13.16, 15.78, 15.38] —
identical motion behavior, no shimmer/seam regression. Mobile tank floor
correct.

## 6. Material validation

sRGB diff, linear rough (`.g` render-verified in 05F), AO UV-set/channel-2
unchanged — same code path, only URLs changed. No lighting/shader compensation.

## 7. Runtime / GPU

1024² RGBA8+mips each — identical to previous runtime output. GPU unchanged
(~18MB hill set). Draws/3s 26559/26442/18670 vs 05A 26442/26208/18571 (noise).
rAF quantized; no FPS claimed.

## 8. Regressions (exit codes, file-logged)

surface 48/48: 0 · integration 10/10: 0 · landing: 0 · webgl: 0 · replay: 0 ·
mobile: 0 · interruptions: 0 · hero: 0 · arrival: 0 · carousel-geometry: 0.
`check-projects` timing out of scope.

## 9. Build

`npm run build` exit 0 (known chunk warning only). `git diff --check` exit 0.
`dist/aquarium/terrain/grass_ground/` contains all 8 files.

## 10. Limitations

Close-up ground camera unreachable non-invasively (standing limit). Preview
serves no Content-Encoding; CDN may differ. Decode isolation not measured.

## 11. Rollback

Restore the three suffixes, rebuild, verify original requests return.
Originals in place; evidence in `.tmp-phase05f/` + `.tmp-phase05g/`.
