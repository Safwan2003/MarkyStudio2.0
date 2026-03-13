# MarkyStudio — Complete System Context

> Last updated: 2026-03-14 — includes 10 targeted pipeline improvements

> Generated for Gemini/Kimi diagnostic session. Every component, rule, and API documented exhaustively.

---

## RECENT IMPROVEMENTS (2026-03-14)

10 targeted changes since last session:

1. **`cubicBezier` + `LightArcBg` added to compiler scope** — both are now pre-built scope constants; LLM must never re-declare them. `LightArcBg` replaces any custom arc/bg implementation for light themes.
2. **`withFade` → `withTransition`** — full transition system upgrade: slide (translateX 80→0), scale (1.06→1), flash (white burst 0.85→0 over 6 frames), and error boundary (dark placeholder on render throw). `TRANSITION_FRAMES = 20` (was `FADE_FRAMES = 8`).
3. **`createMasterComponent` now accepts `musicUrl` + `brand`** — background music injected via CDN URLs; track selected by `brand.musicStyle ?? brand.accentName ?? "cinematic"`.
4. **CDN audio** — music tracks and SFX both now point to Pixabay CDN URLs (no local `/audio/` dependency). All 6 SFX types and 5 music styles available.
5. **Audio-visual alignment** — `alignSceneDurations()` in `src/lib/alignScenes.ts` auto-adjusts `durationInFrames` per scene to match ElevenLabs word timing + 35-frame tail. Called after voiceover prefetch, before generation.
6. **Multi-image story flow** — `generateFullVideo` now detects story flow via `/api/flow-analyze` when ≥2 images; shows `pendingFlow` for user review; `approveFlow()` routes forward with confirmed `ScreenFlow` + `waypointsByImage`. `runPlan` extracted as shared helper.
7. **SFX auto-assignment in plan route** — `buildInteractionScriptFromTransition` now attaches `sfx` fields: `type`+`success` for search/type events, `click` for click/navigate, `whoosh` for hover/scroll. Also adds submit-button event after type sequences.
8. **Light theme enforcement** — plan prompt now instructs "in EVERY scene prompt, use `<LightArcBg brand={BRAND} />` as first child" for light B2B brands. Generate prompt adds LIGHT THEME SCENE RULES block. `bgSkill: "premium-light-arc-bg"` auto-output when brand.style === "light".
9. **Inline UI decompose in plan route** — `/api/plan` now runs UI schema decomposition directly (not just via `/api/ui-decompose` endpoint) using `uiDecomposePromise` in parallel with brand/description extraction. First image only; non-fatal.
10. **`cacheKey` now includes `durationInFrames`** — prevents cache collisions when duration changes after audio alignment.

---

## 1. SYSTEM OVERVIEW

**MarkyStudio** is an AI code-to-video pipeline. The user provides a text prompt (and optionally product screenshots or video frames). The system plans a multi-scene narrative video, generates one React/Remotion component per scene via an LLM, compiles them in-browser with Babel, and plays back the composite video using Remotion's `<Player>`.

### Stack
- **Framework**: Next.js 14 (App Router), TypeScript
- **Video runtime**: Remotion (React-based frame-accurate video)
- **LLM**: Google Gemini via `@google/genai` SDK
- **In-browser compilation**: `@babel/standalone` (transpiles LLM-generated TSX → JS at runtime)
- **Audio**: ElevenLabs TTS via `/api/tts`; SFX via Pixabay CDN (6 types); background music via Pixabay CDN (5 styles)

### Primary User Flow
1. User enters a product description in `LandingPageInput`
2. Optionally attaches screenshots or video frames (base64 data URLs)
3. **NEW (2026-03-14)**: If ≥2 images → `/api/flow-analyze` auto-detects story flow + cursor waypoints → `ScreenFlowEditor` shown for user review/edit → `approveFlow()` called
4. `/api/plan` — runs in parallel: (a) brand extraction via Vision, (b) image descriptions, (c) UI schema decompose, (d) narrative planning → returns `FullVideoPlan` with scenes, brand, bgSkill, globalBg
5. `ScenePlanEditor` shown — user edits/confirms scene order, skills, waypoints
6. `startGeneration()` — prefetches ElevenLabs TTS, runs `alignSceneDurations()`, then sequentially generates each scene
7. `/api/generate` — streaming SSE; skill content injected; LLM outputs TSX code per scene
8. `compileCode()` — in-browser Babel transpiles TSX, injects scope constants, returns React component
9. `createMasterComponent()` — wraps all scenes in `<Sequence>` with withTransition(); injects music
10. Remotion `<Player>` renders live video preview at 1920×1080 / 30fps

---

## 2. PIPELINE ARCHITECTURE

### 2.1 API Endpoints

| Route | Purpose |
|---|---|
| `POST /api/plan` | Narrative planning: vision brand extraction, UI schema decomposition, scene plan generation |
| `POST /api/generate` | Scene code generation (streaming SSE) + follow-up edits (JSON) |
| `POST /api/vision` | UI element detection from screenshot: returns `{elements: [{label, x, y, w?, h?, elementType?}]}` |
| `POST /api/critique` | (Legacy/unused by default) quality critique |
| `POST /api/audit` | Visual quality audit of generated code; returns `{passed, score, issues, fixes}` |
| `POST /api/tts` | ElevenLabs TTS: returns `{audioUrl, wordTimings}` |
| `POST /api/align` | Audio/scene alignment (unused in main flow) |
| `POST /api/flow-analyze` | Vision analysis of uploaded screenshots/video frames → `ScreenFlow` (transitions + bounding boxes). Called by `generateFullVideo` when ≥2 images uploaded. 2-pass pipeline for ≥8 frames (video recordings). |
| `POST /api/ui-decompose` | Standalone UI decomposition (also called inline in `/api/plan`) |

### 2.2 Flow Analysis Pipeline (`/api/flow-analyze`) — NEW 2026-03-14

Called by `generateFullVideo` when ≥2 images uploaded. Returns `ScreenFlow = { screens, transitions }`.

**Routing logic (by frame count):**
- `parsedImages.length < 8` → **Screenshot mode** (single-pass analysis)
- `parsedImages.length >= 8` → **Video recording mode** (2-pass pipeline)

**Screenshot mode (< 8 frames):**
- Single Gemini call with all images + user descriptions
- Extracts: `screens[].{index, description}` and `transitions[].{from, to, action, type, targetLabel, elementType, box, style}`
- Box coordinates on 0–1000 scale, normalized to 0–1 by `normalizeBox()`

**Video recording mode (≥ 8 frames):**
- **Pass 1**: Sub-samples up to 20 frames (every Nth); asks Gemini to identify 4–7 key moment frames + `narrativeSummary` + `productFeature`; maps key positions back to original frame indices; ensures 3–7 key frames
- **Pass 2**: Deep transition analysis on key frames only with bounding boxes
- Extra output fields: `keyFrameIndices[]`, `narrativeSummary`, `productFeature`, `isVideoRecording: true`, `totalFrames`

**Box normalization**: values >2 treated as 0–1000 scale → divided by 1000. Values ≤2 treated as already 0–1 fractions.

**Failure handling**: Any error returns `{ screens: [], transitions: [] }`. Called from `generateFullVideo` with try/catch — non-fatal, shows empty flow editor for manual input.

**ScreenFlow output shape:**
```typescript
interface ScreenFlow {
  screens: { index: number; description: string }[];
  transitions: {
    from: number;        // source screen index
    to: number;          // target screen index
    action: string;      // human description of user action
    type: "click"|"hover"|"navigate"|"type"|"scroll";
    targetLabel: string; // element label/name
    elementType: "input"|"button"|"dropdown"|"card"|"nav";
    box: { x: number; y: number; w: number; h: number };  // 0–1 normalized
    style: { bgColor: string; borderRadius: number };
  }[];
  // Only in video mode:
  keyFrameIndices?: number[];
  narrativeSummary?: string;
  productFeature?: string;
  isVideoRecording?: boolean;
  totalFrames?: number;
}
```

### 2.3 Planning Pipeline (`/api/plan`)

Runs in parallel on POST:
1. **Brand extraction** (Gemini 2.5 Flash): analyzes first uploaded image for `primary`, `secondary`, `bg`, `surface`, `text`, `textMuted`, `border`, `style` colors
2. **Image descriptions** (Gemini 2.5 Flash, only when 2+ images): 1-sentence description per screenshot
3. **UI schema decomposition** (Gemini 2.5 Flash, up to first 5 images in parallel): extracts `UISchema` JSON for each image
4. **Tiered summarization** (when 3+ images):
   - 10+ images (video frames): chunked event extraction → segment summaries → cohesive narrative
   - 3–9 images (screenshot sequence): single flow-analysis pass with `screenSummaries` + `narrative`
5. **Narrative planning** (Gemini 2.5 Flash): takes product prompt + image descriptions + brand context; returns full `FullVideoPlanRaw` with scenes, brand tokens, `globalBg`
6. **Post-processing**:
   - Vision brand values override text-inferred values (vision > text)
   - Auto light-theme detection from bg luminance (threshold: luminance > 0.5)
   - `injectSectionTitles()` inserts 90-frame chapter cards between showcase-skill groups when showcaseCount ≥ 4
   - `buildInteractionScriptFromTransition()` generates `InteractionEvent[]` for chameleon-ui scenes
   - `uiSchema` attached to every scene with an `imageIndex`

Output JSON:
```json
{
  "scenes": [...],
  "brand": { "primary": "#6366f1", ... },
  "bgSkill": "premium-light-arc-bg" | undefined,
  "globalBg": "arcs" | "grid" | "dots",
  "imageDescriptions": [...]
}
```

### 2.4 Generation Pipeline (`/api/generate`)

1. **Validation** (Gemini 2.5 Flash, skip if forcedSkills): validates prompt is motion-graphics related
2. **Skill detection** (Gemini 2.5 Flash, skip if forcedSkills): classifies prompt into skill categories
3. **Skill content injection**: `getCombinedSkillContent(detectedSkills)` appends skill .md files to `SYSTEM_PROMPT`
4. **Mode branching**:
   - `isFollowUp=true`: non-streaming JSON response with `{type:"edit"|"full", edits?, code?}`
   - `isFollowUp=false`: streaming SSE with `text-delta` events
5. **Streaming**: uses `generateContentStream`, emits `data: {type:"metadata"}`, `data: {type:"text-start"}`, `data: {type:"text-delta", delta}`, `data: [DONE]`
6. **Retry logic**: 3 attempts on 429 per-minute rate limits, aborts on daily quota (retryDelay > 60s)

**Edit operation format** (follow-up mode):
```typescript
type EditOperation = {
  description: string;
  old_string: string; // must match EXACTLY (character-for-character)
  new_string: string;
  lineNumber?: number;
}
```

`applyEdits()` fails if `old_string` not found or matches multiple locations.

### 2.5 Generation Hook (`useFullVideoGeneration.ts`)

**Key constants:**
```typescript
const TRANSITION_FRAMES = 20;  // overlap between scenes for cross-dissolve
const HOLD_FRAMES = 24;        // ~0.8s padding after animations complete
const CONCURRENCY = 1;         // scenes generated sequentially (quota-safe)
```

**Total duration formula:**
```
totalFrames = sum(scene.durationInFrames) - (numScenes - 1) * TRANSITION_FRAMES
```
Note: `alignSceneDurations()` may adjust individual scene durations after voiceover prefetch.

**Scene cache:**
```typescript
const sceneCache = new Map<string, CompiledScene>(); // module-level, browser session
```
Cache key hash includes: `skill`, `brand.primary`, `imageIndex`, `durationInFrames`, `prompt[0:80]`.

**Multi-image story flow (2026-03-14):**
```
generateFullVideo(prompt, model, images, descriptions)
  ↓ (if images.length >= 2)
  → POST /api/flow-analyze → detectedFlow (ScreenFlow)
  → setPendingFlow({ images, detectedFlow })  ← shows ScreenFlowEditor to user
  ↓ (user approves in ScenePlanEditor)
  approveFlow(screenFlow, waypointsByImage, descriptions)
  → runPlan(prompt, model, images, descriptions, screenFlow, waypointsByImage)
  → POST /api/plan → planScenes + brand + bgSkill
  → enrich scene prompts with STORY FLOW CONTEXT blocks
  → apply waypointsByImage to matching scenes
  → setPendingPlan(...)
  ↓ (user confirms in ScenePlanEditor)
  startGeneration(editedScenes, effectiveFlow)
  → prefetchVoiceovers()
  → alignSceneDurations()   ← NEW: auto-adjusts durationInFrames to match audio
  → processScene() × N (sequential)
  → createMasterComponent(validScenes, brand.bg, musicUrl, brand)
```

