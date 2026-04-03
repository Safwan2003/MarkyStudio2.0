export const MODELS = [
  // ── Free tier (confirmed) ──────────────────────────────────────────────
  { id: "gemini-2.5-flash:none", name: "Gemini 2.5 Flash — Free (Fast)" },
  { id: "gemini-2.5-pro:none", name: "Gemini 2.5 Pro — Free" },
  { id: "gemini-2.5-pro:low", name: "Gemini 2.5 Pro — Free (Think: Low)" },
  { id: "gemini-2.5-pro:medium", name: "Gemini 2.5 Pro — Free (Think: Medium)" },
  { id: "gemini-2.5-pro:high", name: "Gemini 2.5 Pro — Free (Think: High)" },
  // ── Paid / billing required ────────────────────────────────────────────
  { id: "gemini-3-flash-preview:none", name: "Gemini 3 Flash — Paid (Preview)" },
  { id: "gemini-3.1-pro-preview:none", name: "Gemini 3.1 Pro — Paid (Preview)" },
  { id: "gemini-3.1-pro-preview:low", name: "Gemini 3.1 Pro — Paid (Think: Low)" },
  { id: "gemini-3.1-pro-preview:high", name: "Gemini 3.1 Pro — Paid (Think: High)" },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export type StreamPhase = "idle" | "reasoning" | "generating";

export type GenerationErrorType = "validation" | "api";

/** The interaction performed at this waypoint. */
export type WaypointAction = "click" | "hover" | "double-click" | "scroll" | "none";

export type TransitionType = "search" | "click" | "scroll" | "navigate" | "submit" | "hover";

export type JourneyStepKind =
  | "discover"
  | "explore"
  | "input"
  | "filter"
  | "navigate"
  | "review"
  | "result"
  | "confirm"
  | "proof"
  | "cta";

export interface ScreenTransition {
  from: number;
  to: number;
  /** Human-readable label, e.g. "types 'BMW' and presses search" */
  action: string;
  type: TransitionType;
  /** Short name of the interacted element: "Search Bar", "Submit Button" */
  targetLabel?: string;
  /** UI component kind — drives which Chameleon component to render */
  elementType?: "input" | "button" | "dropdown" | "card" | "nav";
  /**
   * Normalized 0–1 bounding box of the element on the source screen.
   * Stored as 0–1 after normalization from the 0–1000 precision scale used during extraction.
   * x/y = top-left corner, w/h = dimensions (all 0–1 fractions of image width/height).
   */
  box?: { x: number; y: number; w: number; h: number };
  /** Visual style extracted for Chameleon overlay camouflage */
  style?: { bgColor: string; borderRadius: number };
}

export interface JourneyContext {
  /** Narrative function of this scene in the user journey. */
  kind: JourneyStepKind;
  /** What the viewer/user is trying to accomplish in this moment. */
  narrativeTask: string;
  /** Which screen this scene is primarily anchored to. */
  sourceScreenIndex?: number;
  /** Which screen the story leads toward next. */
  targetScreenIndex?: number;
  /** Human-readable description of the current screen. */
  sourceScreenDescription?: string;
  /** Human-readable description of the next/result screen. */
  targetScreenDescription?: string;
  /** Concrete next action taken from the source screen. */
  nextAction?: string;
  /** Transition type derived from flow analysis. */
  transitionType?: TransitionType;
  /** UI target label involved in the next action. */
  targetLabel?: string;
  /** UI element type involved in the next action. */
  elementType?: "input" | "button" | "dropdown" | "card" | "nav";
  /** Product/feature area this scene belongs to. */
  featureName?: string;
}

export interface ScreenFlow {
  screens: { index: number; description: string }[];
  transitions: ScreenTransition[];
  /** Visual energy detected by flow-analyze — drives musicStyle + spring stiffness in planner */
  energyLevel?: "high" | "medium" | "calm";
  /** UI element density across screens: 0=sparse, 1=very dense */
  visualComplexity?: number;
  /** Interaction pacing detected from recording */
  uiPace?: "fast" | "slow";
  /** 2-3 sentence description of the overall walkthrough story. */
  narrativeSummary?: string;
  /** Main feature being demonstrated across the flow. */
  productFeature?: string;
}

/** A single cursor waypoint — normalized coordinates (0–1) within the video frame. */
export interface CursorWaypoint {
  label: string;
  x: number;
  y: number;
  /** UI_SCHEMA element ID for automatic coordinate snapping (e.g. "sidebar-item-2", "metric-card-0", "search-bar", "cta-button").
   *  When set, useHumanizedCursor resolves the exact screen position from UI_SCHEMA — x/y are ignored. */
  id?: string;
  /** Interaction performed at this waypoint. Defaults to "click". */
  action?: WaypointAction;
  /** Frames cursor lingers at this waypoint before moving on. Default: 18 (0.6s @ 30fps). */
  dwellFrames?: number;
  /** Normalized bounding box of the element (0–1). Used by chameleon overlays. */
  box?: { x: number; y: number; w: number; h: number };
  /** UI element type — drives which chameleon component to render. */
  elementType?: "input" | "button" | "dropdown" | "card" | "nav";
}

/** A single timed interaction event mapped from video analysis to Remotion frames. */
export interface InteractionEvent {
  /** Remotion frame number when this event fires. */
  frame: number;
  /** Type of interaction. */
  action: "type" | "click" | "hover" | "popup-open" | "popup-close" | "accordion" | "drag" | "panel-slide";
  /** Human-readable element label (e.g. "Search Bar", "Status dropdown"). */
  target: string;
  /** Text to type (for action:"type") or drag destination label (for action:"drag"). */
  value?: string;
  /** Duration in frames (for drag, accordion, popup animations). */
  durationFrames?: number;
  /** UI component kind — tells the LLM which Chameleon component to render */
  elementType?: "input" | "button" | "dropdown" | "card" | "nav";
  /**
   * Normalized 0–1 bounding box of the target element on the scene image.
   * x/y = top-left corner, w/h = dimensions (all 0–1 fractions of image width/height).
   * Extracted at 0–1000 precision scale then normalized — accurate to ±0.001.
   */
  box?: { x: number; y: number; w: number; h: number };
  /** Visual style for chameleon overlay camouflage */
  style?: { bgColor: string; borderRadius: number };
  /** Contextual section header to display above the UI during this step */
  sectionHeader?: {
    text: string;
    subtext?: string;
    icon?: string;
  };
  /** Sound effect to trigger at this event frame */
  sfx?: "click" | "whoosh" | "pop" | "type" | "success" | "swoosh";
  /** Small floating pill label to show next to cursor during this event (ambient annotation) */
  annotation?: string;
  /**
   * Visual effect to apply to the target element during the hover pre-state (before click fires).
   * The LLM uses this to drive useCursorState's isHovering/hoverProgress values.
   * "glow"       — brand-color box-shadow grows 0→20px
   * "focus-ring" — 2px brand-color outline appears
   * "squish"     — element scale 1→0.97 (like being pressed)
   * "tooltip"    — small floating label appears above cursor
   * "brighten"   — filter brightness 1→1.2
   */
  preClickEffect?: "glow" | "focus-ring" | "squish" | "tooltip" | "brighten";
}

export interface SkillComposition {
  primary: string;
  secondary: string[];
  /** Emotional or technical modifiers (e.g. "emotional-tension", "high-depth", "fast-pacing") */
  modifiers: string[];
}

export type NarrativeRole =
  | "problem-tension"
  | "workflow-choreography"
  | "before-after-transformation"
  | "compare-split-screen"
  | "ecosystem-network"
  | "proof-confidence"
  | "product-payoff";

export type MotionLanguage =
  | "constrained-focus"
  | "guided-choreography"
  | "transformational-portal"
  | "measured-proof"
  | "premium-payoff";

export type InteractionStoryMode =
  | "guided-reveal"
  | "transformation-chain"
  | "proof-of-control"
  | "coordinated-automation"
  | "none";

export interface StyleContract {
  typographyEnergy: "editorial-bold" | "clean-product" | "authoritative-minimal";
  depthModel: "immersive" | "layered" | "soft-studio";
  lightingModel: "cool-specular" | "warm-glow" | "neutral-premium";
  spacingDensity: "airy" | "balanced" | "dense";
  cursorPersonality: "confident-precise" | "guided-calm" | "assertive-snappy";
  iconMotion: "subtle-orbit" | "snapped-magnetic" | "quiet-supporting";
  surfaceStyle: "glass-premium" | "soft-shadow" | "matte-clean";
}

export interface ScenePlan {
  id: number;
  title: string;
  prompt: string;
  /** Legacy skills array (ordered by importance) */
  skills: string[];
  /** Structured skill layout for advanced composition. */
  skillComposition?: SkillComposition;
  durationInFrames: number;
  /** Which uploaded image (0-based index) is primarily used in this scene. Undefined = use all images. */
  imageIndex?: number;
  /** Multiple uploaded images (0-based indices) for multi-view walkthrough scenes.
   *  When set, all referenced images are collected into ATTACHED_IMAGES for this scene. */
  imageIndices?: number[];
  /** Persistent feature context header displayed above UI during multi-feature walkthroughs.
   *  Qanapi-style: "KMS for CSE  Google Workspace" bar at top of scene. */
  featureHeader?: { label: string; badge?: string; icon?: string };
  /** User-confirmed cursor waypoints for premium-cursor-engine scenes. Overrides AI-detected elements. */
  cursorWaypoints?: CursorWaypoint[];
  /** Narrative cursor journey: ordered list of what the user is DOING at each waypoint step.
   *  Generated by the planner to tell a coherent story (e.g. "User opens the team dropdown").
   *  These labels override auto-detected element names when vision enriches coordinates. */
  cursorJourney?: string[];
  /** User journey flow context carried on scenes (primarily used on scene 0 for planner reference). */
  screenFlow?: ScreenFlow;
  /** Narrative task context for this specific scene within the product journey. */
  journeyContext?: JourneyContext;
  /** Timed interaction script: maps video actions → Remotion frame numbers. Used by chameleon-ui scenes. */
  interactionScript?: InteractionEvent[];
  /** AI-written narration script for this scene. Word count must match duration × 2.5 words/sec. */
  voiceoverText?: string;
  /** Emotional intent this scene must create in the viewer: FRUSTRATION | RELIEF | CONFIDENCE | TRUST | URGENCY */
  emotionalIntent?: string;
  /** High-level narrative intent — drives director-led skill selection. */
  intent?: "hook" | "problem" | "solution" | "feature" | "proof" | "cta";
  /** Planner-selected narrative beat archetype for stronger progression. */
  narrativeRole?: NarrativeRole;
  /** Planner-selected visual grammar archetype to avoid repetitive scene structures. */
  visualGrammarRole?: NarrativeRole;
  /** Motion policy for this scene; generation should follow this instead of generic defaults. */
  motionLanguage?: MotionLanguage;
  /** Story mode for cursor/UI scenes so interactions feel marketable rather than merely functional. */
  interactionStoryMode?: InteractionStoryMode;
  /** Global art-direction contract repeated onto scenes for prompt simplicity. */
  styleContract?: StyleContract;
  /** 1–2 headline words to render in BRAND.primary accent color — the highest emotional-weight words. */
  highlightWords?: string[];
  /** Max number of skills allowed in `skills[]` for this scene. Default: 2 (director budget). */
  skillBudget?: number;
  /** Motion intensity budget — feature scenes should default to low. */
  motionBudget?: "low" | "medium" | "high";
  /** Director-defined visual state carry-over for continuity (e.g. "App sidebar remains open, camera zoomed into dashboard") */
  visualState?: string;
  /** Agency Design System overrides for this scene. */
  designSystem?: {
    /** Spacing grid (e.g. 8, 12, 16, 24). Default: 16 */
    spacing?: number;
    /** Content safe-zone margin in px. Default: 80 */
    safeZone?: number;
    /** Motion character: snappy (damping:200) | floaty (damping:400) | elastic (damping:8) */
    motionCharacter?: "snappy" | "floaty" | "elastic";
    /** Visual depth style: glass-heavy | glass-light | flat | soft-shadow */
    depthStyle?: "glass-heavy" | "glass-light" | "flat" | "soft-shadow";
  };
  /** Explicit visual hierarchy mapping for the Art Director. */
  hierarchy?: {
    /** The one focal element that must dominate (e.g. "Hero Dashboard", "CTA Button"). */
    primary: string;
    /** Supporting element (e.g. "Sidebar Nav", "Metric Cards"). 60-70% scale. */
    secondary?: string;
    /** Subtle contextual elements. Muted opacity. */
    tertiary?: string;
  };
  /** Visual anchor object that transforms between scenes.
   *  Must persist across scenes to create a "Visual Thread". */
  visualAnchor?: {
    icon: string;      // icon name from ICON_PATHS
    label: string;     // textual label for the anchor
    colorFrom: string; // "broken" color (e.g. #ef4444)
    colorTo: string;   // "resolved" color (e.g. #10b981)
  };
  /** Continuity role — whether this scene continues the same world/shell from previous scene. */
  continuityRole?: "new-world" | "continue-world";
  /** True for the single scene that delivers the core product transformation ("aha moment"). Gets special animation treatment. */
  isAhaMoment?: boolean;
  /** Pre-generated ElevenLabs audio as a base64 data URI. Injected as VOICEOVER_AUDIO_URL in compiler scope. */
  voiceoverAudioUrl?: string;
  /** Word-level timestamps synced from TTS. Injected as WORD_TIMINGS in compiler scope for useAudioSync(). */
  wordTimings?: { word: string; startFrame: number; endFrame: number }[];
  /** Cinematic transition into this scene from the previous one. */
  transition?: "fade" | "slide" | "scale" | "flash" | "none" | "cameraPan" | "zoomThrough";
  /** Normalized 0–1 coordinate the camera zooms INTO as this scene exits.
   * Set this on Scene N when you want the camera to travel through a UI element into Scene N+1.
   * Scene N+1 should have transition: "zoomThrough" to receive the camera arrival.
   * x/y = center of the target element (e.g. a CTA button or feature card). */
  exitAnchor?: { x: number; y: number };
  /** Vision-extracted structural UI schema for reconstructed UI scenes */
  uiSchema?: UISchema;
  /** Stage direction embedded in the prompt for cinematic guidance (camera moves, emotional arc) */
  stageDirection?: string;
  /** Stock video URL for background compositing (Fronter/Viable-style real office footage).
   * When set, STOCK_VIDEO_URL is injected into compiler scope. */
  stockFootage?: string;
  /** Macro zoom configuration for Bordio-style extreme close-ups.
   * When set, the generate layer wraps UI in MacroCamera + SelectiveFocus. */
  macroZoom?: {
    /** Target scale factor (2.0–5.0). Default 3.0 */
    zoomLevel: number;
    /** Normalized 0–1 center of zoom target */
    focusPoint: { x: number; y: number };
    /** Frame when zoom begins (default 30) */
    zoomInFrame?: number;
    /** Frames at max zoom (default 80) */
    holdFrames?: number;
  };
  /** Persistent label shown above browser chrome / section divider for this scene */
  sectionLabel?: string;
  /** Volume multiplier for background music: 0.5 (quiet/pain) to 1.5 (loud/CTA) */
  musicVolume?: number;
  /** Per-scene music mood — derived from emotionalIntent in plan/route.ts normalization pass.
   *  Injected as MUSIC_MOOD into compiler scope so the LLM coder can select
   *  AbstractMotionBg mode, beat density, and SFX flavor accordingly. */
  musicMood?: "tense" | "sparse-somber" | "uplifting-swell" | "energetic-precise" | "warm-ambient" | "driving-pulse" | "euphoric";
  /** True if this scene is part of a persistent-shell app walkthrough sequence */
  isWalkthroughScene?: boolean;
  /** MorphPortal: normalized 0–1 rect of the element that visually exits this scene.
   *  The element is exported so the next scene can morph from it via morphImport. */
  morphExport?: { id: string; rect: { x: number; y: number; w: number; h: number } };
  /** MorphPortal: normalized 0–1 rect where the exported element arrives in THIS scene.
   *  useMorphEntrance(MORPH_FROM, morphImport.rect) springs it into position. */
  morphImport?: { id: string; rect: { x: number; y: number; w: number; h: number } };
}

// ─── Creative Brief interfaces (Phase 0 Creative Director) ────────────────────

export interface EmotionalBeat {
  beatIndex: number;
  intent: "hook" | "problem" | "solution" | "feature" | "proof" | "cta";
  feeling: string;
  pacingWord: "punch" | "breathe" | "accelerate" | "silence" | "release";
  durationBias: "short" | "normal" | "long";
  colorTemperature: "cold" | "neutral" | "warm";
}

export interface VisualGrammar {
  shapeLanguage: "geometric" | "organic" | "data-dense" | "editorial" | "minimal";
  textureStyle: "clean" | "grainy" | "glossy" | "matte" | "neon";
  iconStyle: "outline" | "filled" | "duotone" | "abstract" | "none";
  layoutDensity: "sparse" | "balanced" | "dense";
  motionPersonality: "snappy" | "fluid" | "heavy" | "playful" | "cinematic";
}

export interface SpatialWorld {
  worldDescription: string;
  cameraStartPosition: "wide" | "close" | "overhead" | "eye-level";
  depthStrategy: "flat" | "layered" | "immersive";
  scenePositions: string[];
}

export interface CreativeBrief {
  logline: string;
  emotionalArc: EmotionalBeat[];
  visualGrammar: VisualGrammar;
  spatialWorld: SpatialWorld;
  soundIntention: string;
  typographyHero: boolean;
  estimatedSceneCount: number;
  /** Single sentence describing the core transformation: "From [pain state] → to [gained state]".
   *  Every scene must serve this thesis. The planner validates against it. */
  coreTransformation?: string;
  /** Visual metaphor strategy per emotional phase.
   *  Drives skill selection for hook/problem scenes — forces chaos/pain visuals before UI. */
  visualMetaphor?: {
    hook: string;      // e.g. "scattered tools exploding outward"
    problem: string;   // e.g. "fragmented chaos, disconnected nodes"
    solution: string;  // e.g. "everything snapping into clean order"
  };
}

// ─── Director Agent interfaces (The Backbone) ────────────────────────────────

export interface NarrativeBackboneBeat {
  beatIndex: number;
  intent: "hook" | "problem" | "solution" | "feature" | "proof" | "cta";
  visualMetaphor: string;
  durationFrames: number;
  imageIndex?: number;
  /** Why this scene exists in the narrative arc */
  reasoning: string;
  /** Visual state carry-over for continuity (e.g. "App sidebar remains open, camera zoomed into dashboard") */
  visualState?: string;
}

export interface NarrativeBackbone {
  logline: string;
  coreTransformation: string;
  globalVisualThread: string;
  beats: NarrativeBackboneBeat[];
}

/**
 * Full brand design system extracted from product description + uploaded screenshots.
 * All fields are mandatory — the generation layer enforces them in every scene.
 */
export interface BrandTokens {
  [key: string]: string | undefined;
  /** Main CTA / accent color — buttons, links, active states, glows. Hex: "#6366f1" */
  primary: string;
  /** Supporting accent — secondary buttons, hover states, complementary elements. Hex: "#a78bfa" */
  secondary: string;
  /** Scene / page background. Hex: "#0f0f1a" for dark, "#f8fafc" for light */
  bg: string;
  /** Card / panel surface. Rgba for dark themes: "rgba(255,255,255,0.06)" */
  surface: string;
  /** Primary text color. "#ffffff" for dark, "#0f172a" for light */
  text: string;
  /** Muted / subtitle text. "rgba(255,255,255,0.5)" for dark */
  textMuted: string;
  /** Glass card border. "rgba(255,255,255,0.12)" for dark, "rgba(0,0,0,0.08)" for light */
  border: string;
  /** Font family name: "Inter" */
  font: string;
  /** Single word descriptor: "indigo", "teal", "rose", "emerald" */
  accentName: string;
  /** Overall visual mood — drives glass opacity, orb intensity, contrast */
  style: "dark" | "light" | "neon";
  /** Product / brand name — used as BRAND.name in CTA scenes. E.g. "Acme" */
  name?: string;
  /** Public URL — used as BRAND.url for CTA typewriter animation. E.g. "acme.com" */
  url?: string;
  /** CTA button label — used as BRAND.cta. E.g. "Start Free Trial" */
  cta?: string;
  /** Music mood — drives track selection in premium-audio skill and master music player */
  musicStyle?: string;
  /** Display font for dramatic headlines (e.g. "Playfair Display") */
  displayFont?: string;
  /** Handwriting/annotation font (defaults to 'Caveat') */
  annotationFont?: string;
  /** Company logo URL — injected as BRAND.logo and COMPANY_LOGO scope var for CTA scenes */
  logo?: string;
}

/** Directed edge connecting two scenes in the Flow Engine graph. */
export interface FlowEdge {
  /** Source scene id */
  from: number;
  /** Destination scene id */
  to: number;
  /** Cinematic transition type on this edge */
  transition: "fade" | "slide" | "scale" | "flash" | "none" | "cameraPan" | "zoomThrough";
  /** Which visual/camera states carry over from source to destination */
  carryOver?: {
    /** Cursor position and velocity maintained across the cut */
    cursor?: boolean;
    /** Camera zoom and pan maintained — no reset to 1.0 */
    camera?: boolean;
    /** UI shell (AppShell, sidebar, topbar) stays mounted unchanged */
    ui?: boolean;
  };
  /** Emotional register shift at this edge — guides color/pacing changes */
  emotionalShift?: string;
}

export interface FullVideoPlan {
  scenes: ScenePlan[];
  brand?: BrandTokens;
  screenFlow?: ScreenFlow;
  /** Global background skill applied across all scenes for visual continuity */
  bgSkill?: string;
  /** Global background variant: "arcs" | "grid" | "dots" */
  globalBg?: string;
  /** One-sentence description of the persistent visual motif that threads all scenes */
  globalVisualThread?: string;
  /** Global art-direction contract that must remain consistent across all scenes. */
  styleContract?: StyleContract;
  /** Flow graph edges — describe transitions and state carry-over between scenes */
  edges?: FlowEdge[];
}

// ─── UI Reconstruction Schema ────────────────────────────────────────────────

export interface UISchema {
  layout: {
    type: "sidebar-main" | "topnav-main" | "full-width" | "split";
    sidebar?: {
      position: "left" | "right";
      width: "narrow" | "standard" | "wide";
      items: { label: string; icon: string; isActive: boolean; badge?: number }[];
      appName: string;
    };
    topbar?: {
      items: { label: string; type: "text" | "button" | "tab"; isActive?: boolean }[];
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

export type ContentSection =
  | { type: "metric-cards"; data: MetricCardData[]; gridColumns?: number }
  | { type: "table"; data: TableData; gridColumns?: number }
  | { type: "chart"; data: ChartData; gridColumns?: number }
  | { type: "form"; data: FormData; gridColumns?: number }
  | { type: "card-grid"; data: CardItem[]; gridColumns?: number }
  | { type: "list"; data: ListItem[]; gridColumns?: number }
  | { type: "detail-panel"; data: Record<string, string>; gridColumns?: number }
  | { type: "hero-header"; data: { title: string; subtitle?: string }; gridColumns?: number };

export interface MetricCardData {
  label: string;
  value: string;
  numericValue: number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export interface TableData {
  columns: { label: string; width: "narrow" | "medium" | "wide" }[];
  rows: { cells: string[]; isHighlighted?: boolean }[];
}

export interface ChartData {
  type: "line" | "bar" | "donut" | "area";
  title?: string;
  dataPoints: number[];
  labels?: string[];
  color: string;
  secondaryColor?: string;
}

export interface FormData {
  title: string;
  fields: {
    label: string;
    type: "text" | "dropdown" | "checkbox" | "textarea" | "date";
    placeholder?: string;
    value?: string;
    options?: string[];
  }[];
  submitLabel: string;
}

export interface CardItem {
  title: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface ListItem {
  label: string;
  status?: string;
  icon?: string;
  value?: string;
}
