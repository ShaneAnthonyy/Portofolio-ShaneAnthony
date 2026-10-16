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
- **Display preferences:** Light and dark themes, a lighter rendering mode, and reduced-motion support.
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