**processScene() flow (per scene):**
1. Check cache; if hit, return immediately
2. Guard: empty prompt → placeholder
3. `reorderImagesForScene()` — puts scene's primary imageIndex first in array
4. Detect navigation continuation (`_isNavigationContinuation`) via sidebar appName matching
5. `resolveModel(skill, userModel, isAhaMoment)` — upgrades isAhaMoment scenes from flash:none → flash:medium (adds thinking budget, still free tier). All other scenes return user model unchanged.
6. `consumeSceneGeneration()` — calls /api/generate, gets back code string
7. `compileCode()` — transpile in-browser
8. If compile fails → retry with error context (1 retry)
9. Quality audit gate: only for `isAhaMoment || imageIndex === 0`; calls `/api/audit`; if score < 70, regenerates with fix instructions
10. Cache result
11. If all fails → placeholder component

**consumeSceneGeneration() prompt assembly:**
1. `buildBrandBlock(brand)` — structured brand reference comment
2. Scene prompt
3. `detectedElementsBlock` — one of:
   - User-confirmed waypoints → `buildInteractionScript(cursorWaypoints)` (CURSOR_STEPS const + chameleon hints)
   - Vision auto-detection via `/api/vision` (for cursor-engine, chameleon-ui, scroll-demo, saas-showcase)
   - For chameleon-ui: merges `interactionScript` events with detected elements → INTERACTION_SCRIPT comment block
   - For cursor-engine: DETECTED_ELEMENTS const declaration
   - For others: DETECTED_SECTIONS const declaration
4. `uiSchemaBlock` — if `scene.uiSchema` present and non-empty, describes `UI_SCHEMA` in scope
5. `voiceoverBlock` — if `scene.voiceoverAudioUrl` present, instructions for `<Audio src={VOICEOVER_AUDIO_URL} />`
6. `narrativeBlock` — if `emotionalIntent` or `isAhaMoment`, instructions for animation style

**buildInteractionScript(waypoints):**
- TRAVEL = 25 frames (spring settle time)
- Adds anchor step at time:0, x:0.5, y:0.85 (cursor starts center-bottom)
- For each waypoint: `arrive = frame`, `actionFrame = arrive + TRAVEL`, `dwell = wp.dwellFrames ?? 22`
- Outputs: `const CURSOR_STEPS = [...]` verbatim code + timing comments + chameleon overlay hints

**`buildContinuityContext(prev, prevPlan, brand)`** — scene-to-scene visual continuity:
- Module-level function (not inside hook)
- Builds a continuity summary from the previous compiled scene
- Passed as `## SCENE CONTINUITY` block to the next scene's prompt
- Content includes: previous scene title, skills, emotional tone, and 5 explicit visual rules:
  1. Keep BRAND.bg locked — never drift from it
  2. Font family must remain consistent
  3. Card border-radius, shadow elevation, spacing must match established language
  4. If previous scene showed sidebar/app shell, maintain same app chrome identity
  5. Color temperature matches emotional arc (RELIEF/CONFIDENCE = warm/bright; FRUSTRATION/PAIN = cold/compressed)
- Applied from scene index 1 onwards (scene 0 has no predecessor)
- Threading: `processScene(..., continuityContext?)` → `consumeSceneGeneration(..., continuityContext?)` → injected as `continuityBlock` before final prompt assembly

**prefetchVoiceovers():** Runs before generation; calls `/api/tts` for all scenes with `voiceoverText`; attaches `voiceoverAudioUrl` + `wordTimings` to scenes.

**alignSceneDurations() — NEW (2026-03-14):**
Runs after `prefetchVoiceovers()`, before generation starts. From `src/lib/alignScenes.ts`:
- For each scene with `wordTimings`: `targetDuration = max(90, lastWord.endFrame + 35)`
- 35 = `TAIL_FRAMES` (breathing room after last spoken word; ~1.16s)
- Minimum 90 frames (3s) — never shrinks below this
- Logs adjustments: `"SceneName" 180→210f`
- Purpose: prevents audio truncation + dead air from mismatched durations

**createMasterComponent(scenes, bgColor, musicUrl, brand):**
- Builds `MasterVideo` React component
- Each scene wrapped in `withTransition()` — applies opacity fade + transform (slide/scale/flash) at entry/exit
- Overlapping sequences: each starts `TRANSITION_FRAMES` (20) before previous ends
- Background music: `<Audio src={musicUrl} volume={hasVoiceover ? 0.08 : 0.18} loop />`
- Music URL from `MUSIC_TRACKS[brand.musicStyle ?? brand.accentName ?? "cinematic"]` (Pixabay CDN)
- Error boundary: scenes that throw on render get a dark placeholder div instead of crashing

**withTransition() transitions:**
- `fade`: opacity 0→1→1→0, no transform (fadeIn = 8f for first scene, 20f for others)
- `slide`: translateX 80→0 on entry (easeOutCubic)
- `scale`: scale 1.06→1 on entry (easeOutCubic)
- `flash`: white overlay div, opacity 0.85→0 over first 6 frames
- `none`: hard cut (opacity jump, no animation)

---

## 3. BRAND TOKEN SYSTEM

### 3.1 BrandTokens Interface
```typescript
interface BrandTokens {
  primary: string;      // Main CTA/accent color — buttons, links, glows. e.g. "#6366f1"
  secondary: string;    // Supporting accent — secondary buttons, hover states. e.g. "#a78bfa"
  bg: string;           // Scene background. e.g. "#0f0f1a" dark | "#f8fafc" light
  surface: string;      // Card/panel surface. e.g. "rgba(255,255,255,0.06)" dark | "white" light
  text: string;         // Primary text. "#ffffff" dark | "#0f172a" light
  textMuted: string;    // Subtitle/muted text. "rgba(255,255,255,0.5)" dark | "rgba(15,23,42,0.5)" light
  border: string;       // Card borders. "rgba(255,255,255,0.12)" dark | "rgba(0,0,0,0.08)" light
  font: string;         // Font family. "Inter"
  accentName: string;   // Single word. "indigo" | "teal" | "rose" | "emerald"
  style: "dark" | "light" | "neon";  // Overall mood
  name?: string;        // Product/brand name. "Acme"
  url?: string;         // Public URL. "acme.com"
  cta?: string;         // CTA button label. "Start Free Trial"
  musicStyle?: string;  // "corporate" | "energetic" | "cinematic" | "calm" | "playful"
}
```

### 3.2 Brand Token Extraction Flow

Vision extraction (Gemini 2.5 Flash on first uploaded image) → LLM text-inference (from prompt text) → Merge (vision values win).

Auto-detection override: if `visionBrand.bg` is a valid 6-digit hex and luminance > 0.5 → `style = "light"`.

Default fallback (no images, no inference):
```typescript
const DEFAULT_BRAND: BrandTokens = {
  primary: "#6366f1",
  secondary: "#a78bfa",
  bg: "#0f0f1a",
  surface: "rgba(255,255,255,0.06)",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.5)",
  border: "rgba(255,255,255,0.12)",
  font: "Inter",
  accentName: "indigo",
  style: "dark",
};
```

### 3.3 BRAND Injection into Compiler Scope

`buildBrandBlock(brand)` generates this comment block (injected as the first part of every scene prompt):
```
## BRAND DESIGN SYSTEM (MANDATORY — use these exact values, no exceptions)
BRAND is already injected into scope — DO NOT declare it. Use BRAND.bg, BRAND.primary, etc. directly.
// BRAND.bg        = "#0f0f1a"
// BRAND.primary   = "#6366f1"
// ... etc.
```

The actual `BRAND` object is injected into the compiler scope as a JavaScript constant. LLM-generated code should NEVER re-declare it.

---

## 4. COMPILER SCOPE

`compileCode()` in `src/remotion/compiler.ts` wraps LLM-generated TSX in a closure that provides all pre-built components and variables as scope constants.

### 4.1 Function Signature
```typescript
function compileCode(
  code: string,
  attachedImages: string[] = [],        // base64 data URLs
  brand: Record<string, string> = {},   // BrandTokens as string map
  voiceoverAudioUrl: string | null = null,
  wordTimings: Array<{ word: string; startFrame: number; endFrame: number }> = [],
  uiSchema: Record<string, unknown> | null = null,
  globalBg: string = "arcs",            // "arcs" | "grid" | "dots"
): CompilationResult
```

Returns `CompilationResult = { Component: React.ComponentType | null; error: string | null }`.

### 4.2 Injected Scope Variables

| Variable | Type | Description |
|---|---|---|
| `ATTACHED_IMAGES` | `string[]` | Array of base64 image data URLs uploaded by user |
| `BRAND` | `BrandLike` | Full brand token object |
| `DETECTED_ELEMENTS` | (injected by generate hook via prompt) | Declared by LLM code |
| `DETECTED_SECTIONS` | (injected by generate hook via prompt) | Declared by LLM code |
| `VOICEOVER_AUDIO_URL` | `string \| null` | Pre-generated ElevenLabs audio data URL |
| `WORD_TIMINGS` | `{word, startFrame, endFrame}[]` | Word-level timing array for `useAudioSync()` |
| `UI_SCHEMA` | `Record<string, unknown> \| null` | Pre-extracted UISchema from vision |
| `GLOBAL_BG` | `string` | Background variant: "arcs" \| "grid" \| "dots" |

All Remotion primitives injected: `spring`, `interpolate`, `useCurrentFrame`, `useVideoConfig`, `AbsoluteFill`, `Sequence`, `Audio`, `Img`, `random`.

RemotionShapes: `Rect`, `Circle`, `Triangle`, `Star`, `Polygon`, `Ellipse`, `Heart`, `Pie`, and all `make*` variants.

Transitions: `TransitionSeries`, `linearTiming`, `springTiming`, `fade`, `slide`, `wipe`, `flip`, `clockWipe`.

Three.js: `THREE`, `ThreeCanvas`.

Lottie: `Lottie`.

### 4.3 Pre-Built Components (full catalog)

**Style utilities:**
```typescript
// Glass card style helper
getGlassCard(brand?: BrandLike): React.CSSProperties
// Returns different styles for light vs dark brands.
// Light: "linear-gradient(135deg, rgba(255,255,255,0.8)...)", shadow "0 8px 32px rgba(0,0,0,0.06)"
// Dark: "linear-gradient(135deg, rgba(255,255,255,0.08)...)", shadow "0 12px 40px rgba(0,0,0,0.45)"

// Glow bloom style (rendered behind element)
glowBloomStyle(color: string, blurPx = 55, opacity = 0.45, spread = 1.5): React.CSSProperties
```

**Spring configs:**
```typescript
const SPRING_CONFIGS = {
  entrance: { damping: 200, stiffness: 120 },   // crisp UI reveal
  float:    { damping: 22,  stiffness: 70  },   // gentle oscillating float
  pop:      { damping: 8,   stiffness: 150 },   // elastic pop
  cinematic:{ damping: 200, stiffness: 80  },   // smooth camera push-in
}
```

**Easings:**
```typescript
const EASINGS = {
  easeOutCubic:    (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic:  (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2,
  easeInQuad:      (t) => t * t,
}
```

**Global style constants:**
```typescript
const GLOBAL_STYLE = {
  contentPadding: 80,
  cardRadius: 20,
  headlineSize: 88,
  shadowScale: "medium",
  shadowMedium: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.04)",
  shadowHigh:   "0 4px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.08), 0 32px 64px rgba(0,0,0,0.06)",
  shadowLow:    "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)",
}
```

---

**Visual effect components:**

**`ParallaxLayer`** `({ depth, children, cameraProgress })`
- `depth`: 0–1 (0.12 = background, 0.40 = midground, 0.80 = foreground)
- `scale = 1 + (depth * 0.45) * cameraProgress`
- Used inside `CinematicCamera` for 2.5D depth separation

**`SheenOverlay`** `({ startFrame, width, height?, angle? })`
- Diagonal shine sweep from `-vw` to `vw*0.5` over 60 frames
- Blend mode: overlay, white gradient at specified angle

**`MotionBlurWhip`** `({ frame, startFrame, duration?, maxBlur?, children })`
- `blurPx = sin(progress * π) * maxBlur`; bell-curve blur peak at midpoint

**`CameraMotionBlur`** `({ children, velocityX?, velocityY?, shutterAngle?, intensity? })`
- SVG feGaussianBlur with asymmetric stdDeviation `(blurX, blurY)`
- `factor = (shutterAngle/360) * intensity`; max 24px per axis

**`ChromaticAberration`** `({ children, intensity?, direction? })`
- SVG filter: splits R (shift right) and B (shift left) channels by `intensity * 4` px
- Directions: "horizontal" | "vertical" | "radial"
- Skipped if intensity < 0.02

**`GlowBloom`** `({ children, color, blurPx?, opacity?, spread?, animated? })`
- Div positioned behind children with `blur(blurPx)` and `scale(spread)`
- `animated=true`: breathes scale with `1 + sin(frame * 0.04) * 0.08`

