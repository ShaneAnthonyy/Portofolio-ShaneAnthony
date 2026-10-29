# Regression tests

Run from the repository root against a production build. Tests use Node's built-in
WebSocket/fetch APIs and Chrome DevTools Protocol; no Playwright, Python or extra
npm dependencies are required. Use Node 22+ and a current Chrome or Edge with WebGL.

## Start the test environment

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Keep preview running. In another PowerShell terminal, start a dedicated headless
browser with a temporary profile (do not use your normal browser profile):

```powershell
$testProfile = Join-Path $env:TEMP ('portfolio-regression-' + [guid]::NewGuid().ToString('N'))
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --remote-debugging-port=9223 --no-first-run --no-default-browser-check --enable-webgl --ignore-gpu-blocklist "--user-data-dir=$testProfile" about:blank
```

For Edge, replace the executable with
`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
The harness creates and disposes an isolated browser context for each invocation.
Run suites sequentially so focus emulation, cache clearing and timing do not compete.
`CDP_PORT` overrides browser port 9223. `DIVE_URL` overrides the default app URL
for the shared harness; the loading matrix specifically targets port 4173.

## Run the retained regression suites

```powershell
Get-ChildItem tests/check-*.mjs | Sort-Object Name | ForEach-Object {
  $browserArgs = @()
  if ($_.Name -in @('check-world-time.mjs', 'check-minecraft-sky.mjs', 'check-world-presentation.mjs', 'check-appearance-migration.mjs')) { $browserArgs = @('--browser') }
  node $_.FullName @browserArgs
  if ($LASTEXITCODE -ne 0) { throw "Failed: $($_.Name)" }
}
node tests/resource-audit.mjs regression
if ($LASTEXITCODE -ne 0) { throw 'Resource lifecycle failed' }
node tests/loading.mjs regression
if ($LASTEXITCODE -ne 0) { throw 'Loading matrix failed' }
```

Each suite is also runnable individually with `node tests/<filename>`.

| Suite | Retained coverage |
| --- | --- |
| `check-projects.mjs` | Corrected **17/17** suite, preserved unchanged: 192 responsive/project/time/performance combinations; rapid input, keyboard/focus, six dialogs, touch, drag, resize/reduced-motion interruptions and continuous morphing. |
| `check-projects-lite.mjs` | Lite detail panels in Daytime/Night on desktop/mobile: opaque background, no blur, readable text contrast, focus and viewport fit. |
| `check-aquarium-ground.mjs` | 18 desktop/mobile/time/Lite views; approved grass, 124x124 repeat, detail maps, opaque material, terrain-aligned stand/sign shadows, texture loads and screenshots. |
| `check-ground-lifecycle.mjs` | Replay resource identity, paused drawing, exact shadow disposal, Lite assets and Reduced Motion bypass. |
| `check-context-lifecycle.mjs` | Three Reduced Motion roundtrips, final GPU release, exact scene-resource disposal, Lite reuse, visibility/resume, parking/replay, public React root unmount and fresh re-entry. Test-only response instrumentation captures the root; production has no debug API. |
| `check-hero-readability.mjs` | Rendered title contrast with a 3.2:1 safety margin and subtitle 4.5:1 at all seven times on desktop/mobile; stable typography bounds and frameless replay. |
| `check-forest-lifecycle.mjs` | Tree counts, shared geometry/materials, responsive resizing, asset requests and replay reuse. |
| `check-dive-landing.mjs` | Precise magnetic landing, stable centered Hero, navbar docking and continuous frame geometry. |
| `check-dive-interruptions.mjs` | Touch/keyboard direction, navigation ownership, resize, page visibility, live Reduced Motion and re-entry. |
| `check-dive-replay.mjs` | Cold-load Hero prewarm, retained canvas across reverse scrolling/replay, replay reset, immediate scrolling after unlock and repeated landing. |
| `check-dive-mobile.mjs` | Native touch landing, centered mobile Hero and immediate Reduced Motion landing. |
| `check-dive-webgl.mjs` | Dive/Hero renderer handoff, paused drawing and standalone WebGL preview. |
| `check-surface-integration.mjs` | Surface/Hero/About clipping, hysteresis, section visibility, Lite/Reduced Motion, replay and mobile resize. |
| `check-audio.mjs` | Real audio playback, pause/resume, loop/volume and reuse of one audio element. |
| `check-viewports.mjs` | 11 desktop/tablet/mobile/landscape sizes; asserts page/dock/title/legend fit and 44px touch targets; saves screenshots. Promoted from the observation-only viewport probe. |
| `resource-audit.mjs` | Five Lite roundtrips, four replays, paused renderers/mixers, shared tree resources, 12 modal cycles, resize/background and Reduced Motion unmount/remount. Records heap, GPU resource and listener counts for inspection; does not impose machine-specific memory thresholds. |
| `loading.mjs` | Cold/warm loading gate and usable-page smoke matrix across nine viewport/mode combinations (18 loads); saves network, timing, resource and screenshot evidence. Timing/network values are diagnostic, not performance budgets. |

## World Time and appearance regression checks

All suites target the standard production build. No appearance opt-in flag or
second bundle is needed. Deterministic checks run without Chrome:

```powershell
node tests/check-world-time.mjs
node tests/check-minecraft-sky.mjs
node tests/check-world-presentation.mjs
node tests/check-appearance-migration.mjs
```

Add `--browser` to each for its production browser coverage. The shared harness
accepts `minutes` for a fixed canonical time, `legacyTheme` only for deliberate
obsolete-storage migration tests, and `colorScheme` for OS-preference independence.
`setWorldTime(minutes)` uses the existing controller to select Manual time.

- `check-appearance-migration.mjs`: production source contract, Live startup,
  local clock, absent manual-theme control/attribute, old Light/Dark/invalid/absent
  storage, unrelated-storage preservation, blocked obsolete-key removal, Manual
  navigation stability, reload-to-Live policy, Contact Copy callback/feedback,
  and frameless Dive Again geometry/keyboard focus.
- `check-world-time.mjs` / `world-time-browser.mjs`: continuous sampling, one
  shared clock timer and subscription cleanup, all presets, native pointer/touch/
  keyboard slider input, mode switching, unchanged App render/resource ownership,
  Hero water, parked/replayed scenes, dynamic light bearing, terrain-aligned
  shadows and reversible twilight/midnight boundaries.
- `check-minecraft-sky.mjs`: fixed resource ownership, square sun/moon, visible
  periodic/reversible cloud pixels, bounded wind, Lite wind disable, tab pause,
  parked/replayed sky, exact disposal, Reduced Motion and failed-WebGL fallback.
- `check-world-environment.mjs`: one shared CSS/SVG environment, complementary
  Hero/content ownership, responsive portals, local palette, no App rerenders or
  GL allocations from time changes, paused hidden scenes and static fallbacks.
- `check-world-presentation.mjs`: all-minute palette bounds plus the seven-hour
  desktop/mobile Normal/Lite/Reduced Motion rendered-pixel contrast matrix,
  adaptive glass/night edges, modal focus/scroll lock and native Skills pointer,
  touch and keyboard interactions. Body/control threshold is 4.5:1, large/focus
  3:1; thresholds are unchanged. `--quick` is diagnostic only, not final acceptance.

Ground/shadow/lifecycle and Hero/About integration checks now target the same
production appearance. Ground checks keep all 18 views, the 124×124 texture repeat,
detail maps, opaque material and terrain clearance assertions; broad shadow
strengths follow the canonical sample, while all five 0.82 contact cores remain
fixed. Ground lifecycle always checks mapped key-shadow cleanup. The corrected
Projects suite retains all **17 checks** and 192 responsive/project/time/performance
combinations, using Daytime/Night instead of retired binary UI themes. Lite project
details retain their opaque no-blur and readable contrast requirements.

The fixed dark loading/fallback defaults are not a second selectable appearance.
No legacy preference controls production rendering. Protected historical assets
remain available in the source/rollback archive. One-off migration screenshots,
profiles, manifests and reports live outside the repository.

## Reusable performance diagnostic


### Scroll profiler

The scroll profiler is retained because it independently exercises cold and repeated
forward/reverse camera travel and records shader/upload/render/frame timings. It
asserts no WebGL context loss; timing values require comparison on the same machine.
Historical baseline/after Python matrices and eager-fish A/B journeys are archived.

```powershell
node tests/profile.mjs measurements 1440 900 --metrics-only --no-trace
node tests/profile.mjs measurements 390 844 --metrics-only --no-trace
```

Each command runs three natural forward/reverse passes and two controlled scrub
forward/reverse passes. Add `--quick` for one natural pair. Omit `--no-trace` for
Chrome trace capture, or `--metrics-only` for camera-position screenshots as well.
Use `measurements` as the output argument to keep generated artifacts ignored.
Optional `--lite`, `--night` and `--gpu` select profiling conditions. The legacy
`--inactive` and `--isolate-vars` flags are diagnosis-only overrides, not acceptance runs.

## Harness, fixtures and outputs

- `browser.mjs`: shared CDP transport, isolated context, input, viewport/mode setup,
  frame sampling, screenshots and cleanup. Required by every retained suite.
- `fixtures/early.js`: pre-navigation WebGL/resource/RAF instrumentation. Required
  by ground, ground lifecycle, loading and resource audit checks.
- `fixtures/instrument.js`: Three.js scene/camera/mixer instrumentation for `profile.mjs`.

Fixtures run only inside test pages and are not imported by production code. Generated
JSON, traces, logs and screenshots are ignored under `measurements/`, `screenshots/`,
`loading/`, `regressions/`, `logs/` or the tests root. Browser emulation covers mobile
layout/input, not physical-device GPU or Safari compatibility.

## Archived utilities

The 2026-10-16 test audit checked package scripts, repository callers, imports and
fixture reads before removal. Obsolete probes, duplicated carousel diagnostics,
historical Python runners, the orphaned forest pixel fixture and old logs were copied
and SHA-256/size verified before repository removal. The exact file list, reasons,
manifest, original viewport probe and verification results live outside Git at:

`C:\CODE\ReactWeb\Portfolio-Shane-Archive\2026-10-16-tests-audit`

See `FINAL-REPORT.md` and `MANIFEST-sha256.json` there. Restore archived files to
their original `tests/` paths and verify their hashes if historical work is needed;
phase-specific tools still require their historical snapshots. No package script or
dependency was removed. Other utilities under `scripts/` were outside this audit.
