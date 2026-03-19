# MarkyStudio — Complete System Context

> Last updated: 2026-03-18 — **Gap analysis fully closed**: (1) layoutTopology variety system replaces 40/60 mandate; (2) DepthStack true 2.5D Z-separation; (3) useVitality hook + cursor hover pre-state (isHovering/hoverProgress); (4) premium-chaos-to-ui-resolve skill; (5) AnimatedHighlighter SVG scribble; (6) beat-driven choreography (useBeatClock, snapToDownbeat, MUSIC_BPM); (7) zoomThrough spatial anchor transitions (exitAnchor field, match-cut renderer).

---

## 1. SYSTEM OVERVIEW

**MarkyStudio** is an AI code-to-video pipeline. User provides a text prompt + optional product screenshots or video frames → system plans a multi-scene narrative video → generates one React/Remotion component per scene via LLM → compiles in-browser with Babel → live preview via Remotion `<Player>`.

### Stack
- **Framework**: Next.js 14 (App Router), TypeScript
- **Video runtime**: Remotion (React-based, 1920×1080 / 30fps)
- **LLM**: Google Gemini via `@google/genai` SDK (model: `gemini-2.5-flash`)
- **In-browser compilation**: `@babel/standalone`
- **Audio**: ElevenLabs TTS via `/api/tts`; SFX + music via Pixabay CDN

### Primary User Flow
1. User enters product description in `LandingPageInput`
2. Optionally attaches screenshots or video frames (base64 data URLs)
3. If ≥5 images → `/api/flow-analyze` detects story flow + cursor waypoints + energy → `ScreenFlowEditor` shown for review → `approveFlow()` called
   *(If ≤4 images: flow-analyze is skipped — planner infers flow directly from images)*
4. `/api/plan` — parallel: (a) brand+descriptions combined call, (b) tiered narrative summary for 3+ images. Returns `FullVideoPlan` with scenes, brand, bgSkill, globalBg, `uiSchemas` embedded
5. `ScenePlanEditor` shown — user edits/confirms scene order, skills, waypoints
6. `startGeneration()` — prefetches ElevenLabs TTS, runs `alignSceneDurations()`, then sequentially generates each scene
7. `/api/generate` — streaming SSE; tiered system prompt + skill content injected; LLM outputs TSX per scene
8. `compileCode()` — Babel transpiles TSX, `postProcessCode()` auto-adds `WebkitBackdropFilter`, injects scope constants
9. `createMasterComponent()` — wraps scenes in `<Sequence>` with `withTransition()`; injects music (per-scene volume), SFX, section labels, FilmGrain, Vignette
10. Remotion `<Player>` renders live video preview

---

## 2. API COST OPTIMIZATIONS (implemented 2026-03-17)

For a typical 3-screenshot, 6-scene video: **~12 Gemini calls → ~5-6 calls** (50%+ reduction).

| Optimization | Savings |
|---|---|
| Brand extraction + image descriptions merged into 1 call | -1 call |
| UI schema extraction merged into narrative planner response | -1 to -3 calls |
| `cachedBrand` passed client→server on regeneration | -1 call |
| Flow-analyze skipped for ≤4 images | -1 call |
| Smart frame deduplication (20 → 12 max frames) | -40% tokens on video recordings |
| Vision call skipped when cursor waypoints already have box data | -0 to -2 calls |
| Audit only runs on `isAhaMoment === true` scenes (not all imageIndex=0) | -1 to -2 calls |

---

## 3. PIPELINE ARCHITECTURE

### 3.1 API Endpoints

| Route | Purpose |
|---|---|
| `POST /api/plan` | Narrative planning: combined brand+desc extraction, inline UI schema, scene planning |
| `POST /api/generate` | Scene code generation (streaming SSE) + follow-up edits (JSON) |
| `POST /api/vision` | UI element detection from screenshot → `{elements: [{label, x, y, w, h, elementType}]}` |
| `POST /api/audit` | Visual quality audit → `{passed, score, issues, fixes}`. Only called for AHA scenes. |
| `POST /api/tts` | ElevenLabs TTS → `{audioUrl, wordTimings}` |
| `POST /api/flow-analyze` | Vision analysis of screenshots/video → `ScreenFlow` (transitions + energy). Called for 5+ images or video recordings. |
| `POST /api/ui-decompose` | Standalone UI decomposition endpoint (also done inline in planner) |
| `POST /api/align` | Audio/scene alignment utility |
| `POST /api/critique` | Legacy quality critique |

### 3.2 Flow Analysis (`/api/flow-analyze`)

**Called when**: `images.length >= 5` OR `isLikelyRecording()` returns true.
**Skipped when**: ≤4 images — planner infers flow directly from visual content.

**Recording detection** (`isLikelyRecording()`): Compares adjacent frame similarity (300-char base64 prefix hash). If >60% of adjacent pairs are >85% similar → it's a recording.

**Screenshot mode** (2–9 distinct frames):
- Single Gemini call; extracts `screens[]`, `transitions[]`, `energyLevel`, `visualComplexity`, `uiPace`
- Box coords on 0–1000 scale, normalized to 0–1 by `normalizeBox()`

**Video recording mode** (≥10 similar frames):
- `detectSignificantFrames()` picks 6–8 most visually distinct key frames (via base64 hash diff scoring)
- Single combined Gemini pass: transition analysis + `energyLevel` + `visualComplexity` + `uiPace`

**ScreenFlow output:**
```typescript
interface ScreenFlow {
  screens: { index: number; description: string }[];
  transitions: {
    from: number; to: number; action: string;
    type: "click"|"hover"|"navigate"|"type"|"scroll";
    targetLabel: string; elementType: "input"|"button"|"dropdown"|"card"|"nav";
    box: { x: number; y: number; w: number; h: number };  // 0–1
    style: { bgColor: string; borderRadius: number };
  }[];
  energyLevel?: "high" | "medium" | "calm";
  visualComplexity?: number;   // 0–1
  uiPace?: "fast" | "slow";
  // Video mode only:
  keyFrameIndices?: number[];
  narrativeSummary?: string;
  isVideoRecording?: boolean;
}
```

### 3.3 Planning Pipeline (`/api/plan`)

Accepts `{ prompt, images, imageUserDescriptions, screenFlow, cachedBrand }`.

**Step 1 — Parallel execution:**
- **Combined brand + descriptions** (1 Gemini call): analyzes all images → brand tokens + 1-sentence description per image. Skipped if `cachedBrand` provided by client (only fetch descriptions then).
- **Tiered summarization** (if 3+ images, after brand call):
  - 10+ frames: chunked event extraction → segment summaries → cohesive narrative
  - 3–9 frames: single flow-analysis pass → `screenSummaries` + `narrative`

**Step 2 — Narrative planning** (1 Gemini call):
- Inputs: product prompt + image descriptions + energy hints + all images (capped at 4 inline)
- Returns: `scenes[]`, `brand`, `globalBg`, `globalVisualThread`, **`uiSchemas[]`** (inline per imageIndex)
- `uiSchemas` are extracted inline — no separate ui-decompose calls

**Step 3 — Post-processing:**
- Vision brand values override text-inferred values
- Auto light-theme detection from bg luminance (threshold: luminance > 0.5)
- `energyLevel === "high"` → overrides `brand.musicStyle = "energetic"`, injects +40 stiffness hint
- `injectSectionTitles()` inserts 90-frame chapter cards between showcase-skill groups when 4+ showcase scenes
- `buildInteractionScriptFromTransition()` generates `InteractionEvent[]` for chameleon-ui scenes with auto `sfx` fields
- `uiSchemas[i]` attached to scenes by `imageIndex`

**Response JSON:**
```json
{
  "scenes": [...],
  "brand": { "primary": "#6366f1", "musicStyle": "energetic", ... },
  "bgSkill": "premium-light-arc-bg" | undefined,
  "globalBg": "arcs" | "grid" | "dots",
  "globalVisualThread": "One sentence: geometric/color/motion motif across all scenes.",
  "imageDescriptions": [...]
}
```

