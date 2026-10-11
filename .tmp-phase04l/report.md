# Phase 04L continuation — verification report

Completed against the existing working tree, without restoring earlier versions. Production browser checks used local Vite preview on port 4173 and headless Microsoft Edge through CDP.

## Handoff and preservation

The supplied code already had the magnetic easing helper, directional touch cancellation, shared GSAP dock, Hero prewarming, and three browser scripts. It still scrolled toward the end of the 400vh Dive spacer, collapsed the spacer at completion, and reset scrollY afterward. Separate dock settling and the renderer's trailing interpolation could continue after arrival.

The original production build and arrival-math check passed (exit 0). The original desktop landing test passed but sampled only after arrival. The original mobile run failed at scrollY=80 (exit 1); replay failed on a residual dock transform of 0.0196px (exit 1). These were actual Node failures, not PowerShell output-pipeline errors.

The current mobile reduced-motion branch first opened an already-unlocked Hero, then scrolled 3,000px and 3,550px before asserting scrollY=0. That setup contradicted normal post-arrival scrolling. It now verifies immediate alignment, completed lifecycle, no magnetic tween, no Dive renderer or Hero canvas, dock settlement, subsequent normal scrolling, and immediate reduced replay. The described screenshot assertion “s.to” is absent from the current mobile file; the replay file's “s.tO” title-opacity assertion was retained and passes. The exact earlier screenshot revision is unavailable.

Hash comparison against the captured handoff confirms Projects.jsx, projects-motion.css, About.jsx, project data, the music controller, and src/scenes/heroAquarium.js are unchanged. Existing scene assets, posters, project banners, untracked files, and approved visual designs were preserved. No dependencies were installed.

## Focused repairs

- Retained the existing magnetic easing and scene. Activation waits until the rendered Dive genuinely reaches the arrival region.
- Collapsed the spacer at magnetic takeover while preserving the existing fixed Hero node and its geometry. Rebased the document's scroll coordinate to the remaining Dive distance, then used one GSAP timeline to move that residual distance to the actual settled Hero target, zero.
- Gave camera/reveal/docking a stable normalized landing value independent of collapsed spacer dimensions. Suppressed shared React scroll notifications during this owned movement and refreshed them on release.
- Held the exact renderer endpoint after completion; removed the extra dock settling tween and its unlock-triggered rebuild. The prepared Hero canvas stays mounted through arrival.
- Stopped native gesture momentum during landing, preserved scrollbar geometry, and restored scrolling on release. A held touch retains the completed frame until touchend; touchstart alone does not cancel.
- Preserved reverse-input cancellation and re-entry. Added live reduced-motion notification to the existing shared progress hook, retaining the same MediaQueryList for listener cleanup. Cleared held-touch state when input handlers detach. Prevented locked Navbar links from starting competing scroll navigation.
- Skipped the separate Hero typography entrance during Dive arrival. Restored the standalone Dive reveal's missing rp value and avoided unused integrated Hero-mount updates.

## Continuity and settled geometry

All 32 cases passed: widths 375, 390, 768, 1024, 1440, and 1920; additional 390×500 and 1440×540 short screens; each in Dark, Light, Lite, and Reduced Motion.

The numeric scroll coordinate is intentionally rebased at takeover. It is not claimed to be continuous at that boundary. Browser frame measurements verify that the visible Hero remains continuous: maximum headline movement across collapse and unlock was x=0.0000px / y=0.0000px; maximum Hero top displacement was 0.0000px. Every final scrollY was 0, with no About exposure, residual dock transform, or later scroll correction. The final frame remained stable beyond two seconds.

The existing fixed Hero presentation was sufficient. No duplicate overlay, extra text, or fixed-overlay crossfade fallback was added.

| Viewport | Settled Hero rect | Headline center x, y | Dock x, y |
|---|---|---|---|
| 375x812 | 375 × 812, top 0 | 187.50, 400.06 | 121.66, 28.00 |
| 390x844 | 390 × 844, top 0 | 195.00, 416.06 | 136.66, 28.00 |
| 768x1024 | 753 × 1024, top 0 | 376.50, 491.03 | 545.66, 20.00 |
| 1024x768 | 1009 × 768, top 0 | 504.50, 357.84 | 801.66, 20.00 |
| 1440x900 | 1425 × 900, top 0 | 712.50, 423.37 | 1117.16, 20.00 |
| 1920x1080 | 1905 × 1080, top 0 | 952.50, 513.37 | 1357.16, 20.00 |
| 390x500 | 390 × 500, top 0 | 195.00, 244.06 | 136.66, 28.00 |
| 1440x540 | 1425 × 540, top 0 | 712.50, 243.37 | 1117.16, 20.00 |

