## MarkyStudio — Complete System Context (Exhaustive, implementation-first)

> **Last rebuilt:** 2026-04-01
> **Audience:** contributors + future agents.
> **Goal:** describe what is actually implemented (not aspirational).
> **Source of truth:** `src/**` + `types/**` + `package.json`.

---

## 0) What this project does

MarkyStudio is a **Next.js + Remotion** application that generates **agency-style SaaS explainer / product demo videos** from:

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
→ Generate Code → Compile → Strategic Audit → Preview → Render/Download
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
  - Supports per-scene **@mention edit routing** in chat (e.g. `@2`, `@Scene1`, `@scene-1`, `@intro`) via `parseSceneMention()`.
  - **Auto-start**: if URL contains `?prompt=...&model=...`, calls `generateFullVideo()` once (200ms delay) using images/descriptions restored from `sessionStorage`.
  - **Auto-retry failed scenes**: after a successful `masterCode` update, any scenes with `code === ""` are re-generated (staggered 3s) unless the last error suggests quota exhaustion.
- `src/app/code-examples/page.tsx` — Playground for compile behavior testing.

### Core orchestration hooks (7)
- `src/hooks/useFullVideoGeneration.ts` (3106 lines) — **Director Engine**. Orchestrates Brief → Backbone → Plan → TTS → Alignment → Generation → Audit. Manages `CompiledScene` state with strategic context persistence. Contains `applyPacingProfile()`, `enforceRhythmProfile()`, LRU scene cache (max 30), `buildBrandBlock()`, `buildMasterCode()`, `buildVoiceoverMap()`, `createMasterComponent()`, `withTransition()`, `SceneErrorBoundary`, `prefetchMusic()`, `prefetchSfx()`, `prefetchVoiceovers()`.
- `src/hooks/useGenerationApi.ts` — Transport for `POST /api/generate` (SSE stream parsing).
- `src/hooks/useCursorSteps.ts` — Safe parsing/rewriting of `const CURSOR_STEPS` inside generated code.
- `src/hooks/useImageAttachments.ts` — Attachment ingestion + video frame extraction.
- `src/hooks/useAutoCorrection.ts` — Error correction loop (up to 3 iterations with LLM feedback).
- `src/hooks/useConversationState.ts` — Multi-turn conversation history management.
- `src/hooks/useAnimationState.ts` — Animation playback state.

### API routes (16 endpoints in `src/app/api/**/route.ts`)

| Route | Method | Purpose |
|---|---|---|
| `plan` | POST | **Director planning pipeline**: Creative Brief (Phase 0) → Narrative Backbone (Phase 1) → Scene Plan (Phase 2). Optional brand+image-description extraction (combined call). Tiered summarization for 10+ video frames. Plan critique + refinement loop. Returns `creativeBrief` + `backbone` alongside scenes. |
| `generate` | POST | **Code generation**. Streaming initial generation over SSE (`metadata`, `text-start`, `text-delta`, `[DONE]`). Follow-up edit mode returns JSON (tool-style string edits or full replacement). Includes retry logic for transient 429s and model fallback on 503. |
| `flow-analyze` | POST | Screenshot/video-frame flow analysis. Uses Gemini Vision to derive `ScreenFlow` (screens + transitions) plus `energyLevel`, `visualComplexity`, `uiPace`. Includes a 2-pass “video recording mode” with key-frame detection + server-side cache keyed by light fingerprints + descriptions. |
| `vision` | POST | Interactive UI element detection. Precision 0-1000 coordinate system. Returns up to 10 elements with bounding boxes, element types, and optional IDs. |
| `ui-decompose` | POST | 2-pass UI layout analysis. Pass 1: layout spine extraction (max 6 zones). Pass 2: per-zone detail extraction using server-side cropping via `sharp`. Optional `verify=true` runs a Pass 3 structural diff between original + reconstruction. |
| `audit` | POST | Strategic Director Audit (Ralph Loop Phase 4). In-memory cache (SHA-256, 5-min TTL). Evaluates narrative strategy, visual continuity, layout hierarchy, brand fidelity. |
| `critique` | POST | Fast pre-render code review (Art Director). Single most impactful issue across 6 priorities. Returns `hasIssues` + `fixPrompt`. |
| `tts` | POST | TTS with 4-tier fallback: ElevenLabs Flash v2.5 (character alignment → word timings) → ElevenLabs basic → Gemini TTS (`gemini-2.5-flash-preview-tts`, wraps PCM to WAV when needed) → Silence. Per-intent ElevenLabs voice settings. Caps text at 1000 chars. |
| `music` | POST | ElevenLabs music generation proxy. Styles: corporate, energetic, cinematic, calm, playful. Optional `musicMood` adds a tone modifier. Cache key is `${style}:${musicMood}` (or `style` only). |
| `sfx` | POST | ElevenLabs SFX proxy. Generates canonical set (`click`, `whoosh`, `pop`, `type`, `success`, `swoosh`) with module-level cache for process lifetime. |
| `stock-video` | GET | Pexels stock video search (Tier 2 of 3-tier background system). Returns HD video URLs. 1-hour cache. |
| `veo` | POST | Google Veo 2 AI video placeholder (Tier 1). Currently returns a hard-coded cinematic fallback URL based on prompt keywords + echoes `originalPrompt`. |
| `capture` | POST | Puppeteer web page screenshot capture. Supports interaction sequences (click, scroll, hover, wait). Returns base64 JPEG frames. |
| `align` | POST | Automated audio-visual alignment. Adjusts `durationInFrames` so visual reveals hit on spoken words. |
| `render-local` | POST | Local Remotion MP4 renderer. Bundles `src/remotion/index.ts` (cached per server process), renders MP4 to `.renders/<jobId>.mp4`. SSE progress events map render progress into 0.15→0.98 range; sends `done` with `{ jobId, size }`. |
| `render-local/download/[jobId]` | GET | Video download handler. UUID validation, streams MP4, auto-deletes after download. |

### Components (32 files across 7 directories)

**Top-level:**
- `ErrorBoundary.tsx` — React class error boundary with fallback UI.
- `ErrorDisplay.tsx` — Flexible error UI (inline/card/fullscreen, 3 sizes, dismissible).
- `Header.tsx` — Logo/branding "MarkyStudio" header.
- `PageLayout.tsx` — Main page wrapper with header and optional sidebar.
- `LandingPageInput.tsx` — Landing form: product description, model selector (9 model options), image attachment, logo upload, tagline/videoType/brandTheme fields.
- `TabPanel.tsx` — Tab navigation: code, preview, cursor, plan.

**AnimationPlayer/:** `index.tsx` (Remotion Player + cursor pin + settings modal + error fallback), `RenderControls/` (DownloadButton, ProgressBar, Error), `SettingsModal.tsx`.

**ChatSidebar/:** `ChatSidebar.tsx` (forwardRef, message history, model selector, collapse toggle), `ChatHistory.tsx`, `ChatInput.tsx`.

**CodeEditor/:** `CodeEditor.tsx` (Monaco + JSX highlighting + streaming overlay), `EditorHeader.tsx`, `CopyButton.tsx`, `StreamingOverlay.tsx`.

