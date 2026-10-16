# Regression tests

Promoted from Phase 06A–06C QA harnesses (canonical copies, behavior preserved).
Production code is never modified by these scripts.

## Prerequisites

1. `npm run build`
2. `npx vite preview --port 4173` (keep running)
3. Headless Chrome with remote debugging: `chrome --headless --remote-debugging-port=9223 about:blank`
   (Edge alternative: `--remote-debugging-port=9224` + `CDP_PORT=9224`)

## Commands (run from repo root)

- Carousel suite (17 checks): `node tests/check-projects.mjs`
- Dive lifecycle: `node tests/check-dive-landing.mjs`, `check-dive-webgl.mjs`,
  `check-dive-replay.mjs`, `check-dive-interruptions.mjs`, `check-dive-mobile.mjs`
- Surface/Hero: `node tests/check-surface-integration.mjs`, `check-audio.mjs`,
  `check-forest-lifecycle.mjs`
- Perf journeys: `node tests/journey.mjs final`, `node tests/journey.mjs mobile --mobile`
- Loading: `node tests/loading.mjs final`
- Resource retention: `node tests/resource-audit.mjs after`
- Full validation matrix: `python tests/run-validation.py`
- Viewport smoke: `node tests/probe-viewports.mjs`

Probes (`probe-*.mjs`, `shots-*.mjs`, `verify-clean.mjs`) are focused diagnostics;
outputs go to `tests/measurements/` and `tests/screenshots/` (git-ignored test artifacts).
Fixtures in `tests/fixtures/` (`early.js`, `instrument.js`, `forest.js`) are page-injected
helpers, not shipped code.
