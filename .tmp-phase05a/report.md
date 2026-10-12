# Phase 05A — Performance Audit (TREES PRIORITY)

Audit-only. No `src/`, shader, model, texture, animation, or config file was modified.
Diagnostics: `.tmp-phase05a/parse-glb.mjs`, `parse-tree-images.mjs`, `audit-trees.mjs`,
`audit-dive.mjs`, `glb-inventory.json`, `audit-results.json`, `audit-dive.json`,
`git-status.txt`, `dist-assets.txt`, `aquarium-sizes.txt`.

## 1. Overall baseline

- `npm run build` (04M session): exit 0; `dist/assets` dominated by project PNGs
  (tixconzer 3.0MB, footfit 1.8MB, emotion 1.7MB, heuristic 1.5MB, devpath 0.9MB);
  JS chunks ~0.3MB + BufferGeometryUtils 0.6MB; pre-existing >500kB warning only.
- Phase 04M transition profile (reused, comparable conditions): median 26.7ms,
  p95 ~40ms, dual-context overlap ~2.8s, contexts created 2 / lost 0.
- This phase idle-rAF sampling reads 13.3/13.5ms in ALL scenarios (vsync-quantized
  page-side rAF; cannot resolve GPU load — Tracing/Performance deltas used instead).
- Public `aquarium/` payload dwarfs `dist/`: first Dive load pulls ~100MB+
  (measured wire bytes, vite preview, no Content-Encoding on GLB).

## 2. AquariumDive rendering findings

- One `THREE.WebGLRenderer` (AA on, ACES, DPR cap 1.5 normal / 0.75 lite),
  PCFSoft 1024 shadows normal / off lite; custom 2-RT dissolve
  (`transitionScale 1/0.75`, `samples 2/0`); no EffectComposer.
- Dive foreground `tick()` + backdrop `tickBackdrop()` + Hero 30fps gated loop +
  perpetual DOM-fish `useFishDrift` rAF (IntersectionObserver flips a flag only —
  loop never stops; small but perpetual).
- No per-frame React state in Dive/Hero hot paths (refs + direct DOM;
  `setDebug` throttled, `setNear` on hysteresis flip). Global `useSectionProgress`
  re-renders App/Navbar/Dive per scroll pixel (throttled) — JS-side, separate
  from GPU cost.
- Draws/3s at 1440 Dive: P0 26442, P0.5 26208, P0.91 18571 (~147 draws/frame).
  Lite: 21056/20868/12699 (~20% fewer). 390: 20792/20608/13390.

## 3. Tree asset audit (highest priority)

Offline glTF parse + runtime CDP isolation (network-blocked `tree.glb`, same camera):

| Asset | Size | Geo | Mats | Images |
|---|---|---|---|---|
| `environment/tree.glb` | 33.25MB | 1 mesh / 1 prim, **706582 verts / 957316 tris** | 1 (`Material.001`, opaque, DoubleSide, no alpha) | 3× WebP 2048² (baseColor 0.17MB, normal 0.50MB, metalRough 0.06MB) |
| `lite/tree-lite.glb` | 7.03MB | 1 mesh / 1 prim, 149845 verts / 119772 tris (8× fewer) | 1, same setup | 3× PNG 512² (0.25/0.59/0.24MB) |
| `kelp.glb` | 31KB | 1122v / 576t, 2 mats | — | none |
| `coral.glb` | 7KB | 144v / 72t, 2 mats | — | none |

- Placement: `placeTreeClone` (`AquariumDivePrototype.jsx:2736`) does
  `src.clone(true)` — geometry/material shared, 4 desktop clones / 1 mobile
  (`TREE_CFG:2700`, `slice(0,1):2706`), per-clone sway entries. NOT InstancedMesh.
- Desktop tree cost: **~3.83M tris** (4 × 957K) at ~4 draw calls. Meadow
  grass/bushes already `InstancedMesh`; Hero plants instanced (64/36).