**CursorEditor/:** `index.tsx` — Edit cursor walkthrough steps, add/remove/edit actions (click/hover/move/none), frame timing.

**ScenePlanEditor/:** `index.tsx` (50+ available skills, add/regenerate/delete scenes, cursor waypoint UI, plan revision with `revisePlan()` + `refinementFeedback`), `CursorWaypointEditor.tsx`, `ScreenshotFlowEditor.tsx`.

**SceneTimeline/:** `index.tsx` — Timeline visualization with colored segments, current frame indicator, seek, regenerate buttons, audit scores.

### Helpers (4 files in `src/helpers/`)
- `api-response.ts` — Zod-based `executeApi<Res, Req>` with schema validation.
- `capture-frame.ts` — `captureFrame()` via `renderStillOnWeb`; `fileToBase64()`.
- `sanitize-response.ts` — `stripMarkdownFences()`, `validateGptResponse()`, `extractComponentCode()`.
- `use-rendering.ts` — Custom hook for video rendering state machine (init → invoking → rendering → done/error).

### Lib (4 files in `src/lib/`)
- `alignScenes.ts` — Audio-visual alignment logic (pure math). Min 90f per scene, 35f tail padding.
- `extractVideoFrames.ts` — Canvas-based video frame extraction with visual-delta filtering. 512px resize.
- `cropZone.ts` — `sharp`-based image cropping for UI decomposition zones.
- `utils.ts` — General utilities (classname merging, etc.).

### Remotion (5 files in `src/remotion/`)
- `compiler.ts` (8747 lines) — Dynamic Babel compilation engine. See Section 6.
- `compiler.test.ts` — Unit tests for compiler.
- `DynamicComp.tsx` — Main Remotion composition entrypoint. Receives props (code, images, brand, uiSchema, globalBg, voiceovers, visualState, highlightWords, visualAnchor).
- `Root.tsx` — Remotion composition root wrapper.
- `index.ts` — Export barrel.

---

## 3) Core data model

### 3.1 Model Selection
9 model options defined in `MODELS[]`:
- **Free tier**: `gemini-2.5-flash:none`, `gemini-2.5-pro:none/low/medium/high` (thinking budget variants)
- **Paid tier**: `gemini-3-flash-preview:none`, `gemini-3.1-pro-preview:none/low/high`

### 3.2 `CreativeBrief` (Phase 0 Strategy)
- `logline`, `estimatedSceneCount`, `typographyHero`, `soundIntention`.
- `emotionalArc[]`: beats with `intent`, `feeling`, `pacingWord` (punch/breathe/accelerate/silence/release), `durationBias`, `colorTemperature`.
- `visualGrammar`: `shapeLanguage`, `textureStyle`, `iconStyle`, `layoutDensity`, `motionPersonality`.
- `spatialWorld`: `worldDescription`, `cameraStartPosition`, `depthStrategy`, `scenePositions[]`.
- `coreTransformation`: "From [pain] → to [gain]" sentence.
- `visualMetaphor`: hook/problem/solution visual concept strings.

### 3.3 `NarrativeBackbone` (Phase 1 Backbone)
Intermediate structure generated before the detailed plan:
- `logline`, `coreTransformation`, `globalVisualThread`.
- `beats[]`: `beatIndex`, `intent`, `visualMetaphor`, `durationFrames`, `imageIndex?`, `reasoning`, `visualState`.

### 3.4 `ScenePlan` (Detailed Planning)
Core fields: `id`, `title`, `prompt`, `skills[]`, `durationInFrames`.
- **Narrative**: `intent` (hook|problem|solution|feature|proof|cta), `emotionalIntent`, `isAhaMoment`, `voiceoverText`, `highlightWords[]`, `stageDirection`.
- **Continuity**: `visualState`, `visualAnchor` ({icon,label,colorFrom,colorTo}), `continuityRole` (new-world|continue-world), `transition` (fade|slide|scale|flash|none|cameraPan|zoomThrough), `exitAnchor` ({x,y}).
- **Skill system**: `skillComposition` ({primary, secondary[], modifiers[]}), `skillBudget`, `motionBudget`.
- **Cursor/interaction**: `cursorWaypoints[]`, `interactionScript[]` (InteractionEvent[]).
- **UI**: `uiSchema`, `featureHeader` ({label,badge?,icon?}), `sectionLabel`, `isWalkthroughScene`.
- **Media**: `stockFootage`, `voiceoverAudioUrl`, `wordTimings[]`, `musicVolume`, `musicMood`.
- **Camera**: `macroZoom` ({zoomLevel,focusPoint,zoomInFrame?,holdFrames?}).
- **Morph**: `morphExport`, `morphImport` ({id, rect{x,y,w,h}}).
- **Multi-image**: `imageIndex`, `imageIndices[]`.

### 3.5 `BrandTokens`
- **Colors**: `primary`, `secondary`, `bg`, `surface`, `text`, `textMuted`, `border`.
- **Typography**: `font`, `displayFont?`, `annotationFont?`.
- **Meta**: `accentName`, `style` (dark|light|neon), `name?`, `url?`, `cta?`, `musicStyle?`, `logo?`.

### 3.6 `FullVideoPlan`
- `scenes[]`, `brand?`, `screenFlow?`, `bgSkill?`, `globalBg?` (arcs|grid|dots), `globalVisualThread?`, `edges?` (FlowEdge[]).

### 3.7 `FlowEdge`
Directed graph edges between scenes: `from`, `to`, `transition`, `carryOver?` ({cursor?, camera?, ui?}), `emotionalShift?`.

### 3.8 `InteractionEvent`
Timed interaction mapped to Remotion frames: `frame`, `action` (type|click|hover|popup-open|popup-close|accordion|drag|panel-slide), `target`, `value?`, `durationFrames?`, `elementType?`, `box?`, `style?`, `sectionHeader?`, `sfx?`, `annotation?`, `preClickEffect?`.

### 3.9 `UISchema`
Vision-extracted structural schema: `layout` (type + sidebar + topbar), `mainContent.sections[]` (metric-cards|table|chart|form|card-grid|list|detail-panel|hero-header), `theme`.

---

## 4) The Director Agent Architecture (Implemented)

MarkyStudio uses a **Multi-Step Reasoning Loop** to ensure videos are strategically grounded and visually continuous.

### 4.1 Phase 0: Creative Strategy (The Brief)
- **Model**: `gemini-2.5-pro` with 800-token Thinking Budget.
- **Goal**: Establish "Core Transformation", emotional arc, visual grammar, spatial world, visual metaphors.
- **Output**: `CreativeBrief` with structured schema validation.

### 4.2 Phase 1: Narrative Architecture (The Backbone)
- **Model**: `gemini-2.5-pro` with 1500-token Thinking Budget.
- **Goal**: Define scene-by-scene beats, visual metaphors, duration allocations, visual continuity handoffs.
- **Critique loop**: `critiqueNarrativeBackbone()` evaluates narrative tension, transformation delivery, visual continuity, metaphor quality. If `needsRefinement`, runs refinement pass with lower temperature (0.4) and 1000-token thinking.
- **Output**: `NarrativeBackbone`.

