"use client";

import {
  extractComponentCode,
  stripMarkdownFences,
} from "@/helpers/sanitize-response";
import { compileCode, extractComponentBody, EntropyDust } from "@/remotion/compiler";
import { alignSceneDurations } from "@/lib/alignScenes";
import type { BrandTokens, CursorWaypoint, ModelId, ScenePlan, ScreenFlow } from "@/types/generation";
import React, { useCallback, useRef, useState } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";

export interface CompiledScene {
  Component: React.ComponentType;
  durationInFrames: number;
  code: string;
  title: string;
  prompt: string;
  skills: string[];
  imageIndex?: number;
  cursorWaypoints?: CursorWaypoint[];
  transition?: "fade" | "slide" | "scale" | "flash" | "none" | "cameraPan" | "zoomThrough";
  exitAnchor?: { x: number; y: number };
  morphExport?: { id: string; rect: { x: number; y: number; w: number; h: number } };
  auditScore?: number;
  hasVoiceover?: boolean;
  isAhaMoment?: boolean;
  emotionalIntent?: string;
  musicVolume?: number;
  voiceoverAudioUrl?: string | null;
  wordTimings?: { word: string; startFrame: number; endFrame: number }[];
  creativeBrief?: import("@/types/generation").CreativeBrief | null;
  backbone?: import("@/types/generation").NarrativeBackbone | null;
  uiSchema?: Record<string, unknown> | null;
  highlightWords?: string[];
  visualState?: string | null;
  visualAnchor?: { icon?: string; label?: string; colorFrom?: string; colorTo?: string } | null;
  featureHeader?: { label: string; badge?: string; icon?: string } | null;
  stockFootage?: string | null;
  musicMood?: string;
  skillComposition?: { primary: string; secondary?: string[]; modifiers?: string[] } | null;
  pipelineCursorSteps?: Array<{ x: number; y: number; time: number; label?: string; box?: object }>;
}

// Module-level LRU cache — max 30 entries, evicts least-recently-used to prevent memory leaks
class LRUCache<K, V> {
  private readonly max: number;
  private readonly map = new Map<K, V>();
  constructor(max: number) { this.max = max; }
  has(key: K): boolean { return this.map.has(key); }
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }
  set(key: K, val: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value!);
    this.map.set(key, val);
  }
}
const sceneCache = new LRUCache<string, CompiledScene>(30);

// Task 0.4: Module-level brand cache — avoids re-running brand extraction on re-generation
let cachedBrandStore: { imageHash: string; brand: BrandTokens } | null = null;

/** Build a collision-resistant hash from a base64 image string.
 *  Samples start + middle + end chunks so two images of equal length
 *  but different content still produce different hashes.
 */
function buildImageHash(base64: string): string {
  const len = base64.length;
  const start = base64.slice(0, 50);
  const mid = len > 100 ? base64.slice(Math.floor(len / 2) - 25, Math.floor(len / 2) + 25) : "";
  const end = len > 50 ? base64.slice(-50) : "";
  return `${len}:${start}|${mid}|${end}`;
}

/** Deterministic pacing profile — adjusts scene durations post-plan for rhythm variety.
 *  Rules:
 *  - FRUSTRATION/PAIN scenes: clamp to ≤180f (urgency — don't drag the pain)
 *  - RELIEF/AHA scenes: boost by +15% clamped to ≤330f (let the payoff breathe)
 *  - Consecutive same-duration scenes: alternate ±10% to break monotony
 *  - CTA scenes: clamp to ≤240f (concise — user already convinced)
 */
function applyPacingProfile(scenes: ScenePlan[]): ScenePlan[] {
  return scenes.map((scene, i) => {
    let dur = scene.durationInFrames;
    const intent = (scene.emotionalIntent ?? "").toUpperCase();
    const isCta = (scene.title ?? "").toLowerCase().includes("cta") || intent === "URGENCY";

    if (intent === "FRUSTRATION" || intent === "PAIN") {
      dur = Math.min(dur, 180);
    } else if (scene.isAhaMoment || intent === "RELIEF") {
      dur = Math.min(Math.round(dur * 1.15), 330);
    } else if (isCta) {
      dur = Math.min(dur, 240);
    }

    // Break monotony: alternate ±10% if adjacent scenes have same duration
    const prevDur = scenes[i - 1]?.durationInFrames;
    const nextDur = scenes[i + 1]?.durationInFrames;
    if (prevDur === dur && nextDur === dur) {
      dur = i % 2 === 0 ? Math.round(dur * 0.91) : Math.round(dur * 1.09);
    }

    // Clamp to valid range [60, 360] and align to 30f boundary
    dur = Math.max(60, Math.min(360, Math.round(dur / 30) * 30));
    return dur !== scene.durationInFrames ? { ...scene, durationInFrames: dur } : scene;
  });
}

/**
 * enforceNarrativeContract
 *
 * Validates and auto-repairs the scene plan to ensure it meets the minimum
 * narrative structure required for a WhatAStory-quality video.
 * Non-destructive: only adds/corrects, never removes scenes.
 */
function enforceNarrativeContract(scenes: ScenePlan[]): ScenePlan[] {
  let result = [...scenes];

  // Rule 1: Must have at least one AHA/RELIEF moment
  const hasAha = result.some(
    (s) => s.isAhaMoment || s.emotionalIntent === "RELIEF" || s.intent === "solution"
  );
  if (!hasAha && result.length > 0) {
    // Auto-promote the last non-CTA scene to AHA
    const lastNonCta = [...result].reverse().find((s) => s.intent !== "cta");
    if (lastNonCta) {
      result = result.map((s) =>
        s.id === lastNonCta.id
          ? { ...s, isAhaMoment: true, emotionalIntent: "RELIEF" as const }
          : s
      );
      console.warn("[NarrativeContract] No AHA moment found — auto-promoted scene:", lastNonCta.id);
    }
  }

  // Rule 2: Must have a hook/problem scene early (within first 2 scenes)
  const earlyProblem = result.slice(0, 2).some(
    (s) => s.intent === "hook" || s.intent === "problem" || s.emotionalIntent === "FRUSTRATION" || s.emotionalIntent === "PAIN"
  );
  if (!earlyProblem && result.length > 1) {
    // Force scene 1 (index 0) to have problem framing if it doesn't already
    result = result.map((s, i) =>
      i === 0 && s.intent !== "hook"
        ? { ...s, intent: "hook" as const }
        : s
    );
    console.warn("[NarrativeContract] No early problem/hook — scene 0 forced to hook intent.");
  }

  // Rule 3: CTA must be last
  const ctaIndex = result.findIndex((s) => s.intent === "cta");
  if (ctaIndex !== -1 && ctaIndex !== result.length - 1) {
    const ctaScene = result.splice(ctaIndex, 1)[0];
    result.push(ctaScene);
    console.warn("[NarrativeContract] CTA was not last — moved to end.");
  }

  // Rule 4: No two consecutive scenes with same primary skill (advisory only)
  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1];
    const curr = result[i];
    if (
      prev.skillComposition?.primary &&
      curr.skillComposition?.primary &&
      prev.skillComposition.primary === curr.skillComposition.primary
    ) {
      console.warn(
        `[NarrativeContract] Consecutive scenes ${i - 1} and ${i} share primary skill "${curr.skillComposition.primary}" — consider diversifying.`
      );
    }
  }

  return result;
}

/** Post-generation rhythm profile enforcement — adjusts CompiledScene durations for pacing.
 *  Runs AFTER generation (on CompiledScene[]), complementing applyPacingProfile which runs before.
 *  Rules:
 *  - CTA/urgency scenes: clamp to ≤150f (punchy, don't drag)
 *  - AHA moment: minimum 210f (let the payoff breathe)
 *  - Frustration scenes: max 180f (keep the pain urgent)
 *  - No 3 consecutive same-duration scenes (break monotony)
 *  - Snap to 30f boundaries, clamp to [90, 360]
 */
function enforceRhythmProfile(scenes: CompiledScene[]): CompiledScene[] {
  return scenes.map((scene, i) => {
    const intentL = (scene.emotionalIntent ?? "").toLowerCase();
    let dur = scene.durationInFrames;

    // CTA scenes must be punchy — never drag
    if ((intentL === "urgency" || scene.title?.toLowerCase().includes("cta")) && dur > 180) {
      console.log(`[rhythm] CTA scene "${scene.title}" clamped ${dur}→150f`);
      dur = 150;
    }

    // AHA moment must breathe — minimum 210 frames
    if (scene.isAhaMoment && dur < 210) {
      console.log(`[rhythm] AHA scene "${scene.title}" extended ${dur}→210f`);
      dur = 210;
    }

    // Problem/frustration scenes stay urgent — max 180f
    if (intentL === "frustration" && dur > 180) {
      console.log(`[rhythm] Problem scene "${scene.title}" clamped ${dur}→180f`);
      dur = 180;
    }

    // Break monotony: no 3 consecutive scenes with same duration
    if (i >= 2) {
      const prev1 = scenes[i - 1]?.durationInFrames;
      const prev2 = scenes[i - 2]?.durationInFrames;
      if (dur === prev1 && dur === prev2) {
        const adjusted = i % 2 === 0 ? Math.round(dur * 0.9) : Math.round(dur * 1.1);
        console.log(`[rhythm] Breaking monotony at scene "${scene.title}": ${dur}→${adjusted}f`);
        dur = adjusted;
      }
    }

    // Snap to 30-frame boundaries and clamp
    dur = Math.max(90, Math.min(360, Math.round(dur / 30) * 30));
    return dur !== scene.durationInFrames ? { ...scene, durationInFrames: dur } : scene;
  });
}

/** Fast non-crypto hash (djb2) — collision-resistant for prompt strings up to any length. */
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function cacheKey(scene: ScenePlan, brand: BrandTokens): string {
  const emotion = scene.emotionalIntent ?? "";
  const aha = scene.isAhaMoment ? "aha" : "";
  const wpts = scene.cursorWaypoints?.map((w) => `${w.x.toFixed(2)},${w.y.toFixed(2)}`).join("|") ?? "";
  // Hash the full prompt — avoids collisions from prompt.slice(0,60) on similar scene descriptions
  const promptHash = hashStr(scene.prompt);
  const voHash = hashStr(scene.voiceoverText ?? "");
  return `${scene.skills.join(",")}::${brand.primary}::${scene.imageIndex ?? -1}::${scene.durationInFrames}::${promptHash}::${voHash}::${emotion}::${aha}::${wpts}`;
}

const TRANSITION_FRAMES = 20;
const HOLD_FRAMES = 24; // ~0.8s hold after animations complete before transition begins

// ---------------------------------------------------------------------------
// SceneErrorBoundary — catches ReferenceErrors from LLM-generated code
// (e.g. undefined variables like "BadgeCoin is not defined") that occur
// during React's render phase and cannot be caught with try/catch.
//
// On failure, renders a high-quality branded fallback scene so the video
// still looks coherent rather than showing a debug error screen.
// ---------------------------------------------------------------------------
class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode; sceneName?: string; brand?: Partial<BrandTokens> | null },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode; sceneName?: string; brand?: Partial<BrandTokens> | null }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message ?? String(error) };
  }

  render() {
    if (this.state.hasError) {
      const { brand, sceneName } = this.props;
      const isLight = brand?.style === "light";
      // For light brands use a slightly off-white so the fallback is visually distinct from blank.
      const bg = isLight ? "#f0f2f5" : (brand?.bg ?? "#0f0f1a");
      const primary = brand?.primary ?? "#6366f1";
      const text = isLight ? "#1a1a2e" : (brand?.text ?? "#ffffff");
      const font = brand?.font ?? "Inter, sans-serif";

      // Gradient overlay — stronger opacity so it's visible on light backgrounds
      const gradientOverlay = `radial-gradient(ellipse at 30% 40%, ${primary}33 0%, transparent 60%),
        radial-gradient(ellipse at 75% 70%, ${primary}22 0%, transparent 55%)`;

      return React.createElement("div", {
        style: {
          position: "absolute", inset: 0,
          background: bg,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        },
      },
        // Gradient atmosphere
        React.createElement("div", {
          style: { position: "absolute", inset: 0, background: gradientOverlay, pointerEvents: "none" },
        }),
        // Accent line at top
        React.createElement("div", {
          style: {
            position: "absolute", top: 0, left: "10%", right: "10%", height: 2,
            background: `linear-gradient(90deg, transparent, ${primary}, transparent)`,
            opacity: 0.8,
          },
        }),
        // Scene title (if available)
        sceneName ? React.createElement("div", {
          style: {
            color: text, fontFamily: font, fontSize: 48, fontWeight: 700,
            letterSpacing: "-0.02em", textAlign: "center", maxWidth: "70%",
            lineHeight: 1.2,
            position: "relative", zIndex: 1,
          },
        }, sceneName) : null,
        // Brand accent dot
        React.createElement("div", {
          style: {
            width: 8, height: 8, borderRadius: "50%",
            background: primary, marginTop: 24,
            boxShadow: `0 0 20px ${primary}88`,
            position: "relative", zIndex: 1,
          },
        }),
        // Visible error hint so dev knows what failed
        React.createElement("div", {
          style: {
            position: "absolute", bottom: 12, right: 16,
            color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.35)",
            fontSize: 10, fontFamily: "monospace",
            maxWidth: 300, textAlign: "right",
          },
        }, this.state.errorMessage.slice(0, 80)),
      );
    }
    return this.props.children;
  }
}

// Fallback silence — used when ElevenLabs music is unavailable
const MUSIC_TRACKS: Record<string, string> = {
  corporate:  "",
  energetic:  "",
  cinematic:  "",
  calm:       "",
  playful:    "",
};

type TransitionType = "fade" | "slide" | "scale" | "flash" | "none" | "cameraPan" | "zoomThrough";

// ---------------------------------------------------------------------------
// withTransition — wraps a scene component with entrance + exit motion
//
// enterType: how THIS scene enters (from the scene plan's `transition` field)
// exitType:  how THIS scene exits (from the NEXT scene's `transition` field)
//
// cameraPan: scene enters from full-width right, exits to full-width left.
//   Creates the WhatAStory "infinite canvas" feel — the camera pans laterally
//   across a larger world rather than cross-dissolving between isolated slides.
//   Motion blur is applied during the pan via a horizontal CSS blur filter.
// ---------------------------------------------------------------------------