- Shadows: trees set NO cast/receive flags (inherit false); blob contact discs
  used instead. Tree shadow cost ≈ 0 today.
- Attributes: POSITION+NORMAL+UV+INDEX only. No Draco/Meshopt/KTX2
  (`extensionsUsed`: `EXT_texture_webp`, `KHR_materials_specular` only).

## 4. Texture/material inventory + decoded estimates

- tree.glb: 3× 2048² → 16MB each RGBA, ×1.33 mips ≈ **~64MB GPU** (shared across
  clones — not ×4). Transfer only 0.73MB (WebP already efficient).
- tree-lite: 3× 512² PNG → ~1MB each, ≈ **~4MB GPU**, but **1.08MB wire — larger
  transfer than the 2048² WebP.** Format matters more than resolution here.
- Terrain 2K set: normal 24.6MB + rough 6.8MB + AO 4.1MB + diff 3.8MB wire
  (≈39MB); decoded estimate ≈ 80MB+ GPU (2K RGBA ×4 with mips). Biggest memory
  item after trees.
- Single tree material ⇒ atlas gives **nothing** (already 1 draw per clone).

## 5. Geometry/draw-call assessment

- Full vs trees-blocked (1440, same Dive positions): draws −1130/−670/−718 per
  3s (~4–6 draws/frame of ~147 ⇒ **~4% of calls**); scriptMs 537→548 / 522→520
  / 903→874 (noise); styleMs unchanged. **Trees cost vertex throughput, not
  calls or main-thread JS.**
- Runtime tri counts unavailable without app hooks (probe is DEV-only);
  offline totals are the evidence: trees ≈ 3.8M vs floor 29K + fish ~20K each.

## 6. Full vs trees-disabled comparison (equivalent cameras)

| Pos | Full draws/3s | No-trees | Δ | scriptMs Δ |
|---|---|---|---|---|
| P0 | 26442 | 25312 | −4.3% | +2% (noise) |
| P0.5 | 26208 | 25538 | −2.6% | −0.3% |
| P0.91 | 18571 | 17853 | −3.9% | −3% |

Conclusion: disabling trees barely moves calls or JS — bottleneck is triangle
rasterization/vertex shading on GPU (not directly timed; stated, not claimed).

## 7. Compression feasibility

- **KTX2/Basis**: three 0.186 ships `KTX2Loader`, app wires only bare
  `GLTFLoader` — needs loader + transcode wiring (05B work). Would cut the
  ~64MB tree + ~80MB terrain GPU footprints; transfer win small for trees
  (0.73MB already) but large for terrain PNGs (31MB). Transcode-at-load cost
  to be measured in 05B.
- **Meshopt/Draco**: modules present, unwired. Tree geometry ≈ 32.5MB of the
  33.25MB file — Meshopt ~40–50% smaller transfer; Draco slower decode.
  Transfer-only; zero runtime tri change. Do NOT confuse with simplification.
- **Resolution**: 2048→1024 = 64→16MB GPU (4×); lite 512² (≈1MB incl. mips)
  already ships and is deemed acceptable at distance — 1024² is the sane 05B
  default, 2048 only if close-up stills demand it.
- **Atlas**: rejected (single material, 1 draw/clone — nothing to merge).
- **WebP note**: tree WebP transfer < lite PNG transfer. Keep WebP/KTX2, not PNG.

## 8. WebGL overlap

04M numbers stand: ~2.8s dual rendering, 2 contexts, Hero parks at 76% /
hidden ≥80%, Dive resumes <32%. Necessary for the crossfade; only post-submerge
tail is shortenable in 05B. No change made.

## 9. React/GSAP findings