### 4.3 Phase 2: Scene Design (The Detailed Plan)
- **Model**: `gemini-2.5-flash` (FAST_MODEL).
- **Prompt**: `buildDirectorPlannerSystemPrompt()` merges Brief + Backbone into non-negotiable mandates.
- **Critique loop**: `critiqueScenePlan()` checks backbone alignment, metaphor enforcement, skill composition, continuity flow, AHA moment design. Runs refinement if needed.
- **Output**: `FullVideoPlan` with `ScenePlan[]` + `BrandTokens`.

### 4.4 Phase 2.5: Plan Refinement (User Feedback)
- Uses `REFINEMENT_PLANNING_PROMPT` for surgical plan revision.
- Receives `refinementFeedback` from client, preserves unchanged scenes, maintains narrative coherence.

### 4.5 Hard Requirements Checklist (8 non-negotiable rules)
1. Chaos Scene: Zero product branding in Scene 1, specific human + specific pain + data point.
2. Act Timing: Every scene prompt has explicit "Act 1/2/3" frame allocations.
3. Layout Topology: No two consecutive scenes share the same topology.
4. Visual Thread: Every scene prompt has "VISUAL THREAD:" line.
5. Transitions: ≥80% middle scenes use cameraPan.
6. Voiceover: Outcome-driven (viewer gains), word count ≤ (duration/30) × 2.8.
7. Highlight Words: Every scene has highlightWords[].
8. Stage Direction: Every scene prompt ends with camera/emotional arc sentence.

---

## 5) Code Generation (`POST /api/generate`)

### 5.1 Initial Generation (SSE)
- Prompt classification validates request is motion-graphics related.
- Emits SSE events:
  - `metadata`: `{ type:"metadata", skills: string[] }`
  - `text-start`: `{ type:"text-start" }`
  - `text-delta`: `{ type:"text-delta", delta: string }` (streaming code tokens)
  - `[DONE]`
- System prompt enforces: VISUAL_STATE continuity mandate, skill composition engine, headline animation rules, background rules, depth/isometric staging, glass card formula, shadow depth scale, spring config presets, emotional intent → animation style mapping, scene act structure, interpolate safety rules, easing patterns, UI_SCHEMA rules.
 - Server reliability behaviors:
   - Retries transient per-minute 429s up to 2× using provider `retryDelay` when present.
   - If upstream returns 503 UNAVAILABLE for `gemini-3-flash-preview`, falls back to `gemini-2.5-flash`.
   - If the client disconnects, avoids `controller.error()` and closes the SSE stream cleanly.

### 5.2 Follow-up Edit Mode (JSON)
- Used when `isFollowUp === true` and `currentCode` is provided.
- The model returns a structured decision:
  - **Targeted edits**: `{ type:"edit", summary, edits:[{ description, old_string, new_string }] }` → applied via `applyEdits(currentCode, edits)`
  - **Full replacement**: `{ type:"full", summary, code }`
- If an edit fails to apply uniquely, the API returns `400` with `{ type:"edit_failed", error, failedEdit? }` so the client can retry with richer context.

### 5.3 Hard Rules (Front-loaded in system prompt)
- No opacity-only headline fades (use `MaskedReveal` or `KineticText`).
- No flat backgrounds (use `LightArcBg` or `AbstractMotionBg`).
- Cinematic rules for Showcase scenes (wrap in `CinematicCamera`).
- Mandatory `GlowBloom` on CTA buttons and metrics.
- `IsometricWrapper` is default 3D staging (not `TiltWrapper`).
- `BRAND.*` values are non-negotiable — no invented colors.
- `interpolate()` outputRange must be numbers only (no CSS strings).

---

## 6) Dynamic Compilation (`compileCode`) — 8747 lines

Implementation: `src/remotion/compiler.ts`. The most critical robustness layer.

### 6.1 `compileCode()` Signature (22 parameters)
```ts
compileCode(
  code, attachedImages[], brand{}, voiceoverAudioUrl, wordTimings[],
  uiSchema, globalBg, globalFrameOffset, morphFrom, sfxUrls{},
  voiceoverUrls{}, initialCameraState, stockVideoUrl, featureHeaderData,
  musicUrl, companyLogoUrl, highlightWords[], visualState, visualAnchor,
  musicMood, skillComposition, pipelineCursorSteps[]
): CompilationResult
```

### 6.2 Scope Injection (Import-free Generation)
All identifiers injected into the sandbox via `new Function()`:

**React/Remotion Core:**
`React`, `AbsoluteFill`, `interpolate` (safe wrapper), `interpolateColor`, `useCurrentFrame`, `useVideoConfig`, `spring`, `Sequence`, `Img`, `Audio`, `OffthreadVideo`, `random`, `useState`, `useEffect`, `useMemo`, `useCallback`, `useContext`, `useReducer`, `useRef`

**Remotion Shapes:**
`Rect`, `Circle`, `Triangle`, `Star`, `Polygon`, `Ellipse`, `Heart`, `Pie` (+ make* constructors)

**Remotion Transitions:**
`TransitionSeries`, `linearTiming`, `springTiming`, `fade`, `slide`, `wipe`, `flip`, `clockWipe`

**Remotion Media:**
`useAudioData`, `visualizeAudio`

**Three.js:**
`THREE`, `ThreeCanvas`, `Lottie`

**Brand/Data:**
`BRAND`, `ATTACHED_IMAGES`, `UI_SCHEMA`, `VOICEOVER_AUDIO_URL`, `WORD_TIMINGS`, `GLOBAL_BG`, `GLOBAL_FRAME_OFFSET`, `MUSIC_BPM`, `MUSIC_URL`, `MUSIC_MOOD`, `STOCK_VIDEO_URL`, `COMPANY_LOGO`, `HIGHLIGHT_WORDS`, `VISUAL_STATE`, `VISUAL_ANCHOR`, `INITIAL_CAMERA_ZOOM`, `INITIAL_CAMERA_PAN`, `MORPH_FROM`, `SFX_URLS`, `VOICEOVER_URLS`, `SKILL_COMPOSITION`

**Physics:**
`SPRING_CONFIGS` (entrance: d200/s120, snap: d160/s220, float: d22/s70, pop: d8/s150, cinematic: d200/s80), `EASINGS` (easeOutCubic, easeInOutCubic, easeInQuad), `PACING_PROFILE`

**Style Utilities:**
`getGlassCard()`, `glowBloomStyle()`, `SAFE_ZONES`

**Visual Components:**
`GlowBloom`, `ChromaticAberration`, `CameraMotionBlur`, `DepthBlur`, `ContextualBgPulse`, `MeshGradientBg`, `LightArcBg`, `AbstractMotionBg` (GradientFlow, ParticleField, LightLeak, GridPulse), `EntropyDust`, `FilmGrain`, `ParallaxLayer`, `SheenOverlay`, `MotionBlurWhip`, `UITransition`, `SyncedWord`