**`DepthBlur`** `({ children, focusDistance?, maxBlur? })`
- `blurPx = focusDistance * maxBlur`; simulates depth-of-field

**`MeshGradientBg`** `({ colors?, animate?, speed?, children? })`
- 4 animated `radial-gradient` ellipses at sinusoidal positions
- Positions update every frame based on `t = frame * 0.004 * speed`

**`FilmGrain`** `({ opacity? })`
- SVG feTurbulence noise texture at z:9999
- Pattern shifts `(frame * 37) % 100` pixels per frame for animated grain

---

**Audio sync hooks:**

**`useAudioSync(wordTimings?)`**
- Returns: `{ currentWord, wordProgress, completedWords, wordTimings }`
- Finds active word where `frame >= startFrame && frame < endFrame`

**`useBeat(bpm?, offset?)`**
- Returns 0–1 beat pulse; sharp attack (15% of beat), slow decay (sidechain style)

---

**Interaction hooks:**

**`useTyping(text, startFrame, fps, cps?=10)`**
- Returns `{ displayText, showCursor }`
- `charCount = floor((frame - startFrame) * cps / fps)`

**`usePopup(openFrame, closeFrame?)`**
- Returns `{ scale, opacity, visible }`
- `openProg`: spring damping:12 stiffness:200 over 20 frames
- `closeProg`: spring damping:20 stiffness:300 over 15 frames

**`useAccordion(triggerFrame, targetHeight)`**
- Returns `{ height, opacity }`
- Spring damping:14 stiffness:100 over 25 frames

**`useDragItem(from, to, startFrame)`**
- Returns `{ x, y, elevation }`
- Spring damping:18 stiffness:100 over 30 frames; elevation peaks at 12px mid-drag

---

**Chameleon overlay components** (for cursor/interaction scenes):

**`ChameleonInput`** `({ x, y, w, h, text, startFrame, brand })`
- Coordinates in 0–1 video fraction; converts to px internally
- Renders typing animation + blinking cursor + focus ring (brand.primary glow at startFrame-5)

**`ChameleonHighlight`** `({ x, y, w, h, triggerFrame, brand })`
- Click push-in animation: scale 1 → 0.95 → 1 via spring
- Opacity: 0→0.8→0.4→0 from triggerFrame+0 to +35

**`DropdownMenu`** `({ x, y, w, items, openFrame, closeFrame?, brand })`
- Glass card dropdown at normalized coordinates
- Items: 36px each; first item highlighted with `brand.primary + "22"`; spring scale-in from top-left

---

**Cinematic components:**

**`CinematicCamera`** `({ targetX?, targetY?, zoomTo?, children })`
- Animates `scale`, `translate`, and `rotateX/Y` for push-in with perspective
- zoom: `interpolate(frame, [0, 90], [1, zoomTo])` with easeInOut
- tilt: X up to 2°, Y up to -1.5° over 150 frames

**`TaskDetailPanel`** `({ openFrame, title, fields, brand })`
- Slides in from right at 38% of video width
- Spring damping:18 stiffness:100; opacity from `usePopup(openFrame)`

**`ModalOverlay`** `({ openFrame, closeFrame?, title?, brand })`
- 50% width × 55% height, centered; backdrop dim + glass card

---

**App shell components:**

**`InputField`** `({ value, placeholder?, label?, focused?, brand, width? })`
- Self-contained input with label, placeholder, focus ring, blinking cursor

**`ChatBubble`** `({ message, author, color?, appearFrame, brand })`
- Author initial avatar circle + message bubble
- Spring damping:14 stiffness:200 at `appearFrame`

**`SidebarNav`** `({ appName?, items, activeItem?, brand })`
- Dark glass sidebar (220px wide)
- Active item: `brand.primary + "22"` bg, 3px left border

**`AppShell`** `({ sidebar?, topbar?, children?, brand, zoom? })`
- Full SaaS layout: topbar (52px) + sidebar + main content
- Topbar: semi-transparent, backdrop blur

---

**Math utility:**

**`cubicBezier(from, to, t, controlOffset?=0.15)`**
- Quadratic bezier with perpendicular control point for natural cursor arcs
- Returns `{ x, y }` in same coordinate space as from/to

---

**Cursor movement utility — NEW (2026-03-14):**

**`cubicBezier(from, to, t, controlOffset?)`**
- Pre-built scope constant — **do NOT re-declare**
- Natural quadratic-bezier arc between two points for smooth cursor movement
- `from`, `to`: `{ x: number, y: number }` in pixel (or normalized) space
- `t`: 0→1 spring progress
- `controlOffset`: perpendicular offset (default: 0.15 = gentle arc; 0.25 = dramatic; up to 0.35)
- Returns `{ x: number, y: number }` in same coordinate space as `from`/`to`
- Usage:
```tsx
const pos = cubicBezier(
  { x: prevStep.x * width, y: prevStep.y * height },
  { x: step.x * width, y: step.y * height },
  springProgress, // 0→1
  0.15,
);
// pos.x, pos.y — use directly for cursor position
// Add micro-jitter during dwell:
const jitterX = springProgress >= 0.98 ? Math.sin(frame * 0.3) * 1.5 : 0;
const jitterY = springProgress >= 0.98 ? Math.cos(frame * 0.4) * 1.0 : 0;
```

---

**Background components:**

**`LightArcBg`** `({ brand? })` — **NEW (2026-03-14) — pre-built scope constant**
- Animated near-white background with 8 concentric rotating arc lines + corner gradient blobs
- Origin at 30%/60% of frame; arcs rotate `frame * 0.05` degrees with staggered offsets
- Corner blobs: `brand.primary`12 at bottom-left, `brand.secondary`0e at top-right, `brand.primary`0b at bottom-right
- **Mandatory for ALL light-theme scenes** — always place as first child of AbsoluteFill:
```tsx
<AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
  <LightArcBg brand={BRAND} />
  {/* ... rest of scene */}
</AbsoluteFill>
```
- Do NOT build custom arc bg from scratch — use this component
- Do NOT add `premium-light-arc-bg` skill on top — LightArcBg is already in scope for all scenes

---

**WhatAStory pattern components:**

**`ContextualSectionHeader`** `({ text, subtext?, icon?, startFrame, exitFrame?, brand })`
- Pinned at top:60, left:80
- Spring entry from translateY(-20px); spring exit to translateY(-12px)
- fontSize:56, fontWeight:800

**`SfxSequencer`** `({ events })`
- **MANDATORY** on cursor/chameleon scenes with INTERACTION_SCRIPT — silent cursor clicks are amateur output
- Maps `events[].sfx` to audio files via `SFX_MAP`:
  - click → `/audio/sfx/click-soft.mp3`
  - whoosh → `/audio/sfx/whoosh-in.mp3`
  - pop → `/audio/sfx/notification.mp3`
  - type → `/audio/sfx/keyboard-type.mp3`
  - success → `/audio/sfx/success-chime.mp3`
  - swoosh → `/audio/sfx/swipe.mp3`
- All 6 SFX files confirmed present in `public/audio/sfx/`
- Pass INTERACTION_SCRIPT array directly: `<SfxSequencer events={INTERACTION_SCRIPT} />`
- Place OUTSIDE all wrappers, as direct child of AbsoluteFill
- Wraps each in `<Sequence from={e.frame} durationInFrames={30}><Audio volume={0.35} /></Sequence>`

**`AnimatedSidebar`** `({ appName, items, brand, startFrame? })`
- Sidebar width: 240px
- App name: spring fade + translateX(-16px) from startFrame
- Nav items: stagger `startFrame + 4 + i*6`; active item has spring-animated left border (0→3px)

**`AnimatedTopbar`** `({ tabs?, breadcrumb?, hasSearch?, hasAvatar?, brand, startFrame?, activeTabIndex?, height? })`
- Tab width: 110px, gap: 8px
- Sliding underline: 2px brand.primary, animates X to `activeTabIndex * (110 + 8)` via spring
- Search: rounded pill with magnifier emoji
- Avatar: 32×32 circle with brand.primary color and "J" initial

**`AnimatedMetricCards`** `({ cards, brand, startFrame?, columns? })`
- Grid layout with `columns` columns (default: 3)
- Each card: white, borderRadius:16, stagger `startFrame + i*8`
- Count-up animation: `numericValue * countProgress` over 30 frames
- Trend arrow: ↑ green #10b981 | ↓ red #ef4444 | → textMuted

**`StatusBadge`** `({ text, color })`
- Pill badge: `${color}18` background, `color` text, borderRadius:99, uppercase

**`TableActionButton`** `({ text, color })`
- Filled button: `color` background, white text, borderRadius:8

**`AnimatedTable`** `({ columns, rows, brand, startFrame? })`
- columns: `{label, width: "narrow"|"medium"|"wide"}[]`; flex 1/2/3
- Header: brand.primary + "08" bg, uppercase labels
- Row stagger: `startFrame + 8 + i*4`; highlighted row: brand.primary + "06" + left border
- `renderCell(c)`: handles string/number, `{type:"badge"/"status"}` → StatusBadge, `{type:"button"/"action"}` → TableActionButton, `{type:"checkbox"}` → styled div

**`AnimatedChart`** `({ type, title?, dataPoints, color, brand, startFrame? })`
- Canvas: 320×160px SVG
- type "line"/"area": polyline with strokeDashoffset draw-on animation; area fill at 18% opacity
- type "bar": rectangles filling up from bottom with `height * progress`
- type "donut": circle with strokeDashoffset from 0 to `circumference * progress`; 20px stroke

**`AnimatedForm`** `({ title, fields, submitLabel, brand, startFrame? })`
- White card, padding 28×32
- Field stagger: `startFrame + 12 + i*12`
- Focus ring on each field during its active window
- Submit button: full width, brand.primary, shadow

**`SectionTitle`** `({ title, subtitle?, icon?, brand, startFrame? })`
- Centered AbsoluteFill layout
- Icon: scale 0.5→1 + translateY(20→0) via spring
- Title: brand.primary color, 48px, weight 700
- Subtitle: textMuted, 18px

**`PersistentSectionLabel`** `({ featureName, integrationIcon?, integrationName?, brand, startFrame? })`
- Position: absolute, top:28, left:36, zIndex:200
- Fades + slides in from translateY(-8px) over 18 frames
- `featureName` in brand.primary (18px, weight 600)
- Optional `integrationIcon/Name` in textMuted opacity 0.45

**`FloatingShapes`** `({ brand, startFrame? })`
- 12 shapes defined in `SHAPE_DEFS` (outside component body — stable reference)
- Shape types: diamond, circle, arrow, square
- Colors: primary (filled or outlined), secondary, muted
- Bob: `sin(elapsed * 0.018 + i * 1.2) * 6`px
- Drift: `cos(elapsed * 0.011 + i * 0.8) * 3`px

**`ContentCard`** `({ brand, startFrame, children })`
- White rounded rectangle, soft shadow (GLOBAL_STYLE.shadowMedium)
- Spring entry from `startFrame`

**`NotificationToast`** — slide-in alert component (position: absolute, bottom-right area)

**`useInteractionFeedback(clickFrame, direction?)`**
- Returns `{ scale, nudgeX, nudgeY, glowOpacity }`
- `direction`: "down" (default) | "right" | "left" | "up"
- Scale: squishes to 0.96 at click, elastic bounce to 1.03, settles at 1.0 (spring damping:8 stiffness:450)
- nudgeY: 2px physical press nudge in the specified direction
- glowOpacity: 0→0.7→0.3→0 from frames 0,4,20,45 — use as glow halo opacity behind element
- Usage:
```tsx
const { scale, nudgeY, glowOpacity } = useInteractionFeedback(CLICK_FRAME, "down");
// Apply to button:
<div style={{ transform: `scale(${scale}) translateY(${nudgeY}px)` }}>Submit</div>
// Render glow behind:
<div style={{ position:"absolute", inset:0, background: BRAND.primary, filter:"blur(20px)", opacity: glowOpacity * 0.5 }} />
```

**`ContextualBgPulse`** `({ triggerFrame, color, intensity?, x?, y? })`
- Props: `triggerFrame: number`, `color: string`, `intensity?: number` (0.15–0.45, default 0.25), `x?: number` (0–1, default 0.5), `y?: number` (0–1, default 0.5)
- Radial glow pulses outward from (x,y) when triggered — bg "celebrates" with product wins
- pulseOpacity: 0→intensity→intensity*0.5→0 at frames 0,8,50,100
- pulseSize: 180px → screen diagonal over 80 frames (ease-out quad)
- Place as LAST child of AbsoluteFill at zIndex:0 (behind all content)
- Use when: form submits, deal closes, metric appears, success toast pops
- Multiple pulses cascade: stagger by 30–60 frames

