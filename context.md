# MarkyStudio — Complete System Context

> Last updated: 2026-03-22 — WhatAStory Implementation Plan COMPLETE. All 12 quality gaps closed. System-wide "Perceived Intelligence" layer active.

---

## 1. SYSTEM OVERVIEW

**MarkyStudio** is an AI code-to-video pipeline. User provides a text prompt + optional product screenshots → system plans a multi-scene narrative video → generates one React/Remotion component per scene via LLM → compiles in-browser with Babel → live preview via Remotion `<Player>`.

### Stack
- **Framework**: Next.js 16.1.5 (App Router), TypeScript 5.9.3
- **Video runtime**: Remotion 4.0.428 (React-based, 1920×1080 / 30fps)
- **LLM**: Google Gemini via `@google/genai` SDK (v1.43.0)
- **In-browser compilation**: `@babel/standalone` 7.28.5
- **3D rendering**: `@remotion/three` 4.0.428 + `three` 0.178.0 + `@react-three/fiber` 9.1.0
- **Audio**: ElevenLabs TTS via `/api/tts`; SFX + music via Pixabay CDN
- **Image processing**: `sharp` ^0.34.5

### Primary User Flow
1. User enters prompt in `LandingPageInput` + optional screenshots
2. `/api/plan` → Gemini structured JSON: scenes, brand, globalVisualThread, FlowEdge graph
3. User reviews `ScenePlanEditor` → approves → `confirmPlan()` fires
4. `runGeneration()` compiles each scene via `/api/generate` (batches of 3)
5. `createMasterComponent()` assembles scenes → `<Player>` live preview

---

## 2. FILE STRUCTURE

```
src/
├── app/api/
│   ├── generate/route.ts                  — per-scene LLM generation (streaming + retry) [1772 lines]
│   ├── plan/route.ts                      — full video narrative planning [1547 lines]
│   ├── audit/route.ts                     — Gemini vision quality scoring
│   ├── tts/route.ts                       — ElevenLabs voiceover synthesis
│   ├── flow-analyze/route.ts              — screen recording analysis (energyLevel, UIpace)
│   ├── ui-decompose/route.ts              — Vision → UISchema structured pipeline
│   ├── align/route.ts                     — audio-visual duration alignment (word timings → durationInFrames)
│   ├── critique/route.ts                  — art director code review (Ralph Loop pre-render check)
│   ├── vision/route.ts                    — UI element detector (0–1000 coordinate system)
│   ├── capture/route.ts                   — Puppeteer screenshot capture with interactions
│   ├── music/route.ts                     — ElevenLabs music generation proxy (cached per style)
│   ├── sfx/route.ts                       — ElevenLabs SFX generation proxy (6 canonical sounds)
│   ├── render-local/route.ts              — Remotion local renderer (bundles + renders to .renders/)
│   └── render-local/download/[jobId]/     — streams rendered video file to client
├── app/generate/page.tsx                  — main UI (plan editor + player + scene cards)
├── hooks/useFullVideoGeneration.ts        — core state machine [2547 lines]
├── remotion/compiler.ts                   — Babel transpiler + scope injection [6605 lines]
├── skills/index.ts                        — skill registry + SKILL_DETECTION_PROMPT
├── skills/*.md                            — 79 skill guidance files (70 premium + 9 example)
├── types/generation.ts                    — all TypeScript interfaces
├── lib/alignScenes.ts                     — alignSceneDurations() — word timing → scene duration math
├── lib/cropZone.ts                        — cropImageToZone(base64, [x,y,w,h]) via sharp
├── lib/extractVideoFrames.ts              — canvas-based video frame extractor (visual-delta filter)
├── lib/utils.ts                           — cn() Tailwind class merger (clsx + tailwind-merge)
└── components/
    ├── LandingPageInput.tsx               — main prompt + image upload form
    ├── ScenePlanEditor/                   — plan review UI (scene cards, topology, skills)
    ├── AnimationPlayer/                   — Remotion <Player> wrapper with seek/frame controls
    ├── SceneTimeline/                     — timeline scrubber showing scene boundaries
    ├── ChatSidebar/                       — side panel for plan/scene conversation
    ├── CodeEditor/                        — Monaco-based scene code viewer/editor
    ├── CursorEditor/                      — waypoint editor for cursor paths
    ├── Header.tsx                         — top navigation bar
    ├── PageLayout.tsx                     — root layout wrapper
    ├── TabPanel.tsx                       — tab switcher primitive
    └── ErrorDisplay.tsx                   — compilation error display
```

---

## 3. PIPELINE ARCHITECTURE

### 3.1 Planning Phase (`/api/plan`)

**Input**: `{ prompt, model, images?, screenFlow?, cachedBrand? }`