function withTransition(
  SceneComp: React.ComponentType,
  duration: number,
  isFirst: boolean,
  isLast: boolean,
  enterType: TransitionType = "fade",
  exitType: TransitionType = "fade",
  exitAnchor?: { x: number; y: number },
  sceneTitle?: string,
  brand?: Partial<BrandTokens> | null,
): React.ComponentType {
  const fadeIn  = isFirst ? 8 : TRANSITION_FRAMES;
  const fadeOut = isLast  ? 8 : TRANSITION_FRAMES;

  return function TransitionScene() {
    const frame = useCurrentFrame();
    const { width } = useVideoConfig();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    // ── Determine if we're in the exit window ──────────────────────────────
    const inExit = !isLast && frame >= duration + HOLD_FRAMES - fadeOut;
    const exitProgress = inExit
      ? Math.min(1, Math.max(0, (frame - (duration + HOLD_FRAMES - fadeOut)) / fadeOut))
      : 0;

    // ── Opacity (used by all non-cameraPan/zoomThrough transitions) ────────
    // Guard: ensure fadeIn doesn't exceed the fade-out start (short scenes)
    const fadeOutStart = Math.max(fadeIn + 1, duration + HOLD_FRAMES - fadeOut);
    let opacity = interpolate(
      frame,
      [0, fadeIn, fadeOutStart, duration + HOLD_FRAMES],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    // ── Transform (entrance) ───────────────────────────────────────────────
    let transform = "none";
    let filter = "none";
    let transformOrigin = "50% 50%";

    if (enterType === "zoomThrough" && !isFirst) {
      // Arrive from a zoomed-in portal — scale 10→1, eases out from center
      const zoomOutScale = interpolate(frame, [0, fadeIn], [10, 1], {
        extrapolateRight: "clamp",
        easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
      });
      transform = `scale(${zoomOutScale.toFixed(4)})`;
      opacity = 1;
    } else if (enterType === "cameraPan" && !isFirst) {
      // Enter from the right — full off-screen to center
      const slideInX = interpolate(frame, [0, fadeIn], [width, 0], {
        extrapolateRight: "clamp",
        easing: easeOut,
      });
      transform = `translateX(${slideInX}px)`;
      opacity = 1; // pure position pan, no opacity fade on entry
      // Horizontal motion blur — strongest at frame 0, gone by fadeIn
      const blurPx = interpolate(frame, [0, Math.round(fadeIn * 0.6), fadeIn], [18, 6, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      });
      if (blurPx > 0.5) filter = `blur(${blurPx.toFixed(1)}px)`;
    } else if (enterType === "slide" && !isFirst) {
      const slideX = interpolate(frame, [0, fadeIn], [80, 0], {
        extrapolateRight: "clamp", easing: easeOut,
      });
      transform = `translateX(${slideX}px)`;
    } else if (enterType === "scale" && !isFirst) {
      const scale = interpolate(frame, [0, fadeIn], [1.06, 1], {
        extrapolateRight: "clamp", easing: easeOut,
      });
      transform = `scale(${scale})`;
    }

    // ── Transform (exit) — overrides entrance transform in exit window ─────
    if (inExit) {
      if (exitType === "zoomThrough") {
        // Zoom INTO the exitAnchor — scale explodes 1→10, cubic ease-in (accelerates into portal)
        const zoomScale = interpolate(exitProgress, [0, 1], [1, 10], {
          easing: (t) => t * t * t,
        });
        transform = `scale(${zoomScale.toFixed(4)})`;
        transformOrigin = exitAnchor
          ? `${(exitAnchor.x * 100).toFixed(1)}% ${(exitAnchor.y * 100).toFixed(1)}%`
          : "50% 50%";
        opacity = 1; // pure zoom, no fade
      } else if (exitType === "cameraPan") {
        // Exit to the left — center to full off-screen
        const slideOutX = interpolate(exitProgress, [0, 1], [0, -width], {
          easing: (t) => t * t, // ease-in — accelerates as it leaves
        });
        transform = `translateX(${slideOutX}px)`;
        opacity = 1; // no opacity fade during camera pan exit
        // Motion blur increases as scene accelerates out
        const blurPx = interpolate(exitProgress, [0, 0.4, 1], [0, 6, 18], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        if (blurPx > 0.5) filter = `blur(${blurPx.toFixed(1)}px)`;
      }
      // Other exit types already handled by opacity interpolation above
    }

    // ── Flash overlay ──────────────────────────────────────────────────────
    const flashOpacity = enterType === "flash"
      ? interpolate(frame, [0, 6], [0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : 0;

    const sceneElement = React.createElement(
      SceneErrorBoundary as React.ComponentType<{ sceneName?: string; brand?: Partial<BrandTokens> | null; children?: React.ReactNode }>,
      { sceneName: sceneTitle, brand },
      React.createElement(SceneComp),
    );

    return React.createElement(
      AbsoluteFill,
      { style: { opacity, transform, transformOrigin, filter, willChange: "transform, opacity, filter", overflow: "hidden" } },
      sceneElement,
      flashOpacity > 0
        ? React.createElement("div", {
            style: {
              position: "absolute", inset: 0,
              background: "white",
              opacity: flashOpacity,
              pointerEvents: "none",
              zIndex: 1000,
            },
          })
        : null,
    );
  };
}

function createMasterComponent(
  scenes: CompiledScene[],
  bgColor?: string,
  musicUrl?: string,
  brand?: Partial<BrandTokens> | null,
  sfxUrls: Record<string, string> = {},
): React.ComponentType {
  // Build overlapping sequence offsets for cross-dissolve transitions
  const entries: Array<{ from: number; Component: React.ComponentType; duration: number }> = [];
  let offset = 0;
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const enterType = (s.transition as TransitionType | undefined) ?? "fade";
    // exitType: if THIS scene has exitAnchor, it zooms through on exit.
    // Otherwise fall back to the next scene's enter transition for directional consistency.
    const exitAnchor = s.exitAnchor;
    const exitType: TransitionType = exitAnchor
      ? "zoomThrough"
      : ((scenes[i + 1]?.transition as TransitionType | undefined) ?? "fade");
    const Wrapped = withTransition(s.Component, s.durationInFrames, i === 0, i === scenes.length - 1, enterType, exitType, exitAnchor, s.title, brand);
    entries.push({ from: offset, Component: Wrapped, duration: s.durationInFrames + HOLD_FRAMES });
    // Overlap next scene by TRANSITION_FRAMES for cross-dissolve (except after last).
    // HOLD_FRAMES pads each scene's slot so animations fully settle before the dissolve begins.
    if (i < scenes.length - 1) {
      offset += s.durationInFrames + HOLD_FRAMES - TRANSITION_FRAMES;
    }
  }

  // Build emotionalIntent map: frame range → intent for adaptive grain + vignette
  const sceneIntentMap = entries.map((e, i) => ({
    from: e.from,
    to: e.from + e.duration,
    emotionalIntent: scenes[i]?.emotionalIntent ?? "",
  }));

  // Binary search helper — replaces O(n) .find() called every frame across 3 overlay layers.
  // sceneIntentMap is already sorted ascending by .from (scenes render in order).
  const findSceneAtFrame = (map: typeof sceneIntentMap, frame: number) => {
    let lo = 0, hi = map.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (frame < map[mid].from) hi = mid - 1;
      else if (frame >= map[mid].to) lo = mid + 1;
      else return map[mid];
    }
    return null;
  };

  // Build section label map: frame range → label for persistent feature labels
  const sceneSectionLabelMap = entries.map((e, i) => ({
    from: e.from,
    to: e.from + e.duration,
    label: (scenes[i] as any)?.sectionLabel ?? null,
  })).filter(s => s.label);

  // FilmGrain overlay — opacity and speed adapt to the current scene's emotionalIntent.
  // FRUSTRATION/PAIN → heavier grain (gritty, oppressive)
  // RELIEF/CONFIDENCE → lighter grain (clean, elevated)
  // EXCITEMENT/URGENCY → fast grain shift (kinetic energy)
  // Two slightly different grain SVGs to alternate between frames for organic variation
  const GRAIN_A = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='6' seed='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
  const GRAIN_B = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.87' numOctaves='6' seed='9' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
  const FilmGrainLayer = function FilmGrainLayer() {
    const frame = useCurrentFrame();
    const intent = findSceneAtFrame(sceneIntentMap, frame)?.emotionalIntent ?? "";
    const opacity = intent === "FRUSTRATION" || intent === "PAIN" ? 0.06
      : intent === "RELIEF" || intent === "CONFIDENCE" ? 0.02
      : intent === "EXCITEMENT" || intent === "URGENCY" ? 0.04
      : 0.03;
    const grainSpeed = intent === "EXCITEMENT" || intent === "URGENCY" ? 72 : 37;
    const shift = (frame * grainSpeed) % 100;
    // Alternate between two grain patterns each frame for organic, non-repeating texture
    const bgImage = (frame % 7) < 3 ? GRAIN_A : GRAIN_B;
    return React.createElement("div", {
      style: {
        position: "absolute", inset: 0, zIndex: 9999, pointerEvents: "none",
        opacity,
        backgroundImage: bgImage,
        backgroundSize: "180px 180px",
        backgroundPosition: `${shift}px ${(shift * 0.7).toFixed(0)}px`,
        mixBlendMode: "multiply" as const,
      },
    });
  };

  // SectionLabel — top-left persistent feature label driven by scene.sectionLabel
  // Renders only when a scene has a sectionLabel set, fades in at scene start.
  const SectionLabelLayer = sceneSectionLabelMap.length > 0
    ? function SectionLabelLayer() {
        const frame = useCurrentFrame();
        const active = sceneSectionLabelMap.find(s => frame >= s.from && frame < s.to);
        if (!active) return null;
        const fadeIn = Math.min(1, (frame - active.from) / 12);
        const fadeOut = Math.min(1, (active.to - frame) / 10);
        const opacity = Math.min(fadeIn, fadeOut);
        return React.createElement("div", {
          style: {
            position: "absolute",
            top: 28, left: 36,
            zIndex: 200,
            pointerEvents: "none" as const,
            opacity,
          },
        },
          React.createElement("div", {
            style: {
              fontFamily: brand?.font || "Inter",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase" as const,
              color: brand?.primary || "#6366f1",
              background: brand?.style === "dark" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.7)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderRadius: 6,
              padding: "4px 10px",
              border: `1px solid ${brand?.border || "rgba(255,255,255,0.12)"}`,
            },
          }, active.label),
        );
      }
    : null;

  // Vignette — dark radial border around frame edges.
  // FRUSTRATION/PAIN → strong vignette (moody, claustrophobic)
  // RELIEF → subtle vignette (open, clean)
  const VignetteLayer = function VignetteLayer() {
    const frame = useCurrentFrame();
    // Find current and adjacent scene boundary to interpolate vignette
    const currentEntry = findSceneAtFrame(sceneIntentMap, frame);
    const nextEntry = currentEntry ? sceneIntentMap[sceneIntentMap.indexOf(currentEntry) + 1] ?? null : null;
    const getVigOpacity = (intent: string) =>
      intent === "FRUSTRATION" || intent === "PAIN" ? 0.15 : intent === "RELIEF" ? 0.05 : 0.08;
    const currentOpacity = getVigOpacity(currentEntry?.emotionalIntent ?? "");
    const nextOpacity = nextEntry ? getVigOpacity(nextEntry.emotionalIntent ?? "") : currentOpacity;
    // Crossfade vignette over 12 frames at scene boundary
    const boundaryFrame = nextEntry?.from ?? Infinity;
    const vignetteOpacity = frame >= boundaryFrame - 12 && frame < boundaryFrame
      ? interpolate(frame, [boundaryFrame - 12, boundaryFrame], [currentOpacity, nextOpacity], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : currentOpacity;
    return React.createElement("div", {
      style: {
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
        pointerEvents: "none" as const,
        zIndex: 9998,
      },
    });
  };

  const PersistentWorldLayer = function PersistentWorldLayer() {
    return React.createElement(EntropyDust, {
      brand: brand as any,
      count: 18,
      zIndex: 1
    });
  };

  // Global background layer — renders animated LightArcBg for light-themed videos
  // Replicates the compiler-scope LightArcBg "arcs" variant inline so the master
  // composition has the same animated arc texture as individual scenes.
  const bgColor_ = brand?.bg || "#f8f9fc";
  const primary_ = brand?.primary || "#6366f1";
  const secondary_ = brand?.secondary || "#ec4899";

  // 18 entropy dust particles — stable seed matches compiler.ts ENTROPY_DUST_PARTICLES
  // so particles appear in the same world positions as scene-level dust overlays.
  const WORLD_DUST = Array.from({ length: 18 }, (_, i) => ({
    x: random(`edust-x-${i}`) as number,
    y: random(`edust-y-${i}`) as number,
    size: (random(`edust-s-${i}`) as number) * 3 + 1.5,
    speed: (random(`edust-sp-${i}`) as number) * 0.4 + 0.2,
    phase: (random(`edust-p-${i}`) as number) * Math.PI * 2,
    opacity: (random(`edust-o-${i}`) as number) * 0.04 + 0.015,
  }));

  // PersistentBg — renders ONE background for the ENTIRE video across all scenes.
  // This is the core of WhatAStory's "infinite canvas" feel: the background never
  // changes, so cuts feel like camera moves through one world, not separate slides.
  // Light brands: animated arc SVG overlay on brand.bg
  // Dark brands: subtle animated radial mesh gradient on brand.bg + entropy dust
  const AnimatedArcBg = function PersistentBg() {
    const frame = useCurrentFrame();
    const { width: W, height: H } = useVideoConfig();
    const isLight = brand?.style === "light";

    if (isLight) {
      // Light: animated concentric arc lines from bottom-left origin
      const ARC_COUNT = 8;
      const ORIGIN_X = W * 0.3;
      const ORIGIN_Y = H * 0.6;
      const rotation = frame * 0.05;
      const arcs = Array.from({ length: ARC_COUNT }, (_, i) => ({
        radius: 180 + i * 130,
        opacity: Math.max(0, 0.04 - i * 0.003),
        dashArray: `${55 + i * 18} ${180 + i * 36}`,
        dashOffset: i * 40,
      }));
      return React.createElement("div", {
        style: { position: "absolute", inset: 0, zIndex: 0, background: bgColor_ },
      },
        React.createElement("div", {
          style: {
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse at 0% 100%, ${primary_}12 0%, transparent 50%), radial-gradient(ellipse at 100% 0%, ${secondary_}0e 0%, transparent 45%), radial-gradient(ellipse at 100% 100%, ${primary_}0b 0%, transparent 40%)`,
          },
        }),
        React.createElement("svg", {
          style: { position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" },
        },
          ...arcs.map((arc, i) =>
            React.createElement("circle", {
              key: i,
              cx: ORIGIN_X, cy: ORIGIN_Y, r: arc.radius,
              fill: "none",
              stroke: `rgba(0,0,0,${arc.opacity.toFixed(3)})`,
              strokeWidth: 1,
              strokeDasharray: arc.dashArray,
              strokeDashoffset: arc.dashOffset,
              transform: `rotate(${rotation + i * 5}, ${ORIGIN_X}, ${ORIGIN_Y})`,
            }),
          ),
        ),
      );
    }

    // Dark: slowly drifting radial mesh gradient blobs on brand.bg
    const t = frame * 0.003;
    const g1x = 30 + Math.sin(t) * 18;
    const g1y = 25 + Math.cos(t * 0.7) * 14;
    const g2x = 72 + Math.cos(t * 1.1) * 16;
    const g2y = 65 + Math.sin(t * 0.9) * 18;
    const g3x = 18 + Math.sin(t * 0.8) * 12;
    const g3y = 74 + Math.cos(t * 1.2) * 14;
    return React.createElement("div", {
      style: {
        position: "absolute", inset: 0, zIndex: 0, background: bgColor_,
      },
    },
      React.createElement("div", {
        style: {
          position: "absolute", inset: 0,
          background: [
            `radial-gradient(ellipse at ${g1x}% ${g1y}%, ${primary_}1a 0%, transparent 52%)`,
            `radial-gradient(ellipse at ${g2x}% ${g2y}%, ${secondary_}14 0%, transparent 48%)`,
            `radial-gradient(ellipse at ${g3x}% ${g3y}%, ${primary_}10 0%, transparent 44%)`,
          ].join(", "),
        },
      }),
      // Entropy dust — 18 particles with stable seeds, same positions as scene-level dust
      // Creates the "infinite canvas" feel: dust is always there as the camera pans over it
      ...WORLD_DUST.map((p, i) =>
        React.createElement("div", {
          key: `wdust-${i}`,
          style: {
            position: "absolute",
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: `rgba(255,255,255,${(p.opacity + Math.sin(frame * 0.02 + p.phase) * 0.008).toFixed(4)})`,
            transform: `translateY(${(Math.sin(frame * 0.015 * p.speed + p.phase) * 3).toFixed(2)}px)`,
            willChange: "transform",
            pointerEvents: "none",
            zIndex: 1,
          },
        })
      ),
    );
  };

  // Build per-scene volume automation arrays for smooth music volume transitions
  const hasVoiceover = scenes.some(s => s.hasVoiceover);
  const baseVolume = hasVoiceover ? 0.08 : 0.18;
  const volFrames: number[] = [];
  const volValues: number[] = [];
  {
    const rawFrames: number[] = [];
    const rawValues: number[] = [];
    entries.forEach((e, i) => {
      const sceneVol = (scenes[i]?.musicVolume ?? 1.0) * baseVolume;
      rawFrames.push(e.from, e.from + 15);
      // Duck to 35% of scene target at each scene boundary (gives SFX audio space),
      // then ramp to full scene volume over 15 frames.
      rawValues.push(sceneVol * 0.35, sceneVol);
    });
    // Deduplicate: interpolate requires strictly monotonically increasing frames
    rawFrames.forEach((f, idx) => {
      if (volFrames.length === 0 || f > volFrames[volFrames.length - 1]) {
        volFrames.push(f);
        volValues.push(rawValues[idx]);
      }
    });
  }

  // Phase 5.1: Pre-compute transition SFX elements using ElevenLabs-generated URLs
  const transitionSfxElements = scenes.map((scene, i) => {
    if (i === 0) return null;
    const transFrame = entries[i]?.from ?? 0;
    const transType = scene.transition ?? "fade";
    let sfxUrl: string | null = null;
    if (transType === "cameraPan") sfxUrl = sfxUrls.swoosh ?? null;
    else if (transType === "slide") sfxUrl = sfxUrls.whoosh ?? null;
    else if (transType === "flash") sfxUrl = sfxUrls.pop ?? null;
    if (!sfxUrl) return null;
    return React.createElement(Sequence, { key: `sfx-${i}`, from: transFrame, durationInFrames: 30,
      children: React.createElement(Audio, { src: sfxUrl, volume: 0.25 } as any)
    } as any);
  }).filter(Boolean);

  return function MasterVideo() {
    const frame = useCurrentFrame();
    const musicVol = volFrames.length > 1
      ? interpolate(frame, volFrames, volValues, { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : baseVolume;

    return React.createElement(
      AbsoluteFill,
      null,
      React.createElement(AnimatedArcBg),
      // Background music with per-scene volume automation
      (musicUrl && musicUrl.length > 5)
        ? React.createElement(Audio, {
            src: musicUrl,
            volume: musicVol,
            loop: true,
          } as any)
        : null,
      ...entries.map(({ from, Component: SceneComp, duration }, i) =>
        React.createElement(Sequence, {
          key: i,
          from,
          durationInFrames: duration,
          children: React.createElement(SceneComp),
        }),
      ),
      // Phase 5.1: Transition SFX
      ...transitionSfxElements,
      // Vignette — emotionalIntent-adaptive dark radial border
      React.createElement(VignetteLayer),
      // Phase 5.2: Persistent section label — feature name in top-left corner
      SectionLabelLayer ? React.createElement(SectionLabelLayer) : null,
      // FilmGrain overlay — topmost layer across entire video
      React.createElement(PersistentWorldLayer),
      React.createElement(FilmGrainLayer),
    );
  };
}

/** Build a Lambda-ready code string from compiled scenes.
 * ATTACHED_IMAGES are passed separately via inputProps.images — not embedded in the code —
 * to avoid a variable-shadowing conflict with the compiler's scope parameter of the same name.
 * Now mirrors createMasterComponent: includes AnimatedBg, Vignette, and FilmGrain layers
 * so the Lambda render matches the browser preview.
 */
export function buildMasterCode(
  scenes: CompiledScene[],
  musicUrl?: string | null,
  sfxUrls?: Record<string, string>,
  brand?: BrandTokens,
): string {
  const sceneComponents = scenes
    .map((scene, i) => {
      const body = extractComponentBody(scene.code);
      const scenePrelude = [
        scene.voiceoverAudioUrl
          ? `  const VOICEOVER_AUDIO_URL = typeof VOICEOVER_URLS !== "undefined" ? (VOICEOVER_URLS[${JSON.stringify(String(i))}] ?? null) : null;`
          : "",
        `  const WORD_TIMINGS = ${JSON.stringify(scene.wordTimings ?? [])};`,
        `  const UI_SCHEMA = ${JSON.stringify(scene.uiSchema ?? null)};`,
        `  const HIGHLIGHT_WORDS = ${JSON.stringify(scene.highlightWords ?? [])};`,
        `  const VISUAL_STATE = ${JSON.stringify(scene.visualState ?? null)};`,
        `  const VISUAL_ANCHOR = ${JSON.stringify(scene.visualAnchor ?? null)};`,
        `  const FEATURE_HEADER = ${JSON.stringify(scene.featureHeader ?? null)};`,
        `  const STOCK_VIDEO_URL = ${JSON.stringify(scene.stockFootage ?? null)};`,
        `  const MUSIC_MOOD = ${JSON.stringify(scene.musicMood ?? "energetic-precise")};`,
        `  const SKILL_COMPOSITION = ${JSON.stringify(scene.skillComposition ?? null)};`,
        `  const PIPELINE_CURSOR_STEPS = ${JSON.stringify(scene.pipelineCursorSteps ?? [])};`,
      ].filter(Boolean).join("\n");
      return `const Scene${i} = () => {\n${scenePrelude}\n${body}\n};`;
    })
    .join("\n\n");

  let offset = 0;
  const sfxSequences: string[] = [];
  const sectionLabelMap: Array<{ from: number; to: number; label: string }> = [];
  const sceneFromFrames: number[] = [];
  const sequences = scenes
    .map((scene, i) => {
      const from = offset;
      sceneFromFrames.push(from);
      // Mirror createMasterComponent: each slot = durationInFrames + HOLD_FRAMES
      const seqDuration = scene.durationInFrames + HOLD_FRAMES;
      const label = (scene as any).sectionLabel as string | undefined;
      if (label) sectionLabelMap.push({ from, to: from + seqDuration, label });
      if (i > 0) {
        const transType = scene.transition ?? "fade";
        let sfxUrl: string | null = null;
        if (transType === "cameraPan") sfxUrl = sfxUrls?.swoosh ?? null;
        else if (transType === "slide") sfxUrl = sfxUrls?.whoosh ?? null;
        else if (transType === "flash") sfxUrl = sfxUrls?.pop ?? null;
        if (sfxUrl) {
          sfxSequences.push(`    <Sequence from={${from}} durationInFrames={30}><Audio src={${JSON.stringify(sfxUrl)}} volume={0.25} /></Sequence>`);
        }
      }
      // Advance offset same way createMasterComponent does: +HOLD_FRAMES, -TRANSITION_FRAMES overlap
      if (i < scenes.length - 1) {
        offset += scene.durationInFrames + HOLD_FRAMES - TRANSITION_FRAMES;
      }
      return `    <Sequence from={${from}} durationInFrames={${seqDuration}}><Scene${i} /></Sequence>`;
    })
    .join("\n");

  // Build per-scene volume automation — mirrors createMasterComponent so Lambda render matches preview
  const hasVoiceover = scenes.some(s => s.hasVoiceover);
  const masterBaseVol = hasVoiceover ? 0.08 : 0.18;
  const masterVolFrames: number[] = [];
  const masterVolValues: number[] = [];
  {
    const rawF: number[] = [];
    const rawV: number[] = [];
    sceneFromFrames.forEach((from, i) => {
      const sceneVol = (scenes[i]?.musicVolume ?? 1.0) * masterBaseVol;
      rawF.push(from, from + 15);
      // Duck to 35% at each scene boundary for SFX space.
      rawV.push(sceneVol * 0.35, sceneVol);
    });
    rawF.forEach((f, idx) => {
      if (masterVolFrames.length === 0 || f > masterVolFrames[masterVolFrames.length - 1]) {
        masterVolFrames.push(f);
        masterVolValues.push(rawV[idx]);
      }
    });
  }
  const musicComponentDef = (musicUrl && musicUrl.length > 5)
    ? masterVolFrames.length > 1
      ? `const _MusicComp = () => {
  const _f = useCurrentFrame();
  const _vol = interpolate(_f, ${JSON.stringify(masterVolFrames)}, ${JSON.stringify(masterVolValues)}, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <Audio src={${JSON.stringify(musicUrl)}} volume={_vol} loop />;
};`
      : `const _MusicComp = () => <Audio src={${JSON.stringify(musicUrl)}} volume={${masterBaseVol.toFixed(4)}} loop />;`
    : "";
  const musicJsx = (musicUrl && musicUrl.length > 5) ? `      <_MusicComp />\n` : "";

  const allSequences = [sequences, ...sfxSequences].join("\n");

  // Master layer components inlined as strings — mirrors createMasterComponent layers
  const bgColor = JSON.stringify(brand?.bg ?? "#0f0f1a");
  const brandFont = JSON.stringify(brand?.font ?? "Inter");
  const brandPrimary = JSON.stringify(brand?.primary ?? "#6366f1");
  const brandBorder = JSON.stringify(brand?.border ?? "rgba(255,255,255,0.12)");
  const brandStyleDark = brand?.style !== "light";

  const sectionLabelsComponent = sectionLabelMap.length > 0
    ? `const _SectionLabels = () => {
  const _f = useCurrentFrame();
  const _map = ${JSON.stringify(sectionLabelMap)};
  const _active = _map.find(s => _f >= s.from && _f < s.to);
  if (!_active) return null;
  const _fadeIn = Math.min(1, (_f - _active.from) / 12);
  const _fadeOut = Math.min(1, (_active.to - _f) / 10);
  const _op = Math.min(_fadeIn, _fadeOut);
  return (
    <div style={{ position: "absolute", top: 28, left: 36, zIndex: 200, pointerEvents: "none", opacity: _op }}>
      <div style={{ fontFamily: ${brandFont}, fontSize: 13, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: ${brandPrimary}, background: "${brandStyleDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.7)"}", backdropFilter: "blur(8px)", borderRadius: 6, padding: "4px 10px", border: "1px solid " + ${brandBorder} }}>{_active.label}</div>
    </div>
  );
};`
    : "";

  const masterLayers = `
const _MasterBg = () => (
  <div style={{ position: "absolute", inset: 0, zIndex: 0, background: ${bgColor} }} />
);
const _MasterVignette = () => (
  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.08) 100%)", pointerEvents: "none", zIndex: 9998 }} />
);
const _MasterGrain = () => {
  const _f = useCurrentFrame();
  const _s = (_f * 37) % 100;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 9999, pointerEvents: "none", opacity: 0.025,
      backgroundImage: "url(\\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\\")",
      backgroundSize: "200px 200px", backgroundPosition: _s + "px " + Math.round(_s * 0.7) + "px",
      mixBlendMode: "multiply" }} />
  );
};
${sectionLabelsComponent}`;

  const sectionLabelsJsx = sectionLabelMap.length > 0
    ? "\n      <_SectionLabels />"
    : "";

  return `${sceneComponents}
${masterLayers}
${musicComponentDef}

export const DynamicAnimation = () => {
  return (
    <AbsoluteFill>
      <_MasterBg />
${musicJsx}${allSequences}
      <_MasterVignette />
      <_MasterGrain />${sectionLabelsJsx}
    </AbsoluteFill>
  );
};`;
}

/** Extracts per-scene voiceover URLs as a keyed map for passing to DynamicComp as VOICEOVER_URLS scope var. */
export function buildVoiceoverMap(scenes: CompiledScene[]): Record<string, string> {
  const map: Record<string, string> = {};
  scenes.forEach((scene, i) => {
    if (scene.voiceoverAudioUrl) {
      map[String(i)] = scene.voiceoverAudioUrl;
    }
  });
  return map;
}

function createPlaceholderScene(title: string, reason?: string): React.ComponentType {
  return function PlaceholderScene() {
    return React.createElement(
      AbsoluteFill,
      {
        style: {
          backgroundColor: "#0f0f1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column" as const,
          gap: 10,
          padding: "0 80px",
        },
      },
      React.createElement("div", {
        style: { fontSize: 28, marginBottom: 4 },
      }, "⚠"),
      React.createElement("div", {
        style: {
          fontSize: 16, fontWeight: 600, color: "#666",
          fontFamily: "Inter, sans-serif", textAlign: "center" as const,
        },
      }, title),
      React.createElement("div", {
        style: {
          fontSize: 12, color: "#ef4444",
          fontFamily: "Inter, sans-serif", textAlign: "center" as const,
        },
      }, "Failed to generate — click Regenerate to retry"),
      reason ? React.createElement("div", {
        style: {
          fontSize: 10, color: "#555", fontFamily: "monospace",
          maxWidth: 500, textAlign: "center" as const,
          wordBreak: "break-word" as const, marginTop: 4,
        },
      }, reason.split("\n")[0].slice(0, 120)) : null,
    );
  };
}

/** Build a structured brand block that gets injected into every scene prompt. */
function buildBrandBlock(brand: BrandTokens): string {
  // Defensive fallbacks — LLM may return an incomplete brand object despite the TypeScript type
  const bg        = brand.bg        || "#0f0f1a";
  const primary   = brand.primary   || "#6366f1";
  const secondary = brand.secondary || "#a78bfa";
  const surface   = brand.surface   || "rgba(255,255,255,0.06)";
  const text      = brand.text      || "#ffffff";
  const textMuted = brand.textMuted || "rgba(255,255,255,0.5)";
  const border    = brand.border    || "rgba(255,255,255,0.12)";
  const font      = brand.font      || "Inter";
  const style     = brand.style     || "dark";
  const musicStyle = brand.musicStyle || "cinematic";

  return `## BRAND DESIGN SYSTEM (MANDATORY — use these exact values, no exceptions)

BRAND is already injected into scope — DO NOT declare it. Use BRAND.bg, BRAND.primary, etc. directly.

// Reference only — these are the values:
// BRAND.bg        = "${bg}"         — AbsoluteFill background, ALL scene backgrounds
// BRAND.primary   = "${primary}"    — CTA buttons, key accents, active states, glows
// BRAND.secondary = "${secondary}"  — secondary panels, complementary accents
// BRAND.surface   = "${surface}"    — glass card backgrounds (already has correct opacity)
// BRAND.text      = "${text}"       — ALL headline and label text
// BRAND.textMuted = "${textMuted}"  — subtitles, captions, metadata
// BRAND.border    = "${border}"     — glass card borders, divider lines
// BRAND.font      = "${font}"       — fontFamily on every text element
// BRAND.style     = "${style}"      — "dark" | "light" | "neon"
// BRAND.musicStyle = "${musicStyle}" — "energetic" | "calm" | "cinematic" | "corporate" | "playful"`;
}

/** Fetch a background music track for the given style from ElevenLabs. Returns null on failure. */
async function prefetchMusic(style: string, musicMood?: string): Promise<string | null> {
  try {
    const res = await fetch("/api/music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style, musicMood }),
    });
    if (!res.ok) return null;
    const { audioUrl } = await res.json();
    return audioUrl ?? null;
  } catch {
    return null;
  }
}

/** Pre-generate all ElevenLabs SFX sounds in one parallel call. Returns a URL map (empty on failure). */
async function prefetchSfx(): Promise<Record<string, string>> {
  try {
    const res = await fetch("/api/sfx", { method: "POST" });
    if (!res.ok) return {};
    const { urls } = await res.json();
    return urls ?? {};
  } catch {
    return {};
  }
}

/** Pre-fetch voiceovers sequentially to avoid hitting TTS rate limits (3 req/min on free tier). */
async function prefetchVoiceovers(scenes: ScenePlan[], voiceId?: string): Promise<ScenePlan[]> {
  // Deduplicate by voiceover text to avoid redundant calls
  const textToAudio = new Map<string, { audioUrl: string; wordTimings: ScenePlan["wordTimings"] }>();
  const results: ScenePlan[] = [];

  for (const scene of scenes) {
    if (!scene.voiceoverText?.trim()) {
      results.push(scene);
      continue;
    }
    const text = scene.voiceoverText.trim();
    // Validate word count: trim if voiceover exceeds scene duration capacity
    const maxWords = Math.ceil((scene.durationInFrames / 30) * 2.8);
    const wordArr = text.split(/\s+/);
    const trimmedText = wordArr.length > maxWords ? wordArr.slice(0, maxWords).join(" ") : text;

    if (textToAudio.has(trimmedText)) {
      const cached = textToAudio.get(trimmedText)!;
      results.push({ ...scene, voiceoverAudioUrl: cached.audioUrl, wordTimings: cached.wordTimings });
      continue;
    }

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmedText, voiceId, intent: scene.intent }),
      });
      if (!res.ok) { results.push(scene); continue; }
      const { audioUrl, wordTimings } = await res.json();
      if (!audioUrl) { results.push(scene); continue; }
      const timings = Array.isArray(wordTimings) && wordTimings.length > 0 ? wordTimings : scene.wordTimings;
      textToAudio.set(trimmedText, { audioUrl, wordTimings: timings });
      results.push({ ...scene, voiceoverAudioUrl: audioUrl, wordTimings: timings });
    } catch {
      results.push(scene); // non-fatal — generation proceeds without audio
    }

    // 400ms gap between TTS requests — keeps rate under 3 req/min on Gemini free tier
    await new Promise((r) => setTimeout(r, 400));
  }

  return results;
}