### 3.4 Generation Pipeline (`/api/generate`)

**Tiered system prompt:**
- **TIER1** (~400 tokens): always injected — core rules (brand tokens, spring configs, MaskedReveal mandatory, useStagger mandatory, z-index architecture, layoutTopology rules, shadow depth scale, glass card formula, cinematic zoom cap 1.06)
- **TIER2** (~200–600 tokens): scene-type specific — cursor rules, voiceover rules, wet headline for AHA, light-theme rules
- **TIER3** (~300 tokens): reference appendix — only for complex scenes (spring config table, typography scale, shadow scale, conceptual depth patterns)
- **Skill content**: skill `.md` files appended last

**Generation flow:**
1. Skill detection (Gemini Flash, skip if `forcedSkills`)
2. Skill content injection: `getCombinedSkillContent(detectedSkills)`
3. `isFollowUp=true` → non-streaming JSON `{type:"edit"|"full", edits?, code?}`
4. `isFollowUp=false` → streaming SSE with `text-delta` events

**`postProcessCode()` — compiler pre-processing:**
- Auto-pairs `WebkitBackdropFilter` wherever `backdropFilter: "blur(Xpx)"` appears
- Auto-adds `backgroundColor: BRAND.bg` to root `<AbsoluteFill>` if missing

### 3.5 Generation Hook (`useFullVideoGeneration.ts`)

**Key constants:**
```typescript
const TRANSITION_FRAMES = 20;  // overlap between scenes for cross-dissolve
const HOLD_FRAMES = 24;        // ~0.8s padding after animations complete
const CONCURRENCY = 1;         // sequential (quota-safe)
```

**Total duration:** `sum(durationInFrames) - (numScenes - 1) * TRANSITION_FRAMES`

**Module-level brand cache:**
```typescript
let cachedBrandStore: { imageHash: string; brand: BrandTokens } | null = null;
```
First 100 chars of first image used as hash. On match, `cachedBrand` sent to `/api/plan` which skips brand extraction.

**`generateFullVideo()` routing:**
```
images.length <= 4 → skip flow-analyze, create minimal synthetic ScreenFlow
images.length >= 5 → POST /api/flow-analyze → setPendingFlow → ScreenFlowEditor
```

**`processScene()` flow:**
1. Check `sceneCache`; hit → return immediately
2. `reorderImagesForScene()` — puts `scene.imageIndex` first
3. `resolveModel()` — upgrades AHA scenes: flash:none → flash:medium (thinking budget)
4. `consumeSceneGeneration(skillMode: "force")` → `/api/generate` → code string
5. Skip `/api/vision` if cursor waypoints already have `box.w > 0` data
6. `compileCode()` — `postProcessCode()` first, then Babel
7. Compile fail → retry with `skillMode: "fallback"` (re-detects skills, avoids failing one)
8. Audit gate: **only `isAhaMoment === true`** (was: isAhaMoment || imageIndex===0)
9. Cache result

**`buildInteractionScript()` details:**
- Input: `waypoints: CursorWaypoint[]`
- **TRAVEL constant**: hardcoded at 25 frames per step *(note: cursor-engine skill doc says 22 — mismatch)*
- Initial anchor: `{ x: 0.5, y: 0.85, time: 0, action: "none" }` *(skill doc says y: 1.10 off-screen)*
- Per waypoint: time advances by TRAVEL+DWELL+CLICK per step
- Auto-assigns `sfx` fields: search → type+success; click/navigate → click; hover → whoosh

**`consumeSceneGeneration()` prompt assembly:**
1. `buildBrandBlock(brand)` — `BRAND.*` constants comment block (includes `musicStyle`)
2. `continuityCtx` — `"GLOBAL VISUAL THREAD: {thread}\n\n{continuityBase}"` (scene 0: thread only; scene 1+: thread + `buildContinuityContext`)
3. Scene prompt
4. `detectedElementsBlock` — user waypoints → `buildInteractionScript()` OR vision auto-detection
5. `uiSchemaBlock` — if `scene.uiSchema` present
6. `voiceoverBlock` — includes "DO NOT add background music" (prevents double-music)
7. `narrativeBlock` — emotionalIntent + AHA animation style
8. `stageDirectionBlock` — cinematic guidance
9. `visualAnchorBlock` — problem: render in `colorFrom` + entropy jitter; solution: `colorTo` + GlowBloom

**`consumeSceneGeneration()` prompt assembly** (blocks appended in order):
1. `buildBrandBlock(brand)`
2. Scene prompt
3. `detectedElementsBlock` — vision / user waypoints
4. `uiSchemaBlock`, `voiceoverBlock`, `narrativeBlock`, `stageDirectionBlock`, `visualAnchorBlock`
5. `continuityBlock` — global visual thread + per-scene handoff
6. **`zoomThroughBlock`** — injected when `scene.transition === "zoomThrough"`; tells LLM primary content must be visible at frame 0 (zoom-out handles arrival energy)

**`createMasterComponent(scenes, bgColor, musicUrl, brand)` produces `MasterVideo`:**
- `AnimatedArcBg` — persistent bg (light: rotating arc SVG; dark: drifting radial gradient blobs)
- `<Audio>` — music with **per-scene volume automation** (`interpolate()` across scene boundaries)
  - `musicVolume` from scene plan (0.5 = pain, 1.0 = normal, 1.3 = aha, 1.5 = CTA) × base (0.08 with VO, 0.18 without)
- `<Sequence>` per scene — `withTransition()` wrapped
- **Transition SFX** — `<Sequence><Audio volume={0.25} /></Sequence>` at each scene start (cameraPan → swoosh, slide → whoosh, flash → pop)
- `VignetteLayer` — emotionalIntent-adaptive dark radial border (0.15 for FRUSTRATION/PAIN, 0.05 for RELIEF, 0.08 default)
- **`SectionLabelLayer`** — reads `scene.sectionLabel`; renders top-left pill label (13px, uppercase, brand.primary, glass bg) with fade-in; z:200
- `FilmGrainLayer` — topmost (z:9999); grain opacity adapts to emotionalIntent (0.06 for FRUSTRATION/PAIN, 0.02 for RELIEF/CONFIDENCE, 0.04 for EXCITEMENT/URGENCY, 0.03 default)

**`withTransition()` transitions:**
- `fade`: opacity 0→1→1→0
- `slide`: translateX 80→0 on entry
- `scale`: scale 1.06→1 on entry
- `flash`: white overlay 0.85→0 over 6 frames
- `none`: hard cut
- `cameraPan`: slides ±full-width with horizontal motion blur (max 18px); no opacity fade
- `zoomThrough`: **spatial match-cut** — exit: `scale(1→10)` cubic ease-in toward `transformOrigin = exitAnchor.x% exitAnchor.y%`; enter: `scale(10→1)` ease-out from center. Pure zoom, opacity:1 throughout. Triggered automatically when `scene.exitAnchor` is set (drives exitType) or `scene.transition === "zoomThrough"` (drives enterType).

**`regenerateSceneWithEdit(index, editInstruction)`:**
- Builds ScenePlan from existing compiled scene (preserves all fields)
- Appends `## USER EDIT REQUEST\n[instruction]` to prompt
- `bypassCache: true` — only rebuilds targeted scene + master

**Chat `@mention` targeting** (`generate/page.tsx`):
- When video exists and prompt contains `@intro`, `@scene-2`, etc. → `regenerateSceneWithEdit()`
- Without `@mention` → full `generateFullVideo()` re-run

---

## 4. BRAND TOKEN SYSTEM

