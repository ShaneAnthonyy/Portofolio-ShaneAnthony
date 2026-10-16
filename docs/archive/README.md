# Archive index

Historical QA evidence from Phases 04–06 lives outside this repository in the
dated backup taken during the 06D cleanup (see the 06D-B final report for the location
and SHA-256 manifest). This folder holds only short summaries — never traces,
screenshots, or benchmark JSON.

## What was verified, per phase

- **06A — Performance & asset audit** (`.tmp-phase06d-a/report.md` §archive): Dive mid-scroll
  smooth; Hero/About drops bounded style-recalc spikes; resources stable; bundles ~1.46MB.
- **06B — Responsive & cross-browser QA**: 11 viewports Chrome + Edge smoke pass; touch verified;
  iPhone Safari manual checklist was still open at cleanup time.
- **06B-FIX — Mobile fish swimming**: side-lane trap (1–5px lanes) → full-width lanes; spans
  224–295px post-fix; iPhone-confirmed by the site owner.
- **06C — UI/UX polish + carousel test correction**: `tests/check-projects.mjs` (17/17);
  resting-geometry invariant; zero production diffs required.

## Running the maintained suite

See `tests/README.md`. Canonical command: `node tests/check-projects.mjs`
(requires `vite preview --port 4173` + headless Chrome `--remote-debugging-port=9223`).

## Restore a file from backup

Locate it in the backup's `MANIFEST-sha256.json`, copy it back, and re-verify the hash
before trusting it.

Final ground/shadow refinement evidence and the final cleanup report are archived at
`C:\CODE\ReactWeb\Portfolio-Shane-Archive\2026-10-16-final-refinements`.
See `FINAL-REPORT.md`, `MANIFEST-sha256.json`, and `archival-results.json` there.
Current ground/shadow checks were preserved in `tests/` before archival.