**Layout Components:**
`TiltWrapper`, `IsometricWrapper`, `DepthStack`, `InWorldText`, `SteppedCamera`

**UI Skeleton Components:**
`ReconstructedAppShell`, `AppShell`, `AnimatedSidebar`, `AnimatedTopbar`, `AnimatedMetricCards`, `AnimatedTable`, `AnimatedChart`, `AnimatedForm`, `AnimatedHighlighter`, `ContextualSectionHeader`, `SfxSequencer`, `AmbientEnvironment`, `PersistentSectionLabel`, `FloatingShapes`, `ContentCard`, `TaskDetailPanel`, `ModalOverlay`, `SidebarNav`, `StatusBadge`, `NotificationToast`, `TableActionButton`, `FeatureContextBar`

**Cursor Hooks:**
`CURSOR_STATE_DEFAULT`, `CURSOR_STEPS`, `useCursorState`, `useHumanizedCursor`, `useCursorPos`, `useMouseProximity`, `resolveElementPosition`

**Interaction Hooks:**
`useTyping`, `usePopup`, `useAccordion`, `useDragItem`, `useInteractionFeedback`, `useInteractionCycle`, `usePreFocusCamera`

**Behavioral Hooks:**
`useEntropy`, `useEntropyWithAttractor`, `useStagger`, `useCascadeTree`, `useVitality` (bounce/breathe/float/pulse), `useMagnetic`, `useTrackedParallax`, `useVelocityMomentum`, `useVelocityAudio`

**Audio Hooks:**
`useAudioSync`, `useBeat`, `useBeatClock`, `snapToDownbeat`, `useSpectrum` (bass/mid/treble), `useBassKick`, `useCounter`

**Morph Hook:**
`useMorphEntrance`

### 6.3 Self-Healing Robustness Layers
- **TS Stripping**: Removes return types and generic arguments (e.g. `useState<T>`).
- **CURSOR_STEPS Normalization**: Strips empty declarations; hoists array literals to avoid TDZ; repairs unclosed arrays.
- **Array.from Recovery**: Detects unclosed `Array.from` initializers, injects defensive `}));`.
- **Literal Collapse**: Collapses partial `const X = [` / `const X = {` that never close into `[]` / `{}`.
- **Undeclared Identifier Fallbacks**: ALL_CAPS → `const X = 0`; PascalCase → empty Fragments; camelCase → identity functions.
- **Redeclaration Stripping**: Removes redeclarations of scope variables (MUSIC_BPM, COMPANY_LOGO, etc.).
- **Brace Balance Checker**: `checkBraceBalance()` ensures matching `{}`/`()`.
- **Safe interpolate**: Wrapper sanitizes inputRange/outputRange before passing to Remotion (prevents `checkInfiniteRange` throws).
- **Duplicate const stripping**: `stripDuplicateConstDeclarations()`.
- **Hoisting passes**: `hoistPureTopLevelConstsToTop()` (global topo-sort), `hoistTopLevelConsts()` (local chunk refinement), `hoistTopLevelVideoConfigDestructures()`.
- **Orphan closer stripping**: `stripOrphanCloserLines()`, `stripDanglingTopLevelObjectElements()`.

### 6.4 Master Component (`createMasterComponent`)
Assembles all compiled scenes into one Remotion composition with:
- **AnimatedArcBg**: Persistent background (light: animated SVG arc lines; dark: drifting radial mesh gradient + entropy dust).
- **Scene Sequences**: Each scene wrapped in `withTransition()` (fade/slide/scale/flash/cameraPan/zoomThrough) + `SceneErrorBoundary`.
- **Music**: Per-scene volume automation with 35% duck at scene boundaries. Loop playback.
- **Transition SFX**: Auto-placed Audio elements at scene transitions (cameraPan→swoosh, slide→whoosh, flash→pop).
- **FilmGrainLayer**: Emotion-adaptive noise overlay (FRUSTRATION: 0.06, RELIEF: 0.02, EXCITEMENT: 0.04, default: 0.03). Alternates two SVG noise patterns.
- **VignetteLayer**: Emotion-adaptive dark radial border (PAIN: 0.15, RELIEF: 0.05, default: 0.08). Crossfades over 12 frames at scene boundaries.
- **SectionLabelLayer**: Persistent top-left feature label with glassmorphic pill.
- **PersistentWorldLayer**: `EntropyDust` (18 particles with stable seeds).

### 6.5 `buildMasterCode()` — Lambda-ready string export
Mirrors `createMasterComponent` as a pure code string for Lambda/server-side rendering. Includes inline master layers (_MasterBg, _MasterVignette, _MasterGrain, _SectionLabels, _MusicComp).

### 6.6 Transition System (`withTransition`)
| Type | Entrance | Exit |
|---|---|---|
| fade | Opacity 0→1 | Opacity 1→0 |
| slide | translateX(80→0) + ease-out | — |
| scale | scale(1.06→1) + ease-out | — |
| flash | White overlay 0.85→0 over 6f | — |
| cameraPan | translateX(width→0) + horizontal motion blur (18→0px) | translateX(0→-width) + accelerating blur (0→18px) |
| zoomThrough | scale(10→1) ease-out cubic | scale(1→10) toward exitAnchor with ease-in cubic |

Constants: `TRANSITION_FRAMES = 20`, `HOLD_FRAMES = 24`.

---

## 7) Quality Loop & Strategic Audit

### 7.1 Fast Quality Check (Client-side in `useFullVideoGeneration`)
- `applyPacingProfile()`: Pre-generation duration adjustment. FRUSTRATION/PAIN ≤180f, AHA/RELIEF +15% (≤330f), CTA ≤240f.
- `enforceRhythmProfile()`: Post-generation. CTA ≤150f, AHA ≥210f, FRUSTRATION ≤180f. Break 3-consecutive-same-duration monotony.
- All durations snapped to 30f boundaries, clamped [90, 360].

### 7.2 Strategic Director Audit (`POST /api/audit`)
In-memory cache (SHA-256 code hash, 5-min TTL). Rubric enforces:
- **Narrative**: Alignment with "Core Transformation" and visual metaphors.
- **Continuity**: Proper usage of `VISUAL_STATE` and `VISUAL_ANCHOR`.
- **Visuals**: Layout hierarchy, edge padding (60-120px), brand fidelity.
- Returns structured critique with `hasIssues` boolean and `fixPrompt`.

### 7.3 Art Director Critique (`POST /api/critique`)
Fast single-issue pre-render review. Priorities: missing background > wrong text sizes > off-brand colors > static arrays > missing easing > cramped layout.

---

## 8) Visual Grammar & Standards

### 8.1 Text Stack
3-layer hierarchy: Label @f:8 (12px, 0.22em tracking, BRAND.primary), Headline @f:20 (96px+, -0.04em), Sub-line @f:40 (22px, BRAND.textMuted).

### 8.2 Composition
- 15-20% mandatory padding; lateral "infinite canvas" camera pans.
- Layout topologies: split-left, split-right, center-focus, isometric-float, full-bleed-overlay. No two consecutive scenes share the same.

