# MarkyStudio Project Documentation

## Overview
MarkyStudio is an AI-powered SaaS demo video generator that transforms product URLs and screenshots into production-quality animated Remotion videos. It uses a sophisticated 6-phase AI pipeline leveraging Gemini 2.5 and ElevenLabs, strictly adhering to "Agency Standard" visual and engineering rules (WhatAStory/Sandwich Video style).

## Architecture

### The 6-Phase Pipeline
The generation process is divided into distinct strategic and execution phases to ensure narrative depth and visual polish:

1.  **Phase 0: Creative Brief (`/api/plan`)**: The **Director Agent** defines the emotional arc, visual grammar (shape language, motion personality), and spatial world before any scenes are planned.
2.  **Phase 1: Narrative Backbone (`/api/plan`)**: Translates the brief into a concrete sequence of 5-8 narrative beats (Hook → Problem → Solution → Feature → Proof → CTA), defining visual metaphors for each.
3.  **Phase 2: Detailed Scene Planning (`/api/plan`)**: The **Planner Agent** maps narrative beats to specific **Premium Skills**, UI schemas, and frame-accurate timing (Setup/Tension/Resolve acts).
4.  **Phase 3: Parallel Asset Pre-fetch**: Generates or fetches TTS (ElevenLabs Flash v2.5), SFX (interaction ripples, whooshes), Music (BPM-synced), and Pexels Stock Video in parallel.
5.  **Phase 4: Scene Code Generation (`/api/generate`)**: The **Coder Agent** generates React/Remotion JSX for each scene, injected with a massive "Skills" context and strict adherence to Agency Standards.
6.  **Phase 5: Master Composition & Audit (`/api/audit`)**: Assembles scenes into a `MasterVideo` with global threads (cinematic pans, zoom-throughs). The **Auditor Agent** (Ralph Loop) performs a final quality check against the original brief.

---

## Agency Standards (The "WhatAStory" Rules)

MarkyStudio enforces a strict set of visual rules to ensure a premium "agency" look:

### 1. The 40/60 Split Layout
- **Left 40%**: Reserved for the **3-Layer Text Stack**.
- **Right 60%**: Reserved for the **Product UI**, typically tilted in 3D space or presented isometrically.
- *Rule*: Never center UI with text below; it kills readability and professional feel.

### 2. 3-Layer Text Stack
A standardized hierarchy for maximum clarity:
- **Layer 1: Label**: 12px, Uppercase, 0.18em tracking, `BRAND.primary` color.
- **Layer 2: Headline**: 96px+, Weight 900, `BRAND.text` color. (Must use `MaskedReveal`).
- **Layer 3: Sub-line**: 22px, Weight 400, `BRAND.textMuted` color.

### 3. Motion & Physics (Spring Configs)
Standardized `stiffness` and `damping` values for consistent "feel":
- **`entrance`**: `{ damping: 200, stiffness: 120 }` (Crisp, no overshoot).
- **`snap`**: `{ damping: 160, stiffness: 220 }` (Tactile, subtle overshoot).
- **`magnetic`**: `{ damping: 12, stiffness: 160 }` (Cursor snap-to-target).
- **`cinematic`**: `{ damping: 200, stiffness: 80 }` (Slow camera push/zoom).

### 4. Scene Pacing (Act Structure)
Every scene is divided into 3 internal acts to maintain engagement:
- **Act 1: Setup (0–20%)**: Background reveal, single anchor element enters.
- **Act 2: Tension (20–75%)**: Main content unfolds, cursor moves, data animates.
- **Act 3: Resolve (75–100%)**: Settle and breathe. No new elements. Hold final state for 20-30 frames.

---

## Multi-Agent Orchestration

### Director Agent (`src/app/api/plan/route.ts`)
The "Executive Producer." It doesn't write code; it writes strategy.
- **Tasks**: Emotional Arc mapping, Visual Metaphor definition, Core Transformation sentence ("From X → to Y").
- **Constraints**: Enforces one "Global Visual Thread" (e.g., a ring or color wash) that evolves across the video.

### Planner Agent (`src/app/api/plan/route.ts`)
The "Project Manager." It maps the Director's vision to technical implementation.
- **Tasks**: Skill selection, frame budgeting, transition assignment (`cameraPan`, `zoomThrough`, `flash`).
- **Logic**: Enforces that ≥80% of middle transitions use `cameraPan` for the "infinite canvas" feel.

### Coder Agent (`src/app/api/generate/route.ts`)
The "Animator." Writes the actual JSX code using the `premium-coder` prompt.
- **Injected Context**: Receives the specific Skill documentation as RAG context to ensure high-fidelity implementation.

