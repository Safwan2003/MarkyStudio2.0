## MarkyStudio — Complete System Context (Exhaustive, implementation-first)

> **Last rebuilt:** 2026-04-03
> **Audience:** contributors + future agents.
> **Goal:** describe what is actually implemented (not aspirational).
> **Source of truth:** `src/**` (89 `.ts` / `.tsx` modules) + root `package.json` + `context.md` itself.
> **NPM package name:** `my-video` (Remotion template lineage); product UI is branded **MarkyStudio**.

**Quick navigation:** §0 Overview · §1 Stack · §2 + §2.1 Repo map & file inventory · §3 Data model · §4 Director phases · §5 `/api/generate` · §6–§17 Compiler · §8 Visual grammar · §9 Skills · §10 Audio · §11 Backgrounds · §12–§15 Cursor / continuity / errors · §16 `useFullVideoGeneration` deep dive · §18–§23 Placeholders, audio, runtime pitfalls, plan route, tests.

---

## 0) What this project does

MarkyStudio is a **Next.js + Remotion** application that generates **agency-style SaaS explainer / product demo videos** (WhatAStory / Sandwich Video tier) from:

- a structured product brief (landing form),
- optional screenshots / screen-recording frames,
- optional logo upload (base64 → BRAND.logo).

It produces:

- `CreativeBrief` + `NarrativeBackbone` (Director reasoning),
- `ScenePlan[]` + `BrandTokens` (Detailed planning),
- per-scene Remotion/React code (LLM-generated),
- a master preview composition (Remotion `<Player>`),
- optional MP4 render via a local render API.

High-level user flow:

```
Landing Input → Creative Brief (Phase 0) → Narrative Backbone (Phase 1)
→ Detailed Plan (Phase 2) → Review/Edit Plan → Confirm (audio)
→ Generate Code → Compile → Strategic Art Director Audit → Preview → Render/Download
```

---

## 1) Tech stack (from `package.json`)

- **Framework**: Next.js App Router (`next@16.1.5`)
- **Language**: TypeScript (`typescript@5.9.3`)
- **UI**: React (`react@19.2.1`), Radix UI primitives (Dialog, Select, Slot, Tooltip)
- **Styling**: Tailwind CSS v4, class-variance-authority, tailwind-merge
- **Video**: Remotion (`remotion@4.0.428` + renderer/bundler/player/transitions/shapes/three/lottie/media-utils/animated-emoji/google-fonts/paths/web-renderer)
- **LLM**: Google Gemini (`@google/genai@^1.43.0`), Vercel AI SDK (`ai@5.0.104`, `@ai-sdk/google`, `@ai-sdk/openai`)
- **Models**: `gemini-2.5-pro` (Reasoning/Thinking with configurable budget), `gemini-2.5-flash` (Generation/Audit/Vision), `gemini-3-flash-preview` + `gemini-3.1-pro-preview` (paid tier options)
- **Dynamic compilation**: `@babel/standalone@7.28.5` + `@babel/parser@^7.28.5`
- **Capture/media tooling**: `puppeteer@^24.37.5`, `sharp@^0.34.5`
- **Audio/Music**: ElevenLabs API (TTS with word timings + Music + SFX)
- **Stock Video**: Pexels API
- **3D**: `three@0.178.0` + `@react-three/fiber@9.1.0` + `@remotion/three`
- **Code Editor**: Monaco (`@monaco-editor/react@4.7.0`)
- **Icons**: `lucide-react@0.555.0`
- **Validation**: `zod@4.3.6`

---

## 2) Repository map (high-signal)

### Pages (3)
- `src/app/page.tsx` — Landing form; builds prompt; stores attachments + logo in `sessionStorage`; navigates to `/generate`.
- `src/app/generate/page.tsx` — Main studio UI. Scene plan editor, code editor (Monaco), video preview (Remotion Player), timeline, chat sidebar.
  - Supports per-scene **@mention edit routing** in chat.
  - **Auto-start**: if URL contains `?prompt=...&model=...`, calls `generateFullVideo()` once using images from `sessionStorage`.
  - **Auto-retry**: fails scenes are re-generated automatically.
- `src/app/code-examples/page.tsx` — Playground for compile behavior testing.