Per file:line map (explore): single shared scroll throttle
(`useSectionProgress.js:68,139`); Hero scrub via frame-subscribers (no state);
all GSAP timelines owned + killed (`HeroAquarium:90 media.revert`,
`App:291 magnetic kill`, `Navbar:160 dock kill`, `Projects:696 kill`);
ScrollToPlugin + ScrollTrigger absent (only core/timeline). No JS bottleneck
attributable to GSAP. `useFishDrift` perpetual rAF is the only always-on loop.

## 10. Network/loading findings

Wire bytes (1440 Dive load): tree.glb 34.9MB, terrain normal 24.6MB, floor
7.9MB, rough 6.8MB, fish 4–5MB ×5, AO 4.1MB, diff 3.8MB — **no
Content-Encoding** from preview (production CDN may compress; flagged).
Trees load during Dive build (`loadAsync:2832`, required path) — necessary but
unprogressive; lite switches URL only. Figma iframe/audio not measured this
phase (carousel/modal untouched by design).

## 11. Mobile

390 full: 20792 draws/3s (1 tree + smaller buffer); lite 390 lower script/style.
Emulation only — no real-GPU claims.

## 12. Ranked opportunities

| Pri | Bottleneck | File/asset | Measurement | Likely cause | Proposal (05B) | Benefit | Visual risk | Complexity | Regress. risk | Verify |
|---|---|---|---|---|---|---|---|---|---|---|
| P0 | Initial transfer ~100MB | `tree.glb` 35MB + terrain 39MB + fish ~25MB | wire bytes | uncompressed 33MB model + 2K maps, no encoding | tree-opt variant + terrain 1K default + keep WebP; server compression | load time / data | low | med | low | CDP bytes + load timing |
| P0 | 3.8M tree tris desktop | `tree.glb` 957K×4 | offline +4% call Δ, JS flat | single 957K primitive cloned | decimate to ~150–250K / LOD / instance | GPU vertex load | med (silhouette) | med | med | stills + draw/tris A/B |
| P1 | ~64MB tree + ~80MB terrain GPU | 3×2048² + 4×2K maps | 21.3MB/img w/ mips | 2K everywhere | 1024² default (16MB), KTX2 eval | memory/upload | low | med | low | `memory` + stills |
| P1 | Perpetual fish rAF | `useFishDrift.js:111` | code | never cancelled | stop when hidden | tiny CPU | none | low | low | trace |
| P2 | 2.8s dual-context overlap | handoff bands | 04M profile | crossfade tail | shorten post-80% | GPU time | low | low | med | overlapMs |
| P2 | PCFSoft 1024 + 2-RT dissolve | Dive `1853/1018` | code | full-res RTs | measure; scale RTs if hot | GPU | low | low | med | paint/composite |
| P3 | KTX2/Draco/Meshopt wiring | loaders | modules present, unwired | — | prototype-gated | mem/xfer | low | med | med | A/B |
| — | Atlas | — | 1 mat / 1 draw | n/a | **rejected** | none | — | — | — | — |

Hypotheses labeled: GPU vertex-bound claim is inferred (CPU flat + tri totals),
not GPU-timed.

## 13. Recommended 05B tree prototype

1. Preserve originals (in repo; rollback = URL swap at `:2707`).
2. One `tree-opt.glb`: decimated ~150–250K tris, 1 material, 3× 1024² WebP,
   same silhouette/branch structure; optional KTX2 twin.
3. A/B at P0/0.5/0.91 + Hero 45% stills, normal vs opt vs lite: draws, script/
   style/paint, wire bytes, stills diff; desktop 4-clone + mobile 1-clone.
4. Roll out winner; terrain 1K + encoding + fish-rAF stop as follow-ups.
5. Rollback: revert URL + delete variant. No other scene element touched.

## 14. Risks / limits

Page-side rAF quantized (13.3ms) — no FPS claims from it. No GPU timer queries;
no physical mobile GPUs. Preview (no) encoding ≠ production CDN. Probe/debug
paths are DEV-only, so runtime tris came from offline parse + draw interception.
Sinefolis embed, audio, modal paths unmeasured by scope.
