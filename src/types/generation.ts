export const MODELS = [
  // ── Free tier (confirmed) ──────────────────────────────────────────────
  { id: "gemini-2.5-flash:none", name: "Gemini 2.5 Flash — Free (Fast)" },
  { id: "gemini-2.5-pro:none",   name: "Gemini 2.5 Pro — Free" },
  { id: "gemini-2.5-pro:low",    name: "Gemini 2.5 Pro — Free (Think: Low)" },
  { id: "gemini-2.5-pro:medium", name: "Gemini 2.5 Pro — Free (Think: Medium)" },
  { id: "gemini-2.5-pro:high",   name: "Gemini 2.5 Pro — Free (Think: High)" },
  // ── Paid / billing required ────────────────────────────────────────────
  { id: "gemini-3-flash-preview:none",   name: "Gemini 3 Flash — Paid (Preview)" },
  { id: "gemini-3.1-pro-preview:none",   name: "Gemini 3.1 Pro — Paid (Preview)" },
  { id: "gemini-3.1-pro-preview:low",    name: "Gemini 3.1 Pro — Paid (Think: Low)" },
  { id: "gemini-3.1-pro-preview:high",   name: "Gemini 3.1 Pro — Paid (Think: High)" },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export type StreamPhase = "idle" | "reasoning" | "generating";

export type GenerationErrorType = "validation" | "api";

export interface ScenePlan {
  id: number;
  title: string;
  prompt: string;
  skill: string;
  durationInFrames: number;
  /** Which uploaded image (0-based index) is primarily used in this scene. Undefined = use all images. */
  imageIndex?: number;
}

/**
 * Full brand design system extracted from product description + uploaded screenshots.
 * All fields are mandatory — the generation layer enforces them in every scene.
 */
export interface BrandTokens {
  [key: string]: string;
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
}

export interface FullVideoPlan {
  scenes: ScenePlan[];
  brand?: BrandTokens;
}
