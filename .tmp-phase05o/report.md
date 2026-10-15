# Phase 05O — Character cinematic QA

[Full-scene screenshots and motion player](index.html) · [Exact phase diff](production-diff.patch) · [Actual command exits](measurements/validation.json) · [Workspace integrity](measurements/preservation.json)

1. **Activation relative to readiness.** Used an isolated Windows Chrome profile and the actual production preview, built before preview access. On the final cold-profile run, the first instrumented scene render was at 8.25s, both character assets were placed at 12.01s, and Enter became ready at 15.22s. Two roots and their existing mixers were constructed under loading, but there were **zero observed mixer updates** through preparation and a deliberate additional 10-second wait. Enter was clicked at 25.25s; both mixer clocks started at zero. The unrecorded real-time sequence then finished the Jockey at 8.506s; the Golem had completed both walks by 14.5s. Desktop activation now requires the existing healthy gate plus App's existing `gateEntered` signal. Portrait clocks additionally wait until displayed camera P≥0.40, where the elevated view can reveal the rear actors. Returning below that threshold pauses, without resetting. No delay timer, new production loop or shader-preparation change was added. [Cold-load clock samples](measurements/startup.json).

2. **Root causes.** Before correction, clocks ran behind the overlay, and the `p < 0.02` branch reset both encounters roughly every second. A visitor pausing at the initial composition therefore never reached walking; the first idle after Enter could also be shortened by invisible updates. The tested initial load did **not** exhaust the encounter under loading: repeated P0 resets kept it idle. Character height bounds were measured before updating their parent world matrix, placing roots about 1.65 units low. More seriously, the GLB position tracks encode zero-based offsets: Golem `Torso` bind Y=1.5 was overwritten with approximately 0.014, Jockey `Chicken_Body` bind Y=0.875 with near zero, and its `Rider_Torso` bind Y=0.3125 with near zero. This compressed the rendered bodies despite valid loader/mixer calls. The loaded clips are now cloned and their position values offset by the existing target node bind position. Original GLBs and rigs are untouched. The Jockey also faced backward: measured model-forward/travel dot averaged −0.999. Its native −Z heading is now accounted for at placement and responsive layout; final means exceed 0.996. Golem uses its existing +Z convention. [Preserved baseline](baseline/timeline.json), [pre-fix animated poses](intermediate/dark-before-binding-fix.json), [heading evidence](measurements/facing.json).

3. **Chicken Jockey visibility.** Exactly one root, original `idle`, `walk`, `run` clips. Corrected parent bounds, bind offsets, modest size increase and nearer waypoints reveal the chicken, attached rider and feet. The rendered full scene shows initial idle, first walk, both weighted actions during the sudden run transition, crossing, the left edge and its later hidden state. The departure endpoint lies beyond the displayed viewport; it is not removed mid-screen. The table below uses full-resolution framebuffer differences with only the actor hidden and shadow updates held fixed, so positive area measures actual body contribution rather than merely a projected box. World bounds and depth-tested visibility are retained in each sequence's JSON. [Dark timeline](after/dark/timeline.json), [light timeline](after/light/timeline.json), [phone timeline](after/mobile/timeline.json).

4. **Iron Golem visibility.** Exactly one approved seven-node Golem, unchanged 76,280-byte GLB, only `idle`/`walk`. Restoring the Torso bind offset recovers the intended proportions in animation. Its shorter, nearer route is separate from the Jockey. On phones, the initial candidate behind the left cherry canopy contributed zero pixels even though its box was in the frustum. The final phone route moves into the measured clear area; reviewed screenshots show the head, torso, arms and legs. The aquarium remains central and largest. No tree, hill, global light or spotlight was changed.

| Capture | Jockey projected size / contributing CSS pixels | Golem projected size / contributing CSS pixels |
|---|---|---|
| dark, initial-idle | 42.0×59.1 / 1309.6 | 76.6×175.5 / 11218.9 |
| dark, run-crossing | 38.0×65.2 / 1202.5 | 104.0×203.5 / 13374.3 |
| dark, second-walk | 51.7×61.8 / 0.0 | 106.9×205.3 / 9018.9 |
| light, initial-idle | 42.0×59.1 / 1342.0 | 76.6×175.5 / 11371.5 |
| light, run-crossing | 38.1×64.5 / 1212.6 | 103.9×203.5 / 13690.6 |
| light, second-walk | 51.6×61.9 / 0.0 | 110.6×205.6 / 9921.3 |
| mobile, initial-idle | 19.7×37.3 / 497.8 | 31.4×110.5 / 2002.2 |
| mobile, run-crossing | 21.4×35.5 / 352.0 | 33.5×111.0 / 2122.7 |
| mobile, second-walk | 21.9×34.7 / 0.0 | 57.1×111.4 / 4482.7 |


   These are representative measured states, not a promise of visibility from every camera/instant. Bounds are approximate and normalized to viewport size; scrollbar/canvas width can differ slightly. Occlusion uses the actual framebuffer. The zero Jockey contribution in second-walk captures is its completed, intentionally hidden state.