/**
 * Build a mandatory CURSOR_STEPS code block from confirmed cursor waypoints.
 * Outputs the actual const declaration so the LLM must copy it verbatim —
 * not just comments that the LLM can silently ignore.
 *
 * Also returns chameleon overlay JSX hints for input/button/dropdown elements
 * so the LLM knows exactly which overlay components to render.
 */
/** Derive the SFX type for a cursor waypoint based on its action + elementType. */
function waypointSfx(wp: CursorWaypoint): string | null {
  if (wp.action === "none" || wp.action === "scroll") return null;
  if (wp.elementType === "input") return "type";
  if (wp.elementType === "dropdown") return "pop";
  if (wp.action === "hover") return "whoosh";
  // click / double-click / nav / button / card → click sound
  return "click";
}

/** Compute structured CURSOR_STEPS array from waypoints — used both for LLM prompt and direct scope injection. */
function computeCursorStepsData(waypoints: CursorWaypoint[]): Array<{ x: number; y: number; label: string; time: number; action: string }> {
  const travelFrames = (fromX: number, fromY: number, toX: number, toY: number): number =>
    Math.min(32, Math.max(12, Math.round(Math.hypot(toX - fromX, toY - fromY) * 180)));

  let frame = 20;
  let prevX = 0.5;
  let prevY = 1.10;
  const steps: Array<{ x: number; y: number; label: string; time: number; action: string }> = [];

  // Initial anchor step
  steps.push({ x: 0.5, y: 1.10, label: "", time: 0, action: "none" });

  waypoints.forEach((wp) => {
    const TRAVEL = travelFrames(prevX, prevY, wp.x, wp.y);
    const arrive = frame;
    const actionFrame = arrive + TRAVEL;
    const dwell = wp.dwellFrames ?? 22;
    frame = actionFrame + dwell;
    prevX = wp.x;
    prevY = wp.y;
    const action = wp.action ?? "click";
    steps.push({ x: parseFloat(wp.x.toFixed(3)), y: parseFloat(wp.y.toFixed(3)), label: wp.label, time: arrive, action });
  });

  // Trailing "none" step
  const lastWp = waypoints[waypoints.length - 1];
  steps.push({ x: parseFloat((lastWp?.x ?? 0.5).toFixed(3)), y: parseFloat((lastWp?.y ?? 0.5).toFixed(3)), label: "", time: frame, action: "none" });

  return steps;
}

function applyCursorJourneyLabels(
  waypoints: CursorWaypoint[],
  cursorJourney?: string[],
): CursorWaypoint[] {
  if (!Array.isArray(cursorJourney) || cursorJourney.length === 0) return waypoints;
  return waypoints.map((wp, index) => {
    const narrativeLabel = cursorJourney[index]?.trim();
    return narrativeLabel ? { ...wp, label: narrativeLabel } : wp;
  });
}

function buildInteractionScript(waypoints: CursorWaypoint[]): string {
  // Dynamic TRAVEL: frames scale with pointer distance (short hop → fast, long diagonal → slow)
  // Formula: clamp(round(distance * 180), 12, 32) where distance is normalized 0-√2 hypot
  // This makes the cursor feel human — quick micro-adjustments, slower large traversals.
  const travelFrames = (fromX: number, fromY: number, toX: number, toY: number): number =>
    Math.min(32, Math.max(12, Math.round(Math.hypot(toX - fromX, toY - fromY) * 180)));

  // Start with cursor off-screen (initial anchor step at time=0)
  let frame = 20; // first spring starts at frame 20 (gives 20 frames of fade-in before cursor moves)

  const stepEntries: string[] = [];
  const chameleonHints: string[] = [];
  const commentLines: string[] = [];
  const sfxEntries: string[] = []; // SFX_EVENTS for SfxSequencer

  // BUG FIX: Add initial anchor step so the first waypoint has a "from" position.
  // Without this, prevStep === currentStep === CURSOR_STEPS[0] for all frames before
  // the first time boundary, so the cursor is already at the destination from frame 0.
  stepEntries.push(`  { x: 0.5, y: 1.10, label: "", time: 0, action: "none" }`);

  // Track previous position for distance-based TRAVEL calculation
  let prevX = 0.5;
  let prevY = 1.10;

  waypoints.forEach((wp, i) => {
    // `arrive` = frame when this step's spring starts (cursor begins traveling)
    // `actionFrame` = frame when cursor physically arrives (spring settled = arrive + TRAVEL)
    // TRAVEL is now distance-based: short moves settle faster, long diagonals take longer
    const TRAVEL = travelFrames(prevX, prevY, wp.x, wp.y);
    const arrive = frame;
    const actionFrame = arrive + TRAVEL; // when click fires / chameleon overlays activate
    const dwell = wp.dwellFrames ?? 22;  // frames cursor stays at destination before next move
    frame = actionFrame + dwell;         // next step's spring starts after dwell ends
    prevX = wp.x;
    prevY = wp.y;

    const action = wp.action ?? 'click';
    const boxStr = wp.box
      ? `, box: { x: ${wp.box.x.toFixed(3)}, y: ${wp.box.y.toFixed(3)}, w: ${wp.box.w.toFixed(3)}, h: ${wp.box.h.toFixed(3)} }`
      : '';
    const typeStr = wp.elementType ? `, elementType: "${wp.elementType}"` : '';

    // BUG FIX: `time` = `arrive` (when spring/movement starts), NOT actionFrame.
    // In the cursor skill: `framesAfterArrival = frame - step.time - TRAVEL`
    // So click fires at step.time + TRAVEL = arrive + TRAVEL = actionFrame ✓
    stepEntries.push(
      `  { x: ${wp.x.toFixed(3)}, y: ${wp.y.toFixed(3)}, label: "${wp.label}", time: ${arrive}, action: "${action}"${boxStr}${typeStr} }`,
    );
    commentLines.push(
      `// Step ${i}: spring starts f:${arrive}, cursor arrives+clicks at f:${actionFrame}${wp.box ? `, box:{x:${wp.box.x.toFixed(3)},y:${wp.box.y.toFixed(3)},w:${wp.box.w.toFixed(3)},h:${wp.box.h.toFixed(3)}}` : ''}${wp.elementType ? `, elementType:"${wp.elementType}"` : ''} — "${wp.label}"`,
    );

    // Derive SFX for this waypoint and add to SFX_EVENTS
    const sfx = waypointSfx(wp);
    if (sfx) {
      sfxEntries.push(`  { frame: ${actionFrame}, sfx: "${sfx}" }`);
      // For input fields: also fire a "success" chime ~30 frames after typing starts
      if (sfx === "type") {
        sfxEntries.push(`  { frame: ${actionFrame + 30}, sfx: "success" }`);
      }
    }

    // Chameleon overlay hints use actionFrame (when cursor arrives and click fires)
    if (wp.box) {
      const { x, y, w, h } = wp.box;
      const dropY = parseFloat((y + h + 0.005).toFixed(3)); // pre-computed dropdown y
      if (wp.elementType === 'input') {
        chameleonHints.push(
          `// Step ${i} — input typing overlay (fires at f:${actionFrame}):\n// <ChameleonInput x={${x.toFixed(3)}} y={${y.toFixed(3)}} w={${w.toFixed(3)}} h={${h.toFixed(3)}} text="[realistic text for this field]" startFrame={${actionFrame}} brand={BRAND} />\n// <ChameleonHighlight x={${x.toFixed(3)}} y={${y.toFixed(3)}} w={${w.toFixed(3)}} h={${h.toFixed(3)}} triggerFrame={${actionFrame}} brand={BRAND} />`,
        );
      } else if (wp.elementType === 'dropdown') {
        chameleonHints.push(
          `// Step ${i} — dropdown (fires at f:${actionFrame}):\n// <ChameleonHighlight x={${x.toFixed(3)}} y={${y.toFixed(3)}} w={${w.toFixed(3)}} h={${h.toFixed(3)}} triggerFrame={${actionFrame}} brand={BRAND} />\n// <DropdownMenu x={${x.toFixed(3)}} y={${dropY}} w={${w.toFixed(3)}} items={["Option 1", "Option 2", "Option 3"]} openFrame={${actionFrame}} brand={BRAND} />`,
        );
      } else if (wp.elementType === 'button' || wp.elementType === 'nav' || wp.elementType === 'card') {
        chameleonHints.push(
          `// Step ${i} — ${wp.elementType} click highlight (fires at f:${actionFrame}):\n// <ChameleonHighlight x={${x.toFixed(3)}} y={${y.toFixed(3)}} w={${w.toFixed(3)}} h={${h.toFixed(3)}} triggerFrame={${actionFrame}} brand={BRAND} />`,
        );
      }
    }
  });

  // Trailing "none" step holds cursor at final position
  const lastWp = waypoints[waypoints.length - 1];
  stepEntries.push(
    `  { x: ${(lastWp?.x ?? 0.5).toFixed(3)}, y: ${(lastWp?.y ?? 0.5).toFixed(3)}, label: "", time: ${frame}, action: "none" }`,
  );

  const cursorStepsCode = `const CURSOR_STEPS = [\n${stepEntries.join(',\n')},\n];`;

  // SFX_EVENTS — companion array for SfxSequencer (always emitted, may be empty)
  const sfxEventsCode = `const SFX_EVENTS = [\n${sfxEntries.join(',\n')}${sfxEntries.length ? ',\n' : ''}];`;

  const chameleonSection = chameleonHints.length > 0
    ? `\n\n## CHAMELEON OVERLAYS — render these at the CLICK frame (uncomment and fill in text):\n${chameleonHints.join('\n')}`
    : '';

  return `## CURSOR WAYPOINTS (USER-CONFIRMED — MANDATORY CODE INJECTION)
CRITICAL: You MUST paste BOTH constants VERBATIM in your component. Do NOT alter any values.

TIMING MODEL: step.time = when spring/movement starts; click fires at step.time + TRAVEL frames later.
TRAVEL is distance-based (12–32f): short hops settle in ~12f, long diagonals in ~32f.
Use this for chameleon overlay startFrame/triggerFrame: framesAfterArrival = frame - step.time - TRAVEL.

${cursorStepsCode}

${sfxEventsCode}

MANDATORY: Add <SfxSequencer events={SFX_EVENTS} /> as the FIRST child of AbsoluteFill so every cursor interaction has sound. SfxSequencer is already in scope — do NOT import or re-declare it.

${commentLines.join('\n')}${chameleonSection}`;
}