### 8.3 Physics — Spring Configs
| Preset | Damping | Stiffness | Use case |
|---|---|---|---|
| entrance | 200 | 120 | Standard UI reveal |
| snap | 160 | 220 | Hero cards, AHA moments |
| float | 22 | 70 | Gentle oscillation loops |
| pop | 8 | 150 | Playful badges, confetti |
| cinematic | 200 | 80 | Camera push-in |

### 8.4 Emotional Intent → Animation Style
| Emotion | Spring | Character | Spacing |
|---|---|---|---|
| FRUSTRATION | d:150/s:200 | Jittery, staggered | Tight, crowded |
| PAIN | d:300/s:60 | Slow, heavy drag | Compressed |
| RECOGNITION | d:200/s:120 | Clean, deliberate | Normal |
| RELIEF | d:400/s:80 | Floating, weightless | Generous (160px+) |
| CONFIDENCE | d:200/s:140 | Synchronized, crisp | Clean, structured |
| TRUST | d:300/s:100 | Gentle, warm | Open, relaxed |
| URGENCY | d:120/s:180 | Fast, pressing | Compact |
| EXCITEMENT | d:8/s:200 | Elastic pop, bounce | Energetic |

### 8.5 Glass Card Formula (WhatAStory High-Depth)
```
blur(24px) saturate(150%)
Directional borders: top=full catch-light, left=0.15, right=0.06, bottom=0.04
Two-layer shadow: 0 1px 2px rgba(0,0,0,0.12), 0 25px 50px -12px rgba(0,0,0,0.50)
```

### 8.6 Shadow Depth Scale (Light Themes)
| Elevation | Shadow |
|---|---|
| Low | 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06) |
| Medium | 0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.04) |
| High | 0 4px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.08), 0 32px 64px rgba(0,0,0,0.06) |

### 8.7 Scene Act Structure
| Duration | Setup (0-20%) | Tension (20-75%) | Resolve (75-100%) |
|---|---|---|---|
| 150f (5s) | 0-30f | 30-105f | 105-150f: hold |
| 180f (6s) | 0-40f | 40-130f | 130-180f: hold |
| 210f (7s) | 0-50f | 50-155f | 155-210f: hold |
| 240f (8s) | 0-60f | 60-180f | 180-240f: hold |
| 270f (9s) | 0-70f | 70-200f | 200-270f: hold |

---

## 9) Skill System

### 9.1 Architecture
- 64 guidance skills (markdown `.md` files) + 9 example skills (code references).
- Skills imported at build time, registered in `src/skills/index.ts`.
- `SKILL_DETECTION_PROMPT` classifies prompts into applicable skill categories.
- `getCombinedSkillContent(skills[])` concatenates relevant skill markdown for injection into LLM context.

### 9.2 Skill Categories (64 guidance skills)

**Brand/Intro (11):** premium-saas-hook, premium-kinetic-text, premium-char-split, premium-gradient-hero, premium-ink-logo-reveal, premium-icon-arc-reveal, premium-dot-matrix-bg, premium-multi-corner-gradient, premium-ambient-environment, premium-network-intro, premium-light-textured-bg

**Problem/Contrast (14):** premium-team-orbit, premium-split-screen, premium-neon-dark, premium-match-cut, premium-floating-path-nodes, premium-icon-concept-scene, premium-before-after, premium-chaos-to-ui-resolve, premium-notification-scatter, premium-feedback-storm, premium-floating-icon-chaos, premium-person-cards, premium-section-title, premium-bold-color-showcase

**Showcase/Feature (25):** premium-saas-showcase, premium-cursor-engine, premium-device-mockup, premium-3d-device-mockup, premium-feature-list, premium-feature-grid, premium-feature-bundle-cards, premium-data-reveal, premium-data-flow-abstract, premium-metric-flyout, premium-stat-counter, premium-scroll-demo, premium-interactive-ui, premium-multi-view-walkthrough, premium-app-walkthrough, premium-live-action-composite, premium-real-photo-device, premium-multi-device, premium-responsive-viewport, premium-macro-closeup, premium-camera-zoom, premium-3d-isometric-explode, premium-isometric-space, premium-single-shot-morphing, premium-narration-reveal

**Trust/Proof (8):** premium-social-proof, premium-testimonial-card, premium-logo-wall, premium-integration-wall, premium-customer-journey, premium-notification-toast, premium-phone-notification, premium-confetti-celebration

**Polish/Technical (6):** premium-glassmorphism, premium-shape-morph-transition, premium-callout-bubble, premium-chameleon-ui, premium-reconstructed-ui, premium-animated-topbar

**Audio/Interaction (3):** premium-audio, premium-interaction-sfx, premium-in-app-chat

**Background (3):** premium-light-arc-bg, premium-icon-bubble-row, premium-cta-scene

**Structural (1):** sequencing (Remotion Sequence/Series timing patterns)

### 9.3 Example Skills (9)
example-histogram, example-progress-bar, example-text-rotation, example-falling-spheres, example-animated-shapes, example-lottie, example-gold-price-chart, example-typewriter-highlight, example-word-carousel

---

## 10) Audio Pipeline

### 10.1 TTS (`POST /api/tts`)
4-tier fallback: ElevenLabs Flash v2.5 (word-level timestamps) → ElevenLabs basic → Gemini TTS → Silence.
Per-intent voice settings: stability/similarity_boost/style/speaker_boost vary by scene type.
Character-level alignment converted to word-level frame timings.

### 10.2 Music (`POST /api/music`)
ElevenLabs music generation. 5 styles: corporate (90 BPM), energetic (128), cinematic (80), calm (68), playful (110).
Per-scene volume automation: base 0.08 (with voiceover) or 0.18 (without). 35% duck at scene boundaries.

### 10.3 SFX (`POST /api/sfx`)
6 canonical types: click, whoosh, pop, type, success, swoosh.
Auto-placed at scene transitions and interaction events.

### 10.4 Beat Sync
`useBeat(bpm?)` — 0-1 pulse value synced to BPM. Sharp attack (15% of beat), exponential decay.
`useBeatClock(bpm?)` — Full beat/bar position (beat, bar, beatProgress, barProgress, isDownbeat).
`snapToDownbeat(approxFrame, bpm, fps)` — Rounds to nearest bar start.

### 10.5 Spectrum Analysis
`useSpectrum(band, src?)` — Real audio frequency analysis (bass 21-430Hz, mid 430-3225Hz, treble 3225-8600Hz).
`useBassKick(threshold, decay)` — Sharp pulse on bass transients.

---

## 11) 3-Tier Background System

| Tier | Source | Implementation |
|---|---|---|
| 1 (AI Video) | Google Veo 2 | `POST /api/veo` — currently returns cinematically matched stock fallback |
| 2 (Stock Video) | Pexels API | `GET /api/stock-video` — HD video URLs, 1-hour cache |
| 3 (Constructed) | AbstractMotionBg | GradientFlow, ParticleField, LightLeak, GridPulse components |

Live-action composite scenes use `OffthreadVideo(STOCK_VIDEO_URL)` at opacity 0.75 + dark overlay + floating UI via `useTrackedParallax`.

