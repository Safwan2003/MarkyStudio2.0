# MarkyStudio — System Architecture

**AI-powered SaaS demo video generator.** Input: product URL + screenshots. Output: fully animated Remotion video — no manual editing required.

---

## Overview

MarkyStudio converts a product description and screenshots into a production-quality animated explainer video using a 6-phase AI pipeline. Each phase uses specialized LLM calls (Gemini 2.5) and pre-built React/Remotion components.

---

## Pipeline Phases

### Phase 1 — User Input
**Component:** `LandingPageInput.tsx`

The user provides:
- Product name + description
- Target audience
- Key features (up to 3)
- Call-to-action text + product URL
- Company logo URL *(new)*
- Brand colors (up to 4 hex values)
- Screenshots or screen recordings (optional)
- AI model selection

---

### Phase 2 — Analysis (Parallel)
**Components:** `/api/flow-analyze`, Brand Extraction (Gemini Vision)

Two analyses run in parallel:

| Analysis | Input | Output |
|---|---|---|
| **Flow Analysis** | Screenshots/recording | `energyLevel` (high/medium/calm), screen transitions, UI pace |
| **Brand Extraction** | Screenshots + description | `BrandTokens` — exact hex colors, font, style (dark/light/neon), music style |

The `energyLevel` auto-overrides `musicStyle` (high → energetic, calm → calm).

---

### Phase 3 — Planning Agent
**Component:** `/api/plan/route.ts` — Gemini 2.5 Flash

The planner LLM receives:
- Brand tokens + energy level
- Product description + CTA
- Screen flow (transitions detected in Phase 2)
- Target video duration *(new)*
- UI schema extraction (optional, from screenshots)

**Output:** `FullVideoPlan` — 5–8 `ScenePlan` objects, each containing:

| Field | Description |
|---|---|
| `title` + `prompt` | Scene brief and narrative direction |
| `skills[]` | Premium Remotion components to use |
| `durationInFrames` | Scene length (90–360 frames at 30fps) |
| `emotionalIntent` | FRUSTRATION / RELIEF / CONFIDENCE / URGENCY |
| `isAhaMoment` | Marks the single most important scene |
| `voiceoverText` | ElevenLabs narration script |
| `transition` | fade / slide / zoomThrough / cameraPan |
| `layoutTopology` | split-left / center-focus / isometric-float / etc. |
| `exitAnchor` | Zoom-through portal target coordinate |
| `morphExport/Import` | Element morph portal between scenes |
| `stockFootage` | Stock video background URL |
| `featureHeader` | Persistent feature context bar config |
| `musicVolume` | Per-scene volume multiplier (0.5–1.5) |

**Post-plan processing:**
- `applyPacingProfile()` — adjusts durations for rhythmic variety (FRUSTRATION ≤180f, CTA ≤240f)

---

### Phase 3.5 — User Review
**Component:** `ScenePlanEditor`

Before generation begins, the user can:
- Edit scene titles, prompts, skills, duration
- Reorder or remove scenes
- Draw cursor waypoints per screenshot (ScreenshotFlowEditor)
- Vision auto-detection of clickable UI elements

---

### Phase 4 — Parallel Pre-fetch
**Components:** `/api/music`, `/api/sfx`, `/api/tts`

All audio assets are generated in parallel before code generation:

| Asset | Service | Output |
|---|---|---|
| Background music | ElevenLabs | `musicUrl` (style-matched track) |
| Sound effects | ElevenLabs | `sfxUrls` — click, whoosh, pop, swoosh |
| Voiceovers | ElevenLabs TTS | `audioUrl` + `wordTimings[]` per scene |

Voiceover word count is validated against scene duration before sending to TTS *(new)*.

---

### Phase 5 — Scene Code Generation (Parallel, max 4 concurrent)
**Components:** `/api/generate`, `compiler.ts`

For each `ScenePlan`, `processScene()` runs:

#### Step 1: Skill Detection
Gemini Flash reads the scene prompt → detects which premium skill docs to inject.

#### Step 2: Prompt Assembly
```
SYSTEM_PROMPT (1,500+ lines of visual rules)
+ Skill docs (*.md injected as context)
+ BrandBlock (exact hex values)
+ ContinuityContext (prev scene + global style summary) ← enhanced
+ CURSOR_STEPS (verbatim waypoints if confirmed)
+ INTERACTION_SCRIPT (chameleon overlay frame timings)
+ UI_SCHEMA (vision-extracted layout)
+ Narrative blocks (emotional intent, aha moment, zoom-through, morph portal)
```

#### Step 3: LLM Code Generation (streaming SSE)
Gemini 2.5 Pro/Flash generates React/Remotion JSX using **50+ pre-built scope components** — no imports needed in generated code.

#### Step 4: Compile
`compileCode()` (Babel in-browser) transpiles JSX → injects all scope variables → returns `CompiledScene { Component, code }`.

On compile failure: **auto-retries** with error context and simplified skill fallback.

#### Step 5: Quality Audit
Gemini scores the compiled scene 0–100. Score < 70 → auto-regenerate with specific fix instructions.

---

### Phase 6 — Master Composition
**Function:** `createMasterComponent()`

Assembles all `CompiledScene` components into a single `MasterVideo` React component:

```
MasterVideo
├── AnimatedArcBg  (persistent background — creates "infinite canvas" feel)
├── Audio (music)  (volume automation per-scene)
├── Scene 0        (wrapped in <Sequence>, with enter/exit transitions)
├── Scene 1
├── ...
├── Scene N
├── SFX sequences  (click/whoosh/pop at transition frames)
├── VignetteLayer  (emotionalIntent-adaptive dark border)
├── SectionLabels  (persistent feature name top-left)
└── FilmGrainLayer (organic noise texture, z:9999)
```

Transition types: `fade`, `slide`, `scale`, `flash`, `cameraPan` (motion blur), `zoomThrough` (scale 1→10 portal).

**Also generates** `buildMasterCode()` — a JSX string for Lambda cloud rendering.

---

### Phase 7 — Output

| Mode | Description |
|---|---|
| **Browser Preview** | Remotion `<Player>` — live React component, instant scrub/playback |
| **Lambda Render** | `buildMasterCode` string → cloud render → exported `.mp4` |

---

## Scope Variables (50+ injected into every scene)

These variables are available to LLM-generated code with zero imports:

| Variable | Description |
|---|---|
| `BRAND` | Colors, font, style, musicStyle, logo *(new)* |
| `ATTACHED_IMAGES[]` | User screenshots as base64 |
| `SPRING_CONFIGS` | entrance / snap / float / pop / cinematic presets |
| `EASINGS` | easeOutCubic / easeInOutCubic / easeInQuad |
| `WORD_TIMINGS[]` | Per-word TTS timestamps |
| `VOICEOVER_AUDIO_URL` | ElevenLabs audio URL |
| `UI_SCHEMA` | Vision-extracted layout structure |
| `MORPH_FROM` | Previous scene exported element rect |
| `GLOBAL_BG` | "arcs" \| "grid" \| "dots" |
| `MUSIC_BPM` | Auto from musicStyle (80/90/110/128...) |
| `MUSIC_URL` | Background track URL |
| `COMPANY_LOGO` | Company logo URL *(new)* |
| `STOCK_VIDEO_URL` | Stock footage URL (optional) |
| `FEATURE_HEADER` | Persistent top-bar config |
| `INITIAL_CAMERA_ZOOM` | From previous scene end state |
| `SAFE_ZONES` | Layout grid anchors |
| `ENTROPY_DUST_PARTICLES` | Pre-seeded particle array |
| `HAND_CURSOR` | Pre-built SVG element |
| `STOCK_AVATARS[]` | 8 headshot URLs |
| `ICON_PATHS` | 24+ SVG paths by name |
| + 30 pre-built React components | GlowBloom, MaskedReveal, CinematicCamera, etc. |

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **In-browser Babel compilation** | No server round-trip for code execution; instant preview |
| **LRU scene cache (30 entries)** | Re-generating one scene skips LLM if prompt+brand unchanged |
| **Persistent background layer** | One `AnimatedArcBg` across all scenes creates "infinite canvas" feel |
| **PAS narrative formula** | Problem → Agitation → Solution arc drives emotional engagement |
| **SceneErrorBoundary** | Catches LLM render errors; shows branded fallback instead of crash |
| **Concurrency limiter (max 4)** | Balances API rate limits with generation speed |
| **applyPacingProfile()** | Post-plan duration adjustment for rhythmic variety |
| **Skill docs as RAG** | Premium `.md` files injected as LLM context = template memory |

---

## Improvements Implemented (2026-03-26)

### Critical
- **Concurrency limiter** — max 4 parallel scene generations (was sequential)
- **Music fetch failure warning** — `musicFetchFailed` state surfaced to UI
- **Compile retry** — already existed; auto-retries with error context on failure
- **editSceneCode updates master** — already existed; master code rebuilt on every edit

### Quality
- **Target duration to planner** — `targetDurationSeconds: 90` passed to planning API
- **Voiceover word count validation** — scripts trimmed to `(frames/30)×2.8` words before TTS
- **Global style continuity** — accumulated palette/skill summary passed to every scene prompt (not just prev-1)

### New Features
- **Company logo option** — logo URL input in form; `BRAND.logo` + `COMPANY_LOGO` scope variable injected into every scene

---

## File Map

```
src/
├── app/
│   ├── api/
│   │   ├── plan/route.ts          # Phase 3: Narrative planning agent
│   │   ├── generate/route.ts      # Phase 5: Scene code generation
│   │   ├── flow-analyze/route.ts  # Phase 2: Screen transition detection
│   │   ├── vision/route.ts        # UI element detection
│   │   ├── tts/route.ts           # ElevenLabs voiceover
│   │   ├── music/route.ts         # ElevenLabs background music
│   │   ├── sfx/route.ts           # ElevenLabs sound effects
│   │   ├── audit/route.ts         # Quality scoring
│   │   └── veo/                   # Stock video integration
│   └── page.tsx                   # Main app page
├── components/
│   ├── LandingPageInput.tsx       # User input form
│   └── ScenePlanEditor/           # Scene review + waypoint editor
├── hooks/
│   └── useFullVideoGeneration.ts  # Core generation orchestrator
├── remotion/
│   └── compiler.ts                # Babel transpiler + 50+ scope components
├── skills/
│   ├── index.ts                   # Skill registry
│   └── premium-*.md               # Skill documentation (RAG memory)
└── types/
    └── generation.ts              # TypeScript types for the full pipeline
```