**`ReconstructedAppShell`** — orchestrates full UI from UISchema; uses AnimatedSidebar + AnimatedTopbar + AnimatedMetricCards + AnimatedTable + AnimatedChart + AnimatedForm based on schema sections

---

## 5. SCENE PLAN SCHEMA

### 5.1 ScenePlan Interface
```typescript
interface ScenePlan {
  id: number;
  title: string;
  prompt: string;           // Full creative brief — injected into /api/generate prompt
  skills: string[];         // Ordered skill stack: [primary, background?, polish?]
  durationInFrames: number;
  imageIndex?: number;      // 0-based index of primary image for this scene
  cursorWaypoints?: CursorWaypoint[];  // User-confirmed click targets (overrides vision)
  screenFlow?: ScreenFlow;  // On scene 0: full user journey context
  interactionScript?: InteractionEvent[];  // Timed events from flow analysis
  voiceoverText?: string;   // Narration script (max (durationInFrames/30)*2.5 words)
  emotionalIntent?: string; // "FRUSTRATION"|"RELIEF"|"CONFIDENCE"|"TRUST"|"URGENCY"|"EXCITEMENT"|"PAIN"|"RECOGNITION"
  isAhaMoment?: boolean;    // Single core transformation scene
  voiceoverAudioUrl?: string;  // Pre-generated ElevenLabs audio base64 data URI
  wordTimings?: { word: string; startFrame: number; endFrame: number }[];
  transition?: "fade"|"slide"|"scale"|"flash"|"none";
  uiSchema?: UISchema;      // Vision-extracted structural UI schema
}
```

### 5.2 CursorWaypoint Interface
```typescript
interface CursorWaypoint {
  label: string;
  x: number;            // Normalized 0–1 video fraction
  y: number;
  action?: WaypointAction;  // "click"|"hover"|"double-click"|"scroll"|"none"
  dwellFrames?: number; // Default: 22 (frames cursor lingers before moving)
  box?: { x: number; y: number; w: number; h: number };  // 0–1 bounding box
  elementType?: "input"|"button"|"dropdown"|"card"|"nav";
}
```

### 5.3 InteractionEvent Interface
```typescript
interface InteractionEvent {
  frame: number;         // Remotion frame when event fires
  action: "type"|"click"|"hover"|"popup-open"|"popup-close"|"accordion"|"drag"|"panel-slide";
  target: string;        // Human-readable element label
  value?: string;        // Text to type, or drag destination label
  durationFrames?: number;
  elementType?: "input"|"button"|"dropdown"|"card"|"nav";
  box?: { x: number; y: number; w: number; h: number };  // 0–1 bounding box
  style?: { bgColor: string; borderRadius: number };
  sectionHeader?: { text: string; subtext?: string; icon?: string };
  sfx?: "click"|"whoosh"|"pop"|"type"|"success"|"swoosh";
}
```

### 5.4 UISchema Interface
```typescript
interface UISchema {
  layout: {
    type: "sidebar-main"|"topnav-main"|"full-width"|"split";
    sidebar?: {
      position: "left"|"right";
      width: "narrow"|"standard"|"wide";
      items: { label: string; icon: string; isActive: boolean; badge?: number }[];
      appName: string;
    };
    topbar?: {
      items: { label: string; type: "text"|"button"|"tab"; isActive?: boolean }[];
      hasSearch: boolean;
      hasAvatar: boolean;
    };
  };
  mainContent: {
    sections: ContentSection[];
  };
  theme: {
    bgColor: string;
    cardBgColor: string;
    textColor: string;
    accentColor: string;
    borderRadius: number;
    isDark: boolean;
  };
}

type ContentSection =
  | { type: "metric-cards"; data: MetricCardData[]; gridColumns?: number }
  | { type: "table"; data: TableData; gridColumns?: number }
  | { type: "chart"; data: ChartData; gridColumns?: number }
  | { type: "form"; data: FormData; gridColumns?: number }
  | { type: "card-grid"; data: CardItem[]; gridColumns?: number }
  | { type: "list"; data: ListItem[]; gridColumns?: number }
  | { type: "detail-panel"; data: Record<string, string>; gridColumns?: number }
  | { type: "hero-header"; data: { title: string; subtitle?: string }; gridColumns?: number };
```

### 5.5 FullVideoPlan Interface
```typescript
interface FullVideoPlan {
  scenes: ScenePlan[];
  brand?: BrandTokens;
  screenFlow?: ScreenFlow;
  bgSkill?: string;       // e.g. "premium-light-arc-bg"
  globalBg?: string;      // "arcs"|"grid"|"dots"
}
```

---

## 6. NARRATIVE PLANNING SYSTEM

### 6.1 WhatAStory Agency Formula

**Agency formula**: Broken Reality → Empathy → Relief → Proof → Action (PAS variant)

**Step 1 — Broken Reality (Hook):** Show the viewer's life WITHOUT the product. Specific and visceral. NOT "Teams struggle" but "Every Monday, Sarah manually copies numbers from 4 spreadsheets."

**Step 2 — AHA Moment:** The one thing making prospects say "I need this." A transformation, not a feature. One scene marked `isAhaMoment: true`.

**Step 3 — Outcome-driven voiceover:** Never feature-driven. "Your report is ready before you finish your coffee" not "Our platform has automated reporting."

**Step 4 — Emotional Intent:** Every scene assigned one emotion. See Emotional Visual Grammar table below.

### 6.2 Emotional Visual Grammar

| emotionalIntent | Spring style | Animation character | Color temp | Pacing |
|---|---|---|---|---|
| FRUSTRATION | damping:150, stiffness:200 | Jittery, staggered, uneven | Desaturated, cold | Fast, overlapping, chaotic |
| PAIN | damping:300, stiffness:60 | Slow, heavy settle | Dark, low saturation, muted | Slow, weighted, oppressive |
| RECOGNITION | damping:200, stiffness:120 | Clean reveal, one element | Normal brand colors | Medium, deliberate |
| RELIEF | damping:400, stiffness:80 | Smooth, floating settle | Warm, bright, high contrast | Slow, spacious, breathing room |
| CONFIDENCE | damping:200, stiffness:140 | Synchronized, crisp | Vivid, full brand saturation | Medium-fast, precise |
| TRUST | damping:300, stiffness:100 | Gentle, warm, no rush | Soft, warm tones | Slow, unhurried |
| URGENCY | damping:120, stiffness:180 | Fast entrance, pulsing, overshoots | High contrast, bright accent | Fast, pressing |
| EXCITEMENT | damping:8, stiffness:200 | Elastic pop, bounce, overshoots | Vivid, energetic | Fast, playful |

### 6.3 Plan Prompt — Scene Prompt Requirements

Every scene prompt output from `/api/plan` MUST include ALL of the following (10 mandatory items):

1. **EMOTIONAL INTENT** — one word + visual grammar: "RELIEF scene — smooth floating settle (damping:400), warm palette, elements drift in gently, generous spacing."
2. **Scene act timing** — explicit frame allocations: "Act 1 (0–50f): headline enters. Act 2 (50–155f): [content]. Act 3 (155–210f): hold final state."
3. **On-screen narrative text** — the EXACT headline text that appears visually (not voiceover). E.g.: "Headline: 'Done in 30 seconds.' — 80–120px, weight 800, brand.text color, enters at f:20 from translateY(30px). Subline: '[text]' — 22px, weight 400, textMuted, appears at f:35."
4. **Visual composition** — dominant layout: "text left (40%), visual right (55%)" or "centered full-screen"
5. **Animation choreography** — what enters first, in what order, at what frames
6. **Background note** — confirm which background skill is active, any ambient/atmospheric elements
7. If device/showcase scene: "display ATTACHED_IMAGES inside ContentCard (clean white frame, no browser chrome)"
8. For light-themed brands: "Use LightArcBg variant='grid' as background."
9. For showcase/cursor scenes: "Add PersistentSectionLabel top-left with featureName='[Feature Name]'."
10. If AHA MOMENT: "THIS IS THE AHA MOMENT — slow the animation, hold on key transformation (Act 3 = 40 frames minimum), make the viewer feel the relief."

#### On-Screen Narrative Text Per Scene Type

**PROBLEM / HOOK:**
- Headline (96–120px, weight 900): Short visceral problem statement. Max 6 words. E.g. "Hours lost. Every week." or "Your team is drowning."
- Sub-line (24px, weight 400, textMuted): Specific cost. E.g. "12 hours of manual reporting — per person, per week"
- Accent word: One word in `BRAND.primary` within the headline

**SOLUTION / AHA:**
- Headline (80–108px, weight 800): Transformation, OUTCOME language. E.g. "Done in 30 seconds." or "One click. Every time."
- Sub-line (22px): How. E.g. "[Product] handles the rest — automatically"
- Hold headline for 30+ frames. It IS the emotional payoff.

**FEATURE / SHOWCASE:**
- Section label (13px, uppercase, letterSpacing: 0.18em, brand.primary): Feature category. E.g. "REPORTING"
- Headline (56–72px, weight 800): What this feature DOES for the viewer. E.g. "See every project. Always."
- Feature tag (14px pill badge): Specific feature name. E.g. "Live Dashboard"

**SOCIAL PROOF / TRUST:**
- Stat headline (96px+, weight 900): The number. E.g. "94%"
- Context line (22px): What the number means. E.g. "of teams report 3× faster delivery"
- Logo or attribution (small, muted)

**CTA:**
- Hero headline (120–160px, weight 900, gradient text): 3–5 words max. E.g. "Start in minutes."
- CTA button text: Direct, outcome-driven. E.g. "Start Your Project →"
- URL (16px, muted): Typed character by character

**CRITICAL**: Write exact on-screen text strings in the scene prompt — LLM must use them verbatim. Never let the code generator invent text.

#### Cursor Scene Prompt Requirements (plan → generate)

For `premium-cursor-engine` or `premium-chameleon-ui` scenes:
- 3–5 concrete UI actions using actual product feature names
- Format: "Cursor navigates to [Feature A] and clicks → types '[value]' → clicks [Button]"
- For cursor-engine add: "Use click-zoom, double ripple, step annotation badges (Step N of M), keyboard key pill when typing"
- For chameleon-ui add: "Use progressive camera zoom, form success state (loading spinner → green checkmark), slide-in toast notification"

**Good cursor-engine prompt example**: "Interactive cursor demo: cursor springs to 'New Report' button and clicks (double ripple + punch-in zoom, Step 1 of 3) → moves to Analytics tab (Step 2 of 3) → clicks Export (Step 3 of 3, keyboard pill 'Enter ↵'). Use ATTACHED_IMAGES[0] as backdrop."

**Good chameleon-ui prompt example**: "Interactive form demo: cursor moves to Search input, ChameleonInput types 'Q3 Sales Report', cursor clicks Submit (ChameleonHighlight glow). Progressive camera follows cursor. After submit: loading spinner → green checkmark → toast 'Report generated'. ATTACHED_IMAGES[0] as backdrop."

#### Voiceover Quality Test
Before finalizing voiceover, verify:
- Does it describe what the VIEWER gains? (not what the product does)
- Is it specific? (mentions actual time, money, or pain saved)
- Does it feel like something a human would say out loud?
- Would someone recognize their own problem in it?
If any answer is NO → rewrite.

### 6.4 Scene Act Structure

Every scene has 3 internal acts. Frame allocations:

| Duration | Setup | Tension | Resolve |
|---|---|---|---|
| 150f (5s) | 0–30f | 30–105f | 105–150f |
| 180f (6s) | 0–40f | 40–130f | 130–180f |
| 210f (7s) | 0–50f | 50–155f | 155–210f |
| 240f (8s) | 0–60f | 60–180f | 180–240f |
| 270f (9s) | 0–70f | 70–200f | 200–270f |

- **Setup**: One anchor element enters. Viewer orients.
- **Tension**: Main content unfolds sequentially.
- **Resolve**: No new elements. Springs settle. Hold 20–30f minimum.

### 6.5 Voiceover Word Count Formula

`maxWords = (durationInFrames / 30) * 2.5`

| Frames | Words |
|---|---|
| 90 | ~7 (section title — leave empty) |
| 150 | ~12 |
| 180 | ~15 |
| 210 | ~17 |
| 240 | ~20 |
| 270 | ~22 |

Hard limit: `(durationInFrames / 30) * 2.8`

### 6.6 Scene Arc Patterns

- **Standard B2B SaaS**: Hook → Problem → Solution reveal → Feature demo ×2–3 → Proof → CTA
- **Data/analytics**: Hook → Broken reality ×2 → Aha moment → Feature walkthrough → Stats → CTA
- **Collaboration/workflow**: Hook → Before chaos → After clarity → Product demo → Social proof → CTA
- **Enterprise/security**: Hook → Cost of problem → How it works → Feature showcase → Testimonial → CTA

**Critical**: First scene MUST show broken reality, never start with "Introducing [Product]" or logo reveal.