### 4.1 BrandTokens Interface
```typescript
interface BrandTokens {
  primary: string;       // e.g. "#6366f1"
  secondary: string;     // e.g. "#a78bfa"
  bg: string;            // e.g. "#0f0f1a" dark | "#f8fafc" light
  surface: string;       // e.g. "rgba(255,255,255,0.06)" dark | "white" light
  text: string;          // "#ffffff" dark | "#0f172a" light
  textMuted: string;     // "rgba(255,255,255,0.5)" dark
  border: string;        // "rgba(255,255,255,0.12)" dark | "rgba(0,0,0,0.08)" light
  font: string;          // "Inter"
  accentName: string;    // "indigo" | "teal" | "rose" | "emerald"
  style: "dark" | "light" | "neon";
  name?: string;         // Product name
  url?: string;          // "acme.com"
  cta?: string;          // "Start Free Trial"
  musicStyle?: string;   // "corporate"|"energetic"|"cinematic"|"calm"|"playful"
  displayFont?: string;  // For dramatic headlines
  annotationFont?: string; // Handwriting font (default: 'Caveat')
}
```

### 4.2 Brand Extraction
Vision (Gemini on first image) → LLM text inference (musicStyle, name, url, cta) → Merge (vision wins for visual tokens).
Auto light-theme override: if `visionBrand.bg` luminance > 0.5 → `style = "light"`.
Energy override: `energyLevel === "high"` → `musicStyle = "energetic"`; `"calm"` → `musicStyle = "calm"`.

---

## 5. COMPILER SCOPE (`src/remotion/compiler.ts`)

### 5.1 `compileCode()` Signature
```typescript
export function compileCode(
  code: string,
  attachedImages: string[] = [],
  brand: Record<string, string> = {},
  voiceoverAudioUrl: string | null = null,
  wordTimings: Array<{ word: string; startFrame: number; endFrame: number }> = [],
  uiSchema: Record<string, unknown> | null = null,
  globalBg: string = "arcs",
  globalFrameOffset: number = 0,
): CompilationResult
```

`postProcessCode()` runs on code before Babel: auto-pairs `WebkitBackdropFilter`, adds `backgroundColor: BRAND.bg` to root `AbsoluteFill`.

### 5.2 Scope Variables
| Variable | Description |
|---|---|
| `ATTACHED_IMAGES` | Array of base64 image data URLs |
| `BRAND` | Full brand token object |
| `VOICEOVER_AUDIO_URL` | ElevenLabs audio data URL or null |
| `WORD_TIMINGS` | Word-level timing array |
| `UI_SCHEMA` | Pre-extracted UISchema or null |
| `GLOBAL_BG` | "arcs" \| "grid" \| "dots" |
| `GLOBAL_FRAME_OFFSET` | Cumulative frame offset for seamless background continuity across scenes |

All Remotion primitives, RemotionShapes, TransitionSeries, THREE, Lottie also in scope.

### 5.3 Style Constants
```typescript
const SPRING_CONFIGS = {
  entrance:  { damping: 200, stiffness: 120 },  // crisp UI reveal
  snap:      { damping: 160, stiffness: 220 },  // snappy tactile hero elements
  float:     { damping: 22,  stiffness: 70  },  // gentle oscillating float
  pop:       { damping: 8,   stiffness: 150 },  // elastic pop
  cinematic: { damping: 200, stiffness: 80  },  // smooth camera push-in
}

const GLOBAL_STYLE = {
  contentPadding: 120,
  cardRadius: 20,
  shadowLow:    "0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.06)",
  shadowMedium: "0 2px 8px rgba(0,0,0,0.06), 0 8px 28px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.05)",
  shadowHigh:   "0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.14), 0 40px 80px rgba(0,0,0,0.10)",
}

const EASINGS = {
  easeOutCubic:   (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2,
  easeInQuad:     (t) => t * t,
}
```

### 5.4 Visual Effect Components
- **`getGlassCard(brand?)`** — WhatAStory High-Depth formula: `blur(24px) saturate(150%)`, directional borders (top/left bright), two-layer shadow
- **`glowBloomStyle(color, blurPx, opacity, spread)`** — bloom div styles for GlowBloom
- **`SheenOverlay({ startFrame, width, height?, angle? })`** — diagonal shine sweep (60 frames)
- **`MotionBlurWhip({ frame, startFrame, duration?, maxBlur?, children })`** — bell-curve blur peak
- **`CameraMotionBlur({ children, velocityX?, velocityY?, shutterAngle?, intensity? })`** — SVG feGaussianBlur directional
- **`ChromaticAberration({ children, intensity?, direction? })`** — R/B channel split (max 4px)
- **`GlowBloom({ children, color, blurPx?, opacity?, spread?, animated? })`** — halo bloom behind element
- **`DepthBlur({ children, focusDistance?, maxBlur? })`** — depth-of-field blur
- **`MeshGradientBg({ colors?, animate?, speed?, children? })`** — 4 animated radial gradient blobs (auto-wrapped with `globalFrameOffset`)
- **`FilmGrain({ opacity? })`** — SVG feTurbulence noise at z:9999

### 5.5 Audio Sync Hooks
- **`useAudioSync(wordTimings?)`** → `{ currentWord, wordProgress, completedWords, wordTimings }`
- **`useBeat(bpm?, offset?)`** → 0–1 beat pulse (sharp attack, slow decay). When called with no args, auto-reads `MUSIC_BPM` from scope.
- **`useBeatClock(bpm?)`** → `{ beat, bar, beatProgress, barProgress, isDownbeat }` — full musical clock. `isDownbeat` fires on every bar's beat 1.
- **`snapToDownbeat(approxFrame, bpm, fps)`** → nearest downbeat frame — use for entrance frame alignment
- **`MUSIC_BPM`** — scope constant injected from `TRACK_BPM[brand.musicStyle]` (corp:90, energetic:128, cinematic:80, calm:68, playful:110)

### 5.6 Interaction Hooks
- **`useTyping(text, startFrame, fps, cps?=10)`** → `{ displayText, showCursor }`
- **`usePopup(openFrame, closeFrame?)`** → `{ scale, opacity, visible }`
- **`useAccordion(triggerFrame, targetHeight)`** → `{ height, opacity }`
- **`useDragItem(from, to, startFrame)`** → `{ x, y, elevation }`

### 5.7 Behavioral Hooks
- **`DepthStack({ layers, cameraRotateY?, cameraRotateX?, children })`** — true `preserve-3d` Z-layer separation. Each child gets `transform: translateZ(Xpx)` based on its depth index. `cameraRotateY` (default -18°) + `cameraRotateX` (default 6°) for isometric float. Use instead of flat `rotateY` on UI cards — layers physically separate when camera tilts.
- **`useVitality(mode?, interval?, phase?)`** → `{ transform, opacity }` — micro-animation for idle elements. Modes: `bounce` (periodic Y dip+spring), `breathe` (±1.5% scale sine), `float` (±4px Y sine), `pulse` (opacity 0.7→1.0). Per-element phase via `random()`. Apply to avatars, cards, and any element that settles and holds.
- **`AnimatedHighlighter({ text, wordIndex, startFrame, style?, color? })`** — SVG scribble/marker/underline/circle drawn behind a headline keyword at `startFrame`. Styles: `marker` (rough fill), `underline` (wavy SVG path), `circle` (hand-drawn ellipse). Uses `mixBlendMode: multiply` for non-destructive overlay over text.
- **`useEntropy(strength?=0.5)`** — per-element sine drift. Use 0.6 for chaos scenes, 0.25 ambient, 0.35 dust
- **`useEntropyWithAttractor(strength, triggerFrame)`** → `{ getFloat(i,amplitude), attractorProgress, chaosStrength }` — chaos resolves to order at triggerFrame
- **`useMagnetic(cursorX, cursorY, elemX, elemY, intensity?, radius?)`** → `{ rotateX, rotateY, active }` — max 8° tilt within radius
- **`TiltWrapper({ tiltX?, tiltY?, scale?, perspective?, glossy? })`** — CSS perspective + rotateX/Y. `glossy={true}` adds reactive specular sheen. Mandatory for midground (z:10–50)
- **`useStagger(index, baseFrame, delayPerItem)`** → `baseFrame + index * delayPerItem`. **MANDATORY for 3+ siblings**
- **`SAFE_ZONES`** — agency layout grid: heroHeadline, heroCenter, featureCardLeft/Right, sectionLabel, statCenter, ctaButton

