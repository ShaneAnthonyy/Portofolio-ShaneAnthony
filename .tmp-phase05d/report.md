# Phase 05D — Terrain Normal-Map Prototype Report

Prototype-only. No production file modified. Originals preserved
(hashes in `originals.txt`).

## 1. Original inventory (verified, not assumed)

| Map | File | Bytes | Dims | Mode | Runtime cap | Wire share |
|---|---|---|---|---|---|---|
| normal | `grass_ground_nor_gl_2k.png` | 24,557,731 | 2048² | RGB | **512** (canvas downscale) | 63% |
| rough | `grass_ground_rough_2k.png` | 6,773,940 | 2048² | I (single) | 1024 | 17% |
| ao | `grass_ground_ao_2k.jpg` | 4,064,520 | 2048² | L (single) | 1024 | 10% |
| diff | `grass_ground_diff_2k.jpg` | 3,787,330 | 2048² | RGB | 1024 | 10% |

Material: `MeshStandardMaterial` + vertexColors, `normalScale 0.6`,
`RepeatWrapping 8×8`, AO on `channel 2` (UV set — verified in code, NOT the
blue channel), `aoMapIntensity 0.65`. Roughness samples `.g` (three standard;
render-verified, not assumed). Lite path uses single `grass_ground_lite.jpg`.

## 2. Corrected GPU-memory record

The 05A "~7MB" estimate was wrong (missed mipmaps + RGBA upload). Verified
assumptions: `TextureLoader`/canvas textures default to RGBA8 + generated
mipmaps (code changes neither). Actual hill set: 1024²×3 + 512²×1 RGBA ≈
**(5.6×3 + 1.4) ≈ 18MB**. All normal candidates resolve to the same 512 RGBA
texture → **GPU unchanged by construction; this phase is transfer-only.**

## 3. Candidates (PIL, zero installs)

| ID | Variant | Bytes | vs orig |
|---|---|---|---|
| N1 | 2048 lossless WebP (format-only) | 10,631,650 | −57% |
| N2 | 512 lossless WebP LANCZOS (**recommended**) | 550,822 | −97.8% |
| N2b | 512 PNG via browser's own downscaler (pixel-identical to runtime) | 804,801 | −96.7% |
| N3-q90 | 512 lossy WebP q90 (experimental, gated) | 111,504 | −99.5% |
| (q80/q70 files generated, untested: 66KB/46KB) | | | |

## 4. Pixel/angular metrics

- N1 vs orig: maxAbs 0.0 (pixel-identical; 0.028° float noise) — format is safe.
- N2 vs PIL-bilinear-512: mean 3.3°, p99 8.8° (resampler difference, LANCZOS vs bilinear).
- N2 vs TRUE browser-canvas-512: mean 14.0° — the runtime downscaler differs
  strongly from PIL on this high-frequency map. Neither resampler is ground
  truth; the approved look comes from the runtime path, hence N2b + visual A/B.
- q90 vs bilinear: mean 5.1°, p99 16.7°.

## 5. Visual A/B (real Three.js, CDP-intercept, correct MIME, zero errors)

P0/P0.5/P0.91 stills (1440) + 3-frame motion strips per candidate (15 + 3 stills
in `shots/`): N1, N2, N2b, q90 all indistinguishable from original — terrain
shading, tiling, lighting identical. Motion diff energy (frame-to-frame mean):
orig [9.45, 6.64], N1 [10.27, 6.83], N2 [9.42, 6.56], N2b [9.6, 6.62],
q90 [10.36, 6.79] — no excess shimmer anywhere.

## 6. Loading/rendering

- Real file bytes are the evidence (injected-response timings segregated, never
  presented as network proof). N2 saves 24.0MB per cold load.
- Draws/texture-count unchanged by construction (same 4 slots) — no run wasted
  re-proving it. Decode of 0.55MB WebP is trivially cheaper than 24.6MB PNG;
  isolated decode timing not measured (stated).
- rAF quantization caveat stands; no FPS claims.

## 7. Compatibility

Plain WebP via `TextureLoader` — universal in all modern browsers (no
`EXT_texture_webp` needed; that's a glTF-container extension). No loader
changes required. KTX2/packing: research-only, deferred (needs encoder tooling
+ loader wiring + transcode measurement).

## 8. Per-map recommendation

- **Normal: N2** — lossless, −97.8%, visually identical in stills + motion.
  N2b is the zero-deviation fallback (+0.25MB). q90 passed gates (−99.5%) and
  is disclosed as an option, but per the no-lossy-on-size-alone rule it is NOT
  the recommendation.
- Diff/rough/AO: not processed (scope gate: normal-first; pipeline validated,
  proceed on approval — same 1024-WebP recipe applies; rough `.g` / AO-UV2
  mappings already verified).

## 9. Risks / rollback

Resampler delta (14°) is real but invisible under normalScale 0.6 + underwater
lighting at approved cameras; close-up ground camera unreachable
non-invasively (stated). Rollback = deploy nothing (no prod change made).

## 10. Verdict

**APPROVE TERRAIN OPTIMIZATION FOR PRODUCTION** — normal map N2 first
(`nor_512_lossless.webp` pattern), diff/rough/AO 1024-WebP on approval.
Expected set total: ~39MB → ~2MB wire (−95%), GPU unchanged (~18MB).