### 6.7 Duration Defaults by Scene Type

| Scene type | Frames | Seconds |
|---|---|---|
| intro | 150 | 5 |
| section-title | 90 | 3 |
| showcase/cursor demo | 210 | 7 |
| features | 180 | 6 |
| social-proof | 150 | 5 |
| cta | 150 | 5 |

Total video: 1050–1500 frames (35–50 seconds at 30fps).

### 6.8 THE CHAOS SCENE (Scene 1 — Non-Negotiable Formula)

6 mandatory rules:
1. ZERO product branding — no logo, no product name, no "Introducing X"
2. Must show a SPECIFIC human in a SPECIFIC painful situation (not generic abstract)
3. Must include at least ONE concrete data point: "3.5 hours every week", "73% of leads lost", "$12k in missed invoices"
4. `emotionalIntent` MUST be "FRUSTRATION" or "RECOGNITION"
5. The viewer must think "that's exactly my problem" — not "that sounds like a problem"
6. Duration: 120–180 frames (4–6 seconds)

**Visual formula:**
- Floating/scattered elements (avatars, tool icons, disconnected nodes) to show fragmentation
- Desaturated/cold color temperature — brand colors appear AFTER solution
- Text on screen = THE PAIN POINT, not a feature name
- Best skills: `premium-team-orbit`, `premium-floating-path-nodes`, `premium-kinetic-text`, `premium-gradient-hero`

**VIOLATION**: Scene 1 showing clean product UI, logo, or saying "Introducing [Product]" is automatic fail.

### 6.9 ANCHOR ELEMENTS — Visual Continuity Across Scenes

1–2 anchor elements per video persist across multiple scenes:

**Common patterns:**
- **App identity**: sidebar nav items + app name must match across consecutive showcase scenes
- **Key metric**: stat introduced in Scene 3 echoed in Scene 4 or CTA ("That's 12 hours back, every week")
- **Brand element**: product logo appears in Scene 1 (problem context), Scene 3 (solution), CTA

**How to use in scene prompts:**
- "ANCHOR: This scene shares the same app shell as Scene 3 — sidebar items [X, Y, Z] and app name '[AppName]' must match exactly."
- "ANCHOR: Echo the '12 hours saved' metric from the previous scene — reinforce it visually."

---

## 7. GENERATION SYSTEM PROMPT

### 7.1 Typography Scale

| Role | Size (px) | Weight | Notes |
|---|---|---|---|
| hero | 128–160 | 900 | Main video headline |
| scene title | 80–108 | 800–900 | Per-scene primary text |
| section | 40–56 | 700 | Feature names, chapter titles |
| body | 22–32 | 400–500 | Supporting copy |
| badge | 14–18 | 500–600 | Pills, labels, tags |

**CRITICAL**: `fontSize < 72px` for main scene headline is a violation. Headlines must fill the frame.

### 7.2 Shadow Depth Scale

```
Low:    "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)"
Medium: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.04)"
High:   "0 4px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.08), 0 32px 64px rgba(0,0,0,0.06)"
```

### 7.3 Light Theme Scene Rules (NEW 2026-03-14)

When `BRAND.style === "light"`, ALL of the following are mandatory:

1. **ALWAYS start with `<LightArcBg brand={BRAND} />`** as first child of AbsoluteFill
2. **White cards** (`background: "white"`) — NOT glass cards (no `backdropFilter` on light bg)
3. **Medium or High shadow elevation** on all floating cards (see Shadow Depth Scale)
4. **Text**: `BRAND.text` (#0f172a); labels: `BRAND.textMuted` (rgba(15,23,42,0.5))
5. **Accent color** (`BRAND.primary`) on max 2–3 elements — never as background fill
6. **Border**: `1px solid rgba(0,0,0,0.08)` on cards and dividers

These rules are now enforced in the generate system prompt AND the plan route. When `/api/plan` outputs `bgSkill: "premium-light-arc-bg"`, every scene prompt is also prepended with "Use LightArcBg as background."

### 7.4 Generate System Prompt — Full Detail

The generate system prompt (`SYSTEM_PROMPT` in `src/app/api/generate/route.ts`) enforces these rules on every LLM scene generation call. Key sections (complete):

#### Spring Config "Pro Standard"
- Standard UI reveal: `damping: 200, stiffness: 120`
- Gentle floating loop: `damping: 22, stiffness: 70`
- Playful pop ONLY: `damping: 8, stiffness: 150`
- Cinematic camera push-in: `damping: 200, stiffness: 80`
- **NEVER** use `damping: 14` or `damping: 28` — low-quality defaults

#### Emotional Intent → Animation Style
Emotion → spring + character + spacing:
- `FRUSTRATION` → damping:150/stiffness:200, jittery staggered entrances, tight crowded spacing
- `PAIN` → damping:300/stiffness:60, slow heavy dragging settle, compressed spacing
- `RECOGNITION` → damping:200/stiffness:120, clean deliberate one-at-a-time, normal spacing
- `RELIEF` → damping:400/stiffness:80, smooth floating almost weightless, generous (160px+ from edges)
- `CONFIDENCE` → damping:200/stiffness:140, synchronized crisp all arrive together, clean structured
- `TRUST` → damping:300/stiffness:100, gentle warm unhurried, open relaxed
- `URGENCY` → damping:120/stiffness:180, fast pressing strong entrance, compact
- `EXCITEMENT` → damping:8/stiffness:200, elastic pop bounce overshoot, energetic
**Application rule**: The emotion applies to ALL spring() calls in the scene, not just one.

#### Scene Act Structure (applied in code per prompt allocations)
```
Act 1 (Setup, 0–20%): ONE anchor element enters. Background reveals. Nothing else.
Act 2 (Tension, 20–75%): Main content unfolds sequentially. Each element 8–15f after previous.
Act 3 (Resolve, 75–100%): ALL animation stops. Final state holds motionless 20–30f min.
```
Hard rule: Act 3 must be fully static — no floating, no pulsing, no continuous animation after Act 3 begins (CTA button may have 0.03 scale pulse only).

#### On-Screen Narrative Text Code Pattern
```tsx
const HEADLINE = "Done in 30 seconds."; // use verbatim from scene prompt
const headlineProgress = spring({ frame: frame - HEADLINE_START, fps, config: { damping: 200, stiffness: 120 } });

// Section label (enters first, tiny, uppercase):
<div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", color: BRAND.primary, textTransform: "uppercase", marginBottom: 16 }}>
  {SECTION_LABEL}
</div>

// Main headline (dominant element):
<div style={{ fontSize: 96, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05,
  maxWidth: "80%", wordBreak: "break-word",
  transform: `translateY(${interpolate(headlineProgress, [0, 1], [30, 0])}px)`,
  opacity: headlineProgress }}>
  {HEADLINE}
</div>

// Sub-line enters 12 frames after headline
```
Accent word rule: identify ONE most powerful word → render in `BRAND.primary` span with gradient text pattern.

#### Gradient Text Pattern
```tsx
style={{
  background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.secondary} 60%, ${BRAND.primary} 100%)`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
}}
```
Use on: hero/opener headlines, CTA primary headline, bold problem statements, brand name reveals.

#### Glass Card Pattern (dark themes)
```tsx
{
  background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderTop: "1px solid rgba(255,255,255,0.2)",
  borderLeft: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 20,
  boxShadow: "0 12px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.15)",
}
```

#### SaaS Color Palette Presets (when BRAND not specified)
| Style | bg | primary | secondary | text |
|---|---|---|---|---|
| Dark SaaS (dev/data) | #0a0f1e | #6366f1 | #14b8a6 | #f8fafc |
| Dark SaaS (enterprise) | #0c1220 | #3b82f6 | #8b5cf6 | #f1f5f9 |
| Light SaaS (B2B) | #f8fafc | #4f46e5 | #0ea5e9 | #0f172a |
| Dark Neon | #080c14 | #22d3ee | #a855f7 | #e2e8f0 |
| Warm Light | #faf9f7 | #f97316 | #eab308 | #1c1917 |
Default: dark SaaS (dev/data) when product type is unclear.

#### Text Overflow Rules (VIOLATION — most common LLM mistake)
- All headline text: `maxWidth: "80%"`, `wordBreak: "break-word"`, `overflowWrap: "break-word"`
- Long labels/subtitles: `maxWidth: "70%"`, `whiteSpace: "normal"`
- Cards with text: always set explicit `width` + `overflow: "hidden"`
- **NEVER** `whiteSpace: "nowrap"` on a headline
- If text is >25 characters: reduce fontSize by 20% from starting value

#### Cursor Scene Additional Rules (13–14 in system prompt)
13. **Depth-of-field on ALL cursor scenes**: wrap screenshot background in `<DepthBlur>`:
```tsx
const dofProgress = interpolate(frame, [ACT_1_END, ACT_1_END+25, ACT_2_END, ACT_2_END+20], [0, 0.7, 0.7, 0], { extrapolateLeft:"clamp", extrapolateRight:"clamp" });
<DepthBlur focusDistance={dofProgress} maxBlur={7}>{/* screenshot */}</DepthBlur>
```
14. **ChromaticAberration from cursor speed** — intensity = cursorVelocity mapped 0→0.55.

#### Performance Rules
- `willChange: "transform"` on elements animating every frame (device floats, orbs)
- Do NOT animate `filter: blur()` per frame — use fixed blur on static depth layers
- Use `transform` for all movement — never animate `top/left/width/height`
- Counter text: `fontVariantNumeric: "tabular-nums"` to prevent layout shift

#### Reconstruction Crossfade — MANDATORY HARD RULE
When `UI_SCHEMA` block present AND `ATTACHED_IMAGES` available:
```tsx
const screenshotOpacity = interpolate(frame, [0, 25, 50], [1, 1, 0], { extrapolateLeft:"clamp", extrapolateRight:"clamp" });
const uiOpacity = interpolate(frame, [30, 65], [0, 1], { extrapolateLeft:"clamp", extrapolateRight:"clamp" });
// Screenshot at z:1 fades out f:0–50; Reconstructed UI at z:2 fades in f:30–65
```
**VIOLATION**: Jumping to reconstructed UI from frame 0 (skipping crossfade) is not allowed.

#### Visual Composition Rules
- Split composition: text left (40%), visual right (55%), 5% gap — for showcase/feature scenes
- Full-screen text scenes: center everything, max 75% width constraint
- AbsoluteFill background must match `BRAND.bg` from frame 0 — never fade in background
- CTA buttons: min 60px tall, min-width 280px, full border-radius (9999px for pill)

#### Chameleon Overlay Rules (INTERACTION_SCRIPT present)
1. Paste `CURSOR_STEPS` const verbatim — do NOT change x/y/box/time values
2. `ChameleonInput x, y, w, h` come directly from `CURSOR_STEPS[n].box` values
3. `triggerFrame/startFrame` = `step.time + 25` (TRAVEL frames after spring starts)
4. Render cursor div OUTSIDE `CinematicCamera` so it stays at z:100
5. Use progressive camera zoom (camera target lerps toward cur.x/cur.y with lag)
6. After button submit: loading spinner → green checkmark → slide-in toast
7. For input steps: keyboard key pill ("Enter ↵") near end of dwell frames

### 7.5 Cinematic Mandatory Rules

**Rule 1 — CinematicCamera + ParallaxLayer** (showcase scenes ≥ 210f AND 3+ visual layers):
```tsx
<CinematicCamera targetX={0.5} targetY={0.42} zoomTo={1.06}>
  <ParallaxLayer depth={0.12} cameraProgress={camProg}>{/* background */}</ParallaxLayer>
  <ParallaxLayer depth={0.40} cameraProgress={camProg}>{/* midground */}</ParallaxLayer>
  <ParallaxLayer depth={0.80} cameraProgress={camProg}>{/* foreground: primary UI */}</ParallaxLayer>
</CinematicCamera>
```

**Rule 2 — GlowBloom** on EVERY CTA button AND every hero metric/stat number:
```tsx
<GlowBloom color={BRAND.primary} blurPx={60} opacity={0.5} spread={1.8} animated>
  <div style={{ /* button styles */ }}>{BRAND.cta}</div>