### 5.8 Cursor System
- **`CURSOR_STATE_DEFAULT`** — `{ x: 0.5, y: 0.85, vx: 0, vy: 0, isClicking: false, speed: 0, isHovering: false, hoverProgress: 0 }`
- **`useCursorState(steps, magneticStrength?=1)`** → `{ x, y, vx, vy, isClicking, speed, approachPhase, isHovering, hoverProgress }`:
  - **Variable travel duration** by distance: short (<0.15) = 18f, medium = 25f, long (>0.4) = 35f
  - **Dwell scan**: Lissajous micro-drift (±8px) during dwell at each waypoint
  - **Per-segment dwell variance**: ±4 to +10 frames randomized per segment
  - **Target overshoot**: ~15px past target, spring-back over 12 frames
  - **Pre-click pause**: 5 frames between settling and click firing
  - **Magnetic lock-on**: last 12 frames of travel use Expo.Out easing (`1 - 2^(-10t)`)
  - `approachPhase` (0→1): use to fade `CursorAnnotationPill` as cursor settles
  - **`isHovering`** (bool): true for 17 frames pre-click (hover pre-state); drive `preClickEffect` reactions
  - **`hoverProgress`** (0→1): 17-frame ramp during hover pre-state; use for glow/squish/tooltip buildup
  - Three-phase model: approach (last 12 travel frames) → hover (17f pre-click) → click (4f)
- **`cubicBezier(from, to, t, controlOffset?=0.15)`** — quadratic bezier for cursor arcs
- **`SyncedWord`**, **`useCursorPos`**, **`useMouseProximity`**, **`KineticWord`**, **`FocusOrchestrator`**, **`CursorAnnotationPill`**

### 5.9 Chameleon Overlay Components
- **`ChameleonInput({ x, y, w, h, text, startFrame, brand })`** — typing animation + focus ring (box-shadow + blinking cursor)
- **`ChameleonHighlight({ x, y, w, h, triggerFrame, brand })`** — click push-in animation
- **`DropdownMenu({ x, y, w, items, openFrame, closeFrame?, brand })`** — glass dropdown; per-item stagger `i*3f`, `scaleY` from top origin

### 5.10 Camera Components
- **`ActionCamera({ interactionScript, zoomAmount?, previewFrames?, holdFrames?, easeFrames?, trackingInertia?, children })`** — snap-zooms to each click target; inertial tracking follows cursor path. **Wrap content layer only — keep cursor outside**
- **`SpotlightCutout({ target, startFrame, darkOpacity?, padX?, padY?, glowColor?, endFrame? })`** — SVG mask overlay with glow ring; target in 0–1 coords; z:90
- **`GhostHighlight({ targets, brand })`** — animated glowing border spring-snapping between positions; z:95
- **`CinematicCamera({ targetX?, targetY?, zoomTo?=1.06, children })`** — slow drone zoom with perspective tilt. **Hard cap: 1.06. Never exceed.**
- **`ParallaxLayer({ depth, children, cameraProgress })`** — depth-scaled layer inside CinematicCamera

### 5.11 App Shell Components
- **`InputField({ value, placeholder?, label?, focused?, brand, width? })`**
- **`ChatBubble({ message, author, color?, appearFrame, brand })`**
- **`SidebarNav({ appName?, items, activeItem?, brand })`** — 220px dark glass sidebar (blur:24px saturate:150%)
- **`AppShell({ sidebar?, topbar?, children?, brand, zoom? })`** — full SaaS layout
- **`TaskDetailPanel({ openFrame, title, fields, brand })`** — slides in from right (blur:24px saturate:150%)
- **`ModalOverlay({ openFrame, closeFrame?, title?, brand })`** — centered glass modal (blur:24px saturate:150%)

### 5.12 WhatAStory Pattern Components
- **`LightArcBg({ brand?, variant?, globalFrameOffset? })`** — **MANDATORY for all light-theme scenes** — near-white bg with 8 rotating arc lines + corner blobs. Variants: "arcs" | "grid" | "dots". Auto-wrapped with `globalFrameOffset` in scope.
- **`AmbientEnvironment({ brand?, children })`** — **Breathing background wrapper**: slow `1.0→1.06` cinematic camera zoom + two corner atmospheric orbs (65vw/80vw, blur:120/140px, opacity:0.15/0.10) + 18 entropy dust particles (defined outside component as `_AMBIENT_DUST` to prevent flicker). Eliminates flat dead backgrounds. Use on any dark-theme scene not using LightArcBg.
- **`ContextualSectionHeader({ text, subtext?, icon?, startFrame, exitFrame?, brand })`** — pinned at top:60, left:80; spring entry
- **`SfxSequencer({ events })`** — **MANDATORY on cursor/chameleon scenes** — maps `events[].sfx` to CDN audio
- **`AnimatedSidebar({ appName, items, brand, startFrame? })`** — staggered spring sidebar
- **`AnimatedTopbar({ tabs?, breadcrumb?, hasSearch?, hasAvatar?, brand, startFrame?, activeTabIndex?, height? })`** — sliding tab underline
- **`AnimatedMetricCards({ cards, brand, startFrame?, columns? })`** — white cards, count-up, trend arrows
- **`AnimatedTable({ columns, rows, brand, startFrame? })`** — staggered row reveal; `renderCell()` handles badge/status/button/checkbox cell types
- **`AnimatedChart({ type, title?, dataPoints, color, brand, startFrame? })`** — SVG line/bar/donut/area
- **`AnimatedForm({ title, fields, submitLabel, brand, startFrame? })`** — sequential field reveal
- **`SectionTitle({ title, subtitle?, icon?, brand, startFrame? })`** — chapter title card
- **`PersistentSectionLabel({ featureName, integrationIcon?, integrationName?, brand, startFrame? })`** — top:28, left:36, z:200
- **`StatusBadge({ text, color })`**, **`TableActionButton({ text, color })`**
- **`FloatingShapes({ brand, startFrame? })`** — 12 bob+drift geometric shapes (outlines + fills)
- **`ContentCard({ brand, startFrame, children })`** — white rounded rectangle spring entry
- **`NotificationToast`** — slide-in alert (bottom-right)
- **`AbstractSkeletonUI({ uiSchema?, brand, opacity?, startFrame? })`** — geometric skeleton blocks; use when UI is atmospheric background (cognitive masking)
- **`ReconstructedAppShell`** — full UI from UISchema (AnimatedSidebar + AnimatedTopbar + content sections)
- **`useInteractionFeedback(clickFrame, direction?)`** → `{ scale, nudgeX, nudgeY, glowOpacity }`
- **`ContextualBgPulse({ triggerFrame, color, intensity?, x?, y? })`** — radial glow pulse on trigger

### 5.13 Layout Components
- **`MaskedReveal({ startFrame, delay?, config?, direction? })`** — `overflow:hidden` clip; inner div translates Y `110%→0%` via spring. **MANDATORY for all main headlines. VIOLATION if opacity-only fade.**
- **`HeroSplit({ left, right, brand, leftWeight?, rightWeight?, gap? })`** — 2-column text-left/visual-right
- **`VideoPlateMockup({ src, kenBurns?, kenBurnsScale?, darkOverlay?, vignetteStrength?, children? })`** — live-action composite (Ken Burns + dark overlay + vignette)
- **`AnimatedConnectionLine({ x1, y1, x2, y2, startFrame, duration?, color?, dashed?, curved? })`** — SVG strokeDashoffset draw animation

