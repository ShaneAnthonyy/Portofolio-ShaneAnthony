import { readFile, writeFile } from 'node:fs/promises'

const root = new URL('./', import.meta.url)
const read = name => readFile(new URL(name, root), 'utf8').then(JSON.parse)
const baseline = await read('baseline/profile.json')
const after = await read('after/profile.json')
const matrix = await read('matrix.json')
const integration = await read('integration.json')
const recordings = await read('motion/recordings.json')
const logBytes = await readFile(new URL('regressions.log', root))
const text = logBytes.toString(logBytes[0] === 255 && logBytes[1] === 254 ? 'utf16le' : 'utf8')
await writeFile(new URL('regressions.log', root), text.replace(/\0/g, '').replace(/^\uFEFF/, ''))
const fmt = value => Number(value).toFixed(1)
const rows = after.reports.flatMap((a, i) => {
  const b = baseline.reports[i]
  return [
    ['Frame interval median, ms', 'medianMs'], ['Frame interval p95, ms', 'p95Ms'],
    ['Intervals above 50ms', 'longFrames'], ['Whole-page JS, ms', 'scriptMs'],
    ['Layout, ms', 'layoutMs'], ['Style recalculation, ms', 'styleMs'], ['Main-thread Paint, ms', 'paintMs'],
  ].map(([label,key]) => `| ${a.width} × ${a.height} | ${label} | ${fmt(b[key])} | ${fmt(a[key])} |`)
})
const report = `# Phase 04M — Surface Break

Implemented only the Hero-to-About transition. No dependencies, heavy assets, new WebGL canvases, render targets, shaders, or source comments were added.

1. **Root causes and audit.** The departing Hero rectangle carried the old alpha mask out of view. A separately positioned bright band and uniform scale did not establish one spatial crossing, and the Dive renderer resumed too late. The previous mask's retained-above/reveal-below polarity was already correct. See the [ten-point baseline audit](audit.md) and [baseline crossing](baseline/1440-forward-45.jpg).

2. **Concept.** The aquarium environment stays in the viewport while the headline and replay control scroll naturally. A small tilt of the existing orthographic camera produces depth-dependent motion of fish and plants; restrained environment transforms and a separately moving reflection complete the approach. The curved water interface then recedes upward, leaving the existing underwater environment behind About.

3. **GSAP architecture.** One paused, one-unit timeline is scrubbed by the existing subscribeProgressFrame feed. Progress is clamp(-Hero.top / Hero.height, 0, 1). useGSAP and matchMedia own cleanup and responsive rebuilds. There are no added global scroll listeners, scroll tweens, snapping, artificial section heights, persistent animation loops, or per-frame React state updates. Existing page-level React scroll subscriptions were not refactored.

4. **Surface crossing.** A normalized SVG clip retains the aquarium above an asymmetric cubic curve. A thin shaded meniscus uses the same curve and travel. Desktop normal mode adds a clipped optical strip with a 1.5px blur and restrained contrast/saturation adjustment. It is confined to a 10%-height region before clipping; mobile and Lite omit it. This is an optical approximation, not a fluid/refraction simulation.

5. **Compositing and stages.** Approach begins at 0%; the edge starts entering around the first quarter of the scroll and crosses the viewport through the middle of the range. Aquarium remains above, existing Dive is exposed below. Surface elements recede completely before the 80% mark and are hidden thereafter. The original backdrop's atmosphere supplies the underwater descent. Only the settled Hero wrapper releases its stacking context, so About is painted above the world. About's contents and animation code are untouched.

6. **Reverse.** The same timeline seeks backward with native document scroll. Tests compare clip attributes, environment transforms, meniscus transforms, and visibility at matching forward/reverse positions. The existing poster always supplies a fallback. Returning from farther down the page prepares one Hero frame while the surface is hidden, then reuses that canvas as it emerges.

7. **WebGL handoff and cleanup.** Existing App hysteresis now receives surface-coverage bands: Dive resumes below 32% progress and parks again above the surface when reversing through 27%. Hero's existing 30fps loop stops at 76%, or immediately when the tab is hidden/prewarmed. It retains its context nearby, disposes beyond 1.8 Hero heights of travel, and prepares again below 1.45. Eight repeated boundary crossings preserved canvas identity. Settled About produced ${integration.after.hero - integration.before.hero} Hero draw calls during the sampled interval while Dive continued. Hidden-tab draw counters stayed unchanged. Original DPR caps and quality scaling remain intact.

8. **Preferences.** Dark/light surface colors use the established palette. Lite uses existing posters and the curved compositing with no Hero WebGL or optical strip. Reduced motion keeps the poster in document flow and disables clipping, held scenery, camera approach, reflection, and meniscus. Live switches and reduced-motion Dive Again passed.

9. **Responsive behavior.** ${matrix.length} combinations passed: 375×812, 390×844, 768×1024, 1024×768, 1440×900, 1920×1080, 390×500, and 1440×540; each in normal dark/light, Lite dark/light, and reduced dark/light. Mobile uses smaller approach travel, 45% of the desktop curve amplitude, and no optical filter. Native touch and viewport-height resizing passed with no horizontal overflow or new scroll lock. See [matrix data](matrix.json) and the preference captures in preferences/.

10. **Exact files.** Product changes: src/components/HeroAquarium.jsx (timeline, surface markup, lifecycle), src/scenes/heroAquarium.js (four-line existing-camera setter), src/App.jsx (nearby-scene readiness latch and removal of obsolete comments), src/index.css (scoped surface styles and removal of old effects). Added verification: scripts/check-surface.mjs, scripts/check-surface-integration.mjs, scripts/profile-surface.mjs, scripts/capture-surface-motion.mjs. Evidence and this report are under .tmp-phase04m/. Hero.jsx, About.jsx, AquariumDivePrototype.jsx, useSectionProgress.js, Navbar, music, Projects, modal/iframe code, other sections, and dependencies were not changed.

11. **Removed code.** Removed the Phase 03C 220%-height alpha-mask CSS, --surface-depth/--dive-edge and dependent highlight/shaft calculations, old full-scene opacity exit, old uniform scale rules, pseudo-element bright band, obsolete progress writer, and intersection-driven creation/disposal mechanism. The existing static posters and arrival wrapper were retained. No old and new surface effects run together.

12. **Performance comparison.** Same production browser, desktop/mobile emulation, six-second forward/reverse scripted native-document scroll, no screenshot recording during the measured interval. These are browser rAF intervals and whole-page main-thread totals, not display-presentation timings or isolated GSAP costs.

| Viewport | Measurement | Before | After |
|---|---|---:|---:|
${rows.join('\n')}

${after.reports.map((a,i)=>`At ${a.width}px, Hero/Dive draw calls were ${baseline.reports[i].drawCalls.hero}/${baseline.reports[i].drawCalls.dive} before and ${a.drawCalls.hero}/${a.drawCalls.dive} after. Both renderers were active for approximately ${fmt(a.overlapMs / 1000)} seconds across the six-second forward-and-back run; overlap follows scroll distance, so a user can dwell with both worlds visible. ${a.contexts.created} WebGL contexts were created in the fresh page, with no new contexts during boundary scrubbing. Renderer: ${a.renderers?.[0] || 'not recorded'}.`).join('\n\n')}

Main-thread Paint events measure the full page, not GPU raster cost of the clip alone. Heap deltas include garbage collection and are not a leak measurement. Resource behavior was separately checked through canvas identity, offscreen disposal, and stopped draw calls. Raw [baseline](baseline/profile.json), [after](after/profile.json), and frame samples are retained. No 60fps or physical-phone performance guarantee is implied.

13. **Build and regressions.** npm run build passed, with the existing >500kB chunk warning. git diff --check passed. The final sequential run passed the surface matrix and integration suite, existing arrival landing, WebGL/prewarm/standalone, reverse/replay, interruption, and native-mobile checks. The fish-path and arrival-math checks also passed. See [integration evidence](integration.json) and [run log](regressions.log). No Phase 04L magnetic-scroll or Navbar docking code changed.

14. **Visual evidence.** [Timestamped motion playback](motion/index.html) contains ${recordings.reduce((n,r)=>n+r.frames.length,0)} actual browser screencast frames across desktop and mobile, including forward/reverse travel. It is a JPEG-frame recording with timestamped playback, not an encoded MP4/WebM. The [after captures](after/profile.json) include 0, 15, 30, 45, 60, 75, 90, and 100% in both directions for desktop and mobile. Compare [desktop crossing](after/1440-forward-45.jpg), [mobile crossing](after/390-forward-45.jpg), and [settled About](after/1440-forward-100.jpg). Sequential captured frames and geometry were reviewed for reveal polarity, continuity, content visibility, and reverse consistency.

15. **Limits.** Verification used Edge and emulated mobile viewports, not physical iOS/Safari or Android devices. GPU memory and GPU timer queries were not collected. Existing whole-page style recalculation and backdrop costs remain visible in the measurements; this phase does not perform Phase 05 optimization. The established underwater visual content and its existing filters were preserved.
`
await writeFile(new URL('report.md', root), report)
console.log('Report written for', matrix.length, 'combinations and', recordings.reduce((n,r)=>n+r.frames.length,0), 'recorded frames')