</GlowBloom>
```

**Rule 3 — ChromaticAberration** on cursor speed + scene entrances:
```tsx
// Cursor velocity → chromatic aberration
const cursorSpeed = Math.sqrt(cursorDx*cursorDx + cursorDy*cursorDy) / 30;
const chromaticIntensity = interpolate(cursorSpeed, [0, 15], [0, 0.55], { extrapolateRight: "clamp" });
// Non-cursor: entrance chroma
const entranceChroma = interpolate(frame, [0, 8], [0.4, 0], { extrapolateRight: "clamp" });
```

### 7.6 WhatAStory Scene Patterns

**Pattern A — Hook/Intro (light brand):**
- LightArcBg variant="grid" as base
- Brand logo PNG centered at ~220px inside ContentCard (400×280px) that springs in
- FloatingShapes scattered around card
- NO headline text — logo IS the message

**Pattern B — Concept/Callout (no UI):**
- LightArcBg variant="grid" + FloatingShapes
- ONE large centered text line (~56px) with key phrase in BRAND.primary
- Small icon (64×64px white circle with emoji) springs in at startFrame+10

**Pattern C — Feature UI Demo (most common):**
- LightArcBg variant="grid" base
- PersistentSectionLabel top-left with featureName
- ContentCard wrapping screenshot or reconstructed UI (75% of frame)
- Cursor/interaction overlays at zIndex 100 inside ContentCard

**Pattern D — Section Title:**
- LightArcBg variant="grid" base
- SectionTitle centered — title, optional subtitle, optional icon
- Clean minimal, 3 seconds, no FloatingShapes

**Pattern E — CTA:**
- LightArcBg variant="grid" base
- Logo centered (~200px), springs in
- Tagline: normal text + colored key phrase in BRAND.primary
- Wide brand-color button (~560×72px, borderRadius:12)

### 7.7 Violations (Automatic Failures)

1. `Math.random()` inside component → use `random('stable-seed')`
2. `PARTICLES/ORBS/CONFETTI arrays inside component` → declare OUTSIDE component
3. `AbsoluteFill` without `backgroundColor` → always set `style={{ backgroundColor: BRAND.bg }}`
4. `fontSize < 72px` for main scene headline
5. Hardcoded hex like `"#6366f1"` → always use `BRAND.primary`
6. `backdropFilter` without `WebkitBackdropFilter` → always pair them
7. `spring()` without explicit config → always pass `config: SPRING_CONFIGS.entrance`
8. Interpolations without easing → visible motion must use `EASINGS.easeOutCubic`
9. Missing `willChange: "transform"` on per-frame animated elements
10. Shadowing a RESERVED NAME → never declare `const spring = ...`, `const BRAND = ...`, etc.
11. Text without `maxWidth` → any headline MUST have `maxWidth: "80%"` + `wordBreak: "break-word"`
12. `whiteSpace: "nowrap"` on headlines > 24px → NEVER
13. **Silent cursor/chameleon scenes** — Any scene with INTERACTION_SCRIPT MUST include `<SfxSequencer events={INTERACTION_SCRIPT} />`. Silent cursor clicks are amateur output. Sound design is 50% of perceived quality.
14. **Flat z-depth** — All layers must be separated into bg (z:0), midground (z:10–50), foreground (z:100+). Never a plain solid fill as the only layer.

### 7.8 Reserved Names

```
spring, interpolate, useCurrentFrame, useVideoConfig, AbsoluteFill, Sequence,
ATTACHED_IMAGES, getGlassCard, ParallaxLayer, SheenOverlay, MotionBlurWhip, SPRING_CONFIGS, EASINGS, Audio, BRAND,
MeshGradientBg, CameraMotionBlur, useAudioSync, useBeat, WORD_TIMINGS, random,
ChromaticAberration, GlowBloom, glowBloomStyle, DepthBlur,
useTyping, usePopup, useAccordion, useDragItem,
ChameleonInput, ChameleonHighlight, DropdownMenu,
CinematicCamera, TaskDetailPanel, ModalOverlay, InputField, ChatBubble, SidebarNav, AppShell,
cubicBezier, LightArcBg,
GLOBAL_STYLE, FilmGrain, ContextualSectionHeader, SfxSequencer, AnimatedSidebar, AnimatedMetricCards, AnimatedTable, AnimatedChart, AnimatedForm, ReconstructedAppShell,
AnimatedTopbar, SectionTitle, NotificationToast, StatusBadge, TableActionButton,
PersistentSectionLabel, FloatingShapes, ContentCard, GLOBAL_BG,
useInteractionFeedback, ContextualBgPulse
```

### 7.9 Visual Narrative Principles

- **Progressive reveal**: Most important element enters first. Supporting elements follow.
- **Breathing room**: 80–120px padding from edges (160px for hero). One dominant element per scene.
- **Typography as emotion**: Problem/frustration → tighter tracking, heavier weight; Relief/solution → looser, lighter; CTA → largest type, brand color.
- **Animation speed = emotion**: Frustration → stiffness:180, damping:14; Relief → stiffness:60, damping:200; Feature demos → stiffness:120, damping:200; CTA → stiffness:150, damping:18.

### 7.10 UI Reconstruction vs Screenshot Overlay

**Use ReconstructedAppShell/AnimatedSidebar/etc. (premium-reconstructed-ui) PREFERRED when:**
- Standard SaaS layout (sidebar + dashboard, settings, forms, tables)
- UI elements need independent animation
- Form/modal interaction (typing, dropdown selection)
- Camera zoom planned (vectors stay crisp)

**Use screenshot overlay (premium-chameleon-ui) ONLY when:**
- Highly custom UI (maps, 3D views, photo-heavy, complex visualizations)
- Brand fidelity is critical above animation quality
- Screenshot contains irreplaceable real data

**Reconstruction crossfade pattern** (mandatory when both are present):
- Screenshot at z:0, fades OUT f:0→50
- Reconstructed UI at z:1, fades IN f:30→65
- Both visible during f:30–50 for visual continuity

### 7.11 Cursor Entry Convention

Always start cursor at `{ x: 0.5, y: 0.85, action: "none" }` — center-bottom of frame.

### 7.12 Output Format

- Output ONLY code — no explanations, no markdown fences, no questions
- Must start with `import` and end with `};`

### 7.13 Mandatory 2.5D Depth Layering

Every scene MUST have 3 depth planes:

- **Layer 1 — Background (z:0)**: texture, bg color, ambient. Moves slowest or static. Always has visual interest: LightArcBg / MeshGradientBg / ContextualBgPulse / radial gradient. Wrap in DepthBlur when cursor active.
- **Layer 2 — Midground (z:10–50)**: UI cards, device mockups, data charts, avatars. Main content. maxWidth 75–88% of frame. Medium elevation shadow.
- **Layer 3 — Foreground (z:100+)**: Headlines, cursor, badges, notification toasts, callout bubbles. Always sharp (never blurred). Enters last.

**Parallax rule:**
```tsx
<ParallaxLayer depth={0.2} cameraProgress={camZoom}>{/* bg — moves less */}</ParallaxLayer>
<ParallaxLayer depth={0.5} cameraProgress={camZoom}>{/* midground */}</ParallaxLayer>
{/* cursor has no ParallaxLayer */}
```

---

## 8. SKILL LIBRARY

### 8.1 Complete Skill Registry (57 premium + 8 basic + 9 examples = 74 total)

All loaded from `src/skills/index.ts`. Names must match exactly.

**Basic category skills** (8 skills):
- `charts` — data visualizations, graphs, bar charts, pie charts, progress bars
- `typography` — kinetic text, typewriter effects, text animations
- `social-media` — Instagram/TikTok/YouTube vertical content
- `messaging` — chat interfaces, WhatsApp, iMessage, chat bubbles
- `3d` — ThreeJS, rotating cubes, spatial animations
- `transitions` — scene changes, fades, slide transitions
- `sequencing` — staggered animations, choreographed entrances
- `spring-physics` — bouncy animations, elastic effects

**Premium skills** (57 skills):

| Skill name | Description | Best use case |
|---|---|---|
| `premium-saas-hook` | Brand reveal, floating icons orbiting hero laptop | Intro for dark SaaS brands |
| `premium-saas-showcase` | Browser chrome, dashboard stat cards, slide-up | General product screenshot showcase |
| `premium-cursor-engine` | Arrow cursor spring movement, click ripple, double ripple, step badges, click-zoom, keyboard pills, spotlight | UI walkthrough demo for tech/analytics |
| `premium-team-orbit` | Floating avatars with role badges, SVG dotted paths, logo reveal | Problem scene for team/collaboration chaos |
| `premium-camera-zoom` | Spring zoom into device screen, true parallax multi-layer, continuous slow pan | Hero push-in reveal, device to fullscreen |
| `premium-social-proof` | Glass notification cards, integration logos orbiting, avatar-widget-orbit variant | Trust/proof scene |
| `premium-cta-scene` | Mesh orb bg, kinetic CTA headline, pulsing gradient button, simple light variant | CTA finale |
| `premium-kinetic-text` | Word-by-word spring stagger, brand pill, flash sweep, light-bg variant, underline accent | Energy/hook text scene |
| `premium-neon-dark` | Sonar rings, SVG glow filter, shape-masked image reveal, heartbeat pulse | Dark tech/analytics problem scene |
| `premium-network-intro` | Avatar nodes, polka-dot SVG paths, ripple rings, real photo support, light bg variant | B2B ecosystem/network intro |
| `premium-feature-list` | Staggered 3–4 feature bullets with icons | Simple feature showcase |
| `premium-device-mockup` | MacBook CSS shell, browser window, phone mockup with ATTACHED_IMAGES on screen | Product screenshot in device frame |
| `premium-scroll-demo` | Browser shell scroll animation, section spotlight | Living product walkthrough |
| `premium-data-reveal` | Counting numbers, bar fill, SVG ring progress, stat card grid | Metric/KPI reveal |
| `premium-split-screen` | Before/after divider with darkening left side | Literal left-vs-right comparison ONLY |
| `premium-multi-device` | Laptop+phone+tablet composite, staggered floats | Cross-platform showcase |
| `premium-glassmorphism` | Glass cards, glowing orbs, parallax depth, gradient-glow border | Rich visual depth, any scene |
| `premium-match-cut` | Scene A zoom-to-fill, scene B zoom-out, motion blur, whip-cut | Sharp contrast reveal |
| `premium-char-split` | Character-level headline animation, push-up letter reveal | Single impactful problem statement |
| `premium-audio` | Background music, SFX, volume fade | Music in intro/CTA scene |
| `premium-chameleon-ui` | 3-layer z hierarchy (screenshot/overlays/cursor), ChameleonInput/Highlight/DropdownMenu, CinematicCamera zoom | Form/input interaction demo over screenshot |
| `premium-data-flow-abstract` | Glowing hub nodes, SVG bezier paths, traveling data packets | Integration/API/AI pipeline |
| `premium-3d-isometric-explode` | Screenshot sliced into 3 floating CSS-3D isometric panels | Architecture/layer reveal |
| `premium-ambient-environment` | Orbiting glow orbs, floating particle dust | Depth layer for glassmorphism/CTA/kinetic |
| `premium-shape-morph-transition` | Color flood fill from clicked element, clipPath expand | Scene transition from cursor-engine/CTA |
| `premium-hand-cursor` | Cartoon pointing-hand SVG, hotspot at fingertip, squeeze click, double ripple | Friendly explainer-video cursor |
| `premium-callout-bubble` | Floating comment card (avatar + typed message + CTA + blue outline), annotation tooltip, slide-in side panel | Collaboration/feedback features |
| `premium-responsive-viewport` | Browser + device-switcher toolbar (desktop/tablet/mobile icons), spring-transition content width | Responsive web product demo |
| `premium-dot-matrix-bg` | CSS repeating-radial-gradient dot grid, floating brand-color accent dots, dark dash marks | Light theme background texture |
| `premium-ink-logo-reveal` | Blob border-radius morph to brand icon shape, wordmark springs in | Dramatic brand/logo moment |
| `premium-multi-corner-gradient` | Pastel corner blob bg (blue BL, salmon TR, red BR), radial-gradient falloff | Light brand background for network-intro/CTA |
| `premium-customer-journey` | Cubic bezier SVG path, traveling dot lerp, milestone dot markers, pop-up info cards with pointer triangle | CRM/CS lifecycle/pipeline scene |
| `premium-icon-concept-scene` | Oversized white circle icon, soft radial color glow, dark coin badge, dotted SVG curved path + triangle arrowhead | Abstract concept/problem visual |
| `premium-icon-arc-reveal` | Dark glow bg, neon outline icon, SVG circle arc draws via strokeDashoffset, concentric rings, shape-mask expand | Dark hook/intro scene |
| `premium-floating-path-nodes` | Dark green bg, aurora nebula (blurred ellipse), outline circles/pills, dotted path, traveling dot | Chaos/disconnected systems problem scene |
| `premium-confetti-celebration` | 80 PARTICLES array outside component, rect/circle/streak shapes, wobble, burst variant | Deal closed/launch/win scene |
| `premium-real-photo-device` | ATTACHED_IMAGES[0]=Ken Burns background, portrait tablet (380×520), 3-layer shadow, screen reflection, ATTACHED_IMAGES[1]=product UI | Product-in-context social proof |
| `premium-icon-bubble-row` | Large colored filled circles with white SVG icons, sequential spring pop-in, arc accent | Feature categories, tech stack, use cases |
| `premium-integration-wall` | Solid brand-color bg, scattered white rounded-square app logo cards | Integration/data sources showcase |
| `premium-feedback-storm` | Person photo centered, floating feedback cards at 2 z-depths, urgency pills | Feedback/VoC/NPS social proof |
| `premium-gradient-hero` | Full-screen bold headline with brand gradient text, zero chrome | Bold statement scene, chapter cards |
| `premium-logo-wall` | Trusted-by logo grid (3×2 or 4×2) or infinite marquee, glass cards | Enterprise social proof |
| `premium-stat-counter` | Single dramatic metric (280px+), count-up, radial glow | Single data-proof stat |
| `premium-feature-grid` | 2×2 or 3×2 animated card grid with icon+title+description | "Here's what you get" overview |
| `premium-interactive-ui` | Full AppShell + SidebarNav + InputField + TaskDetailPanel reconstruction | Showcase when NO screenshot available |
| `premium-light-arc-bg` | Near-white bg with animated concentric SVG arc lines + corner gradient blobs | Background layer for all light-themed scenes |
| `premium-feature-bundle-cards` | 3 white cards + connectors (+ symbols), each with icon/title/accent label | Integration/platform overview |
| `premium-reconstructed-ui` | Full vector UI reconstruction: AnimatedSidebar + AnimatedTopbar + AnimatedMetricCards + AnimatedTable + AnimatedChart + AnimatedForm | Standard SaaS dashboard showcase |
| `premium-section-title` | Centered chapter title card; SectionTitle component + LightArcBg | Chapter breathing room (90f, 3s) |
| `premium-animated-topbar` | Tabs with sliding underline, breadcrumb, search, avatar; AnimatedTopbar | Top navigation scene |
| `premium-light-textured-bg` | Light background variants (arc/grid/dot); wraps LightArcBg | Background layer for light features/proof scenes |
| `premium-notification-toast` | Slide-in success/action notification; NotificationToast component | Action result feedback |
| `premium-app-walkthrough` | Persistent shell (sidebar/topbar persist), only main content area transitions | Multi-screen same-app navigation |
| `premium-before-after` | Horizontal wipe reveal; left panel dark/desaturated "before", right vibrant "after"; animated glowing divider | Problem-to-solution bridge |
| `premium-metric-flyout` | Hero metric (280px) + 3–4 satellite stat pills from screen edges + SVG arc ring + radial glow | ROI/data-proof with supporting stats |
| `premium-testimonial-card` | Full-screen editorial pullquote, word-by-word reveal, avatar, stars | Single strong customer quote |
| `premium-phone-notification` | iOS-style frosted-glass push notification from top | Real-time alerts, mobile CRM/HR |
| `premium-narrative-overlay` | On-screen narrative text layer; bold copy overlay, section label, word-by-word reveal | Polish slot for any narrative text scene |
| `premium-before-after` | Horizontal wipe reveal; left panel dark/desaturated "before", right vibrant "after"; animated glowing divider | Problem-to-solution bridge |
| `premium-metric-flyout` | Hero metric (280px) + 3–4 satellite stat pills from screen edges + SVG arc ring + radial glow | ROI/data-proof with supporting stats |
| `premium-testimonial-card` | Full-screen editorial pullquote, word-by-word reveal, avatar, stars | Single strong customer quote |
| `premium-phone-notification` | iOS-style frosted-glass push notification from top | Real-time alerts, mobile CRM/HR |
| `premium-logo-wall` | Trusted-by logo grid (3×2 or 4×2) or infinite marquee, glass cards | Enterprise social proof |
| `premium-stat-counter` | Single dramatic metric (280px+), count-up, radial glow | Single data-proof stat |
| `premium-feature-grid` | 2×2 or 3×2 animated card grid with icon+title+description | "Here's what you get" overview |
| `premium-interactive-ui` | Full AppShell + SidebarNav + InputField + TaskDetailPanel reconstruction | Showcase when NO screenshot available |
| `premium-gradient-hero` | Full-screen bold headline with brand gradient text, zero chrome | Bold statement scene, chapter cards |
| `premium-integration-wall` | Solid brand-color bg, scattered white rounded-square app logo cards | Integration/data sources showcase |
| `premium-feedback-storm` | Person photo centered, floating feedback cards at 2 z-depths, urgency pills | Feedback/VoC/NPS social proof |

**Example skills** (9 code reference skills):
- `example-histogram`, `example-progress-bar`, `example-text-rotation`, `example-falling-spheres`, `example-animated-shapes`, `example-lottie`, `example-gold-price-chart`, `example-typewriter-highlight`, `example-word-carousel`

### 8.2 Skill Stacking Rules

Skills array: `[primarySkill, backgroundSkill?, polishSkill?]`

- `skills[0]` = PRIMARY: main visual pattern (required)
- `skills[1]` = BACKGROUND: atmosphere/texture (optional but strongly recommended for scenes without built-in bg)
- `skills[2]` = POLISH: micro-pattern on top (optional, sparse use)

**Recommended stacks:**
- Dark hook: `["premium-icon-arc-reveal"]`
- Dark problem: `["premium-floating-path-nodes"]`
- Dark kinetic: `["premium-kinetic-text", "premium-neon-dark"]`
- Dark metrics: `["premium-metric-flyout", "premium-ambient-environment"]`
- Dark CTA: `["premium-cta-scene"]`
- Light hook: `["premium-saas-hook"]`
- Light features: `["premium-icon-bubble-row", "premium-light-textured-bg"]`
- Light cursor: `["premium-chameleon-ui", "premium-dot-matrix-bg"]`
- Light reconstructed UI: `["premium-reconstructed-ui"]`
- Light social proof: `["premium-social-proof", "premium-multi-corner-gradient"]`
- Light stat: `["premium-stat-counter", "premium-light-textured-bg"]`
- Light kinetic: `["premium-kinetic-text", "premium-dot-matrix-bg"]`
- Logo wall: `["premium-logo-wall", "premium-light-textured-bg"]`
- Testimonial: `["premium-testimonial-card", "premium-multi-corner-gradient"]`
- Customer journey: `["premium-customer-journey", "premium-multi-corner-gradient"]`
- Network intro: `["premium-network-intro", "premium-multi-corner-gradient"]`
- Feature grid: `["premium-feature-grid", "premium-light-textured-bg"]`
- Integration wall: `["premium-integration-wall"]`
- Before/after: `["premium-before-after"]`
- Section title: `["premium-section-title"]`

**Constraints:**
- NEVER combine two background skills
- NEVER combine two cursor/interaction skills
- Self-contained skills (icon-arc-reveal, floating-path-nodes, cta-scene, before-after, integration-wall) already have rich backgrounds — do NOT add background skill
- `premium-ambient-environment` as skills[1]: best for metrics/proof/data needing visual depth
- `premium-narrative-overlay` as skills[2]: POLISH slot for explicit on-screen narrative text

### 8.3 Skill Selection Rules

- **Intro scene, light B2B brands**: `premium-saas-hook` with FloatingShapes + ContentCard wrapping logo (WhatAStory hook pattern: logo in white card, geometric shapes floating on grid bg)
- **Intro scene, dark brands**: `premium-icon-arc-reveal` — most polished dark hook
- **Problem scene, scattered team/communication**: `premium-team-orbit`
- **Problem scene, technical failures**: `premium-neon-dark`
- **Problem scene, data silos/chaos**: `premium-floating-path-nodes`
- **Problem scene, literal old-vs-new**: `premium-split-screen` (use sparingly)
- **Problem scene, bold statement**: `premium-kinetic-text` or `premium-char-split`
- **Problem scene, data-backed cost**: `premium-data-reveal`
- **When user uploads screenshots**: MANDATORY at least ONE scene with `premium-cursor-engine` or `premium-chameleon-ui`; MANDATORY at least ONE scene (different) with `premium-device-mockup`/`premium-scroll-demo`/`premium-saas-showcase`
- **Cursor choice**: `premium-hand-cursor` for collaboration/design/consumer SaaS (friendly); `premium-cursor-engine` (arrow) for dev tools/analytics/technical
- **Input fields/dropdowns visible**: use `premium-chameleon-ui` over `premium-cursor-engine` for typing + dropdown overlays
- **Standard SaaS dashboards**: `premium-reconstructed-ui` over `premium-chameleon-ui` — vectors animate independently
- **Integration/API/platform products**: strongly prefer `premium-data-flow-abstract` over `premium-network-intro` for "how it works" scene
- **Light-themed brands**: in EVERY scene prompt, instruct `Use <LightArcBg brand={BRAND} /> as first child of AbsoluteFill`
- **Light-themed B2B/CRM/customer-success**: `premium-multi-corner-gradient` as bg for intro/network-intro/CTA scenes
- **Dark-themed products**: STRICTLY use `premium-icon-arc-reveal` for hook, `premium-floating-path-nodes` for problem, `premium-confetti-celebration` for solution/CTA
- **CTA**: always `premium-cta-scene`; light brands without taglines use "Simple Logo + Wide Button + URL" variant
- **Never repeat same skill** in two scenes
- **Showcase scenes ≥ 210f**: ALWAYS add click-zoom punch-in (1.0→1.06) on at least one key element

### 8.4 Transition Assignment Rules

- First scene: always "fade"
- Problem → Solution: "scale" or "slide"
- Showcase → Social Proof: "fade"
- Social Proof → CTA: "slide" or "flash"
- Cursor/CTA scene finale: "flash" into next scene
- Do NOT use "fade" for >2 consecutive transitions

---

## 9. CURRENT QUALITY BENCHMARKS

### 9.1 Audit System

`/api/audit` evaluates generated code. Returns:
```typescript
{
  passed: boolean;
  score: number;        // 0–100
  issues: string[];
  fixes: string[];
}
```

Quality gate: `score < 70` triggers regeneration with fix instructions. Only audits `isAhaMoment` scenes and `imageIndex === 0` scenes (quota-aware).

Post-generation auto-audit: fires-and-forgets after all scenes compile; logs issues to console only.

### 9.2 CompiledScene Interface
```typescript
interface CompiledScene {
  Component: React.ComponentType;
  durationInFrames: number;
  code: string;
  title: string;
  prompt: string;
  skill: string;           // Note: singular "skill" not "skills" in CompiledScene
  imageIndex?: number;
  cursorWaypoints?: CursorWaypoint[];       // NEW (2026-03-14)
  transition?: "fade"|"slide"|"scale"|"flash"|"none";  // NEW (2026-03-14)
  auditScore?: number;
  hasVoiceover?: boolean;
  isAhaMoment?: boolean;
  emotionalIntent?: string;
  voiceoverAudioUrl?: string | null;
  wordTimings?: { word: string; startFrame: number; endFrame: number }[];
}
// Note: skills[] (plural) is in ScenePlan; CompiledScene uses skill (singular) for the primary skill
```

### 9.3 AlignmentAdjustment Interface (NEW 2026-03-14)
```typescript
interface AlignmentAdjustment {
  sceneId: number;
  title: string;
  oldDuration: number;
  newDuration: number;
  audioDurationFrames: number;
  reason: string;  // e.g. "Audio ends at frame 195 — extended by 35f tail" or "Trimmed to match audio"
}
```
```