### 5.14 Other Scope Components
- **`HandwrittenLabel({ text, x, y, targetX?, targetY?, startFrame, brand, rotation? })`** — Caveat font annotation with optional dotted leader line; x/y in 0–1 coords
- **`PersonCard({ photoIndex, name, role, accentColor?, startFrame, brand, size? })`** — real headshot photo from `STOCK_AVATARS[0..7]` with role pill badge
- **`STOCK_AVATARS`** — array of 8 royalty-free face photos (Unsplash); access as `STOCK_AVATARS[0]` through `STOCK_AVATARS[7]`
- **`GarbledText({ finalText, resolveFrame, scrambleStrength?, startFrame, style })`** — scrambled characters that resolve to readable text at `resolveFrame`
- **`OrbitRing({ centerX?, centerY?, radius, color?, startFrame, dotSpeed?, brand })`** — dashed SVG circle orbit with traveling dot
- **`BoldColorBg({ color, vignetteStrength? })`** — solid saturated background; use only for AHA/CONFIDENCE scenes with `BRAND.primary`
- **`ArcBg`** — persistent animated arc background (light/dark adaptive)
- **`EntropyDust`** / **`ENTROPY_DUST_PARTICLES`** — standalone entropy dust (18 particles OUTSIDE component)
- **`HAND_CURSOR`** — flat cartoon pointing-hand SVG (hotspot at fingertip, -8deg tilt, squeeze on click)

---

## 6. WHATASTORY GLOBAL QUALITY STANDARDS (2026-03-18)

These standards apply to **all generated scenes**. Violations are flagged in audit.

### 6.1 Typography Stack (3-Layer Mandatory)
| Layer | Size | Weight | Tracking | Timing |
|---|---|---|---|---|
| Section label | 13px | 700 | 0.22em uppercase | f:5 |
| Hero headline | 96–128px | 900 | -0.04em | f:12 (MaskedReveal, per-line) |
| Sub-line | 22–28px | 400 | normal | f:22 |

- Section label: `<MaskedReveal startFrame={5}>` (overflow:hidden + translateY too, not just opacity)
- Each headline line: own `overflow:hidden` wrapper, 4f stagger between lines
- `paddingBottom: 4px` on line containers to prevent descender clipping
- ONE accent word in `BRAND.primary` — never two

### 6.2 Cursor Standards
| Property | Value |
|---|---|
| Cursor type | Hand SVG (realistic finger anatomy, knuckle crease, -8deg tilt) |
| Travel | 22 frames, spring: `stiffness:160, damping:12` (magnetic snap with overshoot) |
| Dwell | 10f with `Math.sin(frame*1.8)*1.2` + `Math.cos(frame*2.1)*0.8` micro-jitter BEFORE click |
| Click fires at | `DWELL_START + 10` (not at travel end) |
| Click-zoom | Screenshot scales `1.0→1.06`, origin at click point; eases back out |
| Double ripple | Ring 1 brand color, ring 2 white, 3-frame delay |
| Intent pill | Shows for travel >200px, fades at 65% of travel (approach phase) |
| Min step duration | TRAVEL(22) + DWELL(10) + CLICK(14) = 46f min per step |

> **Note**: `buildInteractionScript()` in useFullVideoGeneration.ts uses TRAVEL=25 (vs skill doc 22). This is a known mismatch to be fixed.

### 6.3 Glass Card Standards (WhatAStory High-Depth)
```css
backdropFilter: blur(24px) saturate(150%)   /* saturate prevents muddy gray */
borderTop:    1px solid rgba(255,255,255,1.0)  /* full-brightness catch light */
borderLeft:   1px solid rgba(255,255,255,0.15)
borderRight:  1px solid rgba(255,255,255,0.06)
borderBottom: 1px solid rgba(255,255,255,0.04)
borderRadius: 20px
boxShadow: 0 12px 40px rgba(0,0,0,0.45), 0 1px 1px rgba(255,255,255,0.18) inset
```
Light glass: `background: rgba(255,255,255,0.85)`, `blur(20px) saturate(150%)`

### 6.4 Cinematic Camera
- Wrap ALL scene content: `scale(interpolate(frame, [0,150], [1.0, 1.06]))` — **hard cap 1.06**
- CTA scenes zoom OUT: `1.05→1.0` (settleScale for finality)
- `CinematicCamera zoomTo` default: 1.06. AHA/URGENCY scenes only: 1.06 (never 1.10+)

### 6.5 Layout Rules (layoutTopology system — replaces 40/60 mandate)
Each scene is assigned a `layoutTopology` by the planner. No two consecutive scenes may share the same topology.

| Topology | Implementation |
|---|---|
| `split-left` | flex row, text left `flex:"0 0 40%"`, visual right `flex:"0 0 60%"` with `perspective:1200 rotateY(-12deg) rotateX(3deg)` + DepthStack inside visual column |
| `split-right` | flex row, visual left `flex:"0 0 60%"` same tilt, text right `flex:"0 0 40%"` |
| `center-focus` | UI centered (max 80% width), bold headline top or bottom in glass-backed div |
| `isometric-float` | DepthStack `cameraRotateY={-18} cameraRotateX={6}`, position off-center (right:5%), text in top-left corner |
| `full-bleed-overlay` | UI/image fills AbsoluteFill (z:0), text is `position:absolute` glass card (z:30) anchored bottom-left or center |

- **Never present UI flat** (no perspective) regardless of topology — always DepthStack or explicit rotateY
- UI width: 120% in split layouts (bleeds off edge, implies expansive system)
- Shadow direction matches rotation: `-30px 40px 80px` (left-lean for left-tilt)
- **Padding**: 80–120px from edges; 160px minimum for hero/title scenes

### 6.6 Showcase Scene Panels (Chameleon / Cursor)
- Background push when panel opens: `bgScale:0.98 + bgBlur:8px + bgDarken:40%`
- Modal backdrop: `backdropFilter: blur(12px)`, z:50 (NOT just dark overlay)
- Spring-driven blur: `bgBlur = interpolate(panelProgress, [0,1], [0,3])`

### 6.7 CTA Scene Standards
- Settle zoom: `interpolate(frame, [0,90], [1.05, 1.0])` — zoom OUT for finality
- Headline spring: `{ damping:22, stiffness:100 }` (heavy, authoritative — not bouncy)
- Button spring: `{ damping:14, stiffness:160 }` (snappy entrance)
- Button pulse: `interpolate(Math.sin((frame-60)*0.05), [-1,1], [1,1.03])` — starts post-settle

### 6.8 Network/Team Intro Timing
| Element | Frame | Spring |
|---|---|---|
| Hub | f:5 | stiffness:180, damping:14 |
| Nodes | f:15 + i*3 | — |
| Lines | f:25 + i*4 | strokeDashoffset Q-bezier |
| Hub pulse | Math.sin((f-30)*0.1) | mapped to [0.95,1.05] |

Network lines: **strokeDashoffset Quadratic Bezier paths only** — no opacity fade, no straight lines.

### 6.9 Z-Index Architecture
| Layer | Z-index | Examples |
|---|---|---|
| Background | 0 | LightArcBg, AmbientEnvironment orbs, entropy dust (z:1) |
| Product UI | 10–50 | AppShell, TiltWrapper card |
| Cognitive masking | 50–95 | Modal backdrop (z:50), SpotlightCutout (z:90), GhostHighlight (z:95) |
| Narrative / Annotations | 100–160 | Cursor (z:100), CursorAnnotationPill (z:160) |
| Master overlays | 200 | SectionLabelLayer |
| FilmGrain | 9999 | Master FilmGrainLayer |

### 6.10 Entropy Dust Rules
- 18 particles array defined **OUTSIDE component** (stable seeds, no flicker per frame)
- `zIndex: 1` (behind all content, above bg)
- Modulo loop: `(frame * speed * 30) % 1080`
- Size: 4px (foreground, blur:2px) or 2px (background, no blur)
- Opacity: 0.10–0.28 range

---

## 7. SCENE PLAN SCHEMA

