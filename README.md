# Shane Anthony — Portfolio

An interactive personal portfolio showcasing selected software projects, technical skills, and my approach to building thoughtful digital experiences.

**Live website:** [shane-anthony.vercel.app](https://shane-anthony.vercel.app)

## Overview

This portfolio combines a clean, editorial interface with an immersive 3D introduction. It is built with React and Three.js, with GSAP-powered motion and responsive layouts designed for different devices and user preferences.

Beyond the visuals, the project includes dedicated regression checks for key interactions, rendering lifecycle behavior, and responsive functionality.

## Features

- **AquariumDive:** A scroll-driven 3D aquarium experience featuring animated aquatic life, a voxel-inspired landscape, and environmental details.
- **Cinematic transitions:** Scroll-based movement between the introduction, hero, and About sections.
- **Projects showcase:** An interactive carousel with project information and case-study views.
- **Skill Map:** An interactive overview of technical skills, with a three-level proficiency scale: Amateur, Intermediate, and Expert.
- **World Time:** Continuous device-local Live time, Manual time and four presets, with Lite rendering and Reduced Motion support.
- **Responsive experience:** Layouts and interactions adapted for desktop, tablet, and mobile screens.
- **Regression testing:** Automated checks for core interactions and selected 3D rendering and lifecycle scenarios.

## Tech Stack

| Area          | Technologies                 |
| ------------- | ---------------------------- |
| Frontend      | React, JavaScript, HTML, CSS |
| Build tooling | Vite                         |
| 3D rendering  | Three.js, WebGL              |
| Motion        | GSAP                         |
| Deployment    | Vercel                       |

## Getting Started

**Prerequisites:** Node.js and npm.

```bash
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal.

### Production Build

```bash
npm run build
npm run preview
```

The build output is generated in `dist/`.

### Minecraft Cinematic World Time

World Time is the sole appearance system in development and production. No
environment flag is required. A fresh visit or reload starts Live using the
visitor's device-local clock, including seconds. Manual holds the chosen time
during navigation and replay; it is intentionally not persisted across reloads.
The range runs from 05:00 to next-day 05:00, with Sunrise 06:00, Daytime 12:00,
Sunset 18:00 and Night 00:00 presets available from the Navbar clock button.

The same continuous sample drives the procedural Minecraft sky, cloud motion,
square sun/moon, AquariumDive lighting and shadows, Hero water and the underwater
content atmosphere. Text, translucent glass and Navbar adapt through local semantic
tokens. The frameless Dive Again control keeps its existing placement and focus
treatment. Lite disables expensive blur/ambient wind; Reduced Motion retains a
static readable presentation, and WebGL failure preserves the CSS/SVG environment.

The former manual Light/Dark control and OS-theme selection are retired. Startup
removes only the obsolete `shane-theme` preference, when storage allows it; a
blocked removal is harmless because the value is never read. Other preferences
are untouched. Fixed loading, native-control and graphical fallback colors remain
as foundational defaults. Old poster/panorama assets are retained for history;
the retired binary sky path no longer loads the panoramas.

Use the standard `npm run dev`, `npm run build` and `npm run preview` commands.
See [tests/README.md](tests/README.md) for regression checks. Browser emulation
does not replace final physical-device/Safari production QA.


## Project Structure

```text
Portfolio-Shane/
├── public/          # Static assets, including 3D models and textures
├── src/             # React components, styles, and application logic
├── tests/           # Regression tests, browser harnesses, and fixtures
├── docs/            # Project documentation
├── index.html
├── package.json
└── README.md
```

## Testing

The repository includes regression tests for important portfolio behavior, such as aquarium rendering and lifecycle, scroll transitions, replay, responsive interactions, audio, and the Projects carousel.

See [`tests/README.md`](tests/README.md) for available test commands, browser prerequisites, and usage notes.

## Design & Performance

The experience balances immersive visuals with practical usability. The implementation includes optimized 3D assets, managed rendering lifecycles, responsive presentation, and alternative experiences for lighter rendering and reduced-motion preferences.

---

Designed and developed by **Shane Anthony**.