---

## 12) Cursor System

### 12.1 `useCursorState(steps, magneticStrength)`
Returns: `x`, `y`, `isClicking`, `isHovering`, `hoverProgress`, `approachPhase`, `speed`.
Three-phase model: approach (last 12 travel frames) → hover (17 frames pre-click) → click (4 frames).

### 12.2 `useHumanizedCursor(steps, magneticStrength, uiSchema)`
Drop-in replacement with realism enhancements:
- Micro-jitter: ±1.5px random walk during travel.
- Breath-pause: ±2px Y sine during long dwells.
- Intent arc: "searching" mode adds lateral deviation mid-path.
- Decisive path: 70% reduced jitter.
- UI_SCHEMA element ID resolution via `resolveElementPosition()`.

### 12.3 Element Resolution
Supports: sidebar-item-N, topnav-item-N, metric-card-N, table-row-N, form-field-N, card-N, list-item-N, cta-button, search-bar, chart, hero-title.

---

## 13) Continuity System

### 13.1 VISUAL_STATE
Director-defined carry-over instructions (e.g. "App sidebar remains open, camera zoomed into dashboard"). Injected as scope variable; generated code reads `const prev = VISUAL_STATE`.

### 13.2 Visual Anchors
Object that transforms between scenes (broken→resolved). Fields: `icon`, `label`, `colorFrom`, `colorTo`. Problem scenes show broken/red state; AHA/solution scenes show resolved/green state.

### 13.3 Global Visual Thread
Persistent design motif in every scene (geometric shape, color wash, motion motif, or floating element). Evolves across scenes: distorted/broken in problems → resolved/warm in solutions.

### 13.4 Morph Portals
`morphExport` on Scene N defines exit element rect. `morphImport` on Scene N+1 defines arrival rect. `useMorphEntrance(MORPH_FROM, rect)` springs element into position.

### 13.5 Camera Continuity
`initialCameraState` ({zoom, panX, panY}) passed between scenes when `FlowEdge.carryOver.camera === true`.

---

## 14) Error Handling

### 14.1 SceneErrorBoundary (React class component)
Catches ReferenceErrors from LLM-generated code during render phase. Renders branded fallback scene (gradient atmosphere + scene title + accent dot + tiny error hint).

### 14.2 ErrorBoundary (`src/components/ErrorBoundary.tsx`)
Page-level React error boundary with fallback message.

### 14.3 ErrorDisplay (`src/components/ErrorDisplay.tsx`)
Flexible error UI: inline/card/fullscreen variants, 3 sizes (sm/md/lg), dismissible.

### 14.4 Compilation Robustness
See Section 6.3 — 11+ self-healing passes before Babel transpilation.

### 14.5 Safe Interpolate
Wrapper sanitizes inputRange/outputRange, coerces to finite numbers, sorts/dedupes non-monotonic ranges. Prevents Remotion's `checkInfiniteRange` throws entirely.

---

## 15) Environment & Deployment

### Required API Keys
- `GOOGLE_GENERATIVE_AI_API_KEY` (Gemini 2.5 — required)
- `ELEVENLABS_API_KEY` (Voiceover, Music, SFX — optional, graceful fallback)
- `PEXELS_API_KEY` (Stock Video Enrichment — optional)

### Commands
- `npm run dev` — Next.js dev server.
- `npm run build` — Production build.
- `npm run test` — Vitest test runner.
- `npm run remotion` — Opens Remotion Studio.
- `npm run render` — CLI render of local compositions.
- `npm run deploy` — Deployment script (`deploy.mjs`).
- `POST /api/render-local` — Server-side MP4 generation with SSE progress.

### Rendering Pipeline
1. `POST /api/render-local` bundles Remotion composition (webpack cached).
2. Renders to MP4 via `@remotion/renderer`.
3. Stores in `.renders/` with UUID jobId.
4. `GET /api/render-local/download/[jobId]` streams MP4, auto-deletes after download.

### Caching Strategy
| Cache | Location | TTL/Policy |
|---|---|---|
| Audit results | In-memory Map | SHA-256 code hash, 5-min TTL |
| Music tracks | In-memory Map | Style+mood key, process lifetime |
| SFX sounds | In-memory Map | Sound type key, process lifetime |
| Flow analysis | In-memory Map | Image fingerprint (SHA-256), process lifetime |
| Scene compilation | Client LRU | Max 30 entries, evicts LRU |
| Brand tokens | Client module-level | Image hash comparison |
| Webpack bundle | Disk | Cached across render requests |
| Stock video | HTTP | 1-hour revalidate |

---

## 16) Deep dive — `src/hooks/useFullVideoGeneration.ts` (Director Engine runtime)

This hook is the **client-side orchestration runtime** that turns a prompt (and optionally screenshots/video frames) into:
- a **pending plan** (editable),
- a set of **compiled per-scene React components**,
- a **master Remotion composition** (component + code string),
- and a **render-ready** bundle of audio + timing metadata.

### 16.1 Primary public API (returned from the hook)

Core actions/state (as used by `src/app/generate/page.tsx`):
- **`generateFullVideo(prompt, model, images?, imageUserDescriptions?)`**:
  - Resets state.
  - If `images.length >= 2`: enters the “flow approval” step (`pendingFlow`) first.
  - Else: calls `/api/plan` directly via `runPlan()` and sets `pendingPlan`.
- **`approveFlow(screenFlow, waypointsByImage, descriptions?, keyFrameIndices?)`**:
  - Clears `pendingFlow`.
  - For recordings: if `keyFrameIndices` provided, narrows planning inputs to those frames (quota + quality).
  - Calls `runPlan()` with `screenFlow` + `waypointsByImage`.
- **`confirmPlan(editedScenes, screenFlow?, imageDescriptions?, voiceId?)`**:
  - Prefetches voiceovers + SFX + music in parallel.
  - Extends scene durations when TTS timings exceed planned duration.
  - Runs `alignSceneDurations()` (audio-visual alignment) and then starts `runGeneration()`.
- **`regenerateScene(index)`**: re-runs generation for exactly one scene, rebuilding master comp/code.
- **`regenerateSceneWithEdit(index, editInstruction, editModel?)`**: same as regenerate but appends a “USER EDIT REQUEST” block into the prompt.
- **`editSceneCode(index, newCode, images?)`**: compiles user-edited code locally via `compileCode()` and updates master.
- **`revisePlan(feedback)`**:
  - Calls `/api/plan` in refinement mode (`existingPlan` + `refinementFeedback`) using cached brand + stored flow context.
  - Updates `pendingPlan` without restarting the whole flow step.
- **`setLogoImage(url|null)`**: stashes a base64 data-url logo override; applied into the planner brand when a plan arrives.