### 7.1 ScenePlan Interface
```typescript
interface ScenePlan {
  id: number;
  title: string;
  prompt: string;
  skills: string[];
  durationInFrames: number;
  imageIndex?: number;
  cursorWaypoints?: CursorWaypoint[];
  screenFlow?: ScreenFlow;
  interactionScript?: InteractionEvent[];
  voiceoverText?: string;
  emotionalIntent?: string;   // "FRUSTRATION"|"RELIEF"|"CONFIDENCE"|"TRUST"|"URGENCY"|"EXCITEMENT"|"PAIN"|"RECOGNITION"
  isAhaMoment?: boolean;
  voiceoverAudioUrl?: string;
  wordTimings?: { word: string; startFrame: number; endFrame: number }[];
  transition?: "fade" | "slide" | "scale" | "flash" | "none" | "cameraPan" | "zoomThrough";
  exitAnchor?: { x: number; y: number };  // Normalized 0-1 coord the camera zooms INTO at exit (set on sending scene; receiving scene gets transition:"zoomThrough")
  layoutTopology?: "split-left" | "split-right" | "center-focus" | "isometric-float" | "full-bleed-overlay";
  uiSchema?: UISchema;
  stageDirection?: string;
  visualAnchor?: { icon: string; colorFrom: string; colorTo: string; label: string };
  sectionLabel?: string;       // Short label → SectionLabelLayer overlay in master component
  musicVolume?: number;        // 0.5 (pain) | 1.0 (normal) | 1.3 (aha) | 1.5 (CTA)
  isWalkthroughScene?: boolean; // Part of persistent-shell walkthrough sequence
}
```

### 7.2 FullVideoPlan Interface
```typescript
interface FullVideoPlan {
  scenes: ScenePlan[];
  brand?: BrandTokens;
  screenFlow?: ScreenFlow;
  bgSkill?: string;
  globalBg?: string;           // "arcs" | "grid" | "dots"
  globalVisualThread?: string; // Geometric/color/motion motif evolving across all scenes
}
```

### 7.3 InteractionEvent Interface
```typescript
interface InteractionEvent {
  frame: number;
  action: string;
  target: string;
  value?: string;
  durationFrames?: number;
  elementType?: string;
  box?: { x: number; y: number; w: number; h: number };  // 0–1 normalized
  style?: { bgColor?: string; borderRadius?: number };
  sectionHeader?: { text: string; subtext?: string; icon?: string };
  sfx?: "click" | "whoosh" | "pop" | "type" | "success" | "swoosh";
  annotation?: string;
  preClickEffect?: "glow" | "focus-ring" | "squish" | "tooltip" | "brighten";  // UI reaction during hover pre-state (isHovering=true, 17f before click)
}
```

---

## 8. NARRATIVE PLANNING SYSTEM

### 8.1 Agency Formula (WhatAStory / Sandwich Video)
Broken Reality → Empathy → Relief → Proof → Action (PAS)

- **Hook**: Show life WITHOUT the product. Specific + visceral. Never "Teams struggle" — "Every Monday, Sarah copies numbers from 4 spreadsheets."
- **AHA Moment**: One scene `isAhaMoment: true`. A transformation, not a feature.
- **Voiceover**: Outcome-driven. "Your report is ready before you finish your coffee" not "Our platform has automated reporting."
- **Every scene**: One emotional intent. One visual metaphor.

### 8.2 Emotional Visual Grammar

| emotionalIntent | Spring | Character | Color temp | Pacing |
|---|---|---|---|---|
| FRUSTRATION | damping:150, stiffness:200 | Jittery, staggered | Desaturated, cold | Fast, chaotic |
| PAIN | damping:300, stiffness:60 | Slow, heavy | Dark, muted | Slow, oppressive |
| RECOGNITION | damping:200, stiffness:120 | Clean reveal | Normal brand | Medium, deliberate |
| RELIEF | damping:400, stiffness:80 | Smooth, floating | Warm, bright | Slow, spacious |
| CONFIDENCE | damping:200, stiffness:140 | Synchronized, crisp | Vivid, saturated | Medium-fast |
| TRUST | damping:300, stiffness:100 | Gentle, warm | Soft, warm | Slow, unhurried |
| URGENCY | damping:120, stiffness:180 | Fast, pulsing, overshoots | High contrast | Fast |
| EXCITEMENT | damping:8, stiffness:200 | Elastic pop, bounces | Vivid, energetic | Fast, playful |

**Energy override**: `energyLevel === "high"` → +40 to all stiffness values.

### 8.3 Scene Count Rules
- No screenshots: 4–5 scenes
- 1–2 screenshots: 5–6 scenes
- 3–5 screenshots: 6–7 scenes
- 6+ screenshots / video: 7–8 scenes
- **Never exceed 8 scenes.** Combine related features.

### 8.4 Walkthrough Detection
When 3+ screenshots share the same sidebar/navigation (same app):
1. `isWalkthroughScene: true` on each related scene
2. First scene: `premium-reconstructed-ui` with full AppShell
3. Subsequent scenes: "Maintain same sidebar/topbar — only replace main content"
4. `"cameraPan"` transition between walkthrough scenes
5. `sectionLabel` set to feature name on each scene (→ SectionLabelLayer overlay)

### 8.5 Voiceover Formula
`maxWords = (durationInFrames / 30) * 2.5` (hard limit: × 2.8)

| Frames | Max words |
|---|---|
| 90 | ~7 (section title — leave empty) |
| 150 | ~12 |
| 180 | ~15 |
| 210 | ~17 |
| 240 | ~20 |

### 8.6 Scene Act Structure

| Duration | Setup | Tension | Resolve |
|---|---|---|---|
| 150f | 0–30f | 30–105f | 105–150f |
| 180f | 0–40f | 40–130f | 130–180f |
| 210f | 0–50f | 50–155f | 155–210f |
| 240f | 0–60f | 60–180f | 180–240f |

---

## 9. AUDIO SYSTEM

### 9.1 Music Tracks
```typescript
const MUSIC_TRACKS = {
  corporate:  "https://cdn.pixabay.com/audio/2023/11/13/audio_3c2e86c693.mp3",
  energetic:  "https://cdn.pixabay.com/audio/2024/08/20/audio_6c53572dfa.mp3",
  cinematic:  "https://cdn.pixabay.com/audio/2024/02/15/audio_b99e82e13f.mp3",
  calm:       "https://cdn.pixabay.com/audio/2024/04/09/audio_9c659e933b.mp3",
  playful:    "https://cdn.pixabay.com/audio/2023/09/07/audio_168f2040eb.mp3",
}
// Selection: MUSIC_TRACKS[brand.musicStyle ?? brand.accentName ?? "cinematic"]
// Volume: interpolated per-scene (musicVolume × 0.08 with VO, × 0.18 without)
```

**Energy → musicStyle chain**: flow-analyze `energyLevel` → planner nudge → `brand.musicStyle` → `MUSIC_TRACKS` key → master `<Audio>` volume interpolation

### 9.2 Voiceover
- Provider: ElevenLabs via `/api/tts`
- Pre-fetched in parallel (`prefetchVoiceovers()`) before generation
- Returns `{ audioUrl, wordTimings }`; attached to scene, injected as `VOICEOVER_AUDIO_URL` + `WORD_TIMINGS`
- `alignSceneDurations()` adjusts `durationInFrames` to `max(90, lastWord.endFrame + 35)` after prefetch

### 9.3 SFX
```typescript
const SFX_MAP = {
  click, whoosh, pop, type, success, swoosh  // all Pixabay CDN
}
```
Auto-assigned in `buildInteractionScriptFromTransition()`: search → type+success; click/navigate → click; hover → whoosh.
Transition SFX at master level: cameraPan → swoosh, slide → whoosh, flash → pop.
`<SfxSequencer events={INTERACTION_SCRIPT} />` mandatory on cursor/chameleon scenes.

---

## 10. SKILLS REGISTRY

Skills are `.md` files in `src/skills/`. Loaded by `getCombinedSkillContent()` and injected after SYSTEM_PROMPT.

### 10.1 Complete Skill List (70+ registered)

**Background / environment:**
- `premium-ambient-environment` — AmbientEnvironment wrapper: corner orbs + entropy dust + cinematic zoom; use on dark scenes
- `premium-dot-matrix-bg` — CSS repeating dot-grid, floating accent dots
- `premium-light-textured-bg` — near-white bg with subtle texture
- `premium-glassmorphism` — glass card overlays (WhatAStory High-Depth formula)
- `premium-gradient-hero` — full-screen brand gradient headline
- `premium-multi-corner-gradient` — pastel radial blobs at corners (light B2B)
- `premium-bold-color-showcase` — solid saturated bg; only for AHA/CONFIDENCE scenes
- `premium-light-arc-bg` — near-white bg with animated concentric arc lines + corner blobs (LightArcBg)

