# MarkyStudio — System Architecture

**Product:** MarkyStudio (UI) — **NPM package:** `my-video` (Remotion template lineage).

**What it is:** A **Next.js App Router** application that turns a product brief (and optional screenshots / recordings) into **agency-style SaaS explainer videos** by orchestrating **Gemini** for planning and scene code, **ElevenLabs** for TTS/music/SFX, and **Remotion** for preview and MP4 rendering.

**Last updated:** 2026-04-03 (aligned with `src/**` as implemented).

---

## 1) High-level architecture

```mermaid
flowchart TB
  subgraph client [Browser]
    LP[Landing `src/app/page.tsx`]
    GEN[Studio `src/app/generate/page.tsx`]
    ORCH[`useFullVideoGeneration`]
    PLAYER[Remotion `Player` + `AnimationPlayer`]
  end

  subgraph apis [Next.js Route Handlers `src/app/api/*/route.ts`]
    PLAN[/api/plan]
    FLOW[/api/flow-analyze]
    GENAPI[/api/generate]
    TTS[/api/tts]
    MUSIC[/api/music]
    SFX[/api/sfx]
    AUDIT[/api/audit]
    RENDER[/api/render-local]
    OTHER[vision, align, capture, ...]
  end

  subgraph runtime [Client-side video runtime]
    COMPILER[`compileCode` in `src/remotion/compiler.ts`]
    MASTER[`createMasterComponent` / `buildMasterCode`]
  end

  LP -->|sessionStorage + navigate| GEN
  GEN --> ORCH
  ORCH --> PLAN
  ORCH --> FLOW
  ORCH --> GENAPI
  ORCH --> TTS
  ORCH --> MUSIC
  ORCH --> SFX
  ORCH --> AUDIT
  ORCH --> COMPILER
  COMPILER --> MASTER
  MASTER --> PLAYER
  PLAYER -->|optional MP4| RENDER
```

**Core idea:** the **Director** (`/api/plan`) produces structured `ScenePlan[]` + brand + narrative artifacts; the **Animator** (`/api/generate` SSE) emits **one React component per scene** with **no imports**; the **compiler** turns that string into a real component by injecting a large curated scope; the **master** stitches scenes with transitions, global music ducking, SFX, vignette, grain, and persistent background.

---

## 2) Technology stack

| Layer | Choice |
|--------|--------|
| App framework | **Next.js 16** (App Router) |
| UI | **React 19**, **Tailwind CSS v4**, Radix primitives |
| Video | **Remotion 4** (Player, transitions, shapes, three, lottie, renderer, etc.) |
| LLM | **Google GenAI** (`@google/genai`), model IDs like `gemini-2.5-flash`, `gemini-2.5-pro`, previews for paid tiers |
| Dynamic JS execution | **`@babel/standalone`** transpiles LLM JSX in the browser |
| Validation | **Zod** (API payloads where used) |
| Media | **Puppeteer** (capture), **Sharp** (image work) |
| Audio | **ElevenLabs** (TTS, music, SFX) via API routes |
| Tests | **Vitest** (`src/remotion/compiler.test.ts`, API/helper tests) |

---

## 3) Repository layout (source of truth)

```
src/
├── app/
│   ├── page.tsx                    # Landing: brief + attachments → sessionStorage → /generate
│   ├── generate/page.tsx           # Main studio: plan editor, chat, code view, Remotion preview
│   ├── code-examples/page.tsx      # Compiler / API experiments
│   ├── layout.tsx                  # Root layout, fonts, global CSS
│   └── api/                        # Server route handlers (see §4)
├── components/                     # UI: ChatSidebar, ScenePlanEditor, AnimationPlayer, etc.
├── hooks/
│   ├── useFullVideoGeneration.ts   # Director orchestration (plan → audio → generate → compile → master)
│   ├── useGenerationApi.ts         # SSE client for /api/generate (single-scene/chat path)
│   ├── useCursorSteps.ts           # Rewrites CURSOR_STEPS in generated code
│   └── ...
├── helpers/                        # sanitize-response, api-response, capture-frame, scene-validation, …
├── lib/                            # alignScenes, extractVideoFrames, cropZone, utils
├── remotion/
│   ├── compiler.ts                 # Babel compile + injected scope + safety wrappers
│   ├── DynamicComp.tsx, Root.tsx, index.ts
├── skills/                         # Build-time imported .md skill docs + registry (`skills/index.ts`)
└── types/
    ├── generation.ts               # ScenePlan, BrandTokens, ScreenFlow, FlowEdge, …
    └── conversation.ts             # Chat / edit context types
```

---

## 4) HTTP API surface (`src/app/api/**/route.ts`)

| Route | Role |
|--------|------|
| `POST /api/plan` | **Director:** creative brief + backbone + `ScenePlan[]`, brand tokens, optional `screenFlow`, `edges`, pacing contracts. |
| `POST /api/flow-analyze` | Vision: derive `ScreenFlow` (transitions, narrative summary, energy) from many frames. |
| `POST /api/generate` | **Scene code:** SSE stream (initial) or JSON (follow-up edits). Skill arbitration + injected context. |
| `POST /api/audit` | Art-director quality pass (score + fixes); drives optional refinement in `useFullVideoGeneration`. |
| `POST /api/tts` | ElevenLabs TTS + word timings (with fallbacks in route). |
| `POST /api/music` | Background music generation. |
| `POST /api/sfx` | SFX asset URLs for transitions. |
| `POST /api/align` | Audio–visual alignment helper. |
| `POST /api/render-local` | Bundle + **local** Remotion render (MP4) with progress SSE. |
| `GET /api/render-local/download/[jobId]` | Download completed render. |
| `POST /api/vision` | UI element boxes (0–1000 precision → normalized). |
| `POST /api/ui-decompose` | Layout decomposition pass. |
| `POST /api/critique` | Fast code critique. |
| `GET /api/stock-video` | Pexels search. |
| `POST /api/veo` | Placeholder / advanced video hook. |
| `POST /api/capture` | Puppeteer screenshot capture. |

Environment variables (typical): `GOOGLE_GENERATIVE_AI_API_KEY`, optional `ELEVENLABS_API_KEY`, `PEXELS_API_KEY` (see `context.md`).

---

## 5) End-to-end user & data flow

### 5.1 Landing (`src/app/page.tsx`)

- Collects product narrative, optional **screenshots / recording frames**, optional **logo**, model choice.
- Persists attachments + descriptions in **`sessionStorage`** and navigates to **`/generate`**.

### 5.2 Studio (`src/app/generate/page.tsx`)

- Restores images from `sessionStorage` on load.
- Wires **`useFullVideoGeneration`**: plan review, flow editor, progress, `masterComponent` for **`AnimationPlayer`**.
- **Chat** can target a single scene via `@mention` → `regenerateSceneWithEdit`.
- **Runtime errors** from the player can trigger targeted scene regeneration (see hook + `runtime-recovery` helpers where used).

### 5.3 Orchestration hook (`src/hooks/useFullVideoGeneration.ts`)

**Entry: `generateFullVideo(prompt, model, images, descriptions)`**

1. **Multi-image flow (≥ 2 images)**  
   - For **≤ 4** images: **synthetic** `ScreenFlow` (no `/api/flow-analyze` call) to save quota.  
   - For **> 4**: `/api/flow-analyze`, then **`ScreenshotFlowEditor`** until user approves.  
2. **`approveFlow`** → calls **`runPlan`** with `screenFlow` + optional `waypointsByImage` (+ optional **key frames** for long recordings).  
3. **Single-image / no flow** → **`runPlan`** directly.

**`runPlan()`** → `POST /api/plan`  
Returns `scenes`, `brand`, `creativeBrief`, `backbone`, `globalBg`, `globalVisualThread`, `edges`, etc. User edits in **`ScenePlanEditor`**, then **`confirmPlan`**.

**`confirmPlan(editedScenes, …, voiceId)`**  

1. Prefetches **TTS + SFX + music** in parallel.  
2. Extends scene durations when **word timings** exceed planned frames.  
3. Runs **`alignSceneDurations`** (`src/lib/alignScenes.ts`).  
4. Enforces **≤ 90s** total budget (scales durations on a 30f grid with a minimum per scene).  
5. Calls **`runGeneration`** → sequential per-scene pipeline.

**Per-scene: `processScene`**

1. **`consumeSceneGeneration`** → `POST /api/generate` (SSE); result normalized with **`extractComponentCode`** (`src/helpers/sanitize-response.ts`).  
2. **`detectSceneStructureIssues`** (invalid exports, missing `AbsoluteFill`, banned patterns, etc.).  
3. **`compileCode`** (`src/remotion/compiler.ts`).  
4. Optional **`/api/audit`** + **one** refinement pass if score &lt; **75** and fixes exist.  
5. On compile failure: **second** generation with classified error strategy (`"fallback"`).  
6. LRU cache: **`sceneCache`** with **max 30** entries (keyed by scene + brand); regenerations bypass cache.

**Concurrency:** `CONCURRENCY = 1` — scenes are generated **sequentially** to reduce rate limits and stream timeouts (not parallel batches of 4).

## 6) Scene code generation (`src/app/api/generate/route.ts`)

- **Initial:** Gemini **`generateContentStream`** → SSE chunks (`metadata`, `text-delta`, `[DONE]`, or `error`).  
- **Follow-up:** JSON edit or full replacement; `applyEdits` requires unique `old_string` matches.  
- **Skills:** `arbitrateSkills` picks up to 3 “major” skills + optional background skill; content merged into the system prompt.  
- **Context injection:** `VISUAL_STATE`, `VISUAL_ANCHOR`, `INITIAL_CAMERA_*`, skill composition, arbitration notes.

---

## 7) Dynamic compilation (`src/remotion/compiler.ts`)

**`compileCode(code, …)`** pipeline (simplified):

1. Strip conflicting `const BRAND = …` if present.  
2. **`extractComponentBody`** — remove imports/exports, score candidate components.  
3. Pre/post-processing passes (hook hoisting, healing for undeclared symbols, etc.).  
4. **`Babel.transform`** with `react` + `typescript` presets → executable JS.  
5. **Safety:** `safeInterpolate`, `safeSpring`, `SafeReact.createElement` style sanitization.  
6. **`new Function(…)`** with a **large** parameter list: Remotion primitives, design-system helpers, chameleon/cursor UI, audio hooks, `PIPELINE_CURSOR_STEPS`, `VISUAL_STATE`, `VISUAL_ANCHOR`, `MUSIC_URL`, etc.  
7. Returns `{ Component, error, compilationError? }`.

**`parseCompilerError`** structures Babel errors for logging and retry prompts.

---

## 8) Master composition (`createMasterComponent` in `useFullVideoGeneration.ts`)

Each scene component is wrapped with **`withTransition`** (enter/exit: `fade`, `slide`, `cameraPan`, `zoomThrough`, etc.; `exitAnchor` forces `zoomThrough` on exit).

The master **`MasterVideo`** stacks (in order):

1. **`AnimatedArcBg`** (persistent full-timeline background; light = arc SVG, dark = drifting radial mesh + dust particles).  
2. **Global `Audio`** for **music** with **per-scene volume automation** (duck at boundaries ~35% then ramp).  
3. **`Sequence`** for each scene with **overlapping** timeline (`HOLD_FRAMES`, `TRANSITION_FRAMES` cross-dissolve).  
4. **Transition SFX** (`Sequence` + `Audio` at cut frames, mapped from transition type).  
5. **`VignetteLayer`** (intent-driven opacity).  
6. **`SectionLabelLayer`** (optional top-left `sectionLabel`).  
7. **`PersistentWorldLayer`** (`EntropyDust` for extra continuity).  
8. **`FilmGrainLayer`** (intent-adaptive grain opacity/speed).

**`buildMasterCode`** emits a **string** of master JSX for **export / render** paths so remote or CLI renders can mirror the browser composition.

---

## 9) Data model (types)

Primary definitions live in **`src/types/generation.ts`**.

| Concept | Purpose |
|---------|---------|
| `CreativeBrief` | Phase-0 strategy: emotional arc, visual grammar, spatial world, metaphors. |
| `NarrativeBackbone` | Phase-1 beats + durations + continuity. |
| `ScenePlan` | Per-scene: `prompt`, `skills`, `durationInFrames`, `voiceoverText`, `cursorWaypoints`, `uiSchema`, `transition`, `exitAnchor`, `morphExport`, `morphImport`, `emotion`, `musicMood`, etc. |
| `BrandTokens` | Colors, typography, `style`, `logo`, `musicStyle`, … |
| `ScreenFlow` | Screens + transitions + `narrativeSummary` / `productFeature`. |
| `FlowEdge` | Graph edges: `transition`, `carryOver` (cursor/ui/camera). |
| `FullVideoPlan` | `scenes[]`, `brand`, `screenFlow`, `globalVisualThread`, `edges`, … |

---

## 10) Skills system (`src/skills/`)

- Dozens of **`premium-*.md`** files are **imported at build time** in `skills/index.ts`.  
- **`getCombinedSkillContent`** + **`SKILL_NAMES`** / `arbitrateSkills` in `/api/generate` constrain which skills are injected per scene.  
- Skills encode **motion patterns**, layout discipline, and “premium” behaviors (cursor, chameleon UI, reconstructed UI, backgrounds, etc.).

---

## 11) Client-only code generation path (`src/hooks/useGenerationApi.ts`)

Used where streaming chat-style generation is needed (not the full multi-scene director). It:

- Parses SSE from `/api/generate`,  
- Applies **`stripMarkdownFences`** + **`extractComponentCode`**,  
- Validates minimal JSX with **`validateGptResponse`**,  
- Enforces a **90s stall timeout** on the stream.

---

## 12) Rendering & export

- **Preview:** `AnimationPlayer` + Remotion **`Player`** with `masterComponent` and string `masterCode` for display.  
- **MP4:** `POST /api/render-local` uses `@remotion/renderer` (see route for concurrency and Chromium flags). `buildMasterCode` + props align preview with file output.

---

## 13) Design decisions (as implemented)

| Decision | Rationale |
|----------|-----------|
| **In-browser Babel** | Compile LLM strings in the client for instant preview without a compile server. |
| **No imports in generated scenes** | All APIs are injected via `compileCode` scope — predictable sandbox. |
| **Sequential scene generation (`CONCURRENCY = 1`)** | Reduces rate limits, timeouts, and ordering bugs vs parallel storms. |
| **LRU scene cache (30)** | Avoids redundant LLM+compile for identical scene+brand keys. |
| **Two-pass generation on failure** | Force pass + fallback pass with classified error strategy. |
| **Audit gate + single refinement** | `MIN_AUDIT_SCORE_FOR_REFINEMENT = 75`; one refinement per qualifying scene. |
| **Master timeline overlap** | `HOLD_FRAMES` + `TRANSITION_FRAMES` for cross-dissolve and readable cuts. |
| **Skills as build-time markdown** | Versioned, deterministic context for the planner and generator. |

---

## 14) Testing & quality gates

- **`src/remotion/compiler.test.ts`** — compiler extraction, healing, scope.  
- **`src/remotion/compiler_healing.test.ts`** — healing edge cases.  
- **`src/helpers/sanitize-response.test.ts`**, **`src/helpers/scene-validation.test.ts`**, **`src/app/generate/runtime-recovery.test.ts`**, **`src/app/api/plan/screenshot-contract.test.ts`** — contracts and recovery paths.

---

## 15) Related docs

- **`context.md`** — Exhaustive implementation notes (pipeline, contracts, pitfalls).  
- **`.planning/codebase/ARCHITECTURE.md`** — May exist; **repo root `ARCHITECTURE.md`** is the primary architecture overview for contributors.