### Core orchestration hooks (7)
- `src/hooks/useFullVideoGeneration.ts` (~3484 lines) — **Director Engine**. Orchestrates Brief → Backbone → Plan → TTS → Alignment → Generation → Audit. Manages `CompiledScene` state with strategic context persistence.
- `src/hooks/useGenerationApi.ts` — Transport for `POST /api/generate` (SSE stream parsing).
- `src/hooks/useCursorSteps.ts` — Safe parsing/rewriting of `const CURSOR_STEPS` inside generated code.
- `src/hooks/useImageAttachments.ts` — Attachment ingestion + video frame extraction.
- `src/hooks/useAutoCorrection.ts` — Error correction loop (up to 3 iterations with LLM feedback).
- `src/hooks/useConversationState.ts` — Multi-turn conversation history management.
- `src/hooks/useAnimationState.ts` — Animation playback state.

### API routes (16 endpoints in `src/app/api/**/route.ts`)

| Route | Method | Purpose |
|---|---|---|
| `plan` | POST | **Director planning pipeline**: Enforces Agency Discipline (Max 3 elements, Skill Discipline, Density Curve). Uses extracted `narrativeSummary` from screenshots to drive story arc. Returns `creativeBrief` + `backbone` alongside scenes. |
| `generate` | POST | **Code generation**. Streaming initial generation over SSE. Enforces Internal Acts, Element limits, High-Depth Glass logic, and a Final Self-Audit checklist. |
| `flow-analyze` | POST | Screenshot/video-frame flow analysis using Gemini Vision to derive `ScreenFlow`, including `narrativeSummary` and `productFeature` extraction for cohesive storytelling. |
| `vision` | POST | Interactive UI element detection. Precision 0-1000 coordinate system. |
| `ui-decompose` | POST | 2-pass UI layout analysis. |
| `audit` | POST | **Art Director Audit**. Brutal quality gate enforcing max 3 elements, 80px safe zone, and clear visual hierarchy (Score < 80 = FAIL). |
| `critique` | POST | Fast pre-render code review. |
| `tts` | POST | TTS with 4-tier fallback: ElevenLabs Flash v2.5 → basic → Gemini TTS → Silence. |
| `music` | POST | ElevenLabs music generation proxy. |
| `sfx` | POST | ElevenLabs SFX proxy. |
| `stock-video` | GET | Pexels stock video search. |
| `veo` | POST | Google Veo 2 AI video placeholder (fallback). |
| `capture` | POST | Puppeteer web page screenshot capture. |
| `align` | POST | Automated audio-visual alignment. |
| `render-local` | POST | Local Remotion MP4 renderer. Uses `concurrency: 8` and optimized Chromium flags for heavy blurs. |
| `render-local/download/[jobId]` | GET | Video download handler. |

### Components
**Top-level:** `ErrorBoundary.tsx`, `ErrorDisplay.tsx`, `Header.tsx`, `PageLayout.tsx`, `LandingPageInput.tsx` (Pre-configured with **AdAstra** "Engineers Recruiting Engineers" default values), `TabPanel.tsx`.
**Directories:** `AnimationPlayer/`, `ChatSidebar/`, `CodeEditor/`, `CursorEditor/`, `ScenePlanEditor/`, `SceneTimeline/`.

### Helpers & Lib
- `src/helpers/api-response.ts`, `capture-frame.ts`, `sanitize-response.ts`, `use-rendering.ts`
- `src/lib/alignScenes.ts`, `extractVideoFrames.ts`, `cropZone.ts`, `utils.ts`

### Remotion
- `compiler.ts` — Dynamic Babel compilation engine. Provides the injected runtime (Agency Shadows, Spring configs, Components like `CinematicCamera` and `GlobalVisualThread`).
- `DynamicComp.tsx`, `Root.tsx`, `index.ts`.

---

## 3) Core data model

### 3.1 Model Selection
9 model options defined in `MODELS[]`.

### 3.2 `CreativeBrief` (Phase 0 Strategy)
- `logline`, `estimatedSceneCount`, `typographyHero`, `soundIntention`.
- `emotionalArc[]`: beats with `intent`, `feeling`, `pacingWord`.
- `visualGrammar`: `shapeLanguage`, `textureStyle`, `iconStyle`, `layoutDensity`, `motionPersonality`.
- `spatialWorld`: `worldDescription`, `cameraStartPosition`, `depthStrategy`, `scenePositions[]`.
- `coreTransformation`: "From [pain] → to [gain]" sentence.
- `visualMetaphor`: hook/problem/solution visual concept strings.

