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

export interface ScreenFlow {
  screens: { index: number; description: string }[];
  transitions: ScreenTransition[];
}

/** A single cursor waypoint — normalized coordinates (0–1) within the video frame. */
export interface CursorWaypoint {
  label: string;
  x: number;
  y: number;
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
}

export interface ScenePlan {
  id: number;
  title: string;
  prompt: string;
  skill: string;
  durationInFrames: number;
  /** Which uploaded image (0-based index) is primarily used in this scene. Undefined = use all images. */
  imageIndex?: number;
  /** User-confirmed cursor waypoints for premium-cursor-engine scenes. Overrides AI-detected elements. */
  cursorWaypoints?: CursorWaypoint[];
  /** User journey flow context carried on scenes (primarily used on scene 0 for planner reference). */
  screenFlow?: ScreenFlow;
  /** Timed interaction script: maps video actions → Remotion frame numbers. Used by chameleon-ui scenes. */
  interactionScript?: InteractionEvent[];
  /** AI-written narration script for this scene (15–25 words). Shown in plan editor, editable by user. */
  voiceoverText?: string;
  /** Pre-generated ElevenLabs audio as a base64 data URI. Injected as VOICEOVER_AUDIO_URL in compiler scope. */
  voiceoverAudioUrl?: string;
  /** Word-level timestamps synced from TTS. Injected as WORD_TIMINGS in compiler scope for useAudioSync(). */
  wordTimings?: { word: string; startFrame: number; endFrame: number }[];
  /** Cinematic transition into this scene from the previous one. */
  transition?: "fade" | "slide" | "scale" | "flash" | "none";
  /** Vision-extracted structural UI schema for reconstructed UI scenes */
  uiSchema?: UISchema;
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
}

export interface FullVideoPlan {
  scenes: ScenePlan[];
  brand?: BrandTokens;
  screenFlow?: ScreenFlow;
  /** Global background skill applied across all scenes for visual continuity */
  bgSkill?: string;
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
