# Phase 05M — Cherry blossom expansion and mobile visibility

**FOREST EXPANSION AND MOBILE FIX SUCCESSFUL** in the verified Windows Chrome production preview. Normal mode now has **10 desktop / 6 tablet / 2 mobile trees**; two recognizable mobile canopies are demonstrated with actual screenshots and rendered pixel contributions. Only `src/components/AquariumDivePrototype.jsx` changed in production during this phase. No deployment or subsequent phase was started.

[Before/after gallery and motion player](index.html) · [Pre-change root-cause audit](mobile-audit.md) · [Exact source diff](production-diff.patch) · [Visibility assertions](measurements/visibility-assertions.json) · [Performance](measurements/performance-summary.json) · [Preservation](measurements/workspace-integrity.json)

1. **Root cause of mobile invisibility.** Both existing trees loaded successfully from the optimized cherry GLB, remained flagged visible, passed fit/grounding checks and intersected the real camera frustum in Normal and Lite. They were not entirely absent: their canopies were mostly outside the narrow portrait composition, with remaining fragments behind the aquarium. At 390×844 P0.5, the old projected canopy spans were about x=-201..83 and x=333..529; only ~29% of either width remained. Small dark edge fragments did not read as recognizable cherry trees. Fog/night grading reduced contrast but was not a loading or culling failure. A second issue was mount-only coordinate selection: resizing a desktop scene to mobile retained desktop tree positions. The diagnosis was recorded and reported before production changes.

2. **Exact mobile fix.** Repositioned the existing two trees using their projected world-space geometry: left center `(-11,-20)` → **`(-5,-12)`**, right `(12,-28)` → **`(5,-24)`**, in X/Z world units. Left fit multiplier remains 3.6; right changes 3.3→3.4. Yaw and sway phases are retained (0.2/2.5 radians; phases 0/3.8). The deeper right tree separates the canopies spatially. No third tree was needed. A small tree-only layout callback reuses the existing resize/quality path and grounding logic to move the same first two roots between desktop and mobile configurations. It also accounts for the already-parented ground translation when re-grounding. Short touch landscape views below 1100 px wide and 500 px high retain two mobile trees. Camera, fish/coral compact rules, materials, fog, lights, shaders and DOM are unchanged; there is no camera attachment or screen-space overlay.

3. **Existing and final counts.** Counts apply to scenes initialized at the listed viewport/mode; the original resident-population ceiling on later enlargement remains, as described in limitations.

| Viewport class | Normal before → after | Lite before → after |
|---|---:|---:|
| Desktop ≥1100 px | 6 → **10** | 4 → **4** |
| Tablet 720–1099 px | 4 → **6** | 3 → **3** |
| Portrait mobile <720 px | 2 → **2 visibly placed** | 2 → **2 visibly placed** |
| Tested touch landscape 844×390 | tablet-style placement → **2 mobile placements** | tablet-style placement → **2 mobile placements** |

Lite retains its existing rendering caps. Normal's full forest is 3,240 tree triangles versus 1,944 before; mobile stays 648. Clones continue sharing one geometry, one material and one texture from the same 28,576-byte, 324-triangle GLB.

4. **Exact new/adjusted positions.** The six original desktop configurations—including scales, yaw and phases—remain unchanged, and their initial root positions/scales match browser baselines exactly. New desktop entries follow them in the deterministic configuration:

| Added tree | Center X | Center Z | Existing fit multiplier | Yaw radians |
|---|---:|---:|---:|---:|
| Left hill | -35 | -46 | 4.1 | 2.9 |
| Right hill | 25 | -56 | 3.7 | 1.1 |
| Left background | -19 | -54 | 3.4 | 4.4 |
| Right inner background | 6 | -29 | 2.7 | 5.4 |

Mobile uses the two coordinates/scales in item 2. These configuration X/Z values center the model's measured bounds; the asymmetric source pivot produces small root-coordinate offsets. Exact actual root/world positions, scale and projected bounds are recorded in [desktop](after/1440x900-normal-dark-visibility.json) and [mobile](after/390x844-normal-dark-visibility.json). Y is calculated from the unchanged terrain, with the original 0.04 embedding and trunk-base sampling, rather than a fixed guessed height.

5. **Desktop composition.** Added staggered outer/rear hill trees and one smaller inner-background tree, with varied yaw and scale. Original near trees retain the framing; added depth does not create a uniform row or a wall. All four new trees contribute actual pixels in P0 rather than only existing in the scene graph. They remain behind the aquarium, with no tree bounds entering its Z volume. Screenshots cover 1440×900 P0/P0.5/P0.91 and 1920×1080. The tank, foreground fish, headline, sign and controls remain readable; no camera or approved asset changes were used to force visibility.