5. **Animation transitions.** Replaced the confirmed immediate `stopAllAction` switches with existing-mixer 0.16-second crossfades. The two active weights sum to one within measured tolerance, and joint transforms/quaternions stay finite and normalized. Root yaw turns smoothly through the route change. Position follows the existing sampled terrain height instead of interpolating endpoint heights across curved ground. Checks cover idle→walk→run and idle→walk→idle→walk; the Golem finishes with a short fade back to its existing idle instead of freezing mid-stride. Dominant-action changes occur about 0.08s after each state boundary because of the fade. Captures and node transforms showed no detached rider pieces, invalid bindings or pose teleport; no asset re-export was needed. Foot motion remains the approved stylized clip playback, not a physical foot-contact solver. [Animation assertions](measurements/animation-analysis.json).

6. **Final routes and timings.** Coordinates below are local X/Z on the existing ground; Y is the unchanged terrain sampler plus the measured model foot offset.

| Actor | Waypoints | Sequence |
|---|---|---|
| Jockey | (14,−18) → (11,−20) → (−30,−22) | Idle 2s → walk 2.5s → run 4s → hide after exit, 8.5s total |
| Golem | (−14,−16) → (−12,−16) → (−10,−17) | Idle 2s → walk 3s → idle 6s → walk 3.5s, 14.5s total, then idle |

   Portrait routes compress X by `min(1, aspect / 1.25)` without stretching the models. Phone Golem X starts at 3 and ends at `3 + 4 × lane`; its Z route stays −16→−16→−17. Its first walk averages 0.67 world units/s on desktop, replacing the previous 12-unit/3-second traverse. Jockey remains a single short, faster encounter. Models stay well behind the tank, so crossing its projected image does not mean glass intersection.

7. **Replay, reverse, suspension and cleanup.** Completed the initial encounter while holding P0, natural forward/reverse motion, repeated returns to P0, magnetic landing, **two Dive Again replays**, a 3-second hidden/frozen interval, resize during animation, parking, and Reduced Motion unmount. Minor scroll reversal never restarts an encounter. Only completion of the existing return lifecycle resets time, home position, yaw, idle action, visibility and active state. Same two actor UUIDs and same two registered mixers survive both replays. Hidden and parked clocks stay fixed; first resumed actor delta is zero. Unmount stops both mixers, uncaches both roots, and disposes the existing Dive renderer. Normal handoff has at most the existing Dive+Hero contexts; replay retires/losses the old Hero context, leaving one connected Dive context. A first harness incorrectly subtracted a prototype `dispose` count from cumulative allocations: Three's renderer disposal is an instance method. That harness failure (exit 1) is preserved; the corrected check observes actual canvas/context ownership, Hero losses and Dive instance disposal, and passes (exit 0). [Lifecycle record](measurements/lifecycle.json), [original harness failure](measurements/lifecycle-first-attempt.json).

8. **Production initialization.** Verified minified production bundles in Chrome, with no application exceptions or TDZ failures. Removed only the temporary `window.__diveCamera`, `window.__diveStats` and `window.__charRigs` hooks after locating their uses in archived 05N-B diagnostics; no functional application caller used them. Current verification hooks the installed Three module externally from the browser harness. No eager camera reference remains. Built before starting the single preview on 4173 because the initial probe found no server; reused it for every subsequent build. No repeated preview launch or connection retry loop was used.

9. **Visual and motion evidence.** The [gallery](index.html) contains the original production initial/walk/run screenshots, final dark/light/phone sequences, all responsive states, and a complete recorded Dive Again replay through both actors' timelines. The player uses actual Chrome screencast frames and captured wall-clock spacing. Three screenshots/readback states per sequence measure perceptual contribution; camera P0, elevated P0.30, downward P0.55, forest composition, and phone scenes are included. Diagnostic readback/capture can stall that recording; it is visual evidence, not an FPS benchmark. Some intermediate QA runs were deliberately stopped to incorporate proven binding, canopy and heading corrections; their partial metrics are not used as final performance results.