**Processing**:
1. Brand extraction via Gemini vision (or use `cachedBrand` if hash matches)
2. If `screenFlow` → read `energyLevel` → override `brand.musicStyle`
3. Narrative planning prompt → Gemini structured output → `ScenePlan[]`
4. Post-process: `injectSectionTitles()`, exitAnchor clamping [0–1], aha swell (musicVolume ≥1.6)

**Brand cache** (`cachedBrandStore`): module-level singleton.
Uses `buildImageHash(base64)` — samples `len:start50|mid50|end50` chunks (samples start, middle, and end of the base64 string) to prevent collisions between images of equal length.

### 3.2 Generation Phase (`runGeneration`)

**Called after**: user confirms plan.

**State Machine Logic** (`useFullVideoGeneration.ts`):
1. **Pacing Profile** (`applyPacingProfile`): Post-processes `durationInFrames` for cinematic rhythm.
   - `FRUSTRATION/PAIN` scenes: Clamped to ≤180f (urgency).
   - `RELIEF/AHA` scenes: Boosted +15%, clamped to ≤330f (breathing room).
   - `CTA` scenes: Clamped to ≤240f.
   - Monotony Break: If 3 consecutive scenes share the same duration, alternate ±10%.
   - Final Alignment: All durations snapped to 30f grid, range [60, 360].
2. **Audio Prefetching**:
   - `prefetchVoiceovers`: Parallel ElevenLabs fetch; deduplicated by text hash; duration clamped to `lastWord.end * 30 + 15f` tail.
   - `prefetchMusic`: One-time fetch during `confirmPlan`.
3. **Continuity Context**: Injects previous scene's camera/cursor/emotional state.
   - `initialCameraState`: If `FlowEdge.carryOver.camera` is true, inherits `CINEMATIC_CAMERA_END` (`zoom: 1.06`, `pan: {0,0}`).
4. **LRU Cache**: `sceneCache` (max 30 entries) prevents re-compiling identical scenes during regeneration or undo/redo.

### 3.3 Master Composition (`createMasterComponent`)

**Timing & Sequencing**:
- Each scene slot = `durationInFrames + HOLD_FRAMES(24)`.
- Overlap = `TRANSITION_FRAMES(20)`.
- `HOLD_FRAMES` ensures animations fully settle before the transition begins.

**The "Infinite Canvas" Layers**:
- **PersistentBg** (`AnimatedArcBg`): ONE background for the entire video.
  - Light theme: Concentric arcs (rotation speed 0.05), opacity 0.04 → 0.01.
  - Dark theme: Subtle animated radial mesh gradient.
- **SectionLabelLayer**: Top-left persistent label (fades in 12f, out 10f).
- **VignetteLayer**: Radial gradient crossfaded over 12f at scene boundaries (opacity 0.05–0.15).
- **FilmGrainLayer**: Alternates between `GRAIN_A` (seed 2, baseFreq 0.85) and `GRAIN_B` (seed 9, baseFreq 0.87) every frame.
  - Adaptive Opacity: `FRUSTRATION: 0.06`, `RELIEF: 0.02`, `EXCITEMENT: 0.04`.
  - Adaptive Speed: `kinetic energy` scenes use shift speed 72 vs standard 37.

**Transitions** (`withTransition`):
- `zoomThrough`: Scale 10→1 enter (ease-out cubic), scale 1→10 exit toward `exitAnchor` (ease-in cubic).
- `cameraPan`: Full-width slide + horizontal motion blur (18px peak, interpolates to 0px).

---

## 4. THE COMPILER SYSTEM (`src/remotion/compiler.ts`)

The compiler is a 6600+ line module-level orchestrator that transforms LLM JSX strings into sandboxed, production-grade React components.

### 4.1 The "Safety Net" (`postProcessCode`)
Before Babel transpilation, the code passes through a multi-phase structural fix layer:
1. **Hoisting**:
   - `CURSOR_STEPS`: Moves declaration to the top using bracket-depth tracking (handles strings/escaped chars).
   - Timing Constants: Hoists `TRAVEL_DURATION`, `DWELL`, `ZOOM_IN`, etc., before `CURSOR_STEPS`.
2. **Fallback Injection**:
   - **ALL_CAPS**: Injects `const X = 0;` for undeclared uppercase constants (e.g., `NODE_FADE_START`).
   - **PascalCase**: Injects `const X = ({children,...p}) => Fragment` for unknown components.
   - **camelCase**: Injects `const x = (...args) => args[0] ?? 0;` for unknown functions.