### 9.4 Known System Limitations

1. **CONCURRENCY = 1**: Scenes generate sequentially. No parallel generation. Primary throughput bottleneck.
2. **isAhaMoment auto-upgrade**: `resolveModel()` upgrades flash:none → flash:medium for aha-moment scenes (1 per video). All other scenes return user-selected model to avoid quota exhaustion.
3. **Audit only on subset**: Only `isAhaMoment || imageIndex === 0` get audited mid-generation (quota-aware).
4. **Vision coordinate space transformation**: Vision API returns 0–1 fractions of image; cursor-engine code adds `0.06 + y * 0.94` to account for 6% chrome bar at top of video.
5. **buildInteractionScript TRAVEL = 25**: Hard-coded cursor spring settle time; must match cursor skill documentation.
6. **Cache bypass**: No way to force cache-bypass per-scene from UI without full regeneration. Cache key (2026-03-14): `skill::brand.primary::imageIndex::durationInFrames::prompt[0:80]`.
7. **SFX now CDN (2026-03-14)**: All 6 SFX types use Pixabay CDN URLs — no local `/audio/sfx/` files needed. Mapped via `SFX_MAP` in `compiler.ts`.
8. **Music now CDN (2026-03-14)**: All 5 music styles use Pixabay CDN URLs — no local `/audio/music/` files needed. Mapped via `MUSIC_TRACKS` in `useFullVideoGeneration.ts`.
9. **Streaming SSE vs JSON**: Initial generation uses streaming SSE; follow-up edits use JSON. Different parsing in `consumeSceneGeneration()`.
10. **No image in follow-up edit mode**: `frameImages` can be passed but `isFollowUp=true` paths use non-streaming JSON responses.
11. **globalBg threading**: `globalBg` flows from `/api/plan` → `pendingPlan` state → `runGeneration()` → `processScene()` → `compileCode()` as 7th parameter. If plan route omits it, defaults to "arcs".
12. **alignSceneDurations minimum**: 90 frames (3s) — scenes will never shrink below this even if audio is shorter.
13. **UI decompose in plan route**: Only runs on `parsedImages[0]` (first image). Runs in parallel with brand extraction. Non-fatal if it fails. Result stored in `uiSchemaResult` and attached to scenes with matching `imageIndex`.
14. **Story flow detection**: `/api/flow-analyze` called with all images when ≥2 uploaded. Non-fatal if it fails — shows empty flow editor for user to fill in manually. `setPendingFlow` always called (may have undefined `detectedFlow`).