### 3.3 `NarrativeBackbone` (Phase 1 Backbone)
- `logline`, `coreTransformation`, `globalVisualThread`.
- `beats[]`: `beatIndex`, `intent`, `visualMetaphor`, `durationFrames`, `imageIndex?`, `reasoning`, `visualState`.

### 3.4 `ScenePlan` (Detailed Planning)
Core fields: `id`, `title`, `prompt`, `skills[]`, `durationInFrames`.
- **Narrative**: `intent`, `emotionalIntent`, `isAhaMoment`, `voiceoverText`, `highlightWords[]`, `stageDirection`.
- **Continuity**: `visualState`, `visualAnchor`, `continuityRole`, `transition`, `exitAnchor`.
- **Skill system**: `skillComposition`, `skillBudget`, `motionBudget`.
- **Design & Hierarchy**: `designSystem` (spacing, safeZone, motionCharacter, depthStyle), `hierarchy` (primary, secondary, tertiary).
- **Cursor/interaction**: `cursorWaypoints[]`, `interactionScript[]`.
- **UI**: `uiSchema`, `featureHeader`, `sectionLabel`, `isWalkthroughScene`.
- **Media**: `stockFootage`, `voiceoverAudioUrl`, `wordTimings[]`, `musicVolume`, `musicMood`.
- **Camera**: `macroZoom`.
- **Morph**: `morphExport`, `morphImport`.

### 3.5 `BrandTokens`
- Colors: `primary`, `secondary`, `bg`, `surface`, `text`, `textMuted`, `border`.
- Typography: `font`, `displayFont?`, `annotationFont?`.
- Meta: `accentName`, `style`, `name?`, `url?`, `cta?`, `musicStyle?`, `logo?`.

### 3.6 `FullVideoPlan`
- `scenes[]`, `brand?`, `screenFlow?`, `bgSkill?`, `globalBg?`, `globalVisualThread?`, `edges?`.

---

## 4) The Director Agent Architecture (Implemented)

MarkyStudio uses a **Multi-Step Reasoning Loop** to ensure videos are strategically grounded, visually continuous, and strictly disciplined.

### 4.1 Phase 0: Creative Strategy (The Brief)
Establishes "Core Transformation", emotional arc, visual grammar, visual metaphors.

### 4.2 Phase 1: Narrative Architecture (The Backbone)
Defines scene-by-scene beats, duration allocations, visual continuity handoffs.

### 4.3 Phase 2: Scene Design (The Detailed Plan)
Merges Brief + Backbone into non-negotiable mandates. Critiques and refines the plan based on Agency Standards. Incorporates `narrativeSummary` from screenshots.

### 4.4 Agency Discipline Mandates (WhatAStory Standards)
1. **Strict Scene Composition**: Maximum 3 visual elements per scene. Only ONE focal element. 80px minimum padding.
2. **Skill Discipline**: Exactly ONE primary skill per scene. No cluttered skill combining.
3. **Visual Density Curve**: Hook (high density/chaos) → Recognition (medium) → AHA (low density/minimal) → CTA (ultra minimal).
4. **Layout System Lock**: Alternating topologies (`center-focus`, `split-left`, `split-right`, `isometric`).
5. **Camera Rules**: Movement every 2 scenes, macro zoom on showcases, static CTA, push-in on AHA.
6. **AHA Payoff**: The cleanest scene in the video. Camera push-in, anchor transformation, Act 3 hold for 45f minimum.

---

## 5) Code Generation (`POST /api/generate`)

Implementation: `src/app/api/generate/route.ts`.

This route is responsible for generating **LLM-authored per-scene React/Remotion code** from a planner-authored `ScenePlan`.

### 5.0 Request Contract (from `useFullVideoGeneration.ts`)
The request body contains:
- `prompt`: scene prompt (plus injected continuity / audit feedback context)
- `model`: selector string (e.g. `gemini-2.5-flash:none`) mapped to provider `modelId` via `model.split(":")[0]`
- `isFollowUp`: switches between initial SSE generation and JSON edit mode
- `currentCode`: existing component code (used only for `isFollowUp`)
- `frameImages`: optional base64 data URLs passed as `inlineData` (`mimeType: image/jpeg`)
- `forcedSkills`, `previouslyUsedSkills`, `skillComposition`: used by `arbitrateSkills()` to select up to 3 major skills + optionally one background skill
- continuity inputs that become compiler-scope values:
  - `visualState`, `visualAnchor`
  - `initialCameraZoom`, `initialCameraPan`