3. **Style Fixes**:
   - Auto-pairs `WebkitBackdropFilter` for every `backdropFilter` instance.
   - Strips TypeScript return type annotations (`: JSX.Element`) from arrow functions.
   - Injects `BRAND.bg` into bare `<AbsoluteFill>` components.

### 4.2 Sandboxed Execution
Code is transpiled via Babel and executed using `new Function(...)`. The scope is heavily populated with 60+ components and 20+ hooks.

### 4.3 `safeInterpolate`
A robust wrapper around Remotion's `interpolate` that prevents crashes:
- Coerces all `outputRange` values to finite numbers.
- Sorts and dedupes `inputRange` to ensure monotonicity.
- Handles `isFinite` checks to prevent `NaN`/`Infinity` from breaking the render loop.

---

## 5. COMPILER SCOPE

### 5.1 Physics & Motion Hooks
- `useEntropy(strength)`: Deterministic jitter.
- `useVelocityMomentum(getValue)`: Evaluates `f` and `f-1` to measure real-time speed/direction.
- `useBeat()`: Sharp attack (15%), slow exponential decay (pow 2).
- `useBeatClock()`: Returns `beat`, `bar`, `isDownbeat` for musical choreography.

### 5.2 Key Visual Components
- `ChromaticAberration`: 3-channel (R/G/B) split via `feColorMatrix` + `feOffset` + `feMerge`.
- `GlowBloom`: Sandwich Video style halo (blur 55px, mix-blend overlay, scale 1.5).
- `MeshGradientBg`: GPU-friendly 4-layered radial-gradients with `color-mix` alpha fallbacks.
- `CameraMotionBlur`: feGaussianBlur with asymmetric `stdDeviation` based on 180° shutter rule.

### 5.3 Interaction Primitives
- `useInteractionFeedback`: Micro-squish (scale 0.96) + nudge (2px) + glow on click.
- `useHumanizedCursor`: Adds ±1.5px jitter, breath-pause ±2px, and a **Click Guard** that snaps to whole pixels during the 4-frame click window.
- `useInteractionCycle`: 4-phase arc (approach → anticipate → act → confirm).

---

## 6. BRAND TOKEN SYSTEM

```typescript
interface BrandTokens {
  primary: string;      bg: string;       surface: string;
  secondary: string;    text: string;     textMuted: string;
  border: string;       font: string;     style: "dark" | "light" | "neon";
  accentName?: string;  name?: string;    url?: string;
  cta?: string;         musicStyle?: string; // corporate|energetic|cinematic|calm|playful
  displayFont?: string; annotationFont?: string;
}
```

---

## 7. NARRATIVE PLANNING SYSTEM (PAS Formula)

**Scene 1 — CHAOS**: ZERO branding; human pain + concrete cost data.
**AHA Moment**: One scene; `musicVolume >= 1.6`; model auto-upgrade to `:medium`.
**Voiceover Formula**: `words = (durationInFrames / 30) * 2.5`.

### Emotional Visual Grammar
| emotionalIntent | Damping | Character | Pacing |
|---|---|---|---|
| FRUSTRATION | 150 | Jittery, uneven | Fast, chaotic |
| RELIEF | 400 | Floating settle | Slow, spacious |
| EXCITEMENT | 8 | Elastic pop, bounce | Fast, playful |

---

## 8. IMPLEMENTATION STATUS (2026-03-22)

### All WhatAStory 12-Gap Fixes RESOLVED:
- **Gap 1**: `OffthreadVideo` background stock footage support.
- **Gap 2**: `MacroCamera` (5x zoom) + `SelectiveFocus` (dual-layer DOF).
- **Gap 3**: `imageIndices[]` multi-screenshot walkthroughs.
- **Gap 4**: `FeatureContextBar` persistent context pill.
- **Gap 5**: `premium-floating-icon-chaos` skill.
- **Gap 6**: `NarrationReveal` (word-by-word synced reveal).
- **Gap 7**: `ICON_PATHS` library (22 icons) + `DrawOnIcon` animation.
- **Gap 8**: `NotificationCard` scatter.
- **Gap 9**: `usePathTraveler` waypoint engine.
- **Gap 10**: `InAppChatPanel` threaded messages.
- **Gap 11**: `ConcentricRings` emanation.
- **Gap 12**: `chromeColor` support.

### Agency Quality RESOLVED:
- **Momentum**: Exit velocity carry-over.
- **Humanized Cursor**: 1.5px jitter + breath-pause + click-guard.
- **BPM Logic**: `beatFrames` dynamically computed from `MUSIC_BPM`.
- **Lambda Accuracy**: `buildMasterCode` sequences now match `HOLD_FRAMES` offset exactly.
- **Texture Loading**: `premium-3d-device-mockup` uses `URL.createObjectURL` for base64 textures to prevent OOM.