**Hooks / intros:**
- `premium-saas-hook` — brand reveal, floating icons, dark cinematic intro; logo-circle variant; integration cluster corner variant; orbital groups (2 named anchors)
- `premium-network-intro` — Hero Hub + SATELLITE_SLOTS 3D depth; bezier SVG paths; real photo support
- `premium-kinetic-text` — word-by-word reveal; section label mandatory; MaskedReveal mandatory; light-bg variant; underline + rotating bold word
- `premium-icon-arc-reveal` — dark hook: neon outline icon + SVG arc draw + concentric rings
- `premium-ink-logo-reveal` — blob morphs to brand icon; wordmark springs in
- `premium-saas-showcase` — 40/60 split; 3D perspective tilt; floating glass badge bridge

**UI / app walkthrough:**
- `premium-reconstructed-ui` — 40/60 split + 3-layer text stack; cascade order: shell → sidebar → header → rows (3f stagger); `rotateY(-8deg) rotateX(2deg)` on shell
- `premium-cursor-engine` — hand SVG cursor; TRAVEL=22f; 10f dwell; click-zoom 1.0→1.06; double ripple; intent pill
- `premium-chameleon-ui` — panel push/blur (bgScale:0.98 + bgBlur:8px + bgDarken:40%); modal backdrop blur(12px); z-index hierarchy blueprint
- `premium-app-walkthrough` — persistent AppShell across walkthrough sequence
- `premium-animated-topbar` — animated tab/breadcrumb topbar
- `premium-interactive-ui` — full interactive UI patterns (Bordio-quality)
- `premium-responsive-viewport` — browser + device-switcher toolbar; spring transition between breakpoints
- `premium-live-action-composite` — real photo bg plate + floating UI cards
- `premium-hand-cursor` — flat cartoon pointing-hand SVG; squeeze click; double ripple

**Feature showcase:**
- `premium-feature-grid` — strict 3f micro-stagger; cascade from translateY(60px); glassmorphism blur(24px) saturate(150%); highlight dims non-target to 0.4 opacity
- `premium-feature-bundle-cards` — 3 white cards + connectors (platform products)
- `premium-section-title` — chapter title card
- `premium-stat-counter` — 220px counter; spring stiffness:60 damping:24 heavy deceleration; prefix/suffix 55% size in BRAND.primary; subline tied to countSpring > 0.8
- `premium-before-after` — split comparison scene
- `premium-data-flow-abstract` — abstract flowing data visualization
- `premium-3d-isometric-explode` — isometric 3D product explode
- `premium-metric-flyout` — metric card flyout animation

**People / social proof:**
- `premium-person-cards` — PersonCard + STOCK_AVATARS for team/problem scenes
- `premium-team-orbit` — 3D ellipse orbit (RADIUS_X:260, RADIUS_Y:80); dynamic zIndex/depth scale/blur/brightness; hub glass blur(24px); brand reveal variant
- `premium-social-proof` — photo bg + review cards; avatar-widget-orbit variant (central photo + orbiting mini data cards)
- `premium-testimonial-card` — single testimonial card reveal; word-by-word animated text

**Transitions / motion:**
- `premium-camera-zoom` — CinematicCamera zoom patterns
- `premium-chaos-to-ui-resolve` — `useEntropyWithAttractor` snaps floating elements (STOCK_AVATARS, icons) into UISchema bounding boxes at `triggerFrame`; chaos→order transition skill
- `premium-shape-morph-transition` — shape-based scene transitions (use as last 45f)
- `premium-feedback-storm` — notification/message chaos storm (problem scenes)
- `premium-confetti-celebration` — 80 PARTICLES defined outside component; rect/circle/streak shapes; confetti burst variant

**CTA:**
- `premium-cta-scene` — settle zoom OUT 1.05→1.0; heavy headline spring damping:22 stiff:100; snappy button damping:14 stiff:160; button pulse; "Simple Logo + Wide Button + URL" light variant

**Narrative / text:**
- `premium-narrative-overlay` — contextual text overlay patterns
- `premium-kinetic-text` — already listed above

**Special:**
- `premium-callout-bubble` — floating comment card (avatar + typed message + CTA button + blue selection outline); annotation tooltip variant; slide-in side panel variant
- `premium-customer-journey` — curved SVG path + milestone dots + white pop-up info cards; dot-traveler animates along path
- `premium-icon-concept-scene` — large icon + soft radial glow + dark badge + dotted SVG curved path with triangle arrowhead
- `premium-floating-path-nodes` — dark bg + aurora/nebula + outline circles/pills + dotted curved SVG path + traveling dot (analytic Q-bezier)
- `premium-icon-bubble-row` — 3 icon circles with staggered labels
- `premium-logo-wall` — brand logo grid reveal
- `premium-integration-wall` — scattered app logo cards on brand-color bg
- `premium-phone-notification` — iOS-style frosted-glass notification from top
- `premium-notification-toast` — toast notification component
- `premium-real-photo-device` — environment bg Ken Burns + vignette; portrait tablet (380×520); 3-layer box-shadow; screen reflection sheen
- `premium-audio` — musicStyle-based track selection (per-scene override)
- `premium-tactile-feedback` — micro-interaction feedback patterns
- `sequencing` — scene transition rules + skill stacking + WhatAStory Composition Standard

**Example skills (dev reference):**
- example-histogram, example-progress-bar, example-text-rotation, example-falling-spheres, example-animated-shapes, example-lottie, example-gold-price-chart, example-typewriter-highlight, example-word-carousel

### 10.2 Skill Selection Rules

**Hook/Intro:**
- Dark polished brands: `premium-icon-arc-reveal` (strongest dark intro)
- Light B2B: `premium-saas-hook` with FloatingShapes + ContentCard
- Light + logo moment: `premium-ink-logo-reveal` + `premium-dot-matrix-bg`

**Problem scenes (MUST use visual metaphor — text-only = quality VIOLATION):**
- Team chaos / scattered tools → `premium-team-orbit`
- Technical failures / system slowness → `premium-neon-dark`
- Disconnected systems / data silos → `premium-floating-path-nodes`
- Bold single pain-point statement → `premium-kinetic-text` or `premium-char-split`
- Data-backed cost-of-problem → `premium-data-reveal`
- Rich visual pain-point list → `premium-glassmorphism`
- Dramatic snap-cut → `premium-match-cut`
- Left-vs-right literal comparison → `premium-split-screen` (use sparingly)

**Product showcase:**
- **MANDATORY (screenshots uploaded)**: At least ONE scene uses `premium-cursor-engine` or `premium-chameleon-ui` with vision-detected elements
- **ALSO MANDATORY**: At least ONE different scene uses device mockup (`premium-device-mockup` / `premium-scroll-demo` / `premium-saas-showcase`)
- Input fields / search bars / dropdowns visible: use `premium-chameleon-ui` over cursor-engine
- Abstract concept / no screenshot: `premium-data-flow-abstract` or `premium-3d-isometric-explode`

**Cursor style:**
- `premium-hand-cursor` for: collaboration tools, design tools, project management, consumer SaaS (friendly tone)
- `premium-cursor-engine` (arrow) for: dev tools, analytics, technical products

**Special rules:**
- Add `premium-ambient-environment` as base to any scene using glassmorphism / cta-scene / kinetic-text
- Dark-themed products: STRICTLY `premium-icon-arc-reveal` for hook, `premium-floating-path-nodes` for problem, `premium-confetti-celebration` for solution/CTA
- CRM/lifecycle products: `premium-customer-journey` for showcase scenes
- Abstract concept scenes: `premium-icon-concept-scene` for problem/solution
- Many integrations: `premium-integration-wall` for problem or showcase
- Collaboration / feedback / annotation features: add `premium-callout-bubble` to cursor scene
- Responsive web products: add `premium-responsive-viewport`
- Light B2B/CRM/CS products: use `premium-multi-corner-gradient` for intro, network-intro, CTA
- Real photo + product screenshot uploaded: `premium-real-photo-device` for social proof (strongest trust-builder)
- Feedback/VoC/NPS products: `premium-feedback-storm` for social proof
- CTA: always `premium-cta-scene`; light brand without tagline → "Simple Logo + Wide Button + URL" variant
- Never repeat the same skill in two scenes