### 5.1 Initial Generation (SSE) (`isFollowUp` is false)
- **OUTPUT CONTRACT**: Pure JS/JSX only. No TS. Last line must be `// EOF`. Exactly ONE main exported component. No imports.
- Emits streaming tokens over SSE using Gemini `generateContentStream()`.
- Hard “stop conditions” are enforced by the SYSTEM_PROMPT (element discipline, 3-act internal structure, and the final self-audit checklist that must be satisfied before `// EOF`).

**SSE event schema** (client consumes `data:` lines):
- `data: { type:"metadata", skills, backgroundSkills, skillNotes }`
- `data: { type:"reasoning-start" }`
- `data: { type:"text-start" }`
- `data: { type:"text-delta", delta }`
- `data: [DONE]` sentinel
- error case: `data: { type:"error", status, message }` then stream closes

### 5.2 Skill Arbitration & Prompt Injection
Before streaming, the route calls `arbitrateSkills(forcedSkills, previouslyUsedSkills, skillComposition)` which:
- selects `selectedSkills` (primary + compatible secondaries) up to 3 major skills,
- optionally selects `backgroundSkills` (from a curated set),
- records arbitration notes that can be reused during refinement.

The route then injects:
- `AVAILABLE PREMIUM SKILLS (CONTEXT)` (stitched from `getCombinedSkillContent`)
- `SKILL_COMPOSITION`, `ACTIVE_SKILLS`, `BACKGROUND_SKILLS`, `SKILL_ARBITRATION_NOTES`
- `VISUAL_STATE`, `VISUAL_ANCHOR`
- `INITIAL_CAMERA_ZOOM`, `INITIAL_CAMERA_PAN`

### 5.3 Follow-up Edit Mode (JSON) (`isFollowUp === true`)
The route uses a JSON decision protocol:
- return `{ type:"edit", summary, edits:[{ old_string, new_string, description }] }` OR
- return `{ type:"full", summary, code:"..." }`

Edits are applied via `applyEdits()`, which requires an exact and unique `old_string` match; if edit application fails, it falls back to full replacement (or returns the original code with an error field).

Why this matters for “too many errors”: if the LLM output breaks the strict “single main export / no imports / ends with `// EOF`” contract, the downstream extraction/compilation and retry loops in `useFullVideoGeneration.ts` will amplify failures.

---

## 6) Dynamic Compilation (`compileCode`) — ~7197 lines in `compiler.ts`

Implementation: `src/remotion/compiler.ts`.
Turns LLM-authored per-scene code into an executable React component via:
- output normalization (strip fences/imports, extract component body, remove conflicting BRAND declarations),
- Babel transpilation (standalone `@babel/standalone` transform),
- runtime scope injection (via `new Function(...)` with a large curated scope),
- safety wrappers for Remotion interpolation/springs and style sanitization,
- self-healing “undeclared symbol” fallbacks to prevent predictable runtime crashes.

### 6.2 Scope Injection highlights
- **Physics / motion**: `SPRING_CONFIGS` plus compiler-local safe motion variants.
- **Style utilities**: `getGlassCard()` + `SHADOWS` constants (low/medium/high/darkGlass/hero).
- **Safety utilities**:
  - `safeInterpolate` (coerces invalid numeric ranges and prevents Remotion infinite-range crashes),
  - `safeSpring` (ensures finite, positive spring config; derives damping/stiffness from `wordTimings`),
  - `SafeReact.createElement` (sanitizes `style` props to prevent NaN/Infinity propagation).
- **Visual components / hooks**: injected into the generated component scope (camera/depth/blur/cursor chameleon/audio sync, etc.).

### 6.3 Self-Healing Robustness Layers
- **Extraction normalization**:
  - `extractComponentBody()` strips imports/exports and chooses the best renderable body via scoring.
  - `stripBrandDeclaration()` prevents “Identifier BRAND has already been declared”.
  - hoisting/normalization passes (hook declaration hoisting + scope alias injection) reduce TDZ/hook-order issues.
- **Healing fallbacks** (to recover from common LLM omissions):
  - undeclared ALL_CAPS constants get safe defaults (`const X = 0;`) when the name matches known safe suffix patterns,
  - undeclared PascalCase components are stubbed with minimal render shells,
  - undeclared camelCase helper functions can be stubbed with conservative `(...args) => args[0] ?? 0` defaults,
  - a subset of scalar timing/coordinate identifiers can be injected with conservative defaults to avoid runtime crashes.