### 9.5 Quality Gap vs WhatAStory Agency Standard

Areas where the system lags WhatAStory quality:

1. **Narrative depth**: LLM often produces feature-driven rather than outcome-driven voiceover despite instructions. The BROKEN REALITY hook often defaults to generic statements.
2. **On-screen text**: Scene prompts often miss specifying exact on-screen text strings, leading LLM to invent generic copy.
3. **Emotional visual grammar**: Spring configs for FRUSTRATION vs RELIEF are documented but LLM frequently ignores them in favor of default entrance springs.
4. **Scene act structure timing**: Act structure is documented but LLM rarely explicitly places elements at documented frame ranges.
5. **AHA moment treatment**: isAhaMoment scenes often lack the slow-spring + 20-frame hold + scale pulse treatment.
6. **PersistentSectionLabel usage**: Rarely used by LLM on showcase scenes despite Pattern C guidance.
7. **ContentCard wrapping**: LLM often uses raw browser chrome instead of the cleaner ContentCard pattern.
8. **Typography size**: Generated headlines frequently smaller than the 80–120px requirement.
9. **GlowBloom on CTAs**: Often omitted despite being mandatory Rule 2.
10. **ChromaticAberration**: Almost never used despite being mandatory Rule 3.

---

## 10. WHATASTORY FORMULA — COMPLETE REFERENCE

### 10.1 Narrative Structure (6-scene standard)

**Scene 1 — Hook (150f, FRUSTRATION/RECOGNITION)**
- Broken reality. Viewer's pain, before product exists in this story.
- Visual: LightArcBg grid + FloatingShapes + ContentCard (light); IconArcReveal (dark)
- Text: 6-word headline, visceral. Sub-line: specific cost.
- NO product name, NO logo.

**Scene 2 — Problem (180f, PAIN)**
- Deepen the pain. Quantify the cost (time, money, stress).
- Visual: floating-path-nodes (dark) or team-orbit (chaos) or data-reveal (cost)
- Text: "73% of teams miss deadlines" or clock-cost metaphor

**Scene 3 — Solution/AHA (210f, RELIEF) — isAhaMoment: true**
- Product transforms the broken reality. OUTCOME language.
- Visual: reconstructed-ui or cursor-engine; slow spring (damping:400)
- Text: "Done in 30 seconds." — hold 30+ frames. Scale pulse 1.0→1.03→1.0.
- Act 3 minimum 40 frames — emotional payoff hold.

**Scene 4 — Feature Demo (210f, CONFIDENCE)**
- Show HOW it works. Specific feature, specific workflow.
- Visual: cursor-engine + PersistentSectionLabel + ContentCard
- Text: section label (13px caps) + headline 56–72px + feature tag pill

**Scene 5 — Social Proof (150f, TRUST)**
- Proof others have solved this. Stats, testimonials, logos.
- Visual: logo-wall or testimonial-card or stat-counter + ambient-environment
- Text: big number (96px+) + context line (22px)

**Scene 6 — CTA (150f, URGENCY + EXCITEMENT)**
- Call to action. Clear outcome. Product name + URL.
- Visual: cta-scene
- Text: 3–5 word gradient headline (120–160px, weight 900) + brand-color button + URL typewriter

### 10.2 On-Screen Text Requirements Per Scene Type

**PROBLEM/HOOK:**
- Headline: 96–120px, weight 900, max 6 words, one word in BRAND.primary
- Sub-line: 24px, weight 400, textMuted, specific cost/metric

**SOLUTION/AHA:**
- Headline: 80–108px, weight 800, OUTCOME language ("Done in 30 seconds.")
- Sub-line: 22px — how the product handles it

**FEATURE/SHOWCASE:**
- Section label: 13px, uppercase, letterSpacing 0.18em, brand.primary
- Headline: 56–72px, weight 800, what feature DOES for viewer
- Feature tag: 14px pill badge

**SOCIAL PROOF:**
- Stat: 96px+, weight 900
- Context: 22px — what number means
- Logo/attribution: small, muted

**CTA:**
- Hero headline: 120–160px, weight 900, gradient text, 3–5 words
- Button: outcome-driven, e.g. "Start Your Project →"
- URL: 16px muted, typewriter animation

### 10.3 Voiceover Quality Checklist

Before finalizing voiceover, verify:
- Does it describe what the VIEWER gains? (not what the product does)
- Is it specific? (mentions actual time, money, or pain saved)
- Does it feel like something a human would say out loud?
- Would someone recognize their own problem in it?

### 10.4 Cursor Scene Prompt Requirements

For `premium-cursor-engine` OR `premium-chameleon-ui`, always include:
- 3–5 concrete UI actions with actual feature names
- Format: "Cursor navigates to [Feature A] and clicks → types '[value]' → clicks [Button]"
- For cursor-engine: mention "Use click-zoom, double ripple, step annotation badges (Step N of M), keyboard key pill when typing"
- For chameleon-ui: mention "progressive camera zoom, form success state (loading spinner → green checkmark), slide-in toast notification"

**Section headers**: For cursor scenes with 3+ interaction steps, include sectionHeader on each interaction event naming the feature (64px, weight 800, slides from above).

### 10.5 bgSkill + globalBg Rules

- `brand.style === "light"` → `bgSkill = "premium-light-arc-bg"`, `globalBg = "grid"` (default)
- Dark themes → `bgSkill = undefined`, `globalBg = "arcs"` (default)
- globalBg variants: "arcs" = light lavender-white with concentric arcs (modern brands); "grid" = light gray crosshatch (enterprise B2B); "dots" = dot matrix (clean/minimal)

### 10.6 Section Title Auto-Injection

When `showcaseCount >= 4 AND !alreadyHasSectionTitles`, `injectSectionTitles()` runs:
- Inserts 90-frame chapter card before first showcase scene of each new `imageIndex` group
- Auto-derived title from scene.title (strips "showcase:", "feature:", etc.)
- Prompt: `SectionTitle chapter card. Title: "${sectionTitle}". Subtitle: "See how it works". Use LightArcBg variant="grid".`

---

## APPENDIX A: Full File Path Reference

| File | Lines | Role |
|---|---|---|
| `src/app/api/plan/route.ts` | ~1310 | Narrative planning pipeline, brand extraction, UI schema decomposition, tiered summarization |
| `src/app/api/generate/route.ts` | ~1321 | Scene code generation, streaming SSE, follow-up edit mode |
| `src/app/api/vision/route.ts` | — | Screenshot UI element detection |
| `src/app/api/audit/route.ts` | — | Visual quality audit |
| `src/app/api/tts/route.ts` | — | ElevenLabs TTS + word timings |
| `src/remotion/compiler.ts` | ~2200 | In-browser Babel compiler, all pre-built scope components |
| `src/hooks/useFullVideoGeneration.ts` | ~1531 | Main generation orchestration hook |
| `src/types/generation.ts` | ~257 | All TypeScript interfaces |
| `src/skills/index.ts` | ~359 | Skill registry, SKILL_DETECTION_PROMPT, getCombinedSkillContent |
| `src/skills/premium-*.md` | varies | 57 skill guidance files |
| `src/components/LandingPageInput.tsx` | — | Main input form |
| `src/components/ScenePlanEditor/` | — | Scene plan editor, cursor waypoint editor |
| `src/components/SceneTimeline/` | — | Scene timeline display |
| `src/lib/alignScenes.ts` | 61 | Audio-visual alignment: adjusts durationInFrames to audio duration + 35f tail; min 90f |
| `src/lib/cropZone.ts` | — | Image crop zone utility |
| `src/lib/extractVideoFrames.ts` | — | Video frame extraction utility |
| `src/remotion/DynamicComp.tsx` | — | Remotion composition wrapper |

## APPENDIX B: Model Configuration

```typescript
// Available models (from src/types/generation.ts)
const MODELS = [
  { id: "gemini-2.5-flash:none",    name: "Gemini 2.5 Flash — Free (Fast)" },
  { id: "gemini-2.5-pro:none",      name: "Gemini 2.5 Pro — Free" },
  { id: "gemini-2.5-pro:low",       name: "Gemini 2.5 Pro — Free (Think: Low)" },
  { id: "gemini-2.5-pro:medium",    name: "Gemini 2.5 Pro — Free (Think: Medium)" },
  { id: "gemini-2.5-pro:high",      name: "Gemini 2.5 Pro — Free (Think: High)" },
  { id: "gemini-3-flash-preview:none",   name: "Gemini 3 Flash — Paid (Preview)" },
  { id: "gemini-3.1-pro-preview:none",   name: "Gemini 3.1 Pro — Paid (Preview)" },
  { id: "gemini-3.1-pro-preview:low",    name: "Gemini 3.1 Pro — Paid (Think: Low)" },
  { id: "gemini-3.1-pro-preview:high",   name: "Gemini 3.1 Pro — Paid (Think: High)" },
]

// Thinking budgets (tokens)
const THINKING_BUDGETS = { low: 1024, medium: 8192, high: 24576 }

// Fast model for classification/validation
const FAST_MODEL = "gemini-2.5-flash"

// Default model when none specified
const DEFAULT_MODEL = "gemini-2.5-flash:none" // pendingModelRef default
```

## APPENDIX C: Vision Coordinate Space

Vision API (`/api/vision`) returns elements in image-fraction space (0–1):
- `x`, `y` = element center, normalized to image dimensions

Cursor-engine coordinate transform (applied in `consumeSceneGeneration`):
```typescript
// Account for 6% chrome bar at top of video frame
const videoY = 0.06 + element.y * 0.94;
const boxY = 0.06 + (element.y - (element.h ?? 0.05) / 2) * 0.94;
```

CursorWaypoint coordinates are already in video space (0–1 video fraction).

## APPENDIX D: SFX File Map

**Updated 2026-03-14**: Now uses Pixabay CDN URLs — no local audio files needed.

```typescript
// In src/remotion/compiler.ts — SFX_MAP
const SFX_MAP = {
  click:   "https://cdn.pixabay.com/audio/2022/03/15/audio_8e4dcdc8a0.mp3",
  whoosh:  "https://cdn.pixabay.com/audio/2022/09/01/audio_d1c8f71ac7.mp3",
  pop:     "https://cdn.pixabay.com/audio/2023/06/14/audio_5a7d7b7b7e.mp3",
  type:    "https://cdn.pixabay.com/audio/2022/11/17/audio_febc508520.mp3",
  success: "https://cdn.pixabay.com/audio/2023/03/17/audio_c1ab6d7a3e.mp3",
  swoosh:  "https://cdn.pixabay.com/audio/2022/10/30/audio_27a9c0d733.mp3",
}
```

**SFX auto-assignment (2026-03-14)** — `buildInteractionScriptFromTransition()` in plan route now auto-attaches `sfx` fields:
- `search`/`type` transition → first event gets `sfx: "type"`, auto-adds submit button event with `sfx: "success"`
- `click`/`navigate` → event gets `sfx: "click"`
- `hover`/`scroll` → event gets `sfx: "whoosh"`

## APPENDIX E: Music Tracks

**Updated 2026-03-14**: Now uses Pixabay CDN URLs — no local audio files needed.

```typescript
// In src/hooks/useFullVideoGeneration.ts — MUSIC_TRACKS
const MUSIC_TRACKS = {
  corporate:  "https://cdn.pixabay.com/audio/2023/11/13/audio_3c2e86c693.mp3",
  energetic:  "https://cdn.pixabay.com/audio/2024/08/20/audio_6c53572dfa.mp3",
  cinematic:  "https://cdn.pixabay.com/audio/2024/02/15/audio_b99e82e13f.mp3",
  calm:       "https://cdn.pixabay.com/audio/2024/04/09/audio_9c659e933b.mp3",
  playful:    "https://cdn.pixabay.com/audio/2023/09/07/audio_168f2040eb.mp3",
}
// Volume: 0.08 when voiceover present, 0.18 without
// Selection order: brand.musicStyle ?? brand.accentName ?? "cinematic"
// Fallback: MUSIC_TRACKS["cinematic"] if key not found
```