6. **Tablet composition.** Normal uses the first six original desktop placements, adding the previously omitted left/right far trees to the former four-tree layout. This preserves the existing tablet framing and fills the rear depth without a new tablet placement system. Verified 768×1024 and 1024×768; Lite 768×1024 retains three. Original corresponding root coordinates/scales and camera matrices match baseline captures.

7. **Mobile visual evidence.** Captured all three priority points at 375×812, 390×844, 390×500 and 430×932, in Normal/Lite × dark/light; also tested touch landscape. The final inspection matrix contains **24 configurations / 72 scene states**. Every phone P0 passes a two-canopy visibility check using projected clipped bounds and actual rendered differences, not object counts. The long portrait P0.5 states pass the same two-canopy check; short-screen P0.5 also retains meaningful canopy regions in the captured data. P0.91 is left to the unchanged aquarium-focused framing and dissolve.

For 390×844 Normal/dark, the following are approximate CSS-pixel areas changed inside each projected canopy region when hiding that tree alone, with shadow updates held fixed. They demonstrate actual rendered contribution, including through transparent glass; they are not percentages of pink pixels or a perceptual standard.

| Camera state | Before left / right | After left / right |
|---|---:|---:|
| P0 | 4028 / 3300 | 16734 / 9472 |
| P0.5 | 5842 / 4219 | 32022 / 18189 |

The diagnostic criterion is >1,500 CSS canopy pixels with >60×35 px clipped extent, supplemented by direct screenshot review. The right canopy at P0 is now almost fully within the viewport; the left and both elevated canopies are substantially more recognizable. Daylight clearly shows the existing pink texture; dark mode retains the approved lavender grading. [375 P0 dark](after/375x812-normal-dark-p0.png), [390 P0.5 light](after/390x844-normal-light-p0.5.png), [short Lite/light P0](after/390x500-lite-light-p0.png), [430 P0.5 light](after/430x932-normal-light-p0.5.png).

8. **Lite verification.** Tested all four phone sizes in Lite/dark and Lite/light, plus desktop/tablet and landscape Lite. The same optimized cherry asset is requested once per fresh scene; no substitute tree asset or material is used. Existing DPR/render-scale, shadow, fish-update and population caps are preserved. Canopy pixel assertions pass in Lite despite its intentionally lower render resolution. Reduced Motion was separately tested at all four phone sizes: it preserves the existing immediate Hero landing and bypasses Dive/WebGL, so trees are not artificially added to that accessibility path.

9. **Grounding.** Reused the existing interpolation over actual terrain triangles and lowest trunk-base sample. The three hills and terrain-generation block are byte-identical. New/repositioned roots remain fixed during sampled motion; existing grounding assertions verify submerged trunk corners within tolerance at four camera states in desktop dark/light and mobile Normal/Lite. Responsive checks prove dynamically placed mobile roots, including Y and scale, match the verified fresh mobile scene, and switching back restores desktop coordinates to 1e-10 tolerance. No new terrain geometry, floating-tree correction overlay or GLB pivot edit was introduced.

10. **Sway and motion.** Existing angular formulas, root pivots, amplitudes and phases for original trees are retained. New far trees use the existing far-tree attenuation. Four scene validations sample 2.5 seconds at each of four camera states and verify finite, changing, bounded sway with fixed root positions, plus continuous swimming of the expected fish population. Separate desktop and mobile native forward/reverse sequences capture **32 motion screenshots** and per-frame transforms. Assertions check fixed bases and original angular bounds throughout. Screenshot playback is visual evidence, not an FPS benchmark. [Desktop trajectory](motion/1440x900.json), [mobile trajectory](motion/390x844.json).

11. **Before/after performance.** Measured the actual displayed camera range P0.10–0.65, including the previous P0.62 first-use boundary, using the preserved Phase 05L profiler and camera mapping. Desktop baseline and final each include three native forward/reverse pairs and two controlled scrub pairs; mobile baseline has one native pair, final has the full ten passes. Cleared HTTP cache for fresh sessions. Hardware-rendered Windows Chrome/ANGLE/NVIDIA RTX 2060 was used; phone results are browser emulation. No quality reduction offsets the added trees.

| Composition / viewport | Passes | Median range ms | Highest pass p95 ms | Maximum affected-range ms | >50 ms |
|---|---:|---:|---:|---:|---:|
| baseline: 1440x900-normal-dark | 10 | 13.2–13.4 | 14.7 | 41.9 | 0 |
| baseline: 390x844-normal-dark | 2 | 13.3–13.4 | 14.6 | 15.8 | 0 |
| after: 1440x900-normal-dark | 10 | 13.3–13.4 | 14.6 | 19.1 | 0 |
| after: 390x844-normal-dark | 10 | 13.3–13.4 | 14.9 | 20.7 | 0 |