- **Runtime sanitization**:
  - numeric style values are clamped/coerced to safe finite values,
  - `opacity/transform/filter` are guarded so invalid values do not crash the renderer.

### 6.4 Error Parsing & Output Contract Expectations
- `compileCode()` returns `{ Component: null, error, compilationError }` on failure.
- `parseCompilerError()` extracts `line/column` from Babel/runtime messages and includes a small snippet for targeted debugging.
- `useFullVideoGeneration.ts` consumes these errors to decide between:
  - an audit refinement pass,
  - or a second “fallback generation” pass with a targeted FIX STRATEGY.

### 6.6 Transition System (`withTransition`)
Fade, slide, scale, flash, cameraPan, zoomThrough. `cameraPan` is the default for middle scenes to maintain "infinite canvas" continuity.

---

## 7) Quality Loop & Strategic Audit

### 7.1 Fast Quality Check (Client-side)
`useFullVideoGeneration.ts` runs a lightweight pre-check before spending tokens on deep audit:
- `fastQualityCheck(finalCode, scene.intent)` produces a cheap signal about likely rule violations (structure/hierarchy risk, based on intent).
- `shouldRequestAudit(scene, fastCheck)` decides whether to call the deep audit endpoint.

This gate reduces audit over-triggering and helps avoid “provider failure → retry loop → more failures”.

### 7.2 Strategic Art Director Audit (`POST /api/audit`)
When the gate says “yes”, `useFullVideoGeneration.ts` calls `/api/audit` with:
- `code` (the compiled-ready scene code string),
- `prompt` + `brand`,
- `creativeBrief` and `backbone` (planner context).

Refinement is triggered with a strict, single-pass rule:
- if `!audit.auditFailed`
- AND `audit.score < MIN_AUDIT_SCORE_FOR_REFINEMENT` (currently `75`)
- AND `audit.fixes?.length > 0`
- then it triggers ONE refinement generation pass.

### 7.3 Art Director Refinement Loop (`useFullVideoGeneration.ts`)
The refinement loop does:
- builds a `refinementContext` from `audit.fixes` + `audit.issues`,
- re-generates the COMPLETE component while staying on the planned skill set (`consumeSceneGeneration(..., "force", ...)`),
- re-compiles with `compileCode()`,
- accepts the refined component only if compilation succeeds.

Important failure mode: if the audit/fetch fails, it is treated as non-fatal (the scene still compiles using the first-pass output).

This audit refinement is separate from the compilation fallback retry loop (next).

### 7.4 Compilation Fallback Retry Loop (contract + syntax recovery)
Inside `useFullVideoGeneration.ts`, each scene follows:
1. **Structure validation before compile**
   - `detectSceneStructureIssues(code)` detects common contract breaks:
     - leaked language label tokens,
     - missing `return`,
     - missing `<AbsoluteFill>` in returned JSX,
     - missing main `export const MyAnimation ...`,
     - nested exported components,
     - unsafe/banned runtime symbols (e.g. invented variables),
     - banned spring patterns (e.g. `spring(...).to(...)`).
   - if structure issues exist, compilation is skipped and errors are converted to a FIX STRATEGY string via `formatStructureIssuesForRetry(...)`.
2. **Compile attempt via `compileCode(...)`**
3. **Second “fallback generation” pass**
   - if `compileCode` returns `result.error` (or structure issues were detected), the code classifies the first error line into known buckets (dangling ternary comment, unbalanced brackets, truncated array/object literal, unexpected token/JSX parse errors, undefined variables, runtime null/undefined patterns).
   - it then calls `consumeSceneGeneration(..., retryErrorCtx, ..., "fallback", ...)` to regenerate with targeted restrictions and re-compiles.
4. **Hard fallback**
   - if both compile attempts fail, the scene becomes a placeholder (`code: ""`), and the UI/preview auto-retry UX can regenerate it later.

---

## 8) Visual Grammar & Standards

### 8.1 Text Stack
Label @f:8 (12px, 0.22em tracking), Headline @f:20 (96px+, -0.04em), Sub-line @f:40 (22px, textMuted).

### 8.3 Physics — Spring Configs
| Preset | Damping | Stiffness | Use case |
|---|---|---|---|
| entrance | 200 | 120 | Standard UI reveal |
| snap | 160 | 220 | Hero cards, AHA moments |
| float | 22 | 70 | Gentle oscillation loops |
| pop | 8 | 150 | Playful badges, confetti |
| cinematic | 200 | 80 | Camera push-in |