Desktop Hero width excludes the native 15px scrollbar gutter. The headline is centered within that actual content width. Mobile uses the full viewport width. The role remains in the approved layout below the headline.

Each case records before activation, first frame at or above 20%, 40%, 60%, 80%, 100%, and over two seconds after completion, plus all intervening sampled frames. Recorded values include scrollY, Hero rect, title center, dock rect, progress, magnetic tween ownership, and renderer lifecycle states. Dock checks compare its measured origin/destination and eased progress; progress continuity is independently bounded. This replaced an incorrect fixed pixel-speed bound that rejected the longer 1920px Lite path.

A completed GSAP tween can precede React's unlock commit by one frame. The landing assertion permits that interval only at progress=1, scrollY=0, with no tween and a cleared dock transform. It does not permit incomplete or drifting frames.

## Input, modes, and rendering

Passed: genuine mobile swipe journey; touchstart without cancellation; held-touch release; reverse and forward touch; reverse wheel and forward re-entry; reverse and forward keyboard; normal swipe/keyboard scrolling immediately afterward; Navbar ownership and post-dock navigation; resize recovery; page visibility/lifecycle recovery; live reduced-motion change; first arrival followed by two Dive Again journeys; and replay after reduced motion changes during a held touch.

Reduced Motion skips cinematic travel, uses the aligned static Hero, and creates neither a Dive renderer nor a Hero canvas. Lite preserves the static Hero poster and the existing lower-quality Dive path; it adds no Hero WebGL renderer.

Instrumented WebGL draw calls confirm prewarming prepares a frame without sustained dual rendering. Over the waiting sample, Hero draw calls remained 12 → 12 while Dive increased 13369 → 17797. After arrival, Dive remained 19347 → 19347 while Hero increased 102 → 228. Canvas identity is unchanged across landing. The standalone Dive reveal also passes.

## Checks and evidence

All final checks below exited 0. No critical motion test remains failing.

- npm run build: exit 0
- node scripts/check-arrival.mjs: exit 0
- node scripts/check-hero.mjs: exit 0
- node scripts/check-dive-mobile.mjs: exit 0
- node scripts/check-dive-landing.mjs: exit 0
- node scripts/check-dive-replay.mjs: exit 0
- node scripts/check-dive-interruptions.mjs: exit 0
- node scripts/check-dive-matrix.mjs: exit 0
- node scripts/check-dive-webgl.mjs: exit 0
- git diff --check: exit 0
- node scripts/capture-dive-motion.mjs: exit 0

The Vite build retains its existing warning about a chunk exceeding 500kB. The first development lifecycle test was invalidated by Vite reloading after its socket disconnected during page freezing; the production lifecycle check passes.

- [Motion filmstrips](motion-review.html): 14 selected actual rendered browser frames across desktop and mobile.
- [Motion measurements](motion-evidence.json)
- [32-case results and sampled stages](matrix.json)
- [WebGL draw-call measurements](webgl-draws.json)
- [Final command exit statuses](final-checks.json)
- Per-case JSON files contain full frame samples; PNG files show settled layouts.

## Files changed in this continuation

Source: src/App.jsx; src/components/AquariumDivePrototype.jsx; src/components/Navbar.jsx; src/components/Hero.jsx; src/components/HeroAquarium.jsx; src/animation/typography.js; src/hooks/useSectionProgress.js; src/index.css.

Existing checks completed: scripts/check-dive-mobile.mjs; scripts/check-dive-landing.mjs; scripts/check-dive-replay.mjs.

New checks/helpers: scripts/dive-browser.mjs; scripts/check-dive-matrix.mjs; scripts/check-dive-interruptions.mjs; scripts/check-dive-webgl.mjs; scripts/capture-dive-motion.mjs. Evidence and handoff backups are in .tmp-phase04l/.

## Performance and limits

For animated matrix cases, median sampled frame intervals ranged 13.4–14.1ms and per-case p95 ranged 17.6–66.9ms. These are browser rAF wall-clock intervals using headless/software WebGL, not GPU timings or a guarantee of 60fps. Some slow frames remain in this environment. Motion capture runs add readback overhead and were kept separate from these timing measurements. No new scene, canvas, shader, render target, postprocessing, dependency, or permanent animation loop was added.

Testing used Edge desktop and touch/device emulation. Physical iPhone Safari, real mobile GPU performance, and audible playback were not tested. Music playback code is unchanged. Phase 05 was not started.
