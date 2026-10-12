# Phase 05F — Remaining Terrain Textures Prototype Report

Prototype-only. No production file modified. Originals preserved
(hashes: diff `4272bddc…`, rough `4bb2ecca…`, AO `ae473945…`).

## 1. Inventory (verified)

| Map | File | Bytes | Dims/mode | Runtime | sRGB | Slot semantics |
|---|---|---|---|---|---|---|
| diff | `grass_ground_diff_2k.jpg` | 3,787,330 | 2048² RGB | 1024 | true | base color |
| rough | `grass_ground_rough_2k.png` | 6,773,940 | 2048² **16-bit gray** (values 56815–63540, 4567 unique) | 1024 | false | `.g` channel (three standard; render-verified) |
| ao | `grass_ground_ao_2k.jpg` | 4,064,520 | 2048² L | 1024 | false | UV set via `channel 2`, `aoMapIntensity 0.65` |

8×8 `RepeatWrapping` on all; normalScale 0.6; Lite uses single `grass_ground_lite.jpg`.

## 2. Candidates (PIL, zero installs)

| ID | Variant | Bytes | vs orig |
|---|---|---|---|
| D1 | diff 1024 lossless WebP | 1,550,452 | −59% |
| D2 | diff 1024 lossy q90 (**recommended**) | 319,080 | −91.6% |
| R1 | rough 1024 lossless WebP, 16-bit→8-bit range-preserved (227–245 band intact) | 298,038 | −95.6% |
| A1 | AO 1024 lossless WebP | 826,304 | −79.7% |

Rough conversion: `round(v·255/65535)` via numpy (PIL `point()` rejects lambdas
on I-mode) then LANCZOS — no clipping/normalization; `.g` fidelity verified
below. Lossy rough excluded per scope (no evidence need: lossless already −96%).

## 3. Numeric gates (true browser-canvas reference)

- D1: max 14, mean 1.57 · D2: max 21, mean 2.75 (resampler + q90; small)
- R1 `.g`: max 3, mean 0.6 — 16-bit scaling preserved correctly
- A1: max 31, mean 3.58 (≈1.4% AO-intensity delta at 0.65 strength)

## 4. Visual A/B (real scene, per-map CDP intercept, zero errors)

P0/P0.5/P0.91 stills each: D1, D2, R1, A1 indistinguishable from baseline —
color, roughness response, AO darkening, tiling, lighting all match. Motion
diff energy: d1 [9.43, 6.58], r1 [10.35, 6.77], a1 [10.37, 6.8], d2 [9.44, 6.62]
vs orig band [9.45, 6.64] — no excess shimmer. D2 passed after D1 per the gate;
−79% over D1 with no artifacts, so D2 (not D1) is recommended.

## 5. Combined (N2 live + D2 + R1 + A1, 5-frame fwd/rev)

Stills + 10 motion frames, zero errors. Terrain color, normal detail,
roughness variation, AO, tiling, lighting all consistent; fwd/rev motion
energies smooth (7–16, camera-travel proportional, no spikes). No cumulative
drift — no map excluded.

## 6. Savings (file bytes are the evidence)

- Set total: 39,183,521 → 1,994,244 bytes (**−94.9%**, −37.2MB per cold load).
- With 05C+05E: Dive payload roughly −60MB overall.
- GPU: unchanged (~18MB hill set; same RGBA8+mip resolutions). Draws unchanged
  by construction (same 4 slots). No FPS claimed; decode/downscale work reduced
  but not isolated.

## 7. Compatibility / risks

Plain WebP via `TextureLoader` (universal, no loader changes). 16-bit→8-bit
rough is one-way (original kept). Resampler gaps exist numerically but are
invisible at approved cameras (normalScale 0.6, underwater lighting, 8×8
tiling). Close-up ground camera unreachable non-invasively (standing limit).

## 8. Files

`.tmp-phase05f/`: `diff_1024_lossless.webp`, `diff_1024_q90.webp`,
`rough_1024_lossless.webp`, `ao_1024_lossless.webp`, `ref1024.mjs/json`,
`ab-maps.mjs`, `ab-combined.mjs`, `shimmer.py`, `metrics.py`(05D),
`shots/` (33 JPGs).

## 9. Verdict

**APPROVE REMAINING TERRAIN TEXTURES FOR PRODUCTION** — D2 + R1 + A1 (with
live N2). Rollback = deploy nothing (no prod change made); integration
rollback later = restore three suffixes, rebuild.