10. **Frame time and rendering.** Sequential captures used the same production scene, camera path, DPR, lights, water/glass and renderer settings. Each Normal desktop/phone run includes three native forward/reverse pairs and two controlled scrub pairs. The inactive control loads/prepares the same models, hides only their roots and skips their mixer updates from outside the application. Its first forward pass is the closest equivalent active/inactive comparison; subsequent passes naturally include the Jockey's exit. Metrics below are milliseconds in actual displayed P0.10–0.65, mapped from sampled camera XYZ rather than target scroll alone.

| Run | Median | p95 | Maximum | >50 ms |
|---|---:|---:|---:|---:|
| perf-desktop natural-1-forward | 13.4 | 22.5 | 37.4 | 0 |
| perf-desktop natural-1-reverse | 13.3 | 14.7 | 28.2 | 0 |
| perf-inactive natural-1-forward | 13.4 | 14.9 | 16.3 | 0 |
| perf-inactive natural-1-reverse | 13.3 | 14.9 | 16.4 | 0 |
| perf-mobile natural-1-forward | 13.3 | 15.0 | 17.1 | 0 |
| perf-mobile natural-1-reverse | 13.3 | 14.5 | 16.5 | 0 |
| perf-untraced-active natural-1-forward | 13.4 | 15.5 | 27.6 | 0 |
| perf-untraced-active natural-1-reverse | 13.3 | 14.7 | 16.6 | 0 |
| perf-untraced-inactive-control natural-1-forward | 13.3 | 14.9 | 27.6 | 0 |
| perf-untraced-inactive-control natural-1-reverse | 13.2 | 14.3 | 15.2 | 0 |


| Control, first forward pass | Draws/frame | Triangles/frame | Mixer CPU/pass | JS/pass | Style/pass | Contexts |
|---|---:|---:|---:|---:|---:|---:|
| perf-desktop | 184.0 | 334987.0 | 29.7 ms | 4006.8 ms | 390.9 ms | 1 |
| perf-inactive | 127.0 | 333883.0 | 0.0 ms | 3187.0 ms | 338.9 ms | 1 |
| perf-mobile | 151.0 | 237872.0 | 23.5 ms | 3353.5 ms | 343.8 ms | 1 |
| perf-untraced-active | 184.0 | 334987.0 | 23.3 ms | 2639.9 ms | 199.3 ms | 1 |
| perf-untraced-inactive-control | 127.0 | 333883.0 | 0.0 ms | 1819.7 ms | 148.8 ms | 1 |


   Draw/triangle entries are median submitted frame counts in the corresponding target interval; raw traces contain exact per-frame data. Mixer CPU is the measured sum of mixer-update spans over each complete pass. The two mixers remain resident; two update during the encounter, one after Jockey exit, zero when suspended or in the inactive control. Intro performance captures use one WebGL context, with zero unexpected losses. Shader links, framebuffers and texture uploads during measured passes are listed in [rendering summary](measurements/rendering-summary.json); initial asset requests and preparation remain under loading. Quantized approximately 13.3ms intervals do not establish an FPS improvement. Active/inactive controls measure bounded workload differences, not universal zero cost.

11. **Phase 05L freeze regression.** Across 20 final active desktop/phone passes, the affected displayed interval had 1 interval over 50ms; its worst interval was 53.5ms. This was an isolated desktop scrub frame at P≈0.118, with 42.0ms inside the renderer command span and a 46.1ms main-thread task. A separate 57.8ms first-forward interval at P≈0.089, before the specified range, included a 52.9ms task. Neither performed shader linking, target allocation or texture upload; mixer work was small (29.7ms summed across the complete first forward pass). These are render/runtime outliers, not evidence that the old repeated multi-second shader freeze returned. The exact driver/scheduling cause is unresolved, and the spikes are not discarded. Supplemental untraced active forward/reverse runs had no >50ms intervals (whole-run maxima 27.6/25.8ms); the correctly disabled actor control also had none (27.6/16.9ms). This bounds the observed result without attributing every difference to tracing. No repeated freeze or initialization work appeared at P0.62. Complete distributions, main-thread execution, long tasks/animation frames and GL events are in [desktop analysis](perf-desktop/analysis.json), [inactive analysis](perf-inactive/analysis.json), [phone analysis](perf-mobile/analysis.json), [untraced active](perf-untraced-active/analysis.json), and [untraced inactive](perf-untraced-inactive-control/analysis.json). Camera keys/interpolation, the hidden-atmosphere CSS fix and transition preparation text are unchanged. Cold preparation still costs time under the loader; no quality reduction was made.