Whole-run maxima outside/inside that range were 41.9 ms baseline desktop and 23.4 ms final desktop; mobile baseline 48.5 ms and final 28.9 ms. Main-scene P0/P0.5 draws/triangles are **119 / 331,291 → 123 / 332,587** desktop, and **93 / 236,444 → 93 / 236,444** mobile. Desktop adds four main draws and exactly 1,296 tree triangles. Transparent callback counts stay 31 desktop / 19 mobile. Early-range renderer CPU observations remain comparable (about 2.28→2.38 ms desktop in the first matched forward pass); this is not a claim of lower GPU cost or a physical-mobile benchmark. Raw GPU query samples remain available in the profiles.

12. **Phase 05L freeze regression.** All **20 final scrolling passes** had zero intervals over 50 ms and zero new shader links, framebuffer creation, model-buffer uploads or texture uploads while crossing the range. Each measured intro used one stable Dive context with zero losses. The original CSS-variable gate in App and dissolve preparation/render/camera blocks are byte-preserved, as are the existing warm-up registration and quality settings. No application rAF loop was added. Handoff/hidden-tab tests verify renderer scheduling. One separate static P0.3 diagnostic observed an **83.2 ms** interval; four focused reverse-arrival static rechecks with tracing did not reproduce it (largest interval **31.8 ms**, no main-thread long tasks). Its original cause remains unattributed; it is retained in the evidence rather than presented as universally flawless pacing. [Static recheck](measurements/static-recheck.json).

13. **Exact files modified.** Production: only [AquariumDivePrototype.jsx](../src/components/AquariumDivePrototype.jsx), for tree configuration, count selection and reusable tree positioning on responsive changes. Temporary scripts, raw traces, screenshots and this report are under `.tmp-phase05m/`. Preservation checks cover **3015** pre-existing files: all other bytes remain identical, including App's Phase 05L change, assets, previous untracked phase artifacts, shaders, CSS, camera/GSAP code, Navbar, audio, carousel and original tests. No dependency or source comment was added. The source diff is against the pre-05M working tree, not HEAD, so earlier uncommitted work is retained.

14. **Build and regression exits.** Final `npm run build`: **0**, 5.97 seconds; the existing large-chunk warning remains. `git diff --check`: **0**. Baseline/final profiles, 24-case inspection matrix, all four scene validations, forest lifecycle, responsive/rotation checks, four Reduced Motion sizes, visibility assertions and preservation checks: **0**. Pure arrival and Hero fish path checks: **0**. Desktop motion: **0**; mobile motion initially hit a diagnostic CDP integer-speed parameter error, corrected and rerun with **0**, without production changes.

| Existing interaction check | Actual exit(s) |
|---|---:|
| `check-dive-landing` | 0 |
| `check-dive-webgl` | 0 |
| `check-dive-replay` | 0 |
| `check-dive-interruptions` | 0 |
| `check-dive-mobile` | 0 |
| `check-surface-integration` | 1 → 0 (output-folder retry) |
| `check-audio` | 0 |
| `check-projects` | 1 |

Hero/About integration initially passed all interaction assertions but exited 1 saving to a missing diagnostics directory; creating it and rerunning the unchanged test produced 0. Projects passes all **192 geometry combinations**, then retains its known unrelated **“all transient transforms cleared”** timing failure. The aggregate runners' historical exit 1 values are retained rather than rewritten as clean runs. No carousel code or unrelated assertion was changed. [Original regression exits](measurements/regressions.json), [additional runs](measurements/additional-exits.json), [corrected final checks](measurements/final-checks.json). No application/WebGL errors were observed in the verified captures; existing shadow-map warning and any favicon 404 remain outside this phase.

15. **Remaining limitations.** These are hardware-accelerated headless Chrome tests, not physical-phone or the user's interactive-browser measurements; driver/thermal/refresh and OS shader-cache behavior can differ. Pixel thresholds are diagnostics alongside reviewed screenshots. Original live time means clouds, title bob, fish poses and sway differ between before/after captures. The isolated static outlier is not attributed. As before, a scene initialized with a smaller viewport/Lite population retains that resident maximum if enlarged or upgraded later; a fresh Normal scene selects 10/6. Existing desktop-origin scenes do restore 10/6/2 correctly across the tested resize cycle, and phone-origin portrait/landscape retains its two corrected trees. Lite's intentional 4/3/2 cap and Reduced Motion's Dive bypass are preserved. No further optimization or feature phase was started.

16. **Final verdict: FOREST EXPANSION AND MOBILE FIX SUCCESSFUL.** The requested Normal forest expansion and two-tree mobile visibility are demonstrated in the actual rendered composition. Grounding, sway, unchanged cameras and the prior scroll-freeze fixes were verified with before/after images, motion data and repeated measurements. The existing Projects timing failure and test limitations remain explicitly recorded.