/** Consume an SSE stream from /api/generate and return the final code string. */
async function consumeSceneGeneration(
  scene: ScenePlan,
  model: string,
  brand: BrandTokens,
  errorContext?: string,
  images?: string[],
  continuityContext?: string,
  /** "force" = use scene.skills as forcedSkills (default); "fallback" = pass as previouslyUsedSkills so LLM picks alternative */
  skillMode: "force" | "fallback" = "force",
  initialCameraState: CameraEndState = DEFAULT_CAMERA_STATE,
): Promise<string> {
  // Build the full prompt: brand block + scene creative brief
  const brandBlock = buildBrandBlock(brand);

  // Vision bridge: pre-detect UI elements from the screenshot and inject them into the prompt.
  // - cursor-engine: precise x/y coordinates used as CURSOR_STEPS waypoints
  //   If the user already confirmed waypoints in the plan editor, use those directly
  //   and skip the /api/vision call entirely (faster + more accurate).
  // - scroll-demo / saas-showcase: element labels used to populate realistic content
  const VISION_SKILLS = new Set([
    "premium-cursor-engine",
    "premium-chameleon-ui",
  ]);
  let detectedElementsBlock = "";
  // scroll-demo: only call vision if there are no existing waypoints with content
  const needsVisionForScrollDemo =
    scene.skills.includes("premium-scroll-demo") &&
    images && images.length > 0 &&
    !scene.cursorWaypoints?.length;
  if (
    (scene.skills.some(sk => VISION_SKILLS.has(sk)) || needsVisionForScrollDemo) &&
    images &&
    images.length > 0 &&
    !errorContext // skip on retry — don't double-call vision
  ) {
    // ── User-confirmed cursor waypoints (skip vision call) ─────────────────
    // Applies to both cursor-engine and chameleon-ui when user set waypoints
    if (
      (scene.skills.includes("premium-cursor-engine") || scene.skills.includes("premium-chameleon-ui")) &&
      scene.cursorWaypoints &&
      scene.cursorWaypoints.length > 0
    ) {
      // User-confirmed waypoints: use them directly for CURSOR_STEPS.
      // But if any waypoint lacks box data, still run vision to enrich them —
      // without boxes, chameleon overlays can't target the right UI elements.
      const missingBoxes = scene.cursorWaypoints.filter(wp => !wp.box || wp.box.w === 0);
      if (missingBoxes.length > 0 && images[0]) {
        try {
          const vRes = await fetch("/api/vision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: images[0], uiSchema: (scene as any).uiSchema ?? undefined }),
          });
          if (vRes.ok) {
            const vData = await vRes.json();
            const vElements: Array<{ label: string; x: number; y: number; w?: number; h?: number; id?: string; elementType?: string }> = vData.elements ?? [];
            // Enrich each waypoint that lacks a box by finding the nearest vision element
            const enriched = scene.cursorWaypoints.map(wp => {
              if (wp.box && wp.box.w > 0) return wp;
              const nearest = vElements.reduce<{ el: typeof vElements[0] | null; d: number }>(
                (best, el) => {
                  const d = Math.hypot(el.x - wp.x, el.y - wp.y);
                  return d < best.d ? { el, d } : best;
                },
                { el: null, d: Infinity },
              );
              if (nearest.el && nearest.d < 0.2) {
                const el = nearest.el;
                const w = el.w ?? 0.12;
                const h = el.h ?? 0.06;
                return {
                  ...wp,
                  id: wp.id ?? el.id,
                  elementType: wp.elementType ?? (el.elementType as any),
                  box: { x: el.x - w / 2, y: el.y - h / 2, w, h },
                };
              }
              return wp;
            });
            console.log(`Vision-enriched ${enriched.filter(w => w.box).length}/${enriched.length} user waypoints with box data`);
            scene = {
              ...scene,
              cursorWaypoints: applyCursorJourneyLabels(enriched, scene.cursorJourney),
            };
          }
        } catch { /* non-fatal */ }
      }
      const wpts = applyCursorJourneyLabels(scene.cursorWaypoints ?? [], scene.cursorJourney);
      console.log(`Cursor path: using ${wpts.length} user-confirmed waypoints for "${scene.title}"`);
      detectedElementsBlock = `\n\n${buildInteractionScript(wpts)}`;
    } else {
      // ── Fallback: auto-detect via /api/vision ──────────────────────────
      // Skip /api/vision only when ALL waypoints already have valid box data.
      // Using .some() was a bug — if only 1/4 waypoints had a box, vision was skipped
      // and the remaining 3 stayed boxless, breaking chameleon overlays on those targets.
      // No waypoints (undefined or []) → nothing to enrich, skip vision
      const allHaveBoxData = scene.cursorWaypoints?.every(wp => wp.box && wp.box.w > 0) ?? true;
      const needsVisionDetection = !allHaveBoxData;
      if (!needsVisionDetection) {
        console.log(`Skipping /api/vision for "${scene.title}" — box data already present in waypoints`);
      }
      try {
        if (!needsVisionDetection) throw new Error("skip-vision");
        const visionResponse = await fetch("/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: images[0], uiSchema: (scene as any).uiSchema ?? undefined }),
        });
        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          const elements: Array<{ label: string; x: number; y: number; w?: number; h?: number; elementType?: string }> =
            visionData.elements ?? [];
          if (elements.length > 0) {
            if (scene.skills.includes("premium-chameleon-ui")) {
              // Merge vision elements with the interactionScript to produce
              // INTERACTION_SCRIPT comments including bounding boxes + frame timings.
              const script = scene.interactionScript ?? [];
              // Stop-words to ignore when scoring label similarity
              const STOP = new Set(["the", "a", "an", "on", "in", "at", "to", "for", "of", "with", "and", "or", "button", "field", "bar", "input", "area"]);
              const steps = script.map((ev, i) => {
                // Match event target to a vision element using multi-word scoring
                const targetWords = ev.target.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
                const scored = elements.map((e) => {
                  const labelWords = e.label.toLowerCase().split(/\s+/).filter(w => w.length > 1);
                  const matches = targetWords.filter(tw =>
                    labelWords.some(lw => lw.includes(tw) || tw.includes(lw))
                  );
                  return { e, score: matches.length };
                });
                const best = scored.sort((a, b) => b.score - a.score)[0];
                const el = (best && best.score > 0) ? best.e : elements[i % elements.length];
                const videoW = el.w ?? 0.12;
                const videoH = el.h ? el.h * 0.94 : 0.05;
                const boxStr = el
                  ? `, box:{x:${parseFloat((el.x - videoW / 2).toFixed(3))},y:${parseFloat((0.06 + (el.y - (el.h ?? 0.05) / 2) * 0.94).toFixed(3))},w:${parseFloat(videoW.toFixed(3))},h:${parseFloat(videoH.toFixed(3))}}`
                  : "";
                const typeStr = el?.elementType ? `, elementType:"${el.elementType}"` : "";
                const arrive = Math.max(0, ev.frame - 25);
                const clickAction = ev.action === "type" ? "click" : ev.action;
                return `// Step ${i}: cursor arrives f:${arrive}, ${clickAction} at f:${ev.frame}${boxStr}${typeStr} — "${ev.target}"`;
              });

              if (steps.length > 0) {
                detectedElementsBlock = `

## INTERACTION_SCRIPT (from video analysis + vision detection — copy these exactly)
Use these frame numbers and bounding boxes to position ChameleonInput/ChameleonHighlight/DropdownMenu.

${steps.join("\n")}`;
              } else {
                // No interactionScript — fall back to DETECTED_ELEMENTS for the LLM to interpret
                const labels = elements.map((el) => el.label);
                detectedElementsBlock = `

## DETECTED UI SECTIONS FROM UPLOADED SCREENSHOT
${JSON.stringify(labels, null, 2)}`;
              }
            } else if (scene.skills.includes("premium-cursor-engine")) {
              const transformed = elements.map((el) => {
                const videoW = el.w ?? 0.1;
                const videoH = el.h ? el.h * 0.94 : 0.05;
                return {
                  label: el.label,
                  x: parseFloat(el.x.toFixed(3)),
                  y: parseFloat((0.06 + el.y * 0.94).toFixed(3)),
                  box: {
                    x: parseFloat((el.x - videoW / 2).toFixed(3)),
                    y: parseFloat((0.06 + (el.y - (el.h ?? 0.05) / 2) * 0.94).toFixed(3)),
                    w: parseFloat(videoW.toFixed(3)),
                    h: parseFloat(videoH.toFixed(3)),
                  },
                  elementType: el.elementType,
                };
              });
              detectedElementsBlock = `

## DETECTED UI ELEMENTS FROM UPLOADED SCREENSHOT
The screenshot is displayed below a 6% chrome bar at the top of the video frame.
These coordinates are already in video space.
Select 3–5 of the most interesting elements for the walkthrough demo.

CRITICAL: You MUST include the following constant declaration in your generated code (do not assume it is in scope):

const DETECTED_ELEMENTS = ${JSON.stringify(transformed, null, 2)};`;
            } else {
              const labels = elements.map((el) => el.label);
              detectedElementsBlock = `

## DETECTED UI SECTIONS FROM UPLOADED SCREENSHOT
These are the real UI sections/components visible in the screenshot.
Use these labels to populate your component with accurate text, stat names, and layout sections that match the actual product — do NOT invent generic labels.

CRITICAL: You MUST include the following constant declaration in your generated code (do not assume it is in scope):

const DETECTED_SECTIONS = ${JSON.stringify(labels, null, 2)};`;
            }
            console.log(
              `Vision bridge (${scene.skills.join("+")}): ${elements.length} elements detected for "${scene.title}"`,
            );
          }
        }
      } catch (e) {
        console.warn("Vision detection failed (non-fatal):", e);
      }
    }
  }

  // Voiceover block: if the scene has a pre-generated ElevenLabs audio URL,
  // tell the LLM how to use VOICEOVER_AUDIO_URL (already in compiler scope).
  let voiceoverBlock = "";
  if (scene.voiceoverAudioUrl) {
    voiceoverBlock = `

## VOICEOVER AUDIO (PRE-GENERATED — MUST include in output)
A professional ElevenLabs narration clip exists for this scene.
VOICEOVER_AUDIO_URL is injected into compiler scope as a constant string.
You MUST include the following in your component output:

  {VOICEOVER_AUDIO_URL && (
    <Audio
      src={VOICEOVER_AUDIO_URL}
      volume={(f) => interpolate(f, [0, 15, durationInFrames - 15, durationInFrames], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  )}

Do NOT add background music — the master composition already plays a global music track. Only include the voiceover Audio element above.
Do NOT declare VOICEOVER_AUDIO_URL — it is already in scope.`;
  }

  // UI Schema block: if the scene has a pre-extracted UISchema, inject it as UI_SCHEMA constant
  const hasValidUiSchema = scene.uiSchema &&
    Array.isArray((scene.uiSchema as any).mainContent?.sections) &&
    ((scene.uiSchema as any).mainContent.sections.length > 0 ||
     (scene.uiSchema as any).layout?.sidebar?.items?.length > 0);

  let uiSchemaBlock = "";
  if (hasValidUiSchema) {
    const _schema = scene.uiSchema as any;
    uiSchemaBlock = `

## UI_SCHEMA (PRE-EXTRACTED — ALREADY IN SCOPE as UI_SCHEMA) ⚠ MANDATORY RENDER

A structural decomposition of the product UI has been pre-extracted from the screenshot.
UI_SCHEMA is injected into compiler scope — DO NOT declare it.

**CRITICAL: You MUST render <ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} /> as the PRIMARY visual element.**
- Non-UI visuals (floating shapes, headlines, nodes) MUST be at zIndex ≤ 2. AppShell uses zIndex 3–10. Cursor uses zIndex 100+.
- DO NOT skip or substitute this component — this IS the product UI. Rendering a blank/placeholder breaks the video.
- If cursor interactions target UI elements that cannot be matched, fall back to viewport center: x=width*0.5, y=height*0.5.
- Always guard schema access: UI_SCHEMA?.mainContent?.sections?.[0]?.data ?? []

// Reference only — schema shape:
// UI_SCHEMA.layout.type = "${_schema?.layout?.type ?? "sidebar-main"}"
// UI_SCHEMA.layout.sidebar?.appName = "${_schema?.layout?.sidebar?.appName ?? "—"}"
// UI_SCHEMA.mainContent.sections = [${(_schema?.mainContent?.sections ?? []).map((s: any) => s.type).join(", ")}]
// UI_SCHEMA.theme.isDark = ${_schema?.theme?.isDark ?? false}

Use: <ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} />
Or build manually with AnimatedSidebar, AnimatedMetricCards, AnimatedTable, AnimatedChart, AnimatedForm`;
  }

  // Emotional intent + aha moment block
  let narrativeBlock = "";
  if ((scene as any).emotionalIntent || (scene as any).isAhaMoment) {
    narrativeBlock = `\n\n## NARRATIVE DIRECTION`;
    if ((scene as any).emotionalIntent) {
      narrativeBlock += `\nEmotional intent: ${(scene as any).emotionalIntent}
The visuals and animation must make the viewer feel this emotion. Choose colors, pacing, and motion that reinforce it:
- FRUSTRATION: use crowded layouts, overlapping elements, red/orange accents, jerky motion
- RELIEF: use open space, soft greens/blues, smooth springs, breathing room
- CONFIDENCE: clean grid layout, precise typography, satisfying reveal order
- TRUST: calm pacing, testimonial-style cards, real names/logos
- URGENCY: fast cuts, countdown feel, strong CTA color
- EXCITEMENT: bold colors, energetic spring physics, large type`;
    }
    if ((scene as any).isAhaMoment) {
      narrativeBlock += `\n\nTHIS IS THE AHA MOMENT SCENE — the single most important scene in the video.
Design it to deliver the product's core transformation as viscerally as possible:
- Use SPRING_CONFIGS.snap (damping:160, stiffness:220) on the PRIMARY revealed element — the satisfying "pop" is the payoff
- Secondary/supporting elements use SPRING_CONFIGS.entrance (damping:200, stiffness:120) so they don't compete
- Add a 20-frame hold after the key element appears before anything else moves
- Use a subtle scale pulse (1.0 → 1.03 → 1.0 over 30 frames) on the central element after it settles
- The headline must use OUTCOME language: what the viewer's life looks like AFTER using the product
- Wrap the hero element in GlowBloom (color=BRAND.primary, blurPx=80, opacity=0.4, animated=true) — the glow IS the aha signal
- This scene should feel like a sigh of relief — all the previous pain dissolves here`;
    }
  }

  const continuityBlock = continuityContext
    ? `\n\n## SCENE CONTINUITY\n${continuityContext}`
    : "";

  // Zoom-through entrance note: tells the LLM this scene begins with the camera arriving from deep
  const zoomThroughBlock = (scene as any).transition === "zoomThrough"
    ? `\n\n## ZOOM-THROUGH ARRIVAL (cinematic match cut)
This scene begins with a cinematic portal arrival — the previous scene's camera zoomed INTO a UI element and this scene receives the camera emerging from that element.
Design rules for zoom-through arrival:
- The primary content (UI, card, dashboard) must be VISIBLE at frame 0 — do NOT fly it in from off-screen.
- Avoid large entrance animations in the first 15 frames — the zoom-out transition handles the arrival energy.
- Supporting elements (text labels, section headers, badges) spring in from frame 15+ as normal.
- The scene should feel like "arriving at a destination" — the viewer is already inside the product.`
    : "";

  const stageDirectionBlock = (scene as any).stageDirection
    ? `\n\n## STAGE DIRECTION\n${((scene as any).stageDirection as string).replace(/`/g, "\\`")}`
    : "";

  // Visual anchor — emotional transformation throughline across problem/solution scenes
  const va = (scene as any).visualAnchor as { icon: string; colorFrom: string; colorTo: string; label: string } | undefined;
  const visualAnchorBlock = va
    ? `\n\n## VISUAL ANCHOR TRANSFORMATION
This scene is part of a visual anchor story. The anchor element "${va.icon}" (label: ${va.label}) must appear in this scene.
- In PROBLEM/FRUSTRATION scenes: render "${va.icon}" in its BROKEN STATE — use color ${va.colorFrom} (red/alarm), show it visually distressed: pulsing alarm, cracked outline, overlapping chaos, or erratic jitter (useEntropy strength 0.7).
- In SOLUTION/AHA scenes: render "${va.icon}" in its RESOLVED STATE — use color ${va.colorTo} (calm/success), show it healed: smooth reveal, satisfying scale-up 1.0→1.08, soft glow (GlowBloom color="${va.colorTo}"), settled spring (damping:200, stiffness:60).
The viewer must RECOGNIZE this element from the problem scene and FEEL the transformation when they see it resolved. This is the emotional core of the video.
Position it prominently: if the scene has a split layout, the anchor is the right-side hero element. If centered, it is the first element to appear.`
    : "";

  // MorphPortal import block: tells LLM that MORPH_FROM is in scope and what useMorphEntrance does
  const morphImportBlock = (scene as any).morphImport
    ? `\n\n## MORPH PORTAL ARRIVAL
This scene receives a shape that morphed from the previous scene. MORPH_FROM is in scope (a normalized 0–1 rect).
Use useMorphEntrance(MORPH_FROM, toRect, startFrame) to spring the element from its exported position into its natural position here.
The morphing element should be the FIRST thing to appear (startFrame: 0). Other content enters once progress > 0.5.
Example:
  const { style, progress } = useMorphEntrance(MORPH_FROM, { x: 0.1, y: 0.15, w: 0.8, h: 0.65 });
  <div style={{ ...style, background: BRAND.primary }}>
    {progress > 0.5 && <AppShellContent />}
  </div>
Border-radius auto-interpolates from circular blob → card corner radius as the spring settles.`
    : "";

  // Stock video background block: instructs the LLM to use OffthreadVideo
  const stockFootage = (scene as any).stockFootage as string | undefined;
  const stockVideoBlock = stockFootage
    ? `\n\n## STOCK VIDEO BACKGROUND (MANDATORY — Fronter/Viable-style cinematic composite)
STOCK_VIDEO_URL is in scope (string): "${stockFootage}"
OffthreadVideo is in scope — use it as the base background layer.