12. **Desktop, tablet and mobile.** Tested 1440×900, 1920×1080, 768×1024, 1024×768, 375×812, 390×844 and 390×500. 42 viewport/mode combinations pass, including dark/light Normal, dark/light Lite and dark/light Reduced Motion. Normal visible forest totals remain 14/8/3 (10+4, 6+2, 2+1). Lite remains 6/4/2. Original mobile tree positions and density are unchanged. Actors are present in Normal mobile; they wait through the frontal view, then play from the elevated view with fitted waypoints. Phone Golem is moved clear of the canopy; no tree was removed. Resize changes layout while retaining the same actors and clocks. [Full matrix](measurements/responsive.json).

13. **Lite and Reduced Motion.** Fresh Lite and Reduced visits request neither character GLB; Lite has no actor mixers and Reduced uses no Dive/Hero WebGL canvas. Switching an existing Normal scene to Lite hides/suspends the resident actors, and returning to Normal resumes them. Their absence on a scene initialized in Lite follows the existing initial-population policy; upgrading that already-mounted scene does not newly load actors until a normal initialization. Reduced unmount performs mixer cleanup. No extra renderer, animation loop or character cost was added to Lite.

14. **Exact files changed.** Production: `src/App.jsx` (passes existing Enter state) and `src/components/AquariumDivePrototype.jsx` (character readiness, rig offsets, heading, placement, terrain following, crossfades, replay/cleanup and obsolete QA globals). New diagnostics/evidence live only in `.tmp-phase05o/`; [manifest](files-manifest.json) lists every artifact. Preservation checks cover 3535 pre-existing files: none missing, only these two authorized source files changed. All assets, dependencies, CSS, Navbar, music, Hero/About, Projects, existing diagnostics and previous dirty/untracked work retain their bytes. No new source comments. [Exact phase-only diff](production-diff.patch), [integrity](measurements/preservation.json).

15. **Build and regressions — actual exits.** Final production build: **0** (existing >500kB chunk advisory only). `git diff --check`: **0**. Existing browser assertions are retained; only browser plumbing/output paths use the new diagnostic directory. Projects passed all 192 geometry combinations, then failed the known unrelated “all transient transforms cleared” timing assertion; both regression aggregate runners therefore exited 1. It was never weakened. An initial supplemental control omitted `--inactive`; its actual command is retained and excluded as a control. The corrected inactive command was run separately. The first extra quality probe (exit 1) tried a pointer click on the hidden Navbar mode button; the corrected runtime probe invokes that existing button's handler, retains all assertions and passes (exit 0). Actual visible Hero mode-control interaction also passed the forest/lifecycle regression.

| Check | Exit |
|---|---:|
| startup | 0 |
| lifecycle | 0 |
| cinematic-dark | 0 |
| cinematic-light | 0 |
| cinematic-mobile | 0 |
| responsive | 0 |
| perf-desktop | 0 |
| perf-inactive | 0 |
| perf-mobile | 0 |
| forest-lifecycle | 0 |
| arrival | 0 |
| hero | 0 |
| diff-check | 0 |
| check-dive-landing | 0 |
| check-dive-webgl | 0 |
| check-dive-replay | 0 |
| check-dive-interruptions | 0 |
| check-dive-mobile | 0 |
| check-surface-integration | 0 |
| check-audio | 0 |
| check-projects | 1 |
| untraced-active | 0 |
| perf-desktop-analysis | 0 |
| perf-inactive-analysis | 0 |
| perf-mobile-analysis | 0 |
| perf-untraced-active-analysis | 0 |
| perf-untraced-inactive-analysis | 0 |
| animation-analysis | 0 |
| facing | 0 |
| preservation | 0 |
| untraced-inactive-corrected | 0 |
| untraced-inactive-corrected-analysis | 0 |
| quality-lifecycle | 0 |


16. **Limits.** Results are hardware WebGL Chrome on this Windows desktop; phone/tablet results use emulation, not physical devices. The fresh profile and cleared HTTP cache do not prove OS/driver shader caches were flushed. The two isolated traced render intervals above remain recorded; zero jank on every device is not claimed. Dark-mode actors are intentionally subdued and can be briefly occluded during some views; a visitor who rapidly skips the environment can skip the encounter, while replay remains available. Both complete sequences were observable in the reviewed real scene captures. No pixel-perfect snapshot equality is claimed for live fish, foliage or time-based effects. Existing PCFSoftShadowMap fallback and bundle-size advisories remain. The unrelated Projects timing test remains outside this phase. No deployment was performed.

17. **Final verdict.** CHARACTER CINEMATIC QA SUCCESSFUL. Stopped after Phase 05O.