Primary state outputs:
- **`pendingFlow`**: `{ images, detectedFlow? }` shown in `ScreenshotFlowEditor`.
- **`pendingPlan`**: `{ scenes, brand, imageDescriptions?, screenFlow?, bgSkill?, globalBg?, globalVisualThread?, edges?, creativeBrief?, backbone? }` shown in `ScenePlanEditor`.
- **`scenes`**: `CompiledScene[]` (each scene has `Component`, `code`, `durationInFrames`, `transition`, `auditScore?`, etc.).
- **`masterComponent` / `masterCode`**: the assembled cross-scene composition for preview + rendering.
- **`masterVoiceovers`**: scene-index keyed audio URLs map for rendering.
- **Busy flags**: `isPlanning`, `isFlowDetecting`, `isPrefetchingAudio`, `isGenerating`, plus `progress` and `regeneratingSceneIndex`.

### 16.2 Step 0 — caching & determinism layers

There are two module-level caches designed to reduce cost and improve repeatability:
- **Scene compile cache**: `sceneCache` is an **LRU (max 30)** keyed by `(skills, brand.primary, imageIndex, duration, prompt prefix, voiceover prefix, emotion, aha, cursor waypoint coords)`.
  - Purpose: avoid regenerating/compiling identical scenes across retries and minor plan edits.
- **Brand cache**: `cachedBrandStore` stores `{ imageHash, brand }` derived from the first image.
  - Used to pass `cachedBrand` into `/api/plan` so the server can skip re-extracting brand tokens when the image hasn’t changed.
  - `imageHash` is a lightweight fingerprint: base64 length + start/mid/end slices.

### 16.3 Step 1 — flow detection & approval gating

`generateFullVideo()` branches:
- **If `images.length <= 4`**: it **skips** `/api/flow-analyze` and creates a **synthetic `ScreenFlow`**:
  - `transitions`: auto-filled `navigate` transitions between each consecutive pair.
  - `energyLevel: "medium"`, `uiPace: "slow"`, `visualComplexity: 0.5`.
  - The synthetic flow still triggers the flow editor so the user can edit/confirm.
- **If `images.length > 4`**: calls `POST /api/flow-analyze` and sets `pendingFlow` immediately (empty), then fills `detectedFlow` when ready.
- **If `<2 images`**: no flow step; goes straight to planning (`runPlan`).

### 16.4 Step 2 — planning (`runPlan` → `POST /api/plan`)

`runPlan()`:
- Resets generation outputs (scenes, master, duration, pending states).
- Computes `shouldUseCachedBrand` by comparing the current first-image hash to `cachedBrandStore.imageHash`.
- Calls `/api/plan` with:
  - `prompt`, `model`
  - `images` and `imageUserDescriptions` (when present)
  - `screenFlow` (when approved)
  - `cachedBrand` (when eligible)
  - `targetDurationSeconds: 90` (hard-coded target for planning).
- Parses response:
  - `scenes` (`ScenePlan[]`)
  - `brand` (merged over `DEFAULT_BRAND`)
  - `creativeBrief` + `backbone` (forwarded into `pendingPlan`)
  - `imageDescriptions`, `bgSkill`, `globalBg`, `globalVisualThread`, `edges`.
- Applies a client-side **sanity contract**:
  - Warns if no AHA / no FRUSTRATION / no CTA.
  - If planner forgot AHA, it auto-marks the last non-CTA scene.
- Applies flow-derived cursor waypoints:
  - `waypointsByImage[scene.imageIndex]` overrides `scene.cursorWaypoints` when present.
- Applies **`applyPacingProfile()`** to tweak `durationInFrames` (pre-generation rhythm shaping).
- Stores results into `pendingPlan` for user review/edit.

### 16.5 Step 3 — audio prefetch, duration correction, alignment (inside `confirmPlan`)

`confirmPlan()`:
- Uses `pendingScreenFlowRef` as a fallback if `ScenePlanEditor` doesn’t pass flow back.
- Prefetches in parallel (best-effort; failures don’t abort):
  - **`prefetchVoiceovers()`**: calls `POST /api/tts` per unique trimmed `voiceoverText` (deduped with an in-function map).
  - **`prefetchSfx()`**: calls `POST /api/sfx`, stores into `sfxUrlsRef.current`.
  - **`prefetchMusic(style, dominantMood?)`**: calls `POST /api/music` using `brand.musicStyle` and a derived “dominant mood”.
- Duration correction:
  - If `wordTimings` exist, extends `durationInFrames` to `(lastWord.endFrame + 15)` tail padding when needed.
  - Runs `alignSceneDurations()` to align scenes to audio pacing; logs adjustments.
- Starts `runGeneration()` with:
  - aligned scenes
  - brand + images
  - flow + `globalBg` + `globalVisualThread` + `edges`
  - `creativeBrief` + `backbone`.

### 16.6 Step 4 — core generation loop (`runGeneration`)

Key behaviors:
- **Sequential generation**: `CONCURRENCY = 1` to reduce upstream rate-limit issues.
- **Flow context injection**:
  - For scenes with `imageIndex` and a matching transition from `screenFlow`, appends a `## STORY FLOW CONTEXT` block into the scene prompt.
- **Navigation/persistence layer**:
  - Builds `uiSchemasByImageIndex` from planned scenes (`scene.uiSchema`).
  - Calls `detectNavigationSequences()` to mark `_isNavigationContinuation` for same-app walkthrough sequences.
  - Applies `FlowEdge.carryOver`:
    - `carryOver.ui` → marks destination as navigation continuation.
    - `carryOver.camera` → adds the destination to a set that inherits camera state.
- **Continuity prompt assembly**:
  - `buildContinuityContext(prevCompiled, prevPlan, brand, nextPlan)` produces a continuity block including:
    - brand non-negotiables (`BRAND.bg`, font)
    - “visual thread handoff” rules for `visualAnchor` (broken vs resolved behavior)
    - `DIRECTOR VISUAL STATE` when the plan provides `nextPlan.visualState`.
  - Adds a **global palette summary** after scene 2+ so the model doesn’t drift over long videos.
  - Prepends planner `globalVisualThread` into each continuity block.
- **Global timeline support**:
  - `calculateSceneOffsets()` computes each scene’s global frame offset.
  - `globalFrameOffset` is passed into `compileCode()` so background components can stay phase-continuous across scenes.

Scene build steps (per scene):
- Generates code (via `/api/generate` through helper(s) in this file).
- Sanitizes/normalizes (`stripMarkdownFences()`, `extractComponentCode()`).
- Compiles with `compileCode()` with full scope injection (brand/images/audio/uiSchema/globalBg/offset/etc.).
- Caches in `sceneCache` when eligible.
- Runs `fastQualityCheck(code, intent)`:
  - If it passes, **pre-warms** `/api/audit` cache with `_prewarm`.
  - If it fails, the system may run `/api/audit` and use the top fix instruction as an error-correction hint on regenerate (audit is selectively applied; non-blocking).
- Produces `CompiledScene` including `creativeBrief` + `backbone` references (for later audit/regeneration context).

After all scenes:
- Applies `enforceRhythmProfile()` (post-generation pacing guardrails).
- Builds master preview:
  - `createMasterComponent(validScenes, ...)`
  - `buildMasterCode(validScenes, ...)`
  - `totalDuration = sum(duration + HOLD_FRAMES) - overlaps(TRANSITION_FRAMES)`.

