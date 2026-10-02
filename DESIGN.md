# Elegant Living Aquarium — Design System

> "A professional portfolio that happens to exist inside a beautifully crafted aquarium."
> Aquarium = environment. Portfolio = story. Content always wins.

## 1. Concept

One continuous underwater environment across Hero → About → Skills → Projects → Certificates → Contact. Sections are habitats in the same water, not separate pages. Depth increases subtly: open water → deeper → reef → specimens → quiet water → toward surface.

Keywords: elegant, minimal, premium, calm, atmospheric, organic, editorial, subtle motion.
Avoid: cartoon, neon, gamified UI, heavy glassmorphism, blobs, cursor effects.

Visual priority: 1 content, 2 typography, 3 navigation, 4 environment, 5 motion, 6 decoration.

## 2. Colors

Preserve existing identity, refined deep-water.

Light (`:root`):
`--bg #f8fafc`, `--bg-alt #ffffff`, `--surface #ffffff`, `--line rgba(15,23,42,0.10)`, `--text #0f172a`, `--muted #5b6478`, `--accent #1d4ed8`, `--accent-ink #1538a6`, `--accent-soft rgba(29,78,216,0.08)`, `--success #15803d`.

Dark (`[data-theme='dark']`):
`--bg #0d1b2a`, `--bg-alt #1b263b`, `--line rgba(180,200,230,0.14)`, `--text #eaf0fa`, `--muted #9aa9c4`, `--accent #7aa8ff`, `--accent-ink #b9d0ff`, `--accent-soft rgba(122,168,255,0.14)`.

Aqua overlay (`.aqua-root`):
gradient `#10293f → #0b1e33 → #081627 → #060f1c`, radial top glow `rgba(143,180,232,0.10)`, ink `#e9eef6`, muted `#9fb0c8`, accent `#8fb4e8`, line `rgba(180,200,230,0.14)`, selection `rgba(143,180,232,0.28)`.
Accents used sparingly: active nav, primary buttons, selected states, fish highlights.

## 3. Typography

`--font-display: 'Inter Tight'`, `--font-body: 'Inter'`, `--font-mono: 'JetBrains Mono'`. No decorative fonts. `Press Start 2P` removed; legacy `.font-pixel` maps to mono.
Hero title `clamp(3.5rem,9vw,6rem)` 800 `-0.03em`. Section title `clamp(1.9rem,3vw,2.5rem)` 700 `-0.02em`. Eyebrow mono `0.72rem` uppercase `0.14em`. Body `1.6-1.7` line-height. All body text keeps `0 1px 12px rgba(0,0,0,0.45)` shadow over water for readability.

## 4. Spacing / Layout

`--max-width: 1160px` (layout 1120px). Section `140px 32px 120px`, grid `280px 1fr` rail+body, gap 64px. Rail sticky `top:100px`, right border. Mobile: single column, `80px 22px 64px`. Generous whitespace; environment lives in gutters, never over text.

## 5. Radius / Border / Shadow

`--radius-lg 20px` (cards use 18px), `--radius-md 12px`, pills `999px`.
Aquarium glass: `1px solid rgba(180,200,230,0.13-0.14)`, `backdrop blur 10-12px`, `0 16-24px 36-48px rgba(0,0,0,0.28-0.32)`, top hairline `linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)`. Real glass, not futuristic blur.

## 6. Components

**CategoryCard** (`CategoryCard.jsx`): reusable `aqua-card p-6 md:p-8` foundation. Used in Hero/About/Footer. Projects/Certificates/Contact/Skills keep own compositions sharing same tokens — not forced into identical card.

**Navigation**: resting = attached frame with bottom border. Scrolling = `is-detached` capsule: `top:12px`, centered, `8px 10px` padding, `999px`, `rgba(10,22,36,0.72)` blur 18px. Docks after 1100ms idle. Reduced-motion / mobile-open disables detach. Active link pill `rgba(143,180,232,0.14)`.





**Depth-gap** (`Separator.jsx`): subtle habitat transition, not divider. `8px 32px`, 1px line, label `0.66rem mono 0.16em`: `descending · 08 cm / reef · 15 cm / specimens · 24 cm / quiet water · 32 cm / toward surface · 38 cm`. Atmospheric, never competes.

**Specimen cards**: `Specimen 01` mono index, stack pill, title, desc, GitHub/Figma pills. Hover: `translateY(-2px)`, border `rgba(143,180,232,0.38)`.

**Skills**: voxel PNG fish kept (see Assets). Tiers dots 3/2/1 + pill. Fish drift `0.35/0.15` slow, hover pins `fish-tip` pill, click pins hologram card. Readability first.

## 7. Motion

`--ease-water: cubic-bezier(0.22,1,0.36,1)`. Slow, fluid, underwater. Entrance `reveal` 0.7s +14px stagger 60ms. Hover subtle lift. Fish stay within their section, nav morph remains fluid. No bounce/spring/rapid scale/large rotation. Page must feel premium with animations off.

## 8. Responsive / Accessibility

Desktop full. Tablet reduced density. Mobile: nav hamburger, readable cards, no decorative bubbles. `prefers-reduced-motion`: no fish/reveal/parallax/nav-morph, content fully readable. No cursor effects ever.

## 9. Assets

Skill fish: **PNG kept** — 12 voxel renders (1.6-1.9MB) have 3D cube detail + glow that flat SVG silhouette cannot reproduce without visible loss. SVG-first only where fidelity holds; here it does not. Substrate PNGs **kept** (organic depth), `loading=lazy decoding=async`, `screen` blend. Unreferenced `separator/*.png`, `bubble*.png`, and `textbox.png` assets were removed in cleanup. `Aquarium-Welcome.png` remains as an optional source image; the root now begins with the integrated dive.

## 10. Quality gate

Visual quality over technical completeness. If an animation works but feels excessive/artificial/distracting/gimmicky, simplify it. Final check: hierarchy clear, one coherent water volume, nav dock natural, underwater backdrop subdued, content readable, type dominant, mobile clean, professional.