### 8.5 Glass Card Formula (WhatAStory High-Depth)
```css
background: linear-gradient(...)
backdropFilter: "blur(24px) saturate(160%)"
// Directional borders:
borderTop: "1.5px solid rgba(255,255,255,1.0)" // bright catch-light
borderRight: "1.5px solid rgba(0,0,0,0.05)" // soft
// Two-layer shadow via SHADOWS.high:
boxShadow: "0 4px 8px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.12), 0 32px 64px rgba(0,0,0,0.15)"
```

### 8.6 Shadow Depth Scale (`SHADOWS`)
Standardized elevations: `low`, `medium`, `high`, and `hero` (for AHA/CTA moments with deep ambient occlusion).

---

## 9) Skill System
- 64+ guidance skills (`.md`) loaded at build time. Categorized into Brand/Intro, Problem/Contrast, Showcase/Feature, Trust/Proof, Polish, Audio.
- Enforced single primary skill per scene to maintain clarity and prevent visual clutter.

---

## 10) Audio Pipeline
- TTS: 4-tier fallback ending in Silence.
- Music: ElevenLabs generated (corporate, energetic, cinematic, calm, playful) with 35% auto-duck at scene boundaries.
- SFX: 6 canonical types auto-placed.
- Analysis: Spectrum hooks (`useSpectrum`, `useBassKick`), Beat sync (`useBeat`, `useBeatClock`).

---

## 11) 3-Tier Background System
Tier 1: AI Video (Veo placeholder).
Tier 2: Stock Video (Pexels).
Tier 3: Constructed in-compiler backgrounds (`LightArcBg`, `MeshGradientBg`, `BoldColorBg`). Forced to a single variant across the entire video.

---

## 12) Cursor System
Three-phase model (approach, hover, click) via `useCursorState`.
`useHumanizedCursor` adds micro-jitter, breath-pauses, and intent arcs. Integrates with `uiSchema` for precise UI snapping.

---

## 13) Continuity System
- `VISUAL_STATE`: Carry-over instructions explicitly injected into LLM scope.
- `Visual Anchors`: Icons that physically transform (broken→resolved) across problem/solution scenes.
- `Morph Portals`: `morphExport` and `morphImport` for seamless cross-scene shape transitions.
- Camera Continuity: Preserves zoom/pan between `carryOver.camera` edges.

---

## 15) Environment & Deployment

### Required API Keys
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `ELEVENLABS_API_KEY` (optional)
- `PEXELS_API_KEY` (optional)

### Rendering Pipeline
1. `POST /api/render-local` bundles Remotion composition.
2. Renders MP4 via `@remotion/renderer` optimized for heavy UI/blurs: **`concurrency: 8`**, `h264` high profile, and specialized Chromium flags (`--disable-dev-shm-usage`, `--disable-gpu`).
3. Sends SSE progress updates back to client.

---

## 16) Deep dive — `useFullVideoGeneration.ts`
Client-side orchestration runtime.

This module implements the end-to-end “complete pipeline” (planner → audio → code generation → compilation → audit/refinement → master assembly) and is the primary place where error amplification (and its containment) happens.

Implementation: `src/hooks/useFullVideoGeneration.ts`.

### 16.1 Step 1 — Flow detection → plan approval
Entry point: `generateFullVideo(prompt, model, images, imageUserDescriptions)`
- If `images.length >= 2`:
  - for `<= 4` images it skips `/api/flow-analyze` and builds a synthetic `ScreenFlow` with `navigate` transitions (saves provider cost),
  - for `> 4` images it calls `/api/flow-analyze`, then waits for the user to approve/edit via `ScreenshotFlowEditor`.
- If `images.length < 2`, it skips flow detection and goes straight to planning.

Planning call: `runPlan(...)`
- POSTs to `/api/plan` with:
  - `prompt`, `model`,
  - `images` and `imageUserDescriptions` (optional),
  - `screenFlow` (optional),
  - cached brand tokens when images are unchanged,
  - `targetDurationSeconds`.
- The plan response sets:
  - `scenes` + `brand` (+ `logo` override),
  - `creativeBrief`, `backbone`,
  - `globalBg`, `globalVisualThread`,
  - `edges` (flow carry-over hints).