### 16.7 Manual editing: cursor editor → `editSceneCode()`

When the user edits cursor steps in `CursorEditor`, the hook:
- Computes `pipelineCursorSteps` from `cursorWaypoints` (`computeCursorStepsData()`).
- Calls `compileCode(newCode, ..., pipelineCursorSteps)` which **overrides** any broken/empty `CURSOR_STEPS` that the model may have emitted.
- Updates the single scene’s `Component` and regenerates the master composition/code.

---

## 17) Deep dive — `src/remotion/compiler.ts` (dynamic compilation + injected runtime)

This module is both:
- a **large library of injected building blocks** (components + hooks + constants) that generated scenes rely on without imports, and
- a **self-healing compiler** that tries to turn imperfect LLM output into runnable React/Remotion components.

### 17.1 Core contract: `compileCode(...) → CompilationResult`

Signature (high level):
- Inputs: `code`, `attachedImages`, `brand`, `voiceoverAudioUrl`, `wordTimings`, `uiSchema`, `globalBg`, `globalFrameOffset`, `morphFrom`, `sfxUrls`, `voiceoverUrls`, `initialCameraState`, `stockVideoUrl`, `featureHeaderData`, `musicUrl`, `companyLogoUrl`, `highlightWords`, `visualState`, `visualAnchor`, `musicMood`, `skillComposition`, `pipelineCursorSteps`.
- Output: `{ Component, error, compilationError? }`.

Important behavior:
- If `pipelineCursorSteps` is provided, it is injected as the scope `CURSOR_STEPS` and the compiler actively prevents LLM code from shadowing it (see 17.3).
- `globalFrameOffset` is used by wrapped background components (`LightArcBg`, `MeshGradientBg`) so that a “global background” can stay temporally coherent across scenes.

### 17.2 Phase 0: Extract + normalize the “component body”

The compiler does not trust the LLM output as a complete TSX module.

Pipeline:
- **`extractComponentBody(code)`**:
  - Pre-repairs unclosed arrays for common markers (`CURSOR_STEPS`, `SFX_EVENTS`, `SCENE_TIMELINE`, etc.) before other parsing.
  - Strips all import forms (`import`, `import type`, namespace imports, side-effect imports).
  - Extracts the *first* exported const component body even if extra exports follow.
  - Strips leftover `export` keywords inside helpers/body.

### 17.3 Phase 2: `postProcessCode()` self-healing passes (before Babel)

This stage repairs frequent LLM failure modes so Babel can transpile:
- **CSS compatibility**: auto-add `WebkitBackdropFilter` when `backdropFilter` is present.
- **TypeScript stripping**:
  - removes return types on arrow functions that break extraction
  - removes exported const type annotations (`export const X: React.FC = ...`)
  - strips `interface`/`type` blocks and `as const`
  - strips generic call type params (`useState<string>()`, `Array.from<T>()`)
  - strips `as SomeType` casts
- **AbsoluteFill safety**: if `<AbsoluteFill>` exists but no `backgroundColor` is found anywhere, rewrites it to `style={{ backgroundColor: BRAND.bg }}` to avoid black flicker.
- **Shadowing protection**:
  - removes empty `CURSOR_STEPS = []` / `SFX_EVENTS = []` declarations so injected pipeline data survives.
- **Syntax repair**:
  - closes broken arrays when a new `const` starts on the next line
  - hoists array literals for `CURSOR_STEPS`, `CURSOR_STEPS_DEFINITION`, `SCENE_TIMELINE` to avoid TDZ issues
  - hoists stray declarations found inside array literals (invalid JS)
  - strips broken “audio spring precompute” blocks where the model tries to recompute `AUDIO_STIFFNESS/AUDIO_DAMPING` from `WORD_TIMINGS` and sometimes emits a dangling ternary line (`? … : …`) that causes Babel `Unexpected token` errors

After post-processing, additional hardening runs in `compileCode()`:
- `stripDuplicateConstDeclarations()`
- `hoistPureTopLevelConstsToTop()` (global topo-sort hoist)
- `hoistTopLevelConsts()` (local refinement)
- `hoistTopLevelVideoConfigDestructures()`
- `collapseBrokenTopLevelLiterals()`
- `stripOrphanCloserLines()` / `stripDanglingTopLevelObjectElements()`
- `checkBraceBalance()`

### 17.4 Transpile & execute sandbox

The compiler wraps the repaired body as:
- `const DynamicAnimation = () => { ...body... };`
then runs:
- `Babel.transform(..., presets:["react","typescript"])`
and executes with:
- `new Function(...scopeArgs, wrappedCode + "return DynamicAnimation;")`

Key safety/robustness:
- **`safeInterpolate`** is injected as `interpolate`:
  - coerces inputRange/outputRange to finite numbers
  - sorts + dedupes non-monotonic input ranges
  - returns a sane fallback instead of throwing Remotion’s `checkInfiniteRange` errors.

### 17.5 Scope injection: what scenes can reference without imports

The compiler injects a large scope surface area so generated scenes do not import anything.
The most important injected “data” symbols:
- `BRAND`, `ATTACHED_IMAGES`, `UI_SCHEMA`
- `VOICEOVER_AUDIO_URL`, `WORD_TIMINGS`, `VOICEOVER_URLS`
- `GLOBAL_BG`, `GLOBAL_FRAME_OFFSET`
- `MUSIC_URL`, `MUSIC_BPM`, `MUSIC_MOOD`
- `STOCK_VIDEO_URL`, `COMPANY_LOGO`, `FEATURE_HEADER`
- `HIGHLIGHT_WORDS`, `VISUAL_STATE`, `VISUAL_ANCHOR`
- `MORPH_FROM`, `SFX_URLS`, `SKILL_COMPOSITION`, `CURSOR_STEPS`

And the most important injected “capabilities”:
- **Backgrounds**: `LightArcBg` (+ wrapped version with frameOffset), `AbstractMotionBg`
- **Pacing/physics**: `SPRING_CONFIGS`, `EASINGS`, `PACING_PROFILE`, `SAFE_ZONES`
- **Cursor system**: `useCursorState`, `useHumanizedCursor`, `useCursorPos`, `resolveElementPosition`
- **Audio sync**: `useAudioSync`, `useBeat`, `useBeatClock`, `snapToDownbeat`, `useSpectrum`, `useBassKick`
- **Interaction**: `SfxSequencer`, chameleon hooks (`useTyping`, `usePopup`, etc.)
- **Morph**: `useMorphEntrance(MORPH_FROM, rect)`

### 17.6 Why this compiler exists (practical failure modes it defends against)

Common model-output issues observed and covered by the passes above:
- “`export` not at top level” (caused by extraction failure + leftover exports)
- broken array literals (especially `CURSOR_STEPS` / `SCENE_TIMELINE`)
- TDZ crashes due to `CURSOR_STEPS` referenced before declaration
- redeclaration or shadowing of injected identifiers (losing pipeline data)
- `interpolate()` crashes due to invalid/unsorted ranges
- stray orphan `}` / `};` / `];` lines that break parsing