Pattern:
<AbsoluteFill>
  <OffthreadVideo src={STOCK_VIDEO_URL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 1 }} />
</AbsoluteFill>
<AbsoluteFill style={{ zIndex: 2 }}>
  {/* Floating animated overlays here */}
</AbsoluteFill>

Rules:
- ALWAYS add a dark overlay (rgba(0,0,0,0.12-0.25)) over the video for contrast
- Floating UI elements (icons, cards, labels) go in a SEPARATE AbsoluteFill at zIndex: 2+
- Stock footage is the BASE — it grounds the scene in reality. Do NOT obscure it entirely.`
    : "";

  // Feature header block: instructs LLM to render FeatureContextBar
  const featureHeader = scene.featureHeader;
  const featureHeaderBlock = featureHeader
    ? `\n\n## FEATURE CONTEXT HEADER (MANDATORY — Qanapi-style)
FEATURE_HEADER is in scope: ${JSON.stringify(featureHeader)}
Render it as the topmost layer:
{FEATURE_HEADER && <FeatureContextBar {...FEATURE_HEADER} brand={BRAND} />}
This persistent header bar identifies WHICH feature the viewer is watching.`
    : "";

  // Multi-view walkthrough block: instructs LLM on multi-screenshot scenes
  const imageIndices = scene.imageIndices;
  const multiViewBlock = imageIndices && imageIndices.length > 1
    ? `\n\n## MULTI-VIEW WALKTHROUGH (${imageIndices.length} screenshots assigned)
ATTACHED_IMAGES contains ${imageIndices.length} different product views in order.
Create a tab-switching walkthrough: show a tab bar, crossfade between ATTACHED_IMAGES[0], [1], [2] etc.
Each view gets ~${Math.round(scene.durationInFrames / imageIndices.length)} frames.
Use spring crossfade (not hard cut) between views. Active tab highlights.

UI CONTINUITY (critical for premium feel):
- Render ONE persistent AppShell frame — only the inner content region crossfades between views
- The cursor MUST click each tab before the view switches — no unmotivated transitions
- Keep the screenshot container at the SAME position and scale across all views
- Animate the tab indicator (pill slides from old to new tab over 12 frames)
- Shared elements (sidebar, topbar) stay static — never re-enter between views
This must feel like ONE app evolving, not separate screenshots being swapped.`
    : "";

  // Macro zoom block: instructs the LLM to use MacroCamera + SelectiveFocus
  const mz = (scene as any).macroZoom as { zoomLevel: number; focusPoint: { x: number; y: number }; zoomInFrame?: number; holdFrames?: number } | undefined;
  const macroZoomBlock = mz
    ? `\n\n## MACRO ZOOM (Bordio-style extreme close-up — MANDATORY)
This scene MUST use MacroCamera + SelectiveFocus for an extreme close-up effect.
Both components are already in scope — do NOT re-declare them.

Configuration (from planner):
- zoomLevel: ${mz.zoomLevel}
- focusPoint: { x: ${mz.focusPoint.x}, y: ${mz.focusPoint.y} }
- zoomInFrame: ${mz.zoomInFrame ?? 30}
- holdFrames: ${mz.holdFrames ?? 80}

Pattern — wrap your UI content like this:
<MacroCamera zoomLevel={${mz.zoomLevel}} focusPoint={{x:${mz.focusPoint.x}, y:${mz.focusPoint.y}}} zoomInFrame={${mz.zoomInFrame ?? 30}} holdFrames={${mz.holdFrames ?? 80}}>
  <SelectiveFocus focusX={${mz.focusPoint.x}} focusY={${mz.focusPoint.y}} focusRadius={0.3} blurAmount={10} active={frame >= ${mz.zoomInFrame ?? 30} && frame < ${(mz.zoomInFrame ?? 30) + 25 + (mz.holdFrames ?? 80) + 25}}>
    {/* Your UI content (screenshot, AppShell, etc.) */}
  </SelectiveFocus>
</MacroCamera>
{/* Cursor layers OUTSIDE both wrappers */}

Rules:
- Cursor/annotation layers MUST be OUTSIDE MacroCamera — they stay at screen scale
- Let the UI settle for ${mz.zoomInFrame ?? 30} frames before the zoom snaps in
- The hold phase (${mz.holdFrames ?? 80}f) is where the viewer absorbs the focused UI — use cursor interactions during this phase
- CAMERA-CURSOR SYNC: All cursor click targets during the hold phase MUST be within ±0.15 of the focusPoint (x:${mz.focusPoint.x}, y:${mz.focusPoint.y}). The viewer can only see what's in the zoom region — clicking outside it is invisible and pointless.
- Use usePreFocusCamera(${mz.focusPoint.x}, ${mz.focusPoint.y}, ${mz.zoomInFrame ?? 30}) for anticipatory camera drift BEFORE the macro zoom snaps in — makes the camera feel intentional, not abrupt.`
    : "";

  const scenePrompt = errorContext
    ? `${errorContext}\n\n${brandBlock}\n\n${scene.prompt}${detectedElementsBlock}${uiSchemaBlock}${voiceoverBlock}${narrativeBlock}${continuityBlock}${stageDirectionBlock}${visualAnchorBlock}${zoomThroughBlock}${morphImportBlock}${macroZoomBlock}${stockVideoBlock}${featureHeaderBlock}${multiViewBlock}`
    : `${brandBlock} \n\n${scene.prompt}${detectedElementsBlock}${uiSchemaBlock}${voiceoverBlock}${narrativeBlock}${continuityBlock}${stageDirectionBlock}${visualAnchorBlock}${zoomThroughBlock}${morphImportBlock}${macroZoomBlock}${stockVideoBlock}${featureHeaderBlock}${multiViewBlock} `;

  const makeRequest = async () =>
    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Some scenes (esp. image-heavy + premium skills) can exceed 90s on free-tier models.
      // Use a longer timeout and rely on retry/fallback logic for robustness.
      signal: AbortSignal.timeout(180_000),
      body: JSON.stringify({
        prompt: scenePrompt,
        model,
        isFollowUp: Boolean(errorContext),
        forcedSkills: skillMode === "force" && scene.skills?.length ? scene.skills : undefined,
        previouslyUsedSkills: skillMode === "fallback" ? (scene.skills ?? []) : undefined,
        frameImages: images?.length ? images : undefined,
        skillComposition: (scene as any).skillComposition,
        visualState: scene.visualState,
        visualAnchor: (scene as any).visualAnchor,
        initialCameraZoom: initialCameraState.zoom,
        initialCameraPan: { x: initialCameraState.panX, y: initialCameraState.panY },
      }),
    });

  let response: Response;
  try {
    response = await makeRequest();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = /timed out|TimeoutError/i.test(msg) || (err as any)?.name === "TimeoutError";
    // Single retry on timeout-ish failures (common transient for upstream model calls).
    if (isTimeout) {
      await new Promise((r) => setTimeout(r, 1200));
      response = await makeRequest();
    } else {
      throw err;
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
      `API error ${response.status} for scene "${scene.title}"`,
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    return data.code ?? "";
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let accumulatedText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const event = JSON.parse(data);
        if (event.type === "text-delta") {
          accumulatedText += event.delta;
        }
      } catch {
        // ignore malformed lines
      }
    }
  }

  let finalCode = stripMarkdownFences(accumulatedText);
  finalCode = extractComponentCode(finalCode);
  return finalCode;
}

/**
 * When a scene has imageIndex set, put that image first in the array so LLM and compiler
 * receive it as ATTACHED_IMAGES[0]. All other images follow.
 */
function reorderImagesForScene(images: string[] | undefined, scene: ScenePlan): string[] {
  if (!images || images.length === 0) return [];
  if (scene.imageIndex === undefined || scene.imageIndex < 0 || scene.imageIndex >= images.length) {
    return images.slice(0, 1); // safe fallback: only first image, never out-of-bounds
  }
  return [images[scene.imageIndex], ...images.filter((_, i) => i !== scene.imageIndex)];
}

/**
 * Detect consecutive scenes that share the same app (same sidebar app name).
 * Tags them with _isNavigationContinuation so the generation prompt can
 * use a persistent shell pattern instead of re-rendering the full app.
 */
function detectNavigationSequences(
  scenes: ScenePlan[],
  uiSchemas: Record<number, Record<string, unknown>>,
): ScenePlan[] {
  return scenes.map((scene, i) => {
    if (i === 0) return scene;
    const prevScene = scenes[i - 1];

    const currentSchema = scene.imageIndex != null ? uiSchemas[scene.imageIndex] : null;
    const prevSchema = prevScene.imageIndex != null ? uiSchemas[prevScene.imageIndex] : null;

    // Same app = both have sidebar with matching appName
    const currentAppName = (currentSchema as any)?.layout?.sidebar?.appName;
    const prevAppName = (prevSchema as any)?.layout?.sidebar?.appName;
    const isSameApp = currentAppName && prevAppName && currentAppName === prevAppName;

    if (!isSameApp) return scene;

    return {
      ...scene,
      _isNavigationContinuation: true,
      _persistentShellLayout: (prevSchema as any)?.layout ?? null,
    } as ScenePlan;
  });
}

/** Calculate the start frame offset for every scene in the plan. */
function calculateSceneOffsets(scenes: { durationInFrames: number }[]): number[] {
  const offsets: number[] = [];
  let currentOffset = 0;
  for (let i = 0; i < scenes.length; i++) {
    offsets.push(currentOffset);
    if (i < scenes.length - 1) {
      currentOffset += scenes[i].durationInFrames + HOLD_FRAMES - TRANSITION_FRAMES;
    }
  }
  return offsets;
}

/** Camera state at the end of a scene — used for seamless zoom continuity across cuts. */
interface CameraEndState {
  zoom: number;
  panX: number;
  panY: number;
}

const DEFAULT_CAMERA_STATE: CameraEndState = { zoom: 1.0, panX: 0, panY: 0 };
/** Standard CinematicCamera ending state — what the camera settles at after 90 frames. */
const CINEMATIC_CAMERA_END: CameraEndState = { zoom: 1.06, panX: 0, panY: 0 };

function fastQualityCheck(code: string, intentRaw?: string): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const intent = (intentRaw ?? "feature").toLowerCase();

  if (!/MaskedReveal/.test(code) && ["hook", "solution", "cta"].includes(intent)) {
    issues.push("missing-headline-animation");
  }
  if (!/(TiltWrapper|DepthStack|perspective)/.test(code) && ["feature", "solution"].includes(intent)) {
    issues.push("flat-ui-no-depth");
  }
  if (!/(LightArcBg|MeshGradientBg|EntropyDust|STOCK_VIDEO_URL|VideoPlateMockup|ContextualBgPulse)/.test(code)) {
    issues.push("static-background");
  }
  // Audit rubric flags “flicker” when particles/orbs/confetti arrays are created inside the component.
  // This is a cheap heuristic: if it sees these common identifiers AND an Array.from/[] literal, it likely flickers.
  if (/(PARTICLES|ORBS|CONFETTI)\b/.test(code) && /(Array\.from\(|=\s*\[)/.test(code)) {
    issues.push("flicker-arrays-in-component");
  }
  // Audit rubric penalizes overflow: headlines without maxWidth are high-risk.
  if ((/fontSize\s*:\s*(?:1[0-9]{2,}|[89][0-9])/.test(code) || /Hook\/CTA/.test(code)) && !/maxWidth\s*:/.test(code)) {
    issues.push("missing-maxwidth");
  }

  return { passed: issues.length === 0, issues };
}

function shouldDeepAuditScene(scene: ScenePlan): boolean {
  if (scene.isAhaMoment) return true;
  return false;
}

type SceneStructureIssue =
  | { kind: "missing-eof" }
  | { kind: "leaked-language-label"; label: string }
  | { kind: "multiple-main-exports"; count: number }
  | { kind: "nested-main-export"; sceneName: string; exportName: string }
  | { kind: "scene-missing-return"; sceneName: string }
  | { kind: "scene-missing-absolutefill"; sceneName: string }
  | { kind: "main-scene-missing-return"; exportName: string }
  | { kind: "main-scene-missing-absolutefill"; exportName: string }
  | { kind: "unsafe-audio-spring-constants" };

function detectSceneStructureIssues(code: string): SceneStructureIssue[] {
  const issues: SceneStructureIssue[] = [];
  const lines = code.split("\n");

  // The generator contract requires // EOF; missing it strongly correlates with truncation.
  if (!/^\s*\/\/\s*EOF\s*$/m.test(code)) {
    issues.push({ kind: "missing-eof" });
  }

  // Catch leaked standalone language label lines (not fenced) before Babel sees them.
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]?.trim().toLowerCase();
    if (t === "javascript" || t === "typescript" || t === "jsx" || t === "tsx") {
      issues.push({ kind: "leaked-language-label", label: t });
      break;
    }
  }

  const mainExportMatches = Array.from(
    code.matchAll(/export\s+const\s+(MyAnimation|DynamicAnimation|FragmentedScene)\s*=/g),
  );
  if (mainExportMatches.length > 1) {
    issues.push({ kind: "multiple-main-exports", count: mainExportMatches.length });
  }

  if (/\bAUDIO_STIFFNESS\b|\bAUDIO_DAMPING\b/.test(code)) {
    issues.push({ kind: "unsafe-audio-spring-constants" });
  }

  const mainSceneMatch = code.match(/export\s+const\s+(MyAnimation|DynamicAnimation|FragmentedScene)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*=>\s*\{/);
  if (mainSceneMatch?.[1]) {
    const exportName = mainSceneMatch[1];
    const start = code.indexOf(mainSceneMatch[0]) + mainSceneMatch[0].length - 1;
    let depth = 0;
    let inStr: string | null = null;
    let end = -1;
    for (let i = start; i < code.length; i++) {
      const ch = code[i];
      if (inStr) {
        if (ch === "\\") { i++; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end !== -1) {
      const body = code.slice(start + 1, end);
      if (!/\breturn\b/.test(body)) {
        issues.push({ kind: "main-scene-missing-return", exportName });
      } else if (!/<AbsoluteFill\b/.test(body)) {
        issues.push({ kind: "main-scene-missing-absolutefill", exportName });
      }
    }
  }

  // Validate helper scenes if present: const Scene0 = () => { ... }
  // Minimal brace scan per Scene to ensure it returns JSX and includes AbsoluteFill.
  const re = /\bconst\s+(Scene\d+)\s*=\s*\(\s*\)\s*=>\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const sceneName = m[1]!;
    const braceStart = (m.index ?? 0) + m[0].length - 1; // points at "{"
    let depth = 0;
    let inStr: string | null = null;
    let end = -1;

    for (let i = braceStart; i < code.length; i++) {
      const ch = code[i];
      if (inStr) {
        if (ch === "\\") { i++; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }

      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }

    if (end !== -1) {
      const body = code.slice(braceStart + 1, end);
      const nestedExport = body.match(/export\s+const\s+([A-Z]\w*)\s*=/);
      if (nestedExport) {
        issues.push({ kind: "nested-main-export", sceneName, exportName: nestedExport[1]! });
        continue;
      }
      if (!/\breturn\b/.test(body)) {
        issues.push({ kind: "scene-missing-return", sceneName });
        continue;
      }
      if (!/<AbsoluteFill\b/.test(body)) {
        issues.push({ kind: "scene-missing-absolutefill", sceneName });
      }
    }
  }

  return issues;
}

function formatStructureIssuesForRetry(issues: SceneStructureIssue[]): string {
  const bullets = issues.map((i) => {
    switch (i.kind) {
      case "missing-eof":
        return "- Missing required `// EOF` sentinel (output likely truncated).";
      case "leaked-language-label":
        return `- Found leaked standalone language label line: \`${i.label}\` (invalid JS token).`;
      case "multiple-main-exports":
        return `- Found ${i.count} exported main components. Output must contain exactly one main export.`;
      case "nested-main-export":
        return `- \`${i.sceneName}\` illegally contains nested export \`${i.exportName}\`. Helper scenes cannot declare exported components.`;
      case "scene-missing-return":
        return `- \`${i.sceneName}\` is missing a \`return (...)\` block.`;
      case "scene-missing-absolutefill":
        return `- \`${i.sceneName}\` does not include \`<AbsoluteFill>\` inside its returned JSX.`;
      case "main-scene-missing-return":
        return `- Main exported scene \`${i.exportName}\` is missing a \`return (...)\` block.`;
      case "main-scene-missing-absolutefill":
        return `- Main exported scene \`${i.exportName}\` must return JSX rooted in \`<AbsoluteFill>\`.`;
      case "unsafe-audio-spring-constants":
        return "- Do NOT reference `AUDIO_STIFFNESS` or `AUDIO_DAMPING`; use `SPRING_CONFIGS` or explicit safe positive spring values.";
      default:
        return "- Unknown structural issue.";
    }
  });
  return `STRUCTURE VALIDATION FAILED — fix these before anything else:\n${bullets.join("\n")}`;
}