- The planner is disciplined with AHA/FRUSTRATION/CTA guards (warnings + an auto-mark for AHA if missing).

Flow approval:
- `approveFlow(screenFlow, waypointsByImage, descriptions?, keyFrameIndices?)` optionally narrows multi-image planning to key frames to improve story focus and reduce quota.
- Waypoints are injected only into the FIRST eligible interaction scene for each image index to avoid every scene inheriting the same cursor path.

### 16.2 Step 2 — Audio prefetch + duration clamp/alignment (quality amplifier)
`confirmPlan(editedScenes, screenFlow?, voiceId?)`
- prefetches in parallel:
  - `prefetchVoiceovers` (TTS) → provides `voiceoverAudioUrl` + `wordTimings`,
  - `prefetchSfx`,
  - `prefetchMusic` (ElevenLabs).
- derives `dominantMood` primarily from the solution/feature scene and then from the emotionalIntent arc.
- clamps scene duration to audio:
  - if `wordTimings` exists, extends `durationInFrames` to `lastTiming.endFrame + 15` when audio would overflow.
- aligns scene durations across boundaries:
  - `alignSceneDurations(...)` adjusts durations to better match audio timing.
- enforces runtime budget:
  - caps total length to `<= 90s` and snaps scaled durations to a `30f` grid.

### 16.3 Step 3 — Sequential per-scene code generation → strict compile → audit/refinement → retry
Generation entry: `runGeneration(...)`
- `CONCURRENCY = 1` to reduce provider stream stalls/rate-limit failures.
- enriches each scene prompt with flow-derived `journeyContext` when `screenFlow` exists.
- applies `FlowEdge.carryOver`:
  - `carryOver.ui` marks destination scenes as navigation continuations,
  - `carryOver.camera` determines whether camera state is inherited on `cameraPan` cuts.
- builds continuity:
  - `buildContinuityContext(prevCompiled, prevPlan, brand, nextPlan)` includes emotion + Visual Anchor exit-state handoff text,
  - injects `globalVisualThread` and a `GLOBAL STYLE CONTINUITY` palette summary so later scenes don’t drift.

Per-scene worker: `processScene(scene, ...)`
1. Cursor stability:
   - precomputes `pipelineCursorSteps` from `scene.cursorWaypoints` so cursor animation works even if the LLM mangles CURSOR_STEPS.
2. Code generation:
   - calls `consumeSceneGeneration(...)` (which hits `/api/generate` SSE) with `"force"` (planned skills) or a targeted refinement/fallback context.
3. Normalization + structure validation:
   - `prepareGeneratedSceneCode(...)` extracts the component body (`extractComponentCode(stripMarkdownFences(...))`).
   - `detectSceneStructureIssues(code)` blocks compilation when contract breaks are detected (missing `export const MyAnimation`, missing `<AbsoluteFill>`, nested exports, banned spring patterns, leaked language labels, invented runtime symbols, etc.).
4. Compile:
   - successful path compiles via `compileCode(...)`.
5. Strategic Art Director audit + one-pass refinement:
   - lightweight gate → if needed calls `/api/audit`,
   - if `audit.score < 75` and `audit.fixes` exist, triggers exactly ONE refinement generation pass, then recompiles.
6. Compile/fallback retry (second generation pass):
   - if compilation fails, errors are classified from the first-line message into buckets (dangling ternary, unbalanced brackets, JSX parse errors, undefined vars, runtime null/undefined),
   - it then calls `consumeSceneGeneration(..., "fallback", retryErrorCtx, ...)` and recompiles.
7. Hard fallback:
   - if both attempts fail, returns a placeholder with `code: ""` and the UI can re-trigger generation later.

### 16.4 Step 4 — Master composition assembly
After all scenes compile:
- `createMasterComponent(validScenes, brand.bg, musicUrl, ...)` builds the timeline.
- `buildMasterCode(validScenes, ...)` builds the master string used by the preview player.
- total duration is computed with explicit hold/transition overlaps so visuals match audio pacing.

---

## 22) `src/app/api/plan/route.ts`
Implements the multi-phase Director.
Enforces the "Agency Discipline Mandates" via the large system prompt. Handles Zod validation and critique/refine loops for the backbone and plan.

---
## 23) Tests
Extensive Vitest suite (`src/remotion/compiler.test.ts`) validating compiler extraction, brace balancing, component scope injection, and the new Agency Standard physical/visual constraints.
