import { readFile, writeFile } from 'node:fs/promises'
const read = name => readFile(new URL(name, import.meta.url), 'utf8').then(JSON.parse)
const { results, errors } = await read('matrix.json')
const gl = await read('webgl-draws.json')
const evidence = await read('motion-evidence.json')
const checks = await read('final-checks.json')
if (results.length !== 32 || checks.some(c => c.exitCode !== 0)) throw new Error('Verification is not complete')
const rows = results.filter(r => r.name.endsWith('-dark')).map(r => {
  const f = r.samples.at(-1)
  return `| ${r.name.replace('-dark','')} | ${f.hero.width} × ${f.hero.height}, top ${f.hero.top} | ${f.titleCX.toFixed(2)}, ${f.titleCY.toFixed(2)} | ${f.dock.x.toFixed(2)}, ${f.dock.y.toFixed(2)} |`
}).join('\n')
let maxTitleX = 0, maxTitleY = 0, maxHeroTop = 0
for (const r of results.filter(r => !r.name.endsWith('-reduced'))) {
  const frames = await read(r.name + '.json')
  for (const f of frames) {
    maxTitleX = Math.max(maxTitleX, Math.abs(f.titleCX - frames[0].titleCX))
    maxTitleY = Math.max(maxTitleY, Math.abs(f.titleCY - frames[0].titleCY))
    maxHeroTop = Math.max(maxHeroTop, Math.abs(f.hero.top))
  }
}
const animated = results.filter(r => !r.name.endsWith('-reduced'))
const range = key => `${Math.min(...animated.map(r => r[key])).toFixed(1)}–${Math.max(...animated.map(r => r[key])).toFixed(1)}`
await writeFile(new URL('report.md', import.meta.url), `# Phase 04L continuation — verification report

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

The numeric scroll coordinate is intentionally rebased at takeover. It is not claimed to be continuous at that boundary. Browser frame measurements verify that the visible Hero remains continuous: maximum headline movement across collapse and unlock was x=${maxTitleX.toFixed(4)}px / y=${maxTitleY.toFixed(4)}px; maximum Hero top displacement was ${maxHeroTop.toFixed(4)}px. Every final scrollY was 0, with no About exposure, residual dock transform, or later scroll correction. The final frame remained stable beyond two seconds.

The existing fixed Hero presentation was sufficient. No duplicate overlay, extra text, or fixed-overlay crossfade fallback was added.

| Viewport | Settled Hero rect | Headline center x, y | Dock x, y |
|---|---|---|---|
${rows}

Desktop Hero width excludes the native 15px scrollbar gutter. The headline is centered within that actual content width. Mobile uses the full viewport width. The role remains in the approved layout below the headline.

Each case records before activation, first frame at or above 20%, 40%, 60%, 80%, 100%, and over two seconds after completion, plus all intervening sampled frames. Recorded values include scrollY, Hero rect, title center, dock rect, progress, magnetic tween ownership, and renderer lifecycle states. Dock checks compare its measured origin/destination and eased progress; progress continuity is independently bounded. This replaced an incorrect fixed pixel-speed bound that rejected the longer 1920px Lite path.

A completed GSAP tween can precede React's unlock commit by one frame. The landing assertion permits that interval only at progress=1, scrollY=0, with no tween and a cleared dock transform. It does not permit incomplete or drifting frames.

## Input, modes, and rendering

Passed: genuine mobile swipe journey; touchstart without cancellation; held-touch release; reverse and forward touch; reverse wheel and forward re-entry; reverse and forward keyboard; normal swipe/keyboard scrolling immediately afterward; Navbar ownership and post-dock navigation; resize recovery; page visibility/lifecycle recovery; live reduced-motion change; first arrival followed by two Dive Again journeys; and replay after reduced motion changes during a held touch.

Reduced Motion skips cinematic travel, uses the aligned static Hero, and creates neither a Dive renderer nor a Hero canvas. Lite preserves the static Hero poster and the existing lower-quality Dive path; it adds no Hero WebGL renderer.

Instrumented WebGL draw calls confirm prewarming prepares a frame without sustained dual rendering. Over the waiting sample, Hero draw calls remained ${gl.before.hero} → ${gl.waiting.hero} while Dive increased ${gl.before.dive} → ${gl.waiting.dive}. After arrival, Dive remained ${gl.landed.dive} → ${gl.after.dive} while Hero increased ${gl.landed.hero} → ${gl.after.hero}. Canvas identity is unchanged across landing. The standalone Dive reveal also passes.

## Checks and evidence

All final checks below exited 0. No critical motion test remains failing.

${checks.map(c => `- ${c.command}: exit ${c.exitCode}`).join('\n')}

The Vite build retains its existing warning about a chunk exceeding 500kB. The first development lifecycle test was invalidated by Vite reloading after its socket disconnected during page freezing; the production lifecycle check passes.

- [Motion filmstrips](motion-review.html): ${evidence.length} selected actual rendered browser frames across desktop and mobile.
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

For animated matrix cases, median sampled frame intervals ranged ${range('frameMedian')}ms and per-case p95 ranged ${range('frameP95')}ms. These are browser rAF wall-clock intervals using headless/software WebGL, not GPU timings or a guarantee of 60fps. Some slow frames remain in this environment. Motion capture runs add readback overhead and were kept separate from these timing measurements. No new scene, canvas, shader, render target, postprocessing, dependency, or permanent animation loop was added.

Testing used Edge desktop and touch/device emulation. Physical iPhone Safari, real mobile GPU performance, and audible playback were not tested. Music playback code is unchanged. Phase 05 was not started.
`)
console.log('Report written; max title drift', maxTitleX, maxTitleY, 'cases', results.length, 'runtime errors', errors.length)