/** Generate, compile, and error-recover a single scene. Never throws. */
async function processScene(
  scene: ScenePlan,
  model: string,
  brand: BrandTokens,
  bypassCache: boolean,
  onProgress: (title: string) => void,
  images?: string[],
  globalBg: string = "arcs",
  continuityContext?: string,
  globalFrameOffset: number = 0,
  sfxUrls: Record<string, string> = {},
  /** Camera state inherited from the previous scene — enables zoom continuity on cameraPan cuts */
  initialCameraState: CameraEndState = DEFAULT_CAMERA_STATE,
  /** MorphPortal rect from the previous scene's morphExport — passed as MORPH_FROM scope to compiler */
  morphFrom: { x: number; y: number; w: number; h: number } | null = null,
  /** Music URL for useSpectrum/useBassKick hooks in generated scenes */
  musicUrl: string | null = null,
  creativeBrief?: import("@/types/generation").CreativeBrief | null,
  backbone?: import("@/types/generation").NarrativeBackbone | null,
): Promise<CompiledScene> {
  const key = cacheKey(scene, brand);

  if (!bypassCache && sceneCache.has(key)) {
    onProgress(scene.title);
    return sceneCache.get(key)!;
  }

  onProgress(scene.title);

  // Guard: empty prompt → skip generation and return placeholder immediately
  if (!scene.prompt?.trim()) {
    console.warn(`Scene "${scene.title}" has an empty prompt — skipping generation`);
    return {
      Component: createPlaceholderScene(scene.title),
      durationInFrames: scene.durationInFrames,
      code: "",
      title: scene.title,
      prompt: scene.prompt,
      skills: scene.skills,
    };
  }

  // Use scene-specific image ordering (imageIndex becomes ATTACHED_IMAGES[0])
  // Multi-screenshot support: when imageIndices is set, collect all referenced images
  const sceneImages = scene.imageIndices && scene.imageIndices.length > 0 && images
    ? scene.imageIndices.filter(idx => idx >= 0 && idx < images!.length).map(idx => images![idx])
    : reorderImagesForScene(images, scene);

  // If this scene continues from the same app as the previous scene,
  // hint the generator to use a persistent shell pattern
  const enrichedScene = (scene as any)._isNavigationContinuation
    ? {
        ...scene,
        prompt: scene.prompt + "\n\nNAVIGATION CONTEXT: This scene shows the SAME product as the previous scene (same sidebar/app shell). Use premium-app-walkthrough pattern: keep sidebar and topbar persistent, only transition the main content area. Match the sidebar items and app name from the previous scene.",
      }
    : scene;

  // Resolve model — aha-moment scenes get thinking budget added (still free tier)
  const resolvedModel = resolveModel(scene.skills[0] ?? "", model, (scene as any).isAhaMoment ?? false);
  if (resolvedModel !== model) {
    console.log(`Model routing: "${scene.title}" (${scene.skills.join("+")}) → ${resolvedModel}`);
  }

  // Pre-compute cursor steps from waypoints for direct scope injection into compileCode.
  // This ensures cursor animation works even when the LLM mangles its CURSOR_STEPS declaration.
  const pipelineCursorSteps = scene.cursorWaypoints?.length
    ? computeCursorStepsData(scene.cursorWaypoints)
    : [];

  // First attempt
  try {
    const code = await consumeSceneGeneration(enrichedScene, resolvedModel, brand, undefined, sceneImages, continuityContext, "force", initialCameraState);
    if (code.trim()) {
      const structureIssues = detectSceneStructureIssues(code);
      const result =
        structureIssues.length > 0
          ? { Component: null, error: formatStructureIssuesForRetry(structureIssues) }
          : compileCode(
              code,
              sceneImages,
              brand as Record<string, string>,
              scene.voiceoverAudioUrl ?? null,
              scene.wordTimings ?? [],
              (scene.uiSchema as unknown as Record<string, unknown> | null) ?? null,
              globalBg,
              globalFrameOffset,
              (morphFrom ?? scene.morphImport?.rect ?? null),
              sfxUrls,
              {},
              initialCameraState,
              (scene as any).stockFootage ?? null,
              scene.featureHeader ?? null,
              musicUrl,
              brand.logo ?? null,
              scene.highlightWords ?? [],
              scene.visualState ?? null,
              scene.visualAnchor ?? null,
              scene.musicMood ?? "energetic-precise",
              (scene as any).skillComposition ?? null,
              pipelineCursorSteps,
            );
      if (!result.error && result.Component) {
        let finalCode = code;
        let finalComponent = result.Component;
        let auditScore: number | undefined;

        const tryQualityRetry = async (fixContext: string) => {
          try {
            const qualityCode = await consumeSceneGeneration(enrichedScene, resolvedModel, brand, fixContext, sceneImages, continuityContext, "force", initialCameraState);

            if (!qualityCode.trim()) return false;
            const qualityResult = compileCode(
              qualityCode,
              sceneImages,
              brand as Record<string, string>,
              scene.voiceoverAudioUrl ?? null,
              scene.wordTimings ?? [],
              (scene.uiSchema as unknown as Record<string, unknown> | null) ?? null,
              globalBg,
              globalFrameOffset,
              (morphFrom ?? scene.morphImport?.rect ?? null),
              sfxUrls,
              {},
              initialCameraState,
              (scene as any).stockFootage ?? null,
              scene.featureHeader ?? null,
              musicUrl,
              brand.logo ?? null,
              scene.highlightWords ?? [],
              scene.visualState ?? null,
              scene.visualAnchor ?? null,
              scene.musicMood ?? "energetic-precise",
              (scene as any).skillComposition ?? null,
              pipelineCursorSteps,
            );
            if (!qualityResult.error && qualityResult.Component) {
              finalCode = qualityCode;
              finalComponent = qualityResult.Component;
              return true;
            }
          } catch {
            // non-fatal
          }
          return false;
        };

        const fastCheck = fastQualityCheck(code, scene.intent);
        try {
          if (!fastCheck.passed) {
            // Cheap targeted critique for non-compliant scenes.
            const critiqueRes = await fetch("/api/critique", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code,
                prompt: scene.prompt,
                issues: fastCheck.issues,
                intent: scene.intent,
                skills: scene.skills,
              }),
            });
            if (critiqueRes.ok) {
              const critique = await critiqueRes.json() as { hasIssues: boolean; fixPrompt: string };
              if (critique.hasIssues && critique.fixPrompt?.trim()) {
                const fastContext = `## MANDATORY FIX -- apply before anything else:
${critique.fixPrompt}

FAST QUALITY CHECK FAILED.
Detected issues: ${fastCheck.issues.join(", ")}`;
                const retried = await tryQualityRetry(fastContext);
                if (retried) {
                  auditScore = 75;
                  console.log(`Quality retry succeeded for "${scene.title}"`);
                }
              }
            }
          } else if (shouldDeepAuditScene(scene)) {
            // Non-blocking prewarm: populate audit cache for clean scenes
            if (finalCode?.trim()) {
              fetch("/api/audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _prewarm: true, code: finalCode, score: 82 }),
              }).catch((err) => console.warn("[Audit prewarm] non-fatal:", err)); // deliberately fire-and-forget, never blocking
            }
            // Expensive full audit only for AHA scenes and critical-path cases.
            const auditRes = await fetch("/api/audit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code,
                prompt: scene.prompt,
                brand: brand as Record<string, string>,
                creativeBrief,
                backbone,
              }),
            });
            if (auditRes.ok) {
              const audit = await auditRes.json() as {
                passed: boolean;
                score: number;
                issues: string[];
                fixes: string[];
              };
              auditScore = audit.score;
              console.log(`Audit "${scene.title}": score=${audit.score}, passed=${audit.passed}`);
              if (!audit.passed && audit.score < 70 && audit.fixes?.length > 0) {
                const primaryFix = audit.fixes[0] ?? "";
                const fixContext = `## MANDATORY FIX -- implement this FIRST before anything else:
${primaryFix}

The previous code had these quality issues that must be resolved:
${audit.issues.map(i => `- ${i}`).join("\n")}

Regenerate the complete component with these fixes applied.`;
                const retried = await tryQualityRetry(fixContext);
                if (retried) {
                  auditScore = 75;
                  console.log(`Quality retry succeeded for "${scene.title}"`);
                }
              }
            }
          }
        } catch {
          /* non-fatal quality gate failures should not block scene */
        }

        const compiled: CompiledScene = {
          Component: finalComponent,
          durationInFrames: scene.durationInFrames,
          code: finalCode,
          title: scene.title,
          prompt: scene.prompt,
          skills: scene.skills,
          imageIndex: scene.imageIndex,
          cursorWaypoints: scene.cursorWaypoints,
          transition: scene.transition,
          exitAnchor: (scene as any).exitAnchor,
          morphExport: scene.morphExport,
          auditScore,
          hasVoiceover: !!scene.voiceoverAudioUrl,
          voiceoverAudioUrl: scene.voiceoverAudioUrl ?? null,
          wordTimings: scene.wordTimings ?? [],
          isAhaMoment: (scene as any).isAhaMoment ?? false,
          emotionalIntent: (scene as any).emotionalIntent,
          musicVolume: (scene as any).musicVolume,
          creativeBrief,
          backbone,
          uiSchema: (scene.uiSchema as unknown as Record<string, unknown> | null) ?? null,
          highlightWords: scene.highlightWords ?? [],
          visualState: scene.visualState ?? null,
          visualAnchor: scene.visualAnchor ?? null,
          featureHeader: scene.featureHeader ?? null,
          stockFootage: (scene as any).stockFootage ?? null,
          musicMood: scene.musicMood ?? "energetic-precise",
          skillComposition: (scene as any).skillComposition ?? null,
          pipelineCursorSteps,
        };
        sceneCache.set(key, compiled);
        return compiled;
      }

      // Log the actual error so it's visible in the browser console for debugging
      console.error(`[Scene "${scene.title}"] Compile error (attempt 1):`, result.error);

      // Retry with error context + skill fallback (let LLM pick an alternative skill)
      try {
        const failedSkills = enrichedScene.skills.join(", ");
        const errMsg = result.error ?? "JSX or syntax error";

        // Extract Babel code-frame lines (everything after the first line)
        const errLines = errMsg.split('\n');
        const errFirstLine = errLines[0];
        const codeFrame = errLines.length > 1 ? `\nCode at failure point:\n${errLines.slice(1, 8).join('\n')}` : "";

        // Extract line/column hint for targeted diagnosis
        const lineColMatch = errFirstLine.match(/\((\d+):(\d+)\)/);
        const lineColHint = lineColMatch ? ` at line ${lineColMatch[1]}` : "";

        // ── Classify error type to provide a targeted fix strategy ────────────
        // isDanglingTernary: `?` on its own line after a comment that broke
        // the expression context — the #1 Babel "Unexpected token" pattern.
        const isDanglingTernary =
          /Unexpected token/i.test(errFirstLine) &&
          (errMsg.includes('\n    ?') || errMsg.includes('\n  ?') || errMsg.includes('\n?'));
        const isUnclosedExprConst = /Unexpected keyword ['"]?const['"]?/i.test(errFirstLine);
        const isUnclosedBracket = /Unexpected token.*(?:,|\)|]|})/i.test(errFirstLine);
        const isJsxParseError = !isDanglingTernary && !isUnclosedExprConst && /unexpected token|unterminated|expected/i.test(errFirstLine);
        const isUndefinedVar = /is not defined|cannot access|ReferenceError/i.test(errFirstLine);
        const isRuntimeError = /TypeError|cannot read|null|undefined/i.test(errFirstLine);

        const errorStrategy = isDanglingTernary
          ? `- DANGLING TERNARY${lineColHint}: A comment line was placed between the ternary condition and its \`?\` operator. This breaks the expression context.\n  WRONG: condition\\n// any comment\\n  ? value : other\n  RIGHT: condition\\n  ? value // comment after operator is safe\\n  : other\n  RULE: condition and \`?\` must be on adjacent lines — no blank lines, no comments between them.`
          : isUnclosedExprConst
          ? `- UNBALANCED BRACKETS${lineColHint}: A new \`const\` was opened while a previous [ or { was still unclosed. Close every bracket before starting a new declaration.`
          : isUnclosedBracket
          ? `- UNEXPECTED TOKEN${lineColHint}: A bracket was closed where the parser didn't expect one. Check for double-closing or mismatched { } [ ] ( ).`
          : isJsxParseError
          ? `- JSX PARSE ERROR${lineColHint}: Simplify component structure. Avoid nested ternaries in JSX. Use simple conditional rendering: {flag && <El />}.`
          : isUndefinedVar
          ? `- UNDEFINED VARIABLE${lineColHint}: A variable was used before declaration. Guard with optional chaining (?.) and ensure all arrays/objects are declared before use.`
          : isRuntimeError
          ? `- RUNTIME ERROR${lineColHint}: Add null checks. Guard all array accesses with ?. e.g. ATTACHED_IMAGES?.[0], UI_SCHEMA?.sections?.[0].`
          : `- SYNTAX ERROR${lineColHint}: Check for unclosed brackets, missing commas, or invalid template literals.`;

        const retryErrorCtx = `COMPILATION FAILED — the previous attempt could not be rendered.

Error: ${errFirstLine}${codeFrame}

Failed skills: ${failedSkills}

FIX STRATEGY:
${errorStrategy}

RETRY INSTRUCTIONS:
- Do NOT repeat the same code that caused the error
- Use only built-in scope variables (BRAND, spring, interpolate, useCurrentFrame, AbsoluteFill, Sequence, Audio)
- Avoid complex component patterns — use simple inline JSX
- Keep all arrays (particles, items, etc.) defined OUTSIDE the component function
- SAFE MODE FOR SYNTAX: Do NOT use Array.from() with nested object returns. Do NOT define helper functions. Use only simple literal arrays/objects.
- Guard all optional values: ATTACHED_IMAGES?.[0], UI_SCHEMA?.sections?.[0]
- No template literal expressions inside JSX string attributes`;
        const retryCode = await consumeSceneGeneration(
          enrichedScene,
          resolvedModel,
          brand,
          retryErrorCtx,
          sceneImages,
          continuityContext,
          "fallback",
          initialCameraState,
        );
        if (retryCode.trim()) {
          const retryResult = compileCode(
            retryCode,
            sceneImages,
            brand as Record<string, string>,
            scene.voiceoverAudioUrl ?? null,
            scene.wordTimings ?? [],
            (scene.uiSchema as unknown as Record<string, unknown> | null) ?? null,
            globalBg,
            globalFrameOffset,
            (morphFrom ?? scene.morphImport?.rect ?? null),
            sfxUrls,
            {},
            initialCameraState,
            (scene as any).stockFootage ?? null,
            scene.featureHeader ?? null,
            musicUrl,
            brand.logo ?? null,
            scene.highlightWords ?? [],
            scene.visualState ?? null,
            scene.visualAnchor ?? null,
            scene.musicMood ?? "energetic-precise",
            (scene as any).skillComposition ?? null,
            pipelineCursorSteps,
          );
          if (retryResult.error) {
            console.error(`[Scene "${scene.title}"] Compile error (retry):`, retryResult.error);
          }
          if (!retryResult.error && retryResult.Component) {
            const compiled: CompiledScene = {
              Component: retryResult.Component,
              durationInFrames: scene.durationInFrames,
              code: retryCode,
              title: scene.title,
              prompt: scene.prompt,
              skills: scene.skills,
              imageIndex: scene.imageIndex,
              cursorWaypoints: scene.cursorWaypoints,
              transition: scene.transition,
              exitAnchor: (scene as any).exitAnchor,
              morphExport: scene.morphExport,
              hasVoiceover: !!scene.voiceoverAudioUrl,
              voiceoverAudioUrl: scene.voiceoverAudioUrl ?? null,
              wordTimings: scene.wordTimings ?? [],
              creativeBrief,
              backbone,
              uiSchema: (scene.uiSchema as unknown as Record<string, unknown> | null) ?? null,
              highlightWords: scene.highlightWords ?? [],
              visualState: scene.visualState ?? null,
              visualAnchor: scene.visualAnchor ?? null,
              featureHeader: scene.featureHeader ?? null,
              stockFootage: (scene as any).stockFootage ?? null,
              musicMood: scene.musicMood ?? "energetic-precise",
              skillComposition: (scene as any).skillComposition ?? null,
              pipelineCursorSteps,
              };

            sceneCache.set(key, compiled);
            return compiled;
          }
        }
      } catch (retryErr) {
        console.error(`[Scene "${scene.title}"] Retry threw:`, retryErr);
      }
    }
  } catch (outerErr) {
    console.error(`[Scene "${scene.title}"] Generation threw:`, outerErr);
  }

  console.error(
    `[VideoGen] ❌ Scene "${scene.title}" — BOTH compile attempts failed. Falling back to placeholder.\n` +
    `Check [Scene "${scene.title}"] Compile error logs above this line for the exact error.`
  );
  return {
    Component: createPlaceholderScene(scene.title, "Generation failed — click Regenerate on this scene to retry"),
    durationInFrames: scene.durationInFrames,
    code: "",
    title: scene.title,
    prompt: scene.prompt,
    skills: scene.skills,
  };
}

export interface FullVideoProgress {
  current: number;
  total: number;
  sceneTitle: string;
}

// Skills that benefit from a more capable model — cursor demos, reconstructed UI, and
// complex data-flow scenes require longer reasoning to produce pixel-accurate code.

/**
 * Resolve which model to use for a given skill/scene.
 * For aha-moment scenes on flash:none — upgrade to flash:medium (adds a thinking
 * budget). This is still flash tier (free-compatible) but with reasoning enabled,
 * significantly improving output quality for the single most important scene.
 * Full pro auto-upgrade is disabled — free tier has 0 pro requests and 429s fast.
 */
/** Build a visual continuity summary from a completed scene.
 *  Passed to the next scene's prompt so the LLM maintains consistent visual language.
 *  Now includes the Visual Thread exit state — the "handoff coordinate" that the next scene picks up. */
function buildContinuityContext(prev: CompiledScene, prevPlan: ScenePlan, brand: BrandTokens, nextPlan?: ScenePlan): string {
  const emotion = prevPlan.emotionalIntent ?? "";
  const skills = prevPlan.skills.slice(0, 2).join(" + ");
  const isAha = prevPlan.isAhaMoment ? " (AHA MOMENT)" : "";
  const colorTemp = emotion === "RELIEF" || emotion === "CONFIDENCE"
    ? "warm, open, bright — the pain is resolved"
    : emotion === "FRUSTRATION" || emotion === "PAIN"
    ? "cold, compressed, desaturated — still in problem territory"
    : "match the brand palette established in earlier scenes";

  // Visual Thread exit state — the global motif's final position/state from the previous scene
  const va = (prevPlan as any).visualAnchor as { icon: string; colorFrom: string; colorTo: string; label: string } | undefined;
  const visualThreadBlock = va
    ? `\nVISUAL THREAD HANDOFF: The visual anchor "${va.icon}" (${va.label}) exited the previous scene in the following state:
- If previous was FRUSTRATION/PAIN: anchor was in broken state (color: ${va.colorFrom}), jittering, positioned center-stage
- If previous was RELIEF/CONFIDENCE/AHA: anchor was in resolved state (color: ${va.colorTo}), glowing, settled with GlowBloom
This scene must open with the anchor already in that exit state — do NOT re-introduce it from scratch. The viewer tracks it across scenes as a continuous element. Then evolve it further: dim it (if heading toward a darker emotion) or let it grow/intensify (if heading toward resolution).`
    : "";

  // Global Visual Thread note — the design motif (ring/shape/color wash) must persist
  const visualThreadNote = `\nGLOBAL VISUAL THREAD: Identify what geometric motif or persistent element was established in the previous scene. This scene MUST contain that same element, evolved to match its current emotional state. It should appear early (Act 1) and maintain its established position/size unless the story calls for explicit transformation.`;

  // Explicit Director Visual State from the plan (the backbone's intent)
  const visualStateDirective = nextPlan?.visualState
    ? `\nDIRECTOR VISUAL STATE: ${nextPlan.visualState}`
    : "";

  return `Previous scene: "${prev.title}"${isAha} — skills: ${skills}${emotion ? `, emotional tone: ${emotion}` : ""}.
Visual continuity rules for THIS scene:
- Keep BRAND.bg (${brand.bg}) as the AbsoluteFill background — never drift from it
- Font family must remain ${brand.font ?? "Inter"} on all text elements
- Card border-radius, shadow elevation, and spacing must match the established visual language
- If the previous scene showed a sidebar/app shell, maintain the same app chrome identity
- Color temperature: ${colorTemp}${visualThreadBlock}${visualThreadNote}${visualStateDirective}`;
}

function resolveModel(skill: string, userModel: string, isAhaMoment = false): string {
  // Aha-moment scene on plain flash → add thinking budget (still free tier)
  if (isAhaMoment && userModel.endsWith(":none") && userModel.includes("flash")) {
    const upgraded = userModel.replace(":none", ":medium");
    console.log(`AhaMoment model upgrade: ${userModel} → ${upgraded}`);
    return upgraded;
  }
  return userModel;
}

// Sequential generation is more reliable against upstream rate limits/timeouts.
const CONCURRENCY = 1;

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

