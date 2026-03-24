"use client";

import {
  extractComponentCode,
  stripMarkdownFences,
} from "@/helpers/sanitize-response";
import { compileCode, extractComponentBody } from "@/remotion/compiler";
import { alignSceneDurations } from "@/lib/alignScenes";
import type { BrandTokens, CursorWaypoint, ModelId, ScenePlan, ScreenFlow } from "@/types/generation";
import React, { useCallback, useRef, useState } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

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

function cacheKey(scene: ScenePlan, brand: BrandTokens): string {
  const vo = scene.voiceoverText?.slice(0, 40) ?? "";
  const emotion = scene.emotionalIntent ?? "";
  const aha = scene.isAhaMoment ? "aha" : "";
  const wpts = scene.cursorWaypoints?.map((w) => `${w.x.toFixed(2)},${w.y.toFixed(2)}`).join("|") ?? "";
  return `${scene.skills.join(",")}::${brand.primary}::${scene.imageIndex ?? -1}::${scene.durationInFrames}::${scene.prompt.slice(0, 60)}::${vo}::${emotion}::${aha}::${wpts}`;
}

const TRANSITION_FRAMES = 20;
const HOLD_FRAMES = 24; // ~0.8s hold after animations complete before transition begins

// ---------------------------------------------------------------------------
// SceneErrorBoundary — catches ReferenceErrors from LLM-generated code
// (e.g. undefined variables like "BadgeCoin is not defined") that occur
// during React's render phase and cannot be caught with try/catch.
// ---------------------------------------------------------------------------
class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode; sceneName?: string },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode; sceneName?: string }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message ?? String(error) };
  }

  render() {
    if (this.state.hasError) {
      return React.createElement("div", {
        style: {
          position: "absolute", inset: 0,
          background: "#0f0f1a",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8,
        },
      },
        React.createElement("span", {
          style: { color: "#ef4444", fontSize: 13, fontFamily: "monospace" },
        }, "⚠ Render error"),
        React.createElement("span", {
          style: { color: "#555", fontSize: 11, fontFamily: "monospace", maxWidth: 400, textAlign: "center" },
        }, this.state.errorMessage),
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
      SceneErrorBoundary,
      null,
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
    const Wrapped = withTransition(s.Component, s.durationInFrames, i === 0, i === scenes.length - 1, enterType, exitType, exitAnchor);
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
    const intent = sceneIntentMap.find(s => frame >= s.from && frame < s.to)?.emotionalIntent ?? "";
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
    const currentEntry = sceneIntentMap.find(s => frame >= s.from && frame < s.to);
    const nextEntry = sceneIntentMap.find(s => s.from > (currentEntry?.from ?? 0));
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

  // Global background layer — renders animated LightArcBg for light-themed videos
  // Replicates the compiler-scope LightArcBg "arcs" variant inline so the master
  // composition has the same animated arc texture as individual scenes.
  const bgColor_ = brand?.bg || "#f8f9fc";
  const primary_ = brand?.primary || "#6366f1";
  const secondary_ = brand?.secondary || "#ec4899";

  // PersistentBg — renders ONE background for the ENTIRE video across all scenes.
  // This is the core of WhatAStory's "infinite canvas" feel: the background never
  // changes, so cuts feel like camera moves through one world, not separate slides.
  // Light brands: animated arc SVG overlay on brand.bg
  // Dark brands: subtle animated radial mesh gradient on brand.bg
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
      const prevVol = i > 0 ? (scenes[i - 1]?.musicVolume ?? 1.0) * baseVolume : sceneVol;
      rawFrames.push(e.from, e.from + 15);
      rawValues.push(prevVol, sceneVol);
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
      musicUrl
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
          children: React.createElement(
            SceneErrorBoundary,
            { sceneName: scenes[i]?.title ?? `Scene ${i + 1}`, children: null },
            React.createElement(SceneComp),
          ),
        }),
      ),
      // Phase 5.1: Transition SFX
      ...transitionSfxElements,
      // Vignette — emotionalIntent-adaptive dark radial border
      React.createElement(VignetteLayer),
      // Phase 5.2: Persistent section label — feature name in top-left corner
      SectionLabelLayer ? React.createElement(SectionLabelLayer) : null,
      // FilmGrain overlay — topmost layer across entire video
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
      // Reference VOICEOVER_URLS (injected as scope variable by DynamicComp) instead of
      // embedding 100KB+ base64 data URLs inline — keeps masterCode string lean.
      const voiceoverLine = scene.voiceoverAudioUrl
        ? `  const VOICEOVER_AUDIO_URL = typeof VOICEOVER_URLS !== "undefined" ? (VOICEOVER_URLS[${JSON.stringify(String(i))}] ?? null) : null;\n  const WORD_TIMINGS = ${JSON.stringify(scene.wordTimings ?? [])};\n`
        : "";
      return `const Scene${i} = () => {\n${voiceoverLine}${body}\n};`;
    })
    .join("\n\n");

  let offset = 0;
  const sfxSequences: string[] = [];
  const sectionLabelMap: Array<{ from: number; to: number; label: string }> = [];
  const sequences = scenes
    .map((scene, i) => {
      const from = offset;
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

  const musicLine = musicUrl
    ? `    <Audio src={${JSON.stringify(musicUrl)}} volume={0.3} loop />\n`
    : "";

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

export const DynamicAnimation = () => {
  return (
    <AbsoluteFill>
      <_MasterBg />
${musicLine}${allSequences}
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
  return `## BRAND DESIGN SYSTEM (MANDATORY — use these exact values, no exceptions)

BRAND is already injected into scope — DO NOT declare it. Use BRAND.bg, BRAND.primary, etc. directly.

// Reference only — these are the values:
// BRAND.bg        = "${brand.bg}"         — AbsoluteFill background, ALL scene backgrounds
// BRAND.primary   = "${brand.primary}"    — CTA buttons, key accents, active states, glows
// BRAND.secondary = "${brand.secondary}"  — secondary panels, complementary accents
// BRAND.surface   = "${brand.surface}"    — glass card backgrounds (already has correct opacity)
// BRAND.text      = "${brand.text}"       — ALL headline and label text
// BRAND.textMuted = "${brand.textMuted}"  — subtitles, captions, metadata
// BRAND.border    = "${brand.border}"     — glass card borders, divider lines
// BRAND.font      = "${brand.font}"       — fontFamily on every text element
// BRAND.style     = "${brand.style}"      — "dark" | "light" | "neon"
// BRAND.musicStyle = "${brand.musicStyle ?? "cinematic"}" — "energetic" | "calm" | "cinematic" | "corporate" | "playful"`;
}

/** Fetch a background music track for the given style from ElevenLabs. Returns null on failure. */
async function prefetchMusic(style: string): Promise<string | null> {
  try {
    const res = await fetch("/api/music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style }),
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

/** Pre-fetch ElevenLabs voiceover for every scene that has voiceoverText. Runs in parallel. */
async function prefetchVoiceovers(scenes: ScenePlan[], voiceId?: string): Promise<ScenePlan[]> {
  // Deduplicate by voiceover text to avoid redundant ElevenLabs calls
  const textToAudio = new Map<string, { audioUrl: string; wordTimings: ScenePlan["wordTimings"] }>();
  return Promise.all(
    scenes.map(async (scene) => {
      if (!scene.voiceoverText?.trim()) return scene;
      const text = scene.voiceoverText.trim();
      if (textToAudio.has(text)) {
        const cached = textToAudio.get(text)!;
        return { ...scene, voiceoverAudioUrl: cached.audioUrl, wordTimings: cached.wordTimings };
      }
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: scene.voiceoverText, voiceId }),
        });
        if (!res.ok) return scene;
        const { audioUrl, wordTimings } = await res.json();
        if (!audioUrl) return scene;
        const timings = Array.isArray(wordTimings) && wordTimings.length > 0 ? wordTimings : scene.wordTimings;
        if (audioUrl) {
          textToAudio.set(text, { audioUrl, wordTimings: timings });
        }
        return { ...scene, voiceoverAudioUrl: audioUrl, wordTimings: timings };
      } catch {
        return scene; // non-fatal — generation proceeds without audio
      }
    }),
  );
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
            body: JSON.stringify({ image: images[0] }),
          });
          if (vRes.ok) {
            const vData = await vRes.json();
            const vElements: Array<{ label: string; x: number; y: number; w?: number; h?: number }> = vData.elements ?? [];
            // Enrich each waypoint that lacks a box by finding the nearest vision element
            const enriched = scene.cursorWaypoints.map(wp => {
              if (wp.box && wp.box.w > 0) return wp;
              const nearest = vElements.reduce<{ el: typeof vElements[0] | null; d: number }>(
                (best, el) => {
                  const d = Math.hypot(el.x / 1000 - wp.x, el.y / 1000 - wp.y);
                  return d < best.d ? { el, d } : best;
                },
                { el: null, d: Infinity },
              );
              if (nearest.el && nearest.d < 0.2) {
                const el = nearest.el;
                return { ...wp, box: { x: (el.x - (el.w ?? 80) / 2) / 1000, y: (el.y - (el.h ?? 40) / 2) / 1000, w: (el.w ?? 80) / 1000, h: (el.h ?? 40) / 1000 } };
              }
              return wp;
            });
            console.log(`Vision-enriched ${enriched.filter(w => w.box).length}/${enriched.length} user waypoints with box data`);
            scene = { ...scene, cursorWaypoints: enriched };
          }
        } catch { /* non-fatal */ }
      }
      const wpts = scene.cursorWaypoints ?? [];
      console.log(`Cursor path: using ${wpts.length} user-confirmed waypoints for "${scene.title}"`);
      detectedElementsBlock = `\n\n${buildInteractionScript(wpts)}`;
    } else {
      // ── Fallback: auto-detect via /api/vision ──────────────────────────
      // Skip /api/vision only when ALL waypoints already have valid box data.
      // Using .some() was a bug — if only 1/4 waypoints had a box, vision was skipped
      // and the remaining 3 stayed boxless, breaking chameleon overlays on those targets.
      const allHaveBoxData = scene.cursorWaypoints?.length
        ? scene.cursorWaypoints.every(wp => wp.box && wp.box.w > 0)
        : false;
      const needsVisionDetection = !allHaveBoxData;
      if (!needsVisionDetection) {
        console.log(`Skipping /api/vision for "${scene.title}" — box data already present in waypoints`);
      }
      try {
        if (!needsVisionDetection) throw new Error("skip-vision");
        const visionResponse = await fetch("/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: images[0] }),
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
    ? `\n\n## STAGE DIRECTION\n${(scene as any).stageDirection}`
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

  // Timeline Engine: structured event array to decouple timing from raw LLM math
  // The LLM outputs a SCENE_TIMELINE constant — an ordered array of timed events.
  // This prevents hallucinated frame offsets and makes timing logic auditable.
  const dur = scene.durationInFrames;
  const timelineBlock = `

## SCENE TIMELINE (structured timing — MANDATORY output)
Your component MUST declare a SCENE_TIMELINE constant near the top of the function body.
This is an ordered array of timed events that drives all animations in this scene.
Each entry has: t (frame number), type (what fires), and optional meta fields.

Example structure (adapt frame numbers to this scene's ${dur} frame duration):
const SCENE_TIMELINE = [
  { t: 0,   type: "bg-enter" },
  { t: 12,  type: "headline", text: "Main message" },
  { t: 28,  type: "subtext" },
  { t: 45,  type: "ui-reveal" },
  { t: 60,  type: "cursor-start" },
  { t: ${Math.round(dur * 0.7)},  type: "cta-glow" },
  { t: ${Math.round(dur * 0.85)}, type: "hold" },
];

Rules:
- Use SCENE_TIMELINE[n].t as the startFrame for each element's spring/interpolate — never hardcode raw numbers elsewhere
- All frame values MUST be ≤ ${dur} (this scene's duration)
- Cursor events use CURSOR_STEPS/INTERACTION_SCRIPT timings (already calculated) — reference them, don't duplicate
- "hold" marks where animation stops and the scene simply plays out before the transition fires`;

  const scenePrompt = errorContext
    ? `${brandBlock}\n\n${scene.prompt}${detectedElementsBlock}${uiSchemaBlock}${voiceoverBlock}${narrativeBlock}${continuityBlock}${stageDirectionBlock}${visualAnchorBlock}${zoomThroughBlock}${morphImportBlock}${macroZoomBlock}${stockVideoBlock}${featureHeaderBlock}${multiViewBlock}${timelineBlock} \n\nPrevious attempt failed with this error: \n${errorContext} \nPlease fix the issues and regenerate.`
    : `${brandBlock} \n\n${scene.prompt}${detectedElementsBlock}${uiSchemaBlock}${voiceoverBlock}${narrativeBlock}${continuityBlock}${stageDirectionBlock}${visualAnchorBlock}${zoomThroughBlock}${morphImportBlock}${macroZoomBlock}${stockVideoBlock}${featureHeaderBlock}${multiViewBlock}${timelineBlock} `;

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      prompt: scenePrompt,
      model,
      isFollowUp: Boolean(errorContext),
      forcedSkills: skillMode === "force" && scene.skills?.length ? scene.skills : undefined,
      previouslyUsedSkills: skillMode === "fallback" ? (scene.skills ?? []) : undefined,
      frameImages: images?.length ? images : undefined,
    }),
  });

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
    return images;
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

  // First attempt
  try {
    const code = await consumeSceneGeneration(enrichedScene, resolvedModel, brand, undefined, sceneImages, continuityContext);
    if (code.trim()) {
      const result = compileCode(code, sceneImages, brand as Record<string, string>, scene.voiceoverAudioUrl ?? null, scene.wordTimings ?? [], (scene.uiSchema as unknown as Record<string, unknown> | null) ?? null, globalBg, globalFrameOffset, (morphFrom ?? scene.morphImport?.rect ?? null), sfxUrls, {}, initialCameraState, (scene as any).stockFootage ?? null, scene.featureHeader ?? null);
      if (!result.error && result.Component) {
        // ── Quality audit gate ───────────────────────────────────────────────
        // Audit compiled code for visual quality issues. If score < 70, retry
        // with specific fix instructions. Non-fatal — if audit/retry fails,
        // we keep the successfully-compiled original.
        let finalCode = code;
        let finalComponent = result.Component;
        let auditScore: number | undefined;

        // ── Audit gate ────────────────────────────────────────────────────────
        // Audit every successfully-compiled scene. Catches quality issues before
        // they ship. The audit route caches by code hash (5 min TTL) so repeated
        // calls on the same code are free. Score < 70 → quality retry.
        const shouldAudit = true;
        try {
          if (shouldAudit) {
            const auditRes = await fetch("/api/audit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code,
                prompt: scene.prompt,
                brand: brand as Record<string, string>,
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
                const fixContext = `QUALITY AUDIT FAILED (score: ${audit.score}/100). Code compiled but has visual quality issues.\n\nIssues found:\n${audit.issues.map(i => `- ${i}`).join('\n')}\n\nRequired fixes:\n${audit.fixes.map(f => `- ${f}`).join('\n')}\n\nApply ALL fixes and regenerate the complete component.`;
                try {
                  const qualityCode = await consumeSceneGeneration(enrichedScene, resolvedModel, brand, fixContext, sceneImages);
                  if (qualityCode.trim()) {
                    const qualityResult = compileCode(qualityCode, sceneImages, brand as Record<string, string>, scene.voiceoverAudioUrl ?? null, scene.wordTimings ?? [], (scene.uiSchema as unknown as Record<string, unknown> | null) ?? null, globalBg, globalFrameOffset, (morphFrom ?? scene.morphImport?.rect ?? null), sfxUrls, {}, initialCameraState, (scene as any).stockFootage ?? null, scene.featureHeader ?? null);
                    if (!qualityResult.error && qualityResult.Component) {
                      finalCode = qualityCode;
                      finalComponent = qualityResult.Component;
                      auditScore = 75;
                      console.log(`Quality retry succeeded for "${scene.title}"`);
                    }
                  }
                } catch { /* non-fatal — use original compiled result */ }
              }
            }
          }
        } catch { /* audit failure is non-fatal */ }

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
          isAhaMoment: (scene as any).isAhaMoment ?? false,
          emotionalIntent: (scene as any).emotionalIntent,
          musicVolume: (scene as any).musicVolume,
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
        // Classify error type to provide targeted fix strategy
        const isJsxParseError = /unexpected token|jsx|unterminated|expected/i.test(errMsg);
        const isUndefinedVar = /is not defined|cannot access|ReferenceError/i.test(errMsg);
        const isRuntimeError = /TypeError|cannot read|null|undefined/i.test(errMsg);
        const errorStrategy = isJsxParseError
          ? "- JSX PARSE ERROR: Simplify component structure. Use React.createElement instead of JSX. Avoid nested ternaries in JSX."
          : isUndefinedVar
          ? "- UNDEFINED VARIABLE: Add scope guards. Check all variables are declared before use. Use optional chaining (?.) on all external scope refs."
          : isRuntimeError
          ? "- RUNTIME ERROR: Add null checks. Guard all array accesses with optional chaining. Ensure all objects are initialized before use."
          : "- SYNTAX ERROR: Check for unclosed brackets, missing commas, or invalid template literals.";
        const retryErrorCtx = `COMPILATION FAILED — the previous attempt could not be rendered.

Error: ${errMsg}

Failed skills: ${failedSkills}

FIX STRATEGY:
${errorStrategy}

RETRY INSTRUCTIONS:
- Do NOT repeat the same code that caused the error
- Use only built-in scope variables (BRAND, spring, interpolate, useCurrentFrame, AbsoluteFill, Sequence, Audio)
- Avoid complex component patterns — use simple inline JSX
- Keep all arrays (particles, items, etc.) defined OUTSIDE the component function
- Guard all optional values: ATTACHED_IMAGES?.[0], UI_SCHEMA?.sections?.[0]
- No template literal expressions inside JSX string attributes`;
        const retryCode = await consumeSceneGeneration(
          enrichedScene,
          resolvedModel,
          brand,
          retryErrorCtx,
          sceneImages,
          undefined,
          "fallback",
        );
        if (retryCode.trim()) {
          const retryResult = compileCode(retryCode, sceneImages, brand as Record<string, string>, scene.voiceoverAudioUrl ?? null, scene.wordTimings ?? [], (scene.uiSchema as unknown as Record<string, unknown> | null) ?? null, globalBg, globalFrameOffset, (morphFrom ?? scene.morphImport?.rect ?? null), sfxUrls, {}, initialCameraState, (scene as any).stockFootage ?? null, scene.featureHeader ?? null);
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

  console.warn(`Scene "${scene.title}" failed to compile after retry, using placeholder`);
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
function buildContinuityContext(prev: CompiledScene, prevPlan: ScenePlan, brand: BrandTokens): string {
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

  return `Previous scene: "${prev.title}"${isAha} — skills: ${skills}${emotion ? `, emotional tone: ${emotion}` : ""}.
Visual continuity rules for THIS scene:
- Keep BRAND.bg (${brand.bg}) as the AbsoluteFill background — never drift from it
- Font family must remain ${brand.font ?? "Inter"} on all text elements
- Card border-radius, shadow elevation, and spacing must match the established visual language
- If the previous scene showed a sidebar/app shell, maintain the same app chrome identity
- Color temperature: ${colorTemp}${visualThreadBlock}${visualThreadNote}`;
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

  const pendingModelRef = useRef<string>("gemini-2.5-flash:none");
  const pendingImagesRef = useRef<string[]>([]);
  const pendingBrandRef = useRef<BrandTokens>(DEFAULT_BRAND);
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
          const continuityBase = prevCompiled && prevPlan
            ? buildContinuityContext(prevCompiled, prevPlan, brand)
            : undefined;
          // Prepend the global visual thread (from planner) to every scene's continuity block
          const continuityCtx = globalVisualThread
            ? `GLOBAL VISUAL THREAD: ${globalVisualThread}\n\n${continuityBase ?? ""}`.trim()
            : continuityBase;

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
              }, images, globalBg, continuityCtx, sceneOffsets[sceneIdx], sfxUrlsRef.current, camState, sceneIdx > 0 ? (compiledScenesArr[sceneIdx - 1]?.morphExport?.rect ?? null) : null);
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

        const validScenes = compiledScenesArr.filter(Boolean);
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
          }),
        });

        if (!planResponse.ok) {
          const errorData = await planResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to generate video plan");
        }

        const data = await planResponse.json();
        const planScenes: ScenePlan[] = data.scenes ?? [];
        const brand: BrandTokens = { ...DEFAULT_BRAND, ...(data.brand ?? {}) };
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
        setPendingPlan({ scenes: pacedScenes, brand, imageDescriptions, screenFlow, bgSkill, globalBg: globalBgFromPlan, globalVisualThread, edges: planEdges });
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
      effectiveGlobalBgRef.current = effectiveGlobalBg;
      setPendingPlan(null);
      // Pre-fetch ElevenLabs TTS + SFX + Music in parallel (non-blocking on failure)
      setIsPrefetchingAudio(true);
      const musicStyle = pendingPlan?.brand?.musicStyle ?? "cinematic";
      const [scenesWithAudio, sfxUrls, musicUrl] = await Promise.all([
        prefetchVoiceovers(editedScenes, voiceId),
        prefetchSfx(),
        prefetchMusic(musicStyle),
      ]);
      sfxUrlsRef.current = sfxUrls;
      musicUrlRef.current = musicUrl;
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
      runGeneration(
        alignedScenes,
        pendingModelRef.current,
        pendingBrandRef.current,
        pendingImagesRef.current,
        effectiveFlow,
        effectiveGlobalBg,
        effectiveGlobalVisualThread,
        effectiveEdges,
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
        const updated = await processScene(scenePlan, model, brand, true, () => { }, images, effectiveGlobalBgRef.current ?? "arcs", regenContinuity, globalFrameOffset, sfxUrlsRef.current, regenCamState, regenMorphFrom);

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

        const updated = await processScene(scenePlan, model, brand, true, () => { }, images, effectiveGlobalBgRef.current ?? "arcs", undefined, 0, sfxUrlsRef.current);

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
        const result = compileCode(
          newCode,
          images,
          pendingBrandRef.current as Record<string, string>,
          prev[index].voiceoverAudioUrl ?? null,
          prev[index].wordTimings ?? [],
          (prev[index] as any).uiSchema ?? null,
          effectiveGlobalBgRef.current ?? "arcs",
          0,
          (prev[index] as any).morphImport?.rect ?? null,
          sfxUrlsRef.current,
          {},
          { zoom: 1, panX: 0, panY: 0 },
          (prev[index] as any).stockFootage ?? null,
          (prev[index] as any).featureHeader ?? null,
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
  };
}