### Auditor Agent (`src/app/api/audit/route.ts`)
The "Quality Control." Performs the **Ralph Loop**.
- **Static Analysis**: Checks for illegal `fade` transitions in middle scenes or missing `MaskedReveal` on headlines.
- **Visual Audit**: Analyzes frame captures to ensure UI elements are centered in their 60% zone.

---

## Custom Remotion Compiler (`src/remotion/compiler.ts`)

A high-performance in-browser compiler based on `@babel/standalone`. It creates a rich "DSL" by injecting a massive scope into every generated scene.

### Injected Scope Variables
- **Constants**: `BRAND`, `SPRING_CONFIGS`, `EASINGS`, `PACING_PROFILE`, `SAFE_ZONES`.
- **Assets**: `MUSIC_URL`, `SFX_URLS`, `VOICEOVER_URL`, `ATTACHED_IMAGES[]`.

### Injected Components
- **Layout**: `AbsoluteFill`, `Sequence`, `AppShell`, `ContentCard`, `IsometricWrapper`, `TiltWrapper`.
- **Motion**: `MaskedReveal` (baseline clips), `UITransition`, `CinematicCamera`, `GlowBloom`.
- **Typography**: `KineticText`, `SyncedWord`, `NarrationReveal` (word-level sync).
- **Backgrounds**: `AnimatedArcBg`, `MeshGradientBg`, `DotMatrixBg`, `GridPulse`.

### Injected Hooks
- **`useHumanizedCursor`**: Adds micro-jitter and intent-based arcs (searching vs. decisive).
- **`useAudioSync`**: Provides word-level timing from ElevenLabs timestamps.
- **`useBeat` / `useBeatClock`**: Syncs animations to the background track's BPM.
- **`useVitality`**: Organic micro-animations (breathe, float, bounce) for static elements.
- **`useEntropy`**: Chaos-to-Order physics engine for "chaos" scenes.

---

## Vision Pipeline (`src/app/api/vision/`)

- **`ui-decompose`**: 2-pass extraction (Layout Spine → Zone Details). Detects sidebar nav items, metric cards, and table rows to create a `UI_SCHEMA`.
- **`vision`**: Precision element detection on a 0-1000 coordinate scale for cursor waypoints.
- **`flow-analyze`**: Analyzes screenshot sequences to determine user journey patterns and narrative speed.

---

## Premium Skills System (`src/skills/`)
Markdown-based knowledge base injected into the Coder's prompt. Key skills:
- **`premium-cursor-engine`**: The heart of the demo. Manages approach, anticipate, act, and confirm phases of a click.
- **`premium-reconstructed-ui`**: Vector-based dashboard reconstruction (Table, Chart, CardGrid). Crisp at any zoom level.
- **`premium-3d-isometric-explode`**: 3-layer CSS-3D architecture reveal.
- **`premium-live-action-composite`**: Floating UI cards over stock footage with tracked parallax.
- **`premium-chameleon-ui`**: Overlays for typing, search, and dropdowns that match screenshot aesthetics.

---

## Project Structure
```
/
├── .planning/             # Internal planning documents
├── public/                # Static assets (logos, sample audio)
├── src/
│   ├── app/               # Next.js App Router (Pages & API)
│   │   └── api/           # The 15+ micro-agent endpoints
│   ├── components/        # React components (UI & Editors)
│   │   ├── AnimationPlayer/ # Remotion Player + Render Controls
│   │   └── ScenePlanEditor/ # Visual timeline/beat editor
│   ├── helpers/           # Utility functions (Sanitization, API response)
│   ├── hooks/             # Custom React hooks
│   │   └── useFullVideoGeneration.ts # The Master Pipeline Orchestrator
│   ├── lib/               # Shared libraries (Image processing, alignment)
│   ├── remotion/          # Remotion Root, Compiler, and Composition logic
│   ├── skills/            # 70+ Markdown skill definitions for RAG
│   ├── types/             # TypeScript definitions
│   └── styles/            # Global CSS
├── templates/             # Project-specific template configurations
└── remotion.config.ts     # Remotion configuration
```

## Technology Stack
- **Framework**: Next.js 15 (App Router)
- **Video Engine**: Remotion
- **AI Models**: Google Gemini 2.5 Pro (Planning/Logic) & Flash (Generation/TTS/Asset Tasks)
- **Audio**: ElevenLabs (TTS v2.5, Music, SFX)
- **Transpilation**: @babel/standalone (In-browser)
- **Styling**: Tailwind CSS + Radix UI
- **Deployment**: Vercel + Remotion Lambda (AWS)