export function useFullVideoGeneration() {
  const [isPlanning, setIsPlanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<FullVideoProgress | null>(null);
  const [scenes, setScenes] = useState<CompiledScene[]>([]);
  const [masterComponent, setMasterComponent] =
    useState<React.ComponentType | null>(null);
  const [masterCode, setMasterCode] = useState<string | null>(null);
  const [masterVoiceovers, setMasterVoiceovers] = useState<Record<string, string>>({});
  const [totalDuration, setTotalDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<{
    scenes: ScenePlan[];
    brand: BrandTokens;
    imageDescriptions?: string[];
    screenFlow?: ScreenFlow;
    bgSkill?: string;
    globalBg?: string;
    globalVisualThread?: string;
    edges?: import("@/types/generation").FlowEdge[];
    creativeBrief?: import("@/types/generation").CreativeBrief | null;
    backbone?: import("@/types/generation").NarrativeBackbone | null;
  } | null>(null);
  const [pendingFlow, setPendingFlow] = useState<{
    images: string[];
    detectedFlow?: ScreenFlow;
  } | null>(null);
  const [isFlowDetecting, setIsFlowDetecting] = useState(false);
  const [isPrefetchingAudio, setIsPrefetchingAudio] = useState(false);
  const sfxUrlsRef = useRef<Record<string, string>>({});
  const musicUrlRef = useRef<string | null>(null);
  const [regeneratingSceneIndex, setRegeneratingSceneIndex] = useState<
    number | null
  >(null);
  const [musicFetchFailed, setMusicFetchFailed] = useState(false);

  const pendingModelRef = useRef<string>("gemini-2.5-flash:none");
  const pendingImagesRef = useRef<string[]>([]);
  const pendingBrandRef = useRef<BrandTokens>(DEFAULT_BRAND);
  const pendingLogoImageRef = useRef<string | null>(null);
  const pendingScreenFlowRef = useRef<ScreenFlow | undefined>(undefined);
  const pendingPromptRef = useRef<string>("");
  const pendingDescriptionsRef = useRef<string[]>([]);
  const effectiveGlobalBgRef = useRef<string>("arcs");

  /** Core generation loop — runs scenes sequentially with brand threading. */
  const runGeneration = useCallback(
    async (
      planScenes: ScenePlan[],
      model: string,
      brand: BrandTokens,
      images: string[] = [],
      screenFlow?: ScreenFlow,
      globalBg: string = "arcs",
      globalVisualThread?: string,
      edges?: import("@/types/generation").FlowEdge[],
      creativeBrief?: import("@/types/generation").CreativeBrief | null,
      backbone?: import("@/types/generation").NarrativeBackbone | null,
    ) => {
      setIsGenerating(true);
      setError(null);
      setScenes([]);
      setMasterComponent(null);
      setMasterCode(null);

      try {
        // Enrich each scene's prompt with its confirmed transition context.
        // Only applied when screenFlow is available and the scene has an imageIndex.
        const enrichedScenes = planScenes.map((scene) => {
          if (!screenFlow || scene.imageIndex === undefined) return scene;
          const transition = screenFlow.transitions.find(
            (t) => t.from === scene.imageIndex,
          );
          if (!transition) return scene;
          const actionDesc = transition.action
            ? `"${transition.action}" (${transition.type})`
            : transition.type;
          const contextBlock = `\n\n## STORY FLOW CONTEXT\nThis scene shows screen ${scene.imageIndex + 1} of the user journey. After this screen the user performs: ${actionDesc}. Animate the UI to naturally lead the viewer toward that interaction.`;
          return { ...scene, prompt: scene.prompt + contextBlock };
        });

        // Detect same-app navigation sequences for persistent shell optimization
        const uiSchemasByImageIndex: Record<number, Record<string, unknown>> = {};
        for (const scene of planScenes) {
          if (scene.imageIndex != null && scene.uiSchema) {
            uiSchemasByImageIndex[scene.imageIndex] = scene.uiSchema as unknown as Record<string, unknown>;
          }
        }
        const scenesWithNavContext = detectNavigationSequences(enrichedScenes, uiSchemasByImageIndex);

        // Apply FlowEdge.carryOver — explicit planner signals for UI/camera state carry
        // carryOver.ui → marks the destination scene as a navigation continuation (persistent shell)
        // carryOver.camera → builds a set of scene indices where camera should not reset to 1.0
        const edgeCameraCarrySet = new Set<number>();
        if (edges?.length) {
          for (const edge of edges) {
            const dest = scenesWithNavContext[edge.to];
            if (!dest) continue;
            if (edge.carryOver?.ui && !(dest as any)._isNavigationContinuation) {
              (dest as any)._isNavigationContinuation = true;
              console.log(`FlowEdge ui carryOver: scene[${edge.to}] "${dest.title}" marked as navigation continuation`);
            }
            if (edge.carryOver?.camera) {
              edgeCameraCarrySet.add(edge.to);
              console.log(`FlowEdge camera carryOver: scene[${edge.to}] "${dest.title}" will inherit camera state`);
            }
          }
        }

        const compiledScenesArr: CompiledScene[] = new Array(scenesWithNavContext.length);
        const sceneOffsets = calculateSceneOffsets(scenesWithNavContext);

        for (let i = 0; i < scenesWithNavContext.length; i += CONCURRENCY) {
          const batch = scenesWithNavContext.slice(i, i + CONCURRENCY);

          setProgress({
            current: i + 1,
            total: planScenes.length,
            sceneTitle: batch[0].title,
          });

          // Pass the previous scene's visual context to maintain continuity
          // Only available from scene 2 onwards; skip for scene 0 (first scene, no predecessor)
          const prevCompiled = i > 0 ? compiledScenesArr[i - 1] : undefined;
          const prevPlan = i > 0 ? scenesWithNavContext[i - 1] : undefined;
          const nextPlan = batch[0]; // Current scene we are about to generate
          const continuityBase = prevCompiled && prevPlan
            ? buildContinuityContext(prevCompiled, prevPlan, brand, nextPlan)
            : undefined;

          // Build accumulated global palette summary from ALL completed scenes (not just prev-1)
          // This prevents the LLM from forgetting the visual language established in scene 0 by scene 8.
          let globalPaletteSummary = "";
          if (i > 1) {
            const completedSceneNotes = compiledScenesArr
              .slice(0, i)
              .filter(Boolean)
              .map((_, idx) => {
                const sp = scenesWithNavContext[idx];
                if (!sp) return null;
                return `Scene ${idx + 1} "${sp.title}": [${sp.skills.slice(0, 2).join("+")}] | emotion: ${sp.emotionalIntent ?? "?"} | vol: ${sp.musicVolume ?? 1.0}`;
              })
              .filter(Boolean);
            if (completedSceneNotes.length > 0) {
              globalPaletteSummary = `\n\nGLOBAL STYLE CONTINUITY (${completedSceneNotes.length} scenes completed — DO NOT DEVIATE from these established choices):\n${completedSceneNotes.join("\n")}\n- Palette: bg=${brand.bg}, primary=${brand.primary}, font=${brand.font ?? "Inter"} — MUST match ALL scenes`;
            }
          }

          // Prepend the global visual thread (from planner) to every scene's continuity block
          const continuityCtx = globalVisualThread
            ? `GLOBAL VISUAL THREAD: ${globalVisualThread}\n\n${continuityBase ?? ""}${globalPaletteSummary}`.trim()
            : continuityBase ? `${continuityBase}${globalPaletteSummary}`.trim() : undefined;

          const batchResults = await Promise.allSettled(
            batch.map((scene, j) => {
              // Camera continuity: if this scene enters via cameraPan and both this and the
              // previous scene are walkthrough scenes, pass the standard CinematicCamera end
              // state (zoom=1.06) so the next scene begins mid-zoom instead of resetting to 1.0.
              const sceneIdx = i + j;
              const prevPlanScene = sceneIdx > 0 ? scenesWithNavContext[sceneIdx - 1] : undefined;
              const WALKTHROUGH_SKILLS = new Set(["premium-cursor-engine","premium-app-walkthrough","premium-chameleon-ui","premium-scroll-demo"]);
              const sceneIsWalkthrough = scene.skills?.some(s => WALKTHROUGH_SKILLS.has(s));
              const prevIsWalkthrough = prevPlanScene?.skills?.some(s => WALKTHROUGH_SKILLS.has(s));
              // Camera carries over if: (walkthrough skills + cameraPan) OR explicit FlowEdge carryOver.camera
              const cameraCarryOver =
                (scene.transition === "cameraPan" && sceneIsWalkthrough && prevIsWalkthrough) ||
                edgeCameraCarrySet.has(sceneIdx);
              const camState = cameraCarryOver ? CINEMATIC_CAMERA_END : DEFAULT_CAMERA_STATE;

              return processScene(scene, model, brand, false, (title) => {
                setProgress({
                  current: sceneIdx + 1,
                  total: planScenes.length,
                  sceneTitle: title,
                });
              }, images, globalBg, continuityCtx, sceneOffsets[sceneIdx], sfxUrlsRef.current, camState, sceneIdx > 0 ? (compiledScenesArr[sceneIdx - 1]?.morphExport?.rect ?? null) : null, musicUrlRef.current ?? null, creativeBrief, backbone);
            }),
          );

          for (let j = 0; j < batchResults.length; j++) {
            const result = batchResults[j];
            if (result.status === "fulfilled") {
              compiledScenesArr[i + j] = result.value;
            } else {
              compiledScenesArr[i + j] = {
                Component: createPlaceholderScene(batch[j].title),
                durationInFrames: batch[j].durationInFrames,
                code: "",
                title: batch[j].title,
                prompt: batch[j].prompt,
                skills: batch[j].skills,
              };
            }
          }
        }

        const validScenes = enforceRhythmProfile(compiledScenesArr.filter(Boolean));
        const musicStyle = brand.musicStyle ?? brand.accentName ?? "cinematic";
        const musicUrl = musicUrlRef.current ?? MUSIC_TRACKS[musicStyle] ?? "";
        const master = createMasterComponent(validScenes, brand.bg, musicUrl, brand, sfxUrlsRef.current);
        const masterCodeStr = buildMasterCode(validScenes, musicUrl, sfxUrlsRef.current, brand);
        // Total duration accounts for HOLD_FRAMES padding and TRANSITION_FRAMES overlap between scenes
        const total = validScenes.reduce((sum, s) => sum + s.durationInFrames + HOLD_FRAMES, 0)
          - Math.max(0, validScenes.length - 1) * TRANSITION_FRAMES;

        setScenes(validScenes);
        setMasterComponent(() => master);
        setMasterCode(masterCodeStr);
        setMasterVoiceovers(buildVoiceoverMap(validScenes));
        setTotalDuration(total);

      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
      } finally {
        setIsGenerating(false);
        setProgress(null);
      }
    },
    [],
  );

  /** Step 1: Fetch scene plan, then pause for user review. */
  /** Shared plan-fetch logic — called by both approveFlow (with screenFlow) and generateFullVideo (no images). */
  const runPlan = useCallback(
    async (
      prompt: string,
      model: string,
      images: string[],
      imageUserDescriptions: string[] | undefined,
      screenFlow?: ScreenFlow,
      waypointsByImage?: Record<number, CursorWaypoint[]>,
    ) => {
      setIsPlanning(true);
      setError(null);
      setMasterComponent(null);
      setMasterCode(null);
      setScenes([]);
      setTotalDuration(0);
      setPendingPlan(null);

      try {
        // Task 0.4: Include cached brand if images haven't changed
        const imageHash = images.length > 0 ? buildImageHash(images[0]) : "";
        const shouldUseCachedBrand = cachedBrandStore && cachedBrandStore.imageHash === imageHash;
        if (shouldUseCachedBrand) {
          console.log("Plan: using cached brand tokens (skipping brand re-extraction)");
        }

        const planResponse = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            model,
            images: images.length ? images : undefined,
            imageUserDescriptions: imageUserDescriptions?.length ? imageUserDescriptions : undefined,
            screenFlow,
            cachedBrand: shouldUseCachedBrand ? cachedBrandStore!.brand : undefined,
            targetDurationSeconds: 90,
          }),
        });

        if (!planResponse.ok) {
          const errorData = await planResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to generate video plan");
        }

        const data = await planResponse.json();
        const planScenes: ScenePlan[] = data.scenes ?? [];
        const creativeBrief = data.creativeBrief;
        const backbone = data.backbone;
        const brand: BrandTokens = { ...DEFAULT_BRAND, ...(data.brand ?? {}) };
        // Apply uploaded logo image (overrides LLM-extracted URL)
        if (pendingLogoImageRef.current) {
          brand.logo = pendingLogoImageRef.current;
        }
        // Task 0.4: Cache brand for future regenerations
        if (images.length > 0 && data.brand) {
          cachedBrandStore = { imageHash: buildImageHash(images[0]), brand };
        }
        const imageDescriptions: string[] = data.imageDescriptions ?? [];
        const bgSkill: string | undefined = data.bgSkill;
        const globalBgFromPlan: string = data.globalBg ?? "arcs";
        const globalVisualThread: string | undefined = data.globalVisualThread;
        if (!globalVisualThread) {
          console.warn("Plan: globalVisualThread missing from planner response — visual continuity may be weaker");
        }
        const planEdges: import("@/types/generation").FlowEdge[] = data.edges ?? [];

        if (!planScenes.length) {
          throw new Error("No scenes returned from planner");
        }

        // Validate act structure — warn if key emotional beats are missing
        const hasAhaMoment = planScenes.some(s => s.isAhaMoment);
        const hasFrustration = planScenes.some(s => s.emotionalIntent === "FRUSTRATION" || s.emotionalIntent === "PAIN");
        const hasCta = planScenes.some(s => s.emotionalIntent === "URGENCY" || s.skills?.some(sk => sk.includes("cta")));
        if (!hasAhaMoment) console.warn("Plan: no AHA MOMENT scene — marking last non-CTA scene");
        if (!hasFrustration) console.warn("Plan: no FRUSTRATION/PAIN scene — PAS narrative arc incomplete");
        if (!hasCta) console.warn("Plan: no CTA scene detected");
        // Auto-mark aha moment if planner forgot to set it
        if (!hasAhaMoment && planScenes.length > 2) {
          const lastNonCta = [...planScenes].reverse().find(s =>
            !s.skills?.some(sk => sk.includes("cta")) && s.emotionalIntent !== "URGENCY"
          );
          if (lastNonCta) {
            (lastNonCta as any).isAhaMoment = true;
            console.log(`Auto-marked "${lastNonCta.title}" as aha moment`);
          }
        }

        pendingModelRef.current = model;
        pendingBrandRef.current = brand;

        // Apply waypoints from flow step to matching scenes
        const scenesWithWaypoints =
          waypointsByImage && Object.keys(waypointsByImage).length > 0
            ? planScenes.map((scene) => ({
                ...scene,
                cursorWaypoints:
                  scene.imageIndex !== undefined &&
                  (waypointsByImage[scene.imageIndex]?.length ?? 0) > 0
                    ? waypointsByImage[scene.imageIndex]
                    : scene.cursorWaypoints,
              }))
            : planScenes;

        // Apply pacing profile — adjusts durations for rhythmic variety
        const pacedScenes = applyPacingProfile(scenesWithWaypoints);
        const contractedScenes = enforceNarrativeContract(pacedScenes);
        setPendingPlan({ scenes: contractedScenes, brand, imageDescriptions, screenFlow, bgSkill, globalBg: globalBgFromPlan, globalVisualThread, edges: planEdges, creativeBrief, backbone });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Planning failed");
      } finally {
        setIsPlanning(false);
      }
    },
    [],
  );

  /**
   * Step 1: Entry point.
   * - If ≥2 images: detect story flow first, show flow approval step.
   * - Otherwise: go straight to planning.
   */
  const generateFullVideo = useCallback(
    async (prompt: string, model: ModelId, images: string[] = [], imageUserDescriptions?: string[]) => {
      // Stash all args so approveFlow can forward them to runPlan
      pendingImagesRef.current = images;
      pendingPromptRef.current = prompt;
      pendingDescriptionsRef.current = imageUserDescriptions ?? [];
      pendingModelRef.current = model;

      setError(null);
      setMasterComponent(null);
      setMasterCode(null);
      setScenes([]);
      setTotalDuration(0);
      setPendingPlan(null);
      setPendingFlow(null);

      if (images.length >= 2) {
        // For ≤4 images skip the API call but build a synthetic flow with navigate transitions
        // so plan/route.ts still gets a journey map (transitions: [] causes the block to be omitted)
        if (images.length <= 4) {
          console.log(`Skipping flow-analyze for ${images.length} images — using synthetic flow with transitions`);
          const syntheticFlow: ScreenFlow = {
            screens: images.map((_, i) => ({
              index: i,
              description: imageUserDescriptions?.[i]?.trim() || `Screen ${i + 1}`,
            })),
            // Generate navigate transitions between every consecutive pair of screens
            transitions: images.slice(0, -1).map((_, i) => ({
              from: i,
              to: i + 1,
              action: imageUserDescriptions?.[i]?.trim()
                ? `transitions from "${imageUserDescriptions[i]}" to next screen`
                : `navigates from screen ${i + 1} to screen ${i + 2}`,
              type: "navigate" as const,
            })),
            energyLevel: "medium",
            visualComplexity: 0.5,
            uiPace: "slow",
          };
          setPendingFlow({ images, detectedFlow: syntheticFlow });
          setIsFlowDetecting(false);
        } else {
          // Show flow editor immediately (empty), then fill in once detection completes
          setIsFlowDetecting(true);
          setPendingFlow({ images });

          try {
            const res = await fetch("/api/flow-analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ images, userDescriptions: imageUserDescriptions }),
            });
            const data = res.ok ? await res.json() : null;
            const detectedFlow: ScreenFlow | undefined =
              Array.isArray(data?.transitions) && data.transitions.length > 0 ? data : undefined;
            setPendingFlow({ images, detectedFlow });
          } catch {
            // non-fatal — show empty flow for user to fill in
            setPendingFlow({ images });
          } finally {
            setIsFlowDetecting(false);
          }
        }
      } else {
        // No multi-image flow needed — go straight to planning
        await runPlan(prompt, model, images, imageUserDescriptions, undefined, undefined);
      }
    },
    [runPlan],
  );

  /** Step 1b: User approves the flow → run /api/plan WITH the flow.
   *  For video recordings, keyFrameIndices narrows the images to only the
   *  key moments identified by flow-analyze, saving quota and improving quality.
   */
  const approveFlow = useCallback(
    async (
      screenFlow: ScreenFlow,
      waypointsByImage: Record<number, CursorWaypoint[]>,
      descriptions?: string[],
      keyFrameIndices?: number[],
    ) => {
      setPendingFlow(null);
      pendingScreenFlowRef.current = screenFlow;

      // For video recordings: use only key frames for planning (saves API quota,
      // gives planner focused context instead of 20 near-duplicate frames)
      const allImages = pendingImagesRef.current;
      const planImages = keyFrameIndices && keyFrameIndices.length >= 2
        ? keyFrameIndices.map((i) => allImages[i]).filter(Boolean)
        : allImages;

      const allDescs = descriptions ?? pendingDescriptionsRef.current;
      const planDescs = keyFrameIndices && keyFrameIndices.length >= 2
        ? keyFrameIndices.map((i) => allDescs[i] ?? "")
        : allDescs;

      if (keyFrameIndices && keyFrameIndices.length >= 2) {
        console.log(`Approving flow: using ${planImages.length} key frames from ${allImages.length} total`);
      }

      await runPlan(
        pendingPromptRef.current,
        pendingModelRef.current,
        planImages,
        planDescs,
        screenFlow,
        waypointsByImage,
      );
    },
    [runPlan],
  );

  /** Step 2: User confirms (possibly edited) plan — pre-fetches voiceovers then starts generation. */
  const confirmPlan = useCallback(
    async (
      editedScenes: ScenePlan[],
      screenFlow?: ScreenFlow,
      _imageDescriptions?: string[],
      voiceId?: string,
    ) => {
      // ScenePlanEditor calls onConfirm without screenFlow — fall back to the ref
      // that was stored by approveFlow so multi-image story context is preserved.
      const effectiveFlow = screenFlow ?? pendingScreenFlowRef.current;
      pendingScreenFlowRef.current = effectiveFlow;
      const effectiveGlobalBg = pendingPlan?.globalBg ?? "arcs";
      const effectiveGlobalVisualThread = pendingPlan?.globalVisualThread;
      const effectiveEdges = pendingPlan?.edges;
      const creativeBrief = pendingPlan?.creativeBrief;
      const backbone = pendingPlan?.backbone;
      effectiveGlobalBgRef.current = effectiveGlobalBg;
      setPendingPlan(null);
      // Pre-fetch ElevenLabs TTS + SFX + Music in parallel (non-blocking on failure)
      setIsPrefetchingAudio(true);
      const musicStyle = pendingPlan?.brand?.musicStyle ?? "cinematic";
      // Derive dominant mood from the solution/feature scene for music generation
      // Derive dominant music mood from emotionalIntent arc, not just musicMood field.
      // emotionalIntent → music mood mapping (mirrors WhatAStory energy arc):
      const emotionalIntentToMusicMood: Record<string, string> = {
        FRUSTRATION: "tense",
        PAIN: "tense",
        RECOGNITION: "building",
        RELIEF: "uplifting-swell",
        CONFIDENCE: "driving-pulse",
        TRUST: "warm-resolve",
        URGENCY: "driving-pulse",
        EXCITEMENT: "triumphant",
      };

      // Prefer explicit musicMood from solution/feature scenes first,
      // then fall back to emotionalIntent-derived mood from the AHA moment,
      // then from any scene with emotionalIntent,
      // then from first scene's musicMood.
      const ahaMood =
        editedScenes.find((s) => s.isAhaMoment)?.musicMood ??
        (editedScenes.find((s) => s.isAhaMoment)?.emotionalIntent
          ? emotionalIntentToMusicMood[
              editedScenes.find((s) => s.isAhaMoment)!.emotionalIntent!
            ]
          : undefined);

      const dominantMood =
        editedScenes.find((s) => s.intent === "solution")?.musicMood ??
        ahaMood ??
        editedScenes.find((s) => s.intent === "feature")?.musicMood ??
        (editedScenes.find((s) => s.emotionalIntent)?.emotionalIntent
          ? emotionalIntentToMusicMood[
              editedScenes.find((s) => s.emotionalIntent)!.emotionalIntent!
            ]
          : undefined) ??
        editedScenes[0]?.musicMood ??
        undefined;
      const [scenesWithAudio, sfxUrls, musicUrl] = await Promise.all([
        prefetchVoiceovers(editedScenes, voiceId),
        prefetchSfx(),
        prefetchMusic(musicStyle, dominantMood),
      ]);
      sfxUrlsRef.current = sfxUrls;
      musicUrlRef.current = musicUrl;
      setMusicFetchFailed(musicUrl === null);
      if (musicUrl === null) {
        console.warn("Background music fetch failed — video will render without music");
      }
      setIsPrefetchingAudio(false);
      // Phase 2.5: Clamp durationInFrames to match actual audio length
      const scenesWithClampedDuration = scenesWithAudio.map(scene => {
        if (scene.wordTimings && scene.wordTimings.length > 0) {
          const lastTiming = scene.wordTimings[scene.wordTimings.length - 1];
          const audioDurFrames = (lastTiming.endFrame ?? 0) + 15; // 15-frame tail
          if (audioDurFrames > scene.durationInFrames) {
            console.log(`Duration extended: "${scene.title}" ${scene.durationInFrames}→${audioDurFrames}f (audio)`);
            return { ...scene, durationInFrames: audioDurFrames };
          }
        }
        return scene;
      });
      // Phase 3: Auto-align scene durations to match audio timing
      const { scenes: alignedScenes, adjustments } = alignSceneDurations(scenesWithClampedDuration);
      if (adjustments.length > 0) {
        console.log(`Alignment: ${adjustments.length} scene(s) adjusted:`, adjustments.map(a => `"${a.title}" ${a.oldDuration}→${a.newDuration}f`).join(", "));
      }

      // ── Runtime budget guard ──────────────────────────────────────────────────
      // Enforce 60–90 second discipline. WhatAStory never runs over 90s.
      const MAX_VIDEO_FRAMES = 90 * 30; // 2700 frames = 90 seconds at 30fps
      const MIN_SCENE_FRAMES = 90;      // Never compress a scene below 3 seconds
      const totalFrames = alignedScenes.reduce((sum, sc) => sum + sc.durationInFrames, 0);

      let finalScenes = alignedScenes;
      if (totalFrames > MAX_VIDEO_FRAMES) {
        const scale = MAX_VIDEO_FRAMES / totalFrames;
        console.warn(
          `[BudgetGuard] Total duration ${(totalFrames / 30).toFixed(1)}s exceeds 90s cap. ` +
          `Scaling all scenes by ${(scale * 100).toFixed(1)}%.`
        );
        finalScenes = alignedScenes.map((sc) => ({
          ...sc,
          durationInFrames: Math.max(
            MIN_SCENE_FRAMES,
            Math.round((sc.durationInFrames * scale) / 30) * 30 // snap to 30f grid
          ),
        }));
        console.log(
          `[BudgetGuard] After scaling: ${(finalScenes.reduce((s, sc) => s + sc.durationInFrames, 0) / 30).toFixed(1)}s total.`
        );
      }
      // ─────────────────────────────────────────────────────────────────────────

      runGeneration(
        finalScenes,
        pendingModelRef.current,
        pendingBrandRef.current,
        pendingImagesRef.current,
        effectiveFlow,
        effectiveGlobalBg,
        effectiveGlobalVisualThread,
        effectiveEdges,
        creativeBrief,
        backbone,
      );
    },
    [runGeneration],
  );

  /** Re-generate a single scene by index (bypasses cache). */
  const regenerateScene = useCallback(
    async (index: number) => {
      const scene = scenes[index];
      if (!scene) return;

      const model = pendingModelRef.current;
      const brand = pendingBrandRef.current;
      const images = pendingImagesRef.current;
      setRegeneratingSceneIndex(index);

      try {
        const scenePlan: ScenePlan = {
          id: index,
          title: scene.title,
          prompt: scene.prompt,
          skills: scene.skills,
          durationInFrames: scene.durationInFrames,
          imageIndex: scene.imageIndex,
          cursorWaypoints: scene.cursorWaypoints,
          // Preserve narrative + voiceover context so regenerated code keeps VO + emotion
          voiceoverText: (scene as any).voiceoverText,
          voiceoverAudioUrl: scene.voiceoverAudioUrl ?? undefined,
          wordTimings: scene.wordTimings,
          emotionalIntent: scene.emotionalIntent,
          isAhaMoment: scene.isAhaMoment,
          uiSchema: (scene as any).uiSchema,
          // Preserve scene identity context
          visualAnchor: (scene as any).visualAnchor,
          stageDirection: (scene as any).stageDirection,
          transition: scene.transition,
        };

        const sceneOffsets = calculateSceneOffsets(scenes);
        const globalFrameOffset = sceneOffsets[index] ?? 0;

        // Reconstruct camera state and continuity from the previous compiled scene
        const prevCompiledScene = index > 0 ? scenes[index - 1] : undefined;
        const WALKTHROUGH_SKILLS_REGEN = new Set(["premium-cursor-engine","premium-app-walkthrough","premium-chameleon-ui","premium-scroll-demo"]);
        const prevIsWalkthroughRegen = prevCompiledScene?.skills?.some(s => WALKTHROUGH_SKILLS_REGEN.has(s));
        const thisIsWalkthroughRegen = scene.skills?.some(s => WALKTHROUGH_SKILLS_REGEN.has(s));
        const regenCamState = scene.transition === "cameraPan" && thisIsWalkthroughRegen && prevIsWalkthroughRegen
          ? CINEMATIC_CAMERA_END : DEFAULT_CAMERA_STATE;
        const regenContinuity = prevCompiledScene
          ? buildContinuityContext(prevCompiledScene, {
              title: prevCompiledScene.title,
              prompt: prevCompiledScene.prompt,
              skills: prevCompiledScene.skills,
              durationInFrames: prevCompiledScene.durationInFrames,
              id: index - 1,
              emotionalIntent: prevCompiledScene.emotionalIntent,
              isAhaMoment: prevCompiledScene.isAhaMoment,
              visualAnchor: (prevCompiledScene as any).visualAnchor,
            }, brand)
          : undefined;
        const regenMorphFrom = index > 0 ? (scenes[index - 1]?.morphExport?.rect ?? null) : null;
        const updated = await processScene(scenePlan, model, brand, true, () => { }, images, effectiveGlobalBgRef.current ?? "arcs", regenContinuity, globalFrameOffset, sfxUrlsRef.current, regenCamState, regenMorphFrom, musicUrlRef.current ?? null, scene.creativeBrief, scene.backbone);

        setScenes((prev) => {
          const next = [...prev];
          next[index] = updated;
          const brand = pendingBrandRef.current;
          const musicStyle = brand.musicStyle ?? brand.accentName ?? "cinematic";
          const musicUrl = musicUrlRef.current ?? MUSIC_TRACKS[musicStyle] ?? "";
          const master = createMasterComponent(next, brand.bg, musicUrl, brand, sfxUrlsRef.current);
          const masterCodeStr = buildMasterCode(next, musicUrl, sfxUrlsRef.current, brand);
          setMasterComponent(() => master);
          setMasterCode(masterCodeStr);
          setMasterVoiceovers(buildVoiceoverMap(next));
          return next;
        });
      } catch (err) {
        console.error("Scene regeneration failed:", err);
      } finally {
        setRegeneratingSceneIndex(null);
      }
    },
    [scenes],
  );

  /** Re-generate a single scene with an explicit edit instruction appended to its prompt. */
  const regenerateSceneWithEdit = useCallback(
    async (index: number, editInstruction: string, editModel?: string) => {
      const scene = scenes[index];
      if (!scene) return;

      const model = editModel ?? pendingModelRef.current;
      const brand = pendingBrandRef.current;
      const images = pendingImagesRef.current;
      setRegeneratingSceneIndex(index);

      try {
        const scenePlan: ScenePlan = {
          id: index,
          title: scene.title,
          prompt: scene.prompt + `\n\n## USER EDIT REQUEST\n${editInstruction}\nApply this change while keeping all other aspects of the scene intact.`,
          skills: scene.skills,
          durationInFrames: scene.durationInFrames,
          imageIndex: scene.imageIndex,
          cursorWaypoints: scene.cursorWaypoints,
          voiceoverText: (scene as any).voiceoverText,
          voiceoverAudioUrl: scene.voiceoverAudioUrl ?? undefined,
          wordTimings: scene.wordTimings,
          emotionalIntent: scene.emotionalIntent,
          isAhaMoment: scene.isAhaMoment,
          uiSchema: (scene as any).uiSchema,
          visualAnchor: (scene as any).visualAnchor,
          stageDirection: (scene as any).stageDirection,
          transition: scene.transition,
        };

        const sceneOffsets2 = calculateSceneOffsets(scenes);
        const globalFrameOffset2 = sceneOffsets2[index] ?? 0;
        const prevCompiledScene2 = index > 0 ? scenes[index - 1] : undefined;
        const WALKTHROUGH_SKILLS_EDIT = new Set(["premium-cursor-engine","premium-app-walkthrough","premium-chameleon-ui","premium-scroll-demo"]);
        const prevIsWalkthrough2 = prevCompiledScene2?.skills?.some(s => WALKTHROUGH_SKILLS_EDIT.has(s));
        const thisIsWalkthrough2 = scene.skills?.some(s => WALKTHROUGH_SKILLS_EDIT.has(s));
        const editCamState = scene.transition === "cameraPan" && thisIsWalkthrough2 && prevIsWalkthrough2
          ? CINEMATIC_CAMERA_END : DEFAULT_CAMERA_STATE;
        const editContinuity = prevCompiledScene2
          ? buildContinuityContext(prevCompiledScene2, {
              title: prevCompiledScene2.title,
              prompt: prevCompiledScene2.prompt,
              skills: prevCompiledScene2.skills,
              durationInFrames: prevCompiledScene2.durationInFrames,
              id: index - 1,
              emotionalIntent: prevCompiledScene2.emotionalIntent,
              isAhaMoment: prevCompiledScene2.isAhaMoment,
              visualAnchor: (prevCompiledScene2 as any).visualAnchor,
            }, brand)
          : undefined;
        const editMorphFrom = index > 0 ? (scenes[index - 1]?.morphExport?.rect ?? null) : null;
        const updated = await processScene(scenePlan, model, brand, true, () => { }, images, effectiveGlobalBgRef.current ?? "arcs", editContinuity, globalFrameOffset2, sfxUrlsRef.current, editCamState, editMorphFrom, musicUrlRef.current ?? null, scene.creativeBrief, scene.backbone);

        setScenes((prev) => {
          const next = [...prev];
          next[index] = updated;
          const b = pendingBrandRef.current;
          const musicStyle = b.musicStyle ?? b.accentName ?? "cinematic";
          const musicUrl = musicUrlRef.current ?? MUSIC_TRACKS[musicStyle] ?? "";
          setMasterComponent(() => createMasterComponent(next, b.bg, musicUrl, b, sfxUrlsRef.current));
          const masterCodeStr2 = buildMasterCode(next, musicUrl, sfxUrlsRef.current, b);
          setMasterCode(masterCodeStr2);
          setMasterVoiceovers(buildVoiceoverMap(next));
          return next;
        });
      } catch (err) {
        console.error("Scene edit failed:", err);
      } finally {
        setRegeneratingSceneIndex(null);
      }
    },
    [scenes],
  );

  /** Update a scene's code in-place (e.g. after cursor step edits), recompile with images. */
  const editSceneCode = useCallback(
    (index: number | null, newCode: string, images: string[] = []) => {
      if (index === null) return;
      setScenes((prev) => {
        if (!prev[index]) return prev;
        const sceneOffsets = calculateSceneOffsets(prev);
        const sceneWaypoints = prev[index].cursorWaypoints;
        const editCursorSteps = sceneWaypoints?.length ? computeCursorStepsData(sceneWaypoints) : [];
        const result = compileCode(
          newCode,
          images,
          pendingBrandRef.current as Record<string, string>,
          prev[index].voiceoverAudioUrl ?? null,
          prev[index].wordTimings ?? [],
          (prev[index] as any).uiSchema ?? null,
          effectiveGlobalBgRef.current ?? "arcs",
          sceneOffsets[index] ?? 0,
          (prev[index] as any).morphImport?.rect ?? null,
          sfxUrlsRef.current,
          {},
          { zoom: 1, panX: 0, panY: 0 },
          (prev[index] as any).stockFootage ?? null,
          (prev[index] as any).featureHeader ?? null,
          musicUrlRef.current ?? null,
          (pendingBrandRef.current as any)?.logo ?? null,
          (prev[index] as any).highlightWords ?? [],
          (prev[index] as any).visualState ?? null,
          (prev[index] as any).visualAnchor ?? null,
          (prev[index] as any).musicMood ?? "energetic-precise",
          (prev[index] as any).skillComposition ?? null,
          editCursorSteps,
          );
        if (result.error || !result.Component) return prev;
        const next = [...prev];
        next[index] = {
          ...next[index],
          code: newCode,
          Component: result.Component,
        };
        const brand = pendingBrandRef.current;
        const musicStyle = brand.musicStyle ?? brand.accentName ?? "cinematic";
        const musicUrl = musicUrlRef.current ?? MUSIC_TRACKS[musicStyle] ?? "";
        const master = createMasterComponent(next, brand.bg, musicUrl, brand, sfxUrlsRef.current);
        const masterCodeStr = buildMasterCode(next, musicUrl, sfxUrlsRef.current, brand);
        setMasterComponent(() => master);
        setMasterCode(masterCodeStr);
        setMasterVoiceovers(buildVoiceoverMap(next));
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setMasterComponent(null);
    setMasterCode(null);
    setMasterVoiceovers({});
    setScenes([]);
    setTotalDuration(0);
    setError(null);
    setProgress(null);
    setPendingPlan(null);
    setPendingFlow(null);
    setIsFlowDetecting(false);
  }, []);

  const setLogoImage = useCallback((url: string | null) => {
    pendingLogoImageRef.current = url;
  }, []);

  /** Revise the pending plan based on user feedback without restarting from scratch. */
  const [isRevising, setIsRevising] = useState(false);

  const revisePlan = useCallback(
    async (feedback: string) => {
      if (!pendingPlan) return;
      setIsRevising(true);
      setError(null);
      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: pendingPromptRef.current,
            model: pendingModelRef.current,
            images: pendingImagesRef.current.length ? pendingImagesRef.current : undefined,
            imageUserDescriptions: pendingDescriptionsRef.current.length ? pendingDescriptionsRef.current : undefined,
            screenFlow: pendingScreenFlowRef.current,
            cachedBrand: pendingBrandRef.current,
            existingPlan: pendingPlan.scenes,
            refinementFeedback: feedback,
            targetDurationSeconds: 90,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to revise plan");
        }
        const data = await res.json();
        const revisedScenes: ScenePlan[] = data.scenes ?? pendingPlan.scenes;
        // Preserve existing brand — only override if plan response changes something meaningful
        const revisedBrand: BrandTokens = { ...DEFAULT_BRAND, ...pendingBrandRef.current, ...(data.brand ?? {}) };
        if (pendingLogoImageRef.current) revisedBrand.logo = pendingLogoImageRef.current;
        pendingBrandRef.current = revisedBrand;
        setPendingPlan((prev) => prev ? {
          ...prev,
          scenes: revisedScenes,
          brand: revisedBrand,
          globalVisualThread: data.globalVisualThread ?? prev.globalVisualThread,
          edges: data.edges ?? prev.edges,
        } : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to revise plan");
      } finally {
        setIsRevising(false);
      }
    },
    [pendingPlan],
  );

  return {
    generateFullVideo,
    approveFlow,
    confirmPlan,
    regenerateScene,
    regenerateSceneWithEdit,
    editSceneCode,
    isPlanning,
    isFlowDetecting,
    isPrefetchingAudio,
    musicFetchFailed,
    isGenerating,
    progress,
    scenes,
    masterComponent,
    masterCode,
    masterVoiceovers,
    totalDuration,
    error,
    pendingPlan,
    pendingFlow,
    regeneratingSceneIndex,
    reset,
    /** Stable ref holding current brand tokens — read .current for Lambda export */
    pendingBrandRef,
    /** Stable ref holding the confirmed screen flow — available for re-plan scenarios */
    pendingScreenFlowRef,
    /** Set the uploaded logo image (base64 data URL) — merged into brand.logo after plan */
    setLogoImage,
    /** Revise the pending plan based on natural-language feedback */
    revisePlan,
    /** True while revisePlan is re-calling /api/plan */
    isRevising,
  };
}