---

## 11. GENERATION SYSTEM PROMPT RULES

### 11.1 Mandatory Rules (violations flagged by audit)
1. **All headlines**: `<MaskedReveal>` — VIOLATION if headline uses opacity fade
2. **3+ siblings**: `useStagger(index, baseFrame, delay)` — VIOLATION if all enter at same frame
3. **All colors**: `BRAND.*` tokens — NEVER hardcode hex
4. **All springs**: `SPRING_CONFIGS.*`
5. **Background**: `BRAND.bg` on root AbsoluteFill (`postProcessCode()` auto-enforces)
6. **SNAP rule**: `SPRING_CONFIGS.snap` for 1–2 hero elements in CONFIDENCE/URGENCY/AHA/RELIEF scenes
7. **WET HEADLINE (RELIEF/AHA/CONFIDENCE/EXCITEMENT)**: GlowBloom + SheenOverlay + SPRING_CONFIGS.snap scaling 0.92→1
8. **Cursor scenes**: SfxSequencer + CursorAnnotationPill during travel phases
9. **Voiceover scenes**: `<Audio src={VOICEOVER_AUDIO_URL} />` — NO additional background music
10. **Particles/orbs**: declare arrays OUTSIDE component — NEVER inside (causes flicker per-frame)
11. **`Math.random()`**: NEVER use — always `random("stable-seed")`
12. **Layout**: implement `layoutTopology` from scene plan exactly (split-left/split-right/center-focus/isometric-float/full-bleed-overlay); never present UI flat; no two consecutive scenes same topology

### 11.2 Z-Index Architecture
| Layer | Z-index | Examples |
|---|---|---|
| Background | 0 | LightArcBg, AmbientEnvironment orbs |
| Entropy dust | 1 | EntropyDust, _AMBIENT_DUST |
| Product UI | 10–50 | AppShell, TiltWrapper card |
| Modal backdrop | 50 | ModalOverlay backdrop filter |
| Cognitive masking | 90–95 | SpotlightCutout (90), GhostHighlight (95) |
| Narrative / Annotations | 100–160 | Cursor (100+), CursorAnnotationPill (160) |
| Master overlays | 200 | SectionLabelLayer |
| FilmGrain | 9999 | Master FilmGrainLayer |

### 11.3 Typography Scale
| Role | Size | Weight |
|---|---|---|
| hero | 128–160px | 900 |
| scene title | 80–108px | 800–900 |
| section | 40–56px | 700 |
| body | 22–32px | 400–500 |
| badge | 14–18px | 500–600 |

`fontSize < 72px` for main headline = VIOLATION.

### 11.4 Glass Card Formula (WhatAStory High-Depth)
```css
background:     rgba(255,255,255,0.08)
backdropFilter: blur(24px) saturate(150%)
WebkitBackdropFilter: blur(24px) saturate(150%)  /* auto-added by postProcessCode */
borderTop:    1px solid rgba(255,255,255,1.0)
borderLeft:   1px solid rgba(255,255,255,0.15)
borderRight:  1px solid rgba(255,255,255,0.06)
borderBottom: 1px solid rgba(255,255,255,0.04)
borderRadius: 20px
boxShadow:    0 12px 40px rgba(0,0,0,0.45), 0 1px 1px rgba(255,255,255,0.18) inset
```

### 11.5 Light Theme Rules
When `BRAND.style === "light"`:
1. Always start with `<LightArcBg brand={BRAND} />` as first child of AbsoluteFill
2. White cards (`background: "white"`) — NOT glass cards
3. Dark text on cards always (`#0f172a` — NOT `BRAND.text` which may be white)
4. No glow orbs — use clean drop shadows only

### 11.6 Scene Prompt Requirements (plan/route.ts mandatory checklist)
Each scene prompt must include ALL of:
1. **EMOTIONAL INTENT** — one word + visual grammar
2. **Scene act timing** — explicit frame allocations: "Act 1 (0–50f): ... Act 2 ... Act 3 (hold)"
3. **On-screen narrative text** — EXACT headline + subline text verbatim
4. **Visual composition** — "text left (40%), visual right (60%)" for showcase (MANDATORY: flex 40/60 + `rotateY(-12deg) rotateX(4deg)`) or "centered full-screen"
5. **Animation choreography** — what enters first, in what order, at what frames
6. **Background note** — which skill is active
7. If device scene: "display ATTACHED_IMAGES inside ContentCard"
8. If light-themed: "Use LightArcBg variant='grid'"
9. If showcase/cursor: "Add PersistentSectionLabel with featureName"
10. If AHA MOMENT: "slow animation, hold 40+ frames minimum"

---

## 12. FILE STRUCTURE

```
src/
  app/
    api/
      plan/route.ts         — Narrative planning (brand+desc combined, UI schemas inline)
      generate/route.ts     — Scene code generation (tiered prompts, streaming SSE)
      flow-analyze/route.ts — Flow analysis (smart recording detection, key frame dedup)
      vision/route.ts       — UI element detection
      audit/route.ts        — Quality audit (AHA scenes only)
      tts/route.ts          — ElevenLabs TTS
      ui-decompose/route.ts — Standalone UI decomposition
      align/route.ts        — Audio alignment utility
      critique/route.ts     — Legacy quality critique
    generate/page.tsx       — Main video generation UI (@mention scene targeting)
    page.tsx                — Landing page
    layout.tsx              — Root layout
  components/
    AnimationPlayer/        — Remotion Player wrapper
    ChatSidebar/            — Chat input with edit mode (@mention support)
    LandingPageInput.tsx    — Initial prompt + image upload form
    ScenePlanEditor/        — Scene plan review + waypoint editing
      CursorWaypointEditor.tsx — Drag-and-drop waypoint placement
      ScreenshotFlowEditor.tsx — Flow analysis review UI
    SceneTimeline/          — Scene timeline display
  hooks/
    useFullVideoGeneration.ts — Main generation orchestrator
    useImageAttachments.ts    — Image upload state management
  remotion/
    compiler.ts             — In-browser Babel compiler + full scope catalog
    DynamicComp.tsx         — Remotion root component
  skills/
    index.ts                — Skill registry + SKILL_DETECTION_PROMPT
    *.md                    — 70+ skill guidance files
  lib/
    alignScenes.ts          — Audio/scene duration alignment
    cropZone.ts             — Image crop utilities
    extractVideoFrames.ts   — Video frame extraction
  types/
    generation.ts           — All TypeScript interfaces
templates/                  — Reference templates (desklog, fronter, justcall, pretaa, viable)
scripts/
  download-audio.sh         — Downloads SFX + music for local development
skill_info.md               — All 70+ skills verbatim concatenated (17,882 lines, v3 — for Gemini skill upgrade prompts)
GEMINI_SKILL_UPGRADE_PROMPT.md — Prompt template for future Gemini-driven skill polish rounds
```

---

## 13. KNOWN ISSUES / TECHNICAL DEBT

| Issue | Location | Details |
|---|---|---|
| ~~TRAVEL mismatch~~ | ~~`buildInteractionScript()`~~ | ~~Hardcoded at 25f vs skill doc 22f~~ — **FIXED** (TRAVEL=22, initial anchor y:1.10) |
| ~~Image removal → plan not updated~~ | ~~`useImageAttachments.removeImage()`~~ | ~~Removing image at index N doesn't update scenes~~ — **FIXED** (global image strip with X buttons + handleImageRemove) |
| ~~Vision fires for non-cursor skills~~ | ~~`processScene()`~~ | ~~fires for `premium-saas-showcase`~~ — **FIXED** (removed from VISION_SKILLS set) |
| Brand cache hash collisions | `cachedBrandStore` | Hash is only first 100 chars of first image — collisions possible |
