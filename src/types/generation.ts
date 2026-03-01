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
}

export interface BrandTokens {
  primary: string;
  secondary: string;
  bg: string;
  font: string;
  accentName: string;
}

export interface FullVideoPlan {
  scenes: ScenePlan[];
  brand?: BrandTokens;
}
