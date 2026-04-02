import * as Babel from "@babel/standalone";
import { Lottie } from "@remotion/lottie";
import * as RemotionShapes from "@remotion/shapes";
import { ThreeCanvas } from "@remotion/three";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  interpolateColors,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
// Alias for LLM-generated code that uses either name
const interpolateColor = interpolateColors;

// ---------------------------------------------------------------------------
// Pre-built style constants — injected into every generated component's scope
// so the LLM can reference them directly without re-declaring.
// ---------------------------------------------------------------------------

const getGlassCard = (brand?: any) => {
  const isLight = brand?.style === "light";
  return {
    background: isLight ? "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)" : "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
    backdropFilter: "blur(24px) saturate(150%)",
    WebkitBackdropFilter: "blur(24px) saturate(150%)",
    border: isLight ? "1px solid rgba(255,255,255,0.7)" : "1px solid rgba(255,255,255,0.06)",
    borderTop: isLight ? "1px solid rgba(255,255,255,1.0)" : "1px solid rgba(255,255,255,0.22)",
    borderLeft: isLight ? "1px solid rgba(255,255,255,0.9)" : "1px solid rgba(255,255,255,0.16)",
    borderRadius: 20,
    boxShadow: isLight
      ? "0 8px 32px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.04) inset"
      : "0 12px 40px rgba(0,0,0,0.45), 0 1px 1px rgba(255,255,255,0.18) inset, 0 -1px 0 rgba(0,0,0,0.3) inset",
  };
};

const hex = (color: string, alpha = 1): string => {
  if (typeof color !== "string") return `rgba(0,0,0,${alpha})`;
  const normalized = color.trim();
  if (/^rgba?\(/i.test(normalized)) {
    const parts = normalized.match(/\d+\.?\d*/g)?.map(Number) ?? [0, 0, 0];
    const [r = 0, g = 0, b = 0] = parts;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const raw = normalized.replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw.split("").map((ch) => ch + ch).join("")
      : raw.length === 6
      ? raw
      : "000000";
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// Phase 2: Pro-standard spring configs
// damping:200 = crisp inertial settle (no overshoot) — cinema/agency standard
// damping:8   = elastic pop — only for playful/bouncy elements
// damping:160 = snappy with subtle overshoot — WhatAStory "tactile" standard
const SPRING_CONFIGS = {
  entrance: { damping: 200, stiffness: 120 },   // crisp UI reveal — cards, panels, overlays
  snap: { damping: 160, stiffness: 220 },        // snappy tactile reveal — WhatAStory-tier UI elements that need to feel physical
  float: { damping: 22, stiffness: 70 },         // gentle oscillating float loop
  pop: { damping: 8, stiffness: 150 },           // elastic pop — badges, icons, markers
  cinematic: { damping: 200, stiffness: 80 },    // smooth camera push-in, no overshoot
} as const;

const EASINGS = {
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeInQuad: (t: number) => t * t,
} as const;

// ---------------------------------------------------------------------------
// Pre-built UI Skeleton components — injected into scope so the LLM can
// pass data props without recreating structural layout from scratch.
// ---------------------------------------------------------------------------

interface BrandLike { bg: string; primary: string; secondary: string; surface: string; text: string; textMuted: string; border: string; font?: string; style?: string; name?: string; url?: string; cta?: string; }

const ParallaxLayer = ({ depth = 0.5, children, cameraProgress }: { depth?: number; children: React.ReactNode; cameraProgress: number }) => {
  const scale = 1 + (depth * 0.45) * cameraProgress;
  return React.createElement("div", { style: { position: "absolute", inset: 0, transform: `scale(${scale})`, transformOrigin: "center center", willChange: "transform" } }, children);
};

const SheenOverlay = ({ startFrame, width: w, height: h = "100%", angle = 105 }: { startFrame: number; width: number; height?: string | number; angle?: number }) => {
  const frame = useCurrentFrame();
  const { width: vw } = useVideoConfig();
  const x = interpolate(frame, [startFrame, startFrame + 60], [-vw, vw * 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return React.createElement("div", { style: { position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 5, borderRadius: "inherit" } },
    React.createElement("div", { style: { position: "absolute", inset: 0, background: `linear-gradient(${angle}deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)`, transform: `translateX(${x}px)`, mixBlendMode: "overlay" as any } })
  );
};

const MotionBlurWhip = ({ frame: f, startFrame, duration = 14, maxBlur = 18, children }: { frame: number; startFrame: number; duration?: number; maxBlur?: number; children: React.ReactNode }) => {
  const progress = Math.max(0, Math.min(1, (f - startFrame) / duration));
  const blurPx = Math.sin(progress * Math.PI) * maxBlur;
  return React.createElement("div", { style: { filter: `blur(${blurPx}px)`, willChange: "filter" } }, children);
};

// Phase 2: CameraMotionBlur — cinematic directional motion blur
// shutterAngle: 180° = cinema standard (1/2 shutter rule)
// Applies directional SVG feGaussianBlur with asymmetric stdDeviation
const CameraMotionBlur = ({ children, velocityX = 0, velocityY = 0, shutterAngle = 180, intensity = 1 }: {
  children: React.ReactNode;
  velocityX?: number;  // px/frame horizontal velocity
  velocityY?: number;  // px/frame vertical velocity
  shutterAngle?: number; // degrees (180 = cinema standard)
  intensity?: number;  // 0–2 multiplier
}) => {
  const factor = (shutterAngle / 360) * intensity;
  const blurX = Math.min(Math.abs(velocityX) * factor * 0.35, 24);
  const blurY = Math.min(Math.abs(velocityY) * factor * 0.35, 24);
  if (blurX < 0.4 && blurY < 0.4) return React.createElement(React.Fragment, null, children);
  const filterId = `cmb-${Math.round(blurX * 10)}-${Math.round(blurY * 10)}`;
  return React.createElement(React.Fragment, null,
    React.createElement("svg", { style: { position: "absolute", width: 0, height: 0, overflow: "hidden" } },
      React.createElement("defs", null,
        React.createElement("filter", { id: filterId },
          React.createElement("feGaussianBlur", { stdDeviation: `${blurX.toFixed(1)} ${blurY.toFixed(1)}` }),
        ),
      ),
    ),
    React.createElement("div", { style: { filter: `url(#${filterId})`, willChange: "filter" } }, children),
  );
};

// ---------------------------------------------------------------------------
// ChromaticAberration — R/G/B channel split on fast-motion elements
// ---------------------------------------------------------------------------

/** Applies chromatic aberration (red/blue channel offset) to any element.
 *  Use on fast cursor moves, scene entrances, and CTA reveals for premium feel.
 *  intensity: 0–1 (0=off, 0.3=subtle, 0.7=dramatic, 1=max)
 *  direction: "horizontal" | "vertical" | "radial"
 */
const ChromaticAberration = ({ children, intensity = 0, direction = "horizontal" }: {
  children: React.ReactNode;
  intensity?: number;   // 0–1
  direction?: "horizontal" | "vertical" | "radial";
}) => {
  if (intensity < 0.02) return React.createElement(React.Fragment, null, children);
  const px = intensity * 4; // max 4px offset at full intensity
  const uid = `ca-${Math.round(intensity * 100)}-${direction[0]}`;
  const rDx = direction === "vertical" ? 0 : px;
  const rDy = direction === "vertical" ? -px : 0;
  const bDx = direction === "vertical" ? 0 : -px;
  const bDy = direction === "vertical" ? px : 0;
  return React.createElement(React.Fragment, null,
    // Hidden SVG filter def
    React.createElement("svg", { style: { position: "absolute", width: 0, height: 0, overflow: "hidden" } },
      React.createElement("defs", null,
        React.createElement("filter", { id: uid, x: "-10%", y: "-10%", width: "120%", height: "120%", colorInterpolationFilters: "sRGB" },
          // Red channel — shift right/up
          React.createElement("feColorMatrix", { type: "matrix", values: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", result: "r" }),
          React.createElement("feOffset", { dx: rDx.toFixed(1), dy: rDy.toFixed(1), in: "r", result: "rShift" }),
          // Blue channel — shift left/down
          React.createElement("feColorMatrix", { type: "matrix", values: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0", result: "b" }),
          React.createElement("feOffset", { dx: bDx.toFixed(1), dy: bDy.toFixed(1), in: "b", result: "bShift" }),
          // Green channel — no shift
          React.createElement("feColorMatrix", { type: "matrix", values: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", in: "SourceGraphic", result: "g" }),
          // Merge R + G + B
          React.createElement("feMerge", null,
            React.createElement("feMergeNode", { in: "rShift" }),
            React.createElement("feMergeNode", { in: "g" }),
            React.createElement("feMergeNode", { in: "bShift" }),
          ),
        ),
      ),
    ),
    React.createElement("div", { style: { filter: `url(#${uid})`, willChange: "filter" } }, children),
  );
};

// ---------------------------------------------------------------------------
// GlowBloom — over-bright halo bloom behind any element (Sandwich Video staple)
// ---------------------------------------------------------------------------

/** Returns inline styles for a bloom glow div rendered BEHIND the target element.
 *  Usage: render a <div style={glowBloomStyle(BRAND.primary, 60, 0.5)} /> before the element.
 *  color: hex/rgba glow color (usually BRAND.primary)
 *  blurPx: blur radius (40–80px typical)
 *  opacity: 0.35–0.65 typical
 *  spread: scale factor >1 to make bloom larger than the element (1.4–2.0)
 */
function glowBloomStyle(color: string, blurPx = 55, opacity = 0.45, spread = 1.5): React.CSSProperties {
  return {
    position: "absolute" as const,
    inset: 0,
    background: color,
    filter: `blur(${blurPx}px)`,
    opacity,
    transform: `scale(${spread})`,
    borderRadius: "50%",
    pointerEvents: "none" as const,
    zIndex: -1,
  };
}

/** Wraps children in a bloom glow container. The glow expands outward from the element.
 *  This is the WhatAStory / Sandwich Video signature effect on CTAs, metric reveals, icon reveals.
 */
const GlowBloom = ({ children, color, blurPx = 55, opacity = 0.45, spread = 1.5, animated = false }: {
  children: React.ReactNode;
  color: string;
  blurPx?: number;
  opacity?: number;
  spread?: number;
  animated?: boolean; // slowly breathes the bloom scale
}) => {
  const frame = useCurrentFrame();
  const breathe = animated ? 1 + Math.sin(frame * 0.04) * 0.08 : 1;
  return React.createElement("div", { style: { position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" } },
    React.createElement("div", { style: { ...glowBloomStyle(color, blurPx, opacity, spread * breathe), borderRadius: "inherit" } }),
    children,
  );
};

// ---------------------------------------------------------------------------
// DepthBlur — depth-of-field: blurs a layer based on focus distance
// ---------------------------------------------------------------------------

/** Simulates camera depth-of-field by blurring a background layer.
 *  focusDistance: 0 = sharp (in focus), 1 = maximum blur (far out of focus)
 *  maxBlur: maximum blur in px (6–14px typical for subtle DoF)
 */
const DepthBlur = ({ children, focusDistance = 0, maxBlur = 10 }: {
  children: React.ReactNode;
  focusDistance?: number;  // 0–1
  maxBlur?: number;
}) => {
  const blurPx = Math.max(0, focusDistance * maxBlur);
  if (blurPx < 0.3) return React.createElement(React.Fragment, null, children);
  return React.createElement("div", {
    style: { filter: `blur(${blurPx.toFixed(1)}px)`, willChange: "filter", transition: "filter 0.1s" },
  }, children);
};

// ---------------------------------------------------------------------------
// Phase 3: Audio Sync Hooks — word-level narration timing + beat pulse
// ---------------------------------------------------------------------------

/** Returns the currently spoken word and progress within it, driven by pre-computed word timings. */
function useAudioSync(wordTimings?: Array<{ word: string; startFrame: number; endFrame: number }>) {
  const frame = useCurrentFrame();
  const active = wordTimings?.find((t) => frame >= t.startFrame && frame < t.endFrame) ?? null;
  const wordProgress = active
    ? Math.min(1, (frame - active.startFrame) / Math.max(1, active.endFrame - active.startFrame))
    : 0;
  const completedWords = wordTimings?.filter((t) => frame >= t.endFrame).map((t) => t.word) ?? [];
  return { currentWord: active?.word ?? null, wordProgress, completedWords, wordTimings: wordTimings ?? [] };
}

// BPM for each built-in music style — used to derive MUSIC_BPM scope variable
const TRACK_BPM: Record<string, number> = {
  corporate: 90,
  energetic: 128,
  cinematic: 80,
  calm: 68,
  playful: 110,
};

/** Returns a 0–1 beat pulse value synced to BPM, peaking on each downbeat.
 *  If bpm is omitted, reads MUSIC_BPM from scope (injected per brand.musicStyle).
 *  Sharp attack (0→1 in 15% of beat), slow exponential decay back to 0.
 *  Use for: scale pulse on logo, glow bloom on headline, card bounce on beat. */
function useBeat(bpm?: number, offset: number = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // @ts-ignore — GLOBAL_FRAME_OFFSET injected into scope by compiler
  const gOffset = typeof GLOBAL_FRAME_OFFSET !== "undefined" ? GLOBAL_FRAME_OFFSET : 0;
  // @ts-ignore — MUSIC_BPM injected into scope by compiler (derived from brand.musicStyle)
  const resolvedBpm = bpm ?? (typeof MUSIC_BPM !== "undefined" ? (MUSIC_BPM as number) : 90);
  const beatProgress = ((frame + offset + gOffset) / fps * (resolvedBpm / 60)) % 1;
  // Sharp attack, slow decay — mimics a sidechain compressor
  return beatProgress < 0.15 ? beatProgress / 0.15 : Math.pow(1 - (beatProgress - 0.15) / 0.85, 2);
}

// ---------------------------------------------------------------------------
// useBeatClock — structured beat/bar position for choreographed entrances
// ---------------------------------------------------------------------------

/** Returns full beat/bar position for aligning entrances to musical downbeats.
 *
 *  beat        — which beat within the current bar (0–3 for 4/4 time)
 *  bar         — which 4-beat bar we're in (0-indexed from scene start)
 *  beatProgress — 0→1 within the current beat
 *  barProgress — 0→1 within the current 4-beat bar
 *  isDownbeat  — true on the first 15% of beat 0 in each bar (the "1")
 *
 *  If bpm is omitted, reads MUSIC_BPM from scope.
 *
 *  Usage — enter headline on bar 1, body on bar 2:
 *    const { fps } = useVideoConfig();
 *    const BEAT = fps * 60 / MUSIC_BPM;   // frames per beat
 *    const headlineStart = snapToDownbeat(20, fps);   // nearest downbeat after frame 20
 *    const bodyStart = headlineStart + BEAT * 4;      // one full bar later
 *
 *  Usage — pulse logo scale on every beat:
 *    const beat = useBeat();
 *    <div style={{ transform: `scale(${1 + beat * 0.06})` }}>...</div>
 *
 *  Usage — flash accent color on the "1" of every bar:
 *    const { isDownbeat } = useBeatClock();
 *    <div style={{ background: isDownbeat ? BRAND.primary : BRAND.secondary }}>...</div>
 */
function useBeatClock(bpm?: number): {
  beat: number; bar: number; beatProgress: number; barProgress: number; isDownbeat: boolean;
} {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // @ts-ignore
  const gOffset = typeof GLOBAL_FRAME_OFFSET !== "undefined" ? GLOBAL_FRAME_OFFSET : 0;
  // @ts-ignore
  const resolvedBpm = bpm ?? (typeof MUSIC_BPM !== "undefined" ? (MUSIC_BPM as number) : 90);
  const framesPerBeat = fps * 60 / resolvedBpm;
  const totalBeats = (frame + gOffset) / framesPerBeat;
  const beat = Math.floor(totalBeats) % 4;
  const bar = Math.floor(totalBeats / 4);
  const beatProgress = totalBeats % 1;
  const barProgress = (totalBeats % 4) / 4;
  const isDownbeat = beat === 0 && beatProgress < 0.15;
  return { beat, bar, beatProgress, barProgress, isDownbeat };
}

// ---------------------------------------------------------------------------
// snapToDownbeat — pure utility: rounds approxFrame to nearest bar start
// ---------------------------------------------------------------------------

/** Returns the first downbeat (bar start) at or after approxFrame.
 *  Use to schedule entrance animations so they land on the "1" of a bar.
 *
 *  bpm: if omitted, defaults to 90 (call with MUSIC_BPM from scope for accuracy)
 *  fps: pass useVideoConfig().fps — required since this is not a hook
 *
 *  Example (align entrance to next bar after a 20-frame warm-up):
 *    const { fps } = useVideoConfig();
 *    const BEAT = fps * 60 / MUSIC_BPM;
 *    const enterFrame = snapToDownbeat(20, MUSIC_BPM, fps);
 */
function snapToDownbeat(approxFrame: number, bpm: number = 90, fps: number = 30): number {
  const framesPerBeat = fps * 60 / bpm;
  const framesPerBar = framesPerBeat * 4;
  return Math.ceil(approxFrame / framesPerBar) * framesPerBar;
}

// ---------------------------------------------------------------------------
// Phase 2: MeshGradientBg — animated multi-radial mesh gradient background
// ---------------------------------------------------------------------------

/** Hardware-friendly animated mesh gradient using layered CSS radial-gradients.
 *  Provide 4 hex/rgba colors; if omitted, falls back to brand primary/secondary tones. */
const MeshGradientBg = ({ colors, animate = true, speed = 1, globalFrameOffset = 0, children }: {
  colors?: [string, string, string, string];
  animate?: boolean;
  speed?: number;
  globalFrameOffset?: number;
  children?: React.ReactNode;
}) => {
  const frame = useCurrentFrame();
  const t = animate ? (frame + globalFrameOffset) * 0.004 * speed : 0;
  const c = colors ?? ["#6366f1", "#8b5cf6", "#14b8a6", "#3b82f6"];
  // Build rgba() strings that work for both hex and rgba inputs.
  // For hex colors append alpha via hex; for other formats wrap in a color-mix fallback.
  const withAlpha = (color: string, hexAlpha: string) =>
    color.startsWith("#") && (color.length === 4 || color.length === 7)
      ? `${color}${hexAlpha}`
      : `color-mix(in srgb, ${color} ${Math.round(parseInt(hexAlpha, 16) / 255 * 100)}%, transparent)`;
  const gradients = [
    `radial-gradient(ellipse at ${50 + Math.sin(t) * 22}% ${28 + Math.cos(t * 0.7) * 16}%, ${withAlpha(c[0], "44")} 0%, transparent 58%)`,
    `radial-gradient(ellipse at ${68 + Math.cos(t * 1.3) * 18}% ${62 + Math.sin(t * 1.1) * 22}%, ${withAlpha(c[1], "38")} 0%, transparent 52%)`,
    `radial-gradient(ellipse at ${18 + Math.sin(t * 0.8) * 14}% ${72 + Math.cos(t * 0.9) * 18}%, ${withAlpha(c[2], "32")} 0%, transparent 56%)`,
    `radial-gradient(ellipse at ${62 + Math.cos(t * 1.5) * 24}% ${18 + Math.sin(t * 1.2) * 14}%, ${withAlpha(c[3], "38")} 0%, transparent 52%)`,
  ].join(", ");
  // Note: willChange:"background" is invalid — gradient animation is GPU-accelerated by default.
  return React.createElement(React.Fragment, null,
    React.createElement("div", { style: { position: "absolute", inset: 0, background: gradients } }),
    children,
  );
};

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Interaction Hooks — injected into scope for chameleon overlay scenes
// ---------------------------------------------------------------------------

function useTyping(text: string, startFrame: number, fps: number, cps = 10) {
  const frame = useCurrentFrame();
  const charCount = Math.floor(Math.max(0, frame - startFrame) * cps / fps);
  const displayText = text.slice(0, charCount);
  const showCursor = frame >= startFrame && (charCount < text.length || Math.floor((frame - startFrame) / 15) % 2 === 0);
  return { displayText, showCursor };
}

function usePopup(openFrame: number, closeFrame?: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const openProg = spring({ frame: frame - openFrame, fps, config: { damping: 12, stiffness: 200 }, durationInFrames: 20 });
  const closeProg = closeFrame ? spring({ frame: frame - closeFrame, fps, config: { damping: 20, stiffness: 300 }, durationInFrames: 15 }) : 0;
  const scale = frame < openFrame ? 0 : (closeFrame && frame >= closeFrame) ? Math.max(0, 1 - closeProg) : openProg;
  const opacity = Math.min(scale, 1);
  return { scale, opacity, visible: frame >= openFrame && (!closeFrame || frame < closeFrame) };
}

function useAccordion(triggerFrame: number, targetHeight: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - triggerFrame, fps, config: { damping: 14, stiffness: 100 }, durationInFrames: 25 });
  const height = frame < triggerFrame ? 0 : progress * targetHeight;
  const opacity = Math.min(progress * 2, 1);
  return { height, opacity };
}

function useDragItem(from: { x: number; y: number }, to: { x: number; y: number }, startFrame: number) {
  const frame = useCurrentFrame();
  const { fps, width, height: vh } = useVideoConfig();
  const progress = spring({ frame: frame - startFrame, fps, config: { damping: 18, stiffness: 100 }, durationInFrames: 30 });
  const x = frame < startFrame ? from.x * width : interpolate(progress, [0, 1], [from.x * width, to.x * width]);
  const y = frame < startFrame ? from.y * vh : interpolate(progress, [0, 1], [from.y * vh, to.y * vh]);
  const elevation = frame >= startFrame ? interpolate(progress, [0, 0.1, 0.9, 1], [0, 12, 12, 0]) : 0;
  return { x, y, elevation };
}

// ---------------------------------------------------------------------------
// useInteractionFeedback — micro-squish + nudge + glow on any click event
// Gives UI elements the "push-back" elasticity seen in premium agency videos.
// ---------------------------------------------------------------------------

/** Returns scale + nudge + glowOpacity for a UI element being clicked.
 *  Scale squishes to 0.96 at click peak, elastic bounce to 1.03, settles at 1.
 *  nudgeY: 2px downward push at click moment (simulates physical press).
 *  glowOpacity: 0→0.7→0 glow halo behind the element on click.
 *  direction: which way the element physically "presses" (default: down).
 */
function useInteractionFeedback(
  clickFrame: number,
  direction: "down" | "right" | "left" | "up" = "down",
) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const framesIn = frame - clickFrame;
  if (framesIn < 0) return { scale: 1, nudgeX: 0, nudgeY: 0, glowOpacity: 0 };
  // Snappy squish: fast compress → elastic overshoot → settle
  const bounce = spring({ frame: framesIn, fps, config: { damping: 8, stiffness: 450 }, durationInFrames: 22 });
  const scale = interpolate(bounce, [0, 0.25, 0.65, 1], [1, 0.96, 1.03, 1.0]);
  const nudgeMag = interpolate(bounce, [0, 0.25, 1], [0, 2, 0]);
  const nudgeY = direction === "down" ? nudgeMag : direction === "up" ? -nudgeMag : 0;
  const nudgeX = direction === "right" ? nudgeMag : direction === "left" ? -nudgeMag : 0;
  const glowOpacity = interpolate(framesIn, [0, 4, 20, 45], [0, 0.7, 0.3, 0], { extrapolateRight: "clamp" });
  return { scale, nudgeX, nudgeY, glowOpacity };
}

// ---------------------------------------------------------------------------
// ContextualBgPulse — background reacts to scene events (success, load, etc.)
// In WhatAStory videos, the bg subtly pulses BRAND.primary when the product
// delivers a win (form submit, deal closed, metric reveal).
// ---------------------------------------------------------------------------

/** A radial glow that pulses outward from a point on the background when triggered.
 *  Place as the LAST child of AbsoluteFill at zIndex:0 so it lives behind content.
 *  Pair with a ChameleonHighlight or NotificationToast at the same triggerFrame.
 *  color: usually BRAND.primary or BRAND.secondary
 *  intensity: 0.15 (subtle) to 0.45 (dramatic)
 *  x/y: normalized 0–1 position of the pulse origin (default: screen center)
 */
const ContextualBgPulse = ({
  triggerFrame, color, intensity = 0.25, x = 0.5, y = 0.5,
}: {
  triggerFrame: number; color: string; intensity?: number; x?: number; y?: number;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const framesIn = frame - triggerFrame;
  if (framesIn < 0) return null;
  const pulseOpacity = interpolate(framesIn, [0, 8, 50, 100], [0, intensity, intensity * 0.5, 0], { extrapolateRight: "clamp" });
  const pulseSize = interpolate(framesIn, [0, 80], [180, Math.max(width, height) * 1.8], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 2) });
  return React.createElement("div", {
    style: {
      position: "absolute",
      left: x * width - pulseSize / 2,
      top: y * height - pulseSize / 2,
      width: pulseSize, height: pulseSize,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color} 0%, ${color}00 65%)`,
      opacity: pulseOpacity,
      pointerEvents: "none" as const,
      zIndex: 0,
      willChange: "transform, opacity",
    },
  });
};

// ---------------------------------------------------------------------------
// useVelocityMomentum — frame-over-frame velocity measurement for spring values
// ---------------------------------------------------------------------------

/** Measures the velocity (units/frame) of any spring-animated value.
 *  In Remotion, each frame is rendered independently — we can compute velocity
 *  by evaluating the value at (frame) and (frame-1) and taking the delta.
 *
 *  getValue: pure function that returns the animated value for any given frame.
 *  Returns velocity (signed), speed (absolute), direction (-1/0/1), isSettled.
 *
 *  Use to carry momentum across scene transitions:
 *    // At the last frame of Scene A, measure exit velocity:
 *    const { velocity } = useVelocityMomentum(f => spring({ frame: f, fps, config }));
 *    // Pass velocity → INITIAL_MOMENTUM for Scene B so it starts with matching inertia.
 *
 *  Usage — swipe transition that accelerates if there's carry-over momentum:
 *    const { speed } = useVelocityMomentum(f => interpolate(f, [0, 30], [0, 1]));
 *    const INITIAL_MOMENTUM_X = typeof INITIAL_MOMENTUM !== "undefined" ? INITIAL_MOMENTUM.x : 0;
 *    const boostedSpeed = speed + Math.abs(INITIAL_MOMENTUM_X) * 0.4;
 */
function useVelocityMomentum(
  getValue: (frame: number) => number,
): { velocity: number; speed: number; direction: 1 | -1 | 0; isSettled: boolean } {
  const frame = useCurrentFrame();
  const cur = getValue(frame);
  const prev = frame > 0 ? getValue(frame - 1) : cur;
  const velocity = cur - prev;
  const speed = Math.abs(velocity);
  const direction: 1 | -1 | 0 = velocity > 0.05 ? 1 : velocity < -0.05 ? -1 : 0;
  return { velocity, speed, direction, isSettled: speed < 0.08 };
}

// ---------------------------------------------------------------------------
// useHumanizedCursor — drop-in for useCursorState with motion realism
// ---------------------------------------------------------------------------

/** Adds micro-jitter, breath-pause, and intent-based arc curves to cursor motion.
 *  Drop-in replacement for useCursorState — same return shape, more human feel.
 *
 *  Enhancements over useCursorState:
 *  - micro-jitter: ±1.5px random walk during travel (removes machine-slide straightness)
 *  - breath-pause: subtle ±2px Y sine during long dwells (subconscious human idle)
 *  - intent arc: "searching" mode adds a lateral deviation mid-path (human uncertainty)
 *  - decisive path: when step.intent is "decisive", jitter is reduced by 70%
 *
 *  Usage (drop-in — same as useCursorState):
 *    const { x, y, isClicking, hoverProgress, intent } = useHumanizedCursor(CURSOR_STEPS);
 *    const cx = x * width;
 *    const cy = y * height;
 */
function useHumanizedCursor(
  steps: Array<{ x: number; y: number; time: number; action?: string; dwellFrames?: number; intent?: "searching" | "decisive" }>,
  magneticStrength: number = 1,
): ReturnType<typeof useCursorState> {
  const frame = useCurrentFrame();
  const base = useCursorState(steps as any, magneticStrength);

  // Click guard: snap to clean position — no jitter during 4-frame click window
  if (base.isClicking) return base;

  // Find current step intent
  let currentIntent: "searching" | "decisive" = "searching";
  if (steps?.length) {
    for (let i = steps.length - 1; i >= 0; i--) {
      if (frame >= steps[i].time) { currentIntent = steps[i].intent ?? "searching"; break; }
    }
  }

  // Micro-jitter: reseed every 7 frames so pattern doesn't become visible
  const bucket = Math.floor(frame / 7);
  const jitterScale = currentIntent === "decisive" ? 0.3 : 1.0;
  const jx = ((random(`hc-jx-${bucket}`) as number) - 0.5) * 2 * 0.0015 * jitterScale;
  const jy = ((random(`hc-jy-${bucket}`) as number) - 0.5) * 2 * 0.0009 * jitterScale;

  // Breath-pause: gentle Y sine only during dwell (speed ~0)
  const breathY = base.speed < 0.005 ? Math.sin(frame * 0.022) * 0.0016 : 0;

  // Intent arc: "searching" adds lateral waviness mid-travel
  const arcX = (currentIntent === "searching" && base.speed > 0.005)
    ? Math.sin(frame * 0.13 + (random(`hc-arc-${bucket}`) as number) * Math.PI) * 0.0025
    : 0;

  return {
    ...base,
    x: base.x + jx + arcX,
    y: base.y + jy + breathY,
  };
}

// ---------------------------------------------------------------------------
// UITransition — cinematic state-change wrapper component
// ---------------------------------------------------------------------------

/** Wraps a UI state change with configurable entrance/exit animation.
 *  Replaces bare `visible && <div>` with a fully animated reveal.
 *  type: "fade" | "slideUp" | "slideRight" | "scale" | "blur" | "flipY"
 *  startFrame: when the transition begins
 *  duration: frames for the full transition (default 20)
 *  exit: if true, reverses the animation (element is being removed)
 *
 *  Usage (modal opening at frame 40):
 *    <UITransition type="scale" startFrame={40} duration={18}>
 *      <ModalOverlay ... />
 *    </UITransition>
 *
 *  Usage (dropdown closing at frame 90):
 *    <UITransition type="slideUp" startFrame={90} duration={14} exit>
 *      <DropdownMenu ... />
 *    </UITransition>
 */
const UITransition = ({
  children,
  type = "fade",
  startFrame = 0,
  duration = 20,
  exit: isExit = false,
  config = SPRING_CONFIGS.entrance,
}: {
  children: React.ReactNode;
  type?: "fade" | "slideUp" | "slideRight" | "scale" | "blur" | "flipY";
  startFrame?: number;
  duration?: number;
  exit?: boolean;
  config?: { damping: number; stiffness: number };
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rawProgress = spring({ frame: frame - startFrame, fps, config, durationInFrames: duration + 10 });
  const progress = isExit ? 1 - rawProgress : rawProgress;

  let opacity = 1, tx = 0, ty = 0, scale = 1, blurPx = 0, rotX = 0;
  if (type === "fade") {
    opacity = progress;
  } else if (type === "slideUp") {
    ty = interpolate(progress, [0, 1], [22, 0]);
    opacity = Math.min(progress * 1.8, 1);
  } else if (type === "slideRight") {
    tx = interpolate(progress, [0, 1], [-22, 0]);
    opacity = Math.min(progress * 1.8, 1);
  } else if (type === "scale") {
    scale = interpolate(progress, [0, 1], [0.88, 1]);
    opacity = progress;
  } else if (type === "blur") {
    blurPx = interpolate(progress, [0, 1], [8, 0]);
    opacity = progress;
  } else if (type === "flipY") {
    rotX = interpolate(progress, [0, 1], [-90, 0]);
    opacity = Math.abs(rotX) > 60 ? 0 : 1;
  }

  const transform = `translateX(${tx.toFixed(1)}px) translateY(${ty.toFixed(1)}px) scale(${scale.toFixed(3)})${rotX ? ` perspective(600px) rotateX(${rotX.toFixed(1)}deg)` : ""}`;
  return React.createElement("div", {
    style: { opacity, transform, filter: blurPx > 0.2 ? `blur(${blurPx.toFixed(1)}px)` : "none", willChange: "transform, opacity, filter" },
  }, children);
};

// ---------------------------------------------------------------------------
// usePreFocusCamera — camera begins pre-tracking target before cursor arrives
// ---------------------------------------------------------------------------

/** Returns camera zoom + pan that pre-focus the upcoming target element
 *  before the cursor reaches it — giving scenes narrative intention.
 *  The camera "leads the action": it starts zooming into the target 0.5s
 *  before the click, so the viewer's eye is already drawn there.
 *
 *  targetX/Y: normalized 0–1 position of the target element
 *  cursorArrivalFrame: when the cursor will arrive at the target
 *  previewDuration: frames before arrival when tracking begins (default 20)
 *  maxZoom: zoom level at peak focus (default 1.04 — subtle, not jarring)
 *
 *  Usage:
 *    const { zoom, panX, panY } = usePreFocusCamera(0.62, 0.45, 72);
 *    <CinematicCamera zoom={zoom} panX={panX} panY={panY} />
 *  Or manually:
 *    <div style={{ transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`, transformOrigin: "50% 50%" }}>
 */
function usePreFocusCamera(
  targetX: number = 0.5,
  targetY: number = 0.5,
  cursorArrivalFrame: number = 60,
  previewDuration: number = 20,
  maxZoom: number = 1.04,
): { zoom: number; panX: number; panY: number; focusProgress: number } {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const preStartFrame = cursorArrivalFrame - previewDuration;
  const focusProgress = frame < preStartFrame ? 0
    : spring({ frame: frame - preStartFrame, fps, config: { damping: 200, stiffness: 40 }, durationInFrames: previewDuration + 10 });
  const zoom = 1 + (maxZoom - 1) * focusProgress;
  const panX = (targetX - 0.5) * width * 0.04 * focusProgress;
  const panY = (targetY - 0.5) * height * 0.04 * focusProgress;
  return { zoom, panX, panY, focusProgress };
}

// ---------------------------------------------------------------------------
// useInteractionCycle — 4-phase premium interaction model
// ---------------------------------------------------------------------------

/** Standardized interaction arc: approach → anticipate → act → confirm.
 *  Every premium agency video click has all 4 phases — this hook returns
 *  state values for each so elements respond across the full arc.
 *
 *  approach:    cursor decelerating (element brightens, scale nudges)
 *  anticipate:  hover pre-state (glow/focus ring builds before click)
 *  act:         click fires (squish + ripple + nudge)
 *  confirm:     post-click success (checkmark/badge springs in)
 *
 *  Usage (button with full interaction arc):
 *    const cycle = useInteractionCycle({ approachStart: 40, clickFrame: 72 });
 *    <div style={{
 *      transform: `scale(${cycle.act.scale})`,
 *      filter: `brightness(${1 + 0.15 * cycle.approach.progress})`,
 *      boxShadow: `0 0 ${20 * cycle.anticipate.progress}px ${BRAND.primary}60`,
 *    }}>
 *      {cycle.confirm.visible ? '✓ Done' : 'Submit'}
 *    </div>
 *    {cycle.act.rippleOpacity > 0 && <div style={{ opacity: cycle.act.rippleOpacity }} />}
 */
function useInteractionCycle({
  approachStart = 0,
  approachDuration = 12,
  anticipateDuration = 18,
  clickFrame,
  confirmDuration = 20,
}: {
  approachStart?: number;
  approachDuration?: number;
  anticipateDuration?: number;
  clickFrame: number;
  confirmDuration?: number;
}): {
  approach: { progress: number };
  anticipate: { progress: number };
  act: { progress: number; scale: number; rippleOpacity: number; nudgeY: number };
  confirm: { progress: number; visible: boolean };
} {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: approach — cursor decelerating toward target
  const approachProgress = frame < approachStart ? 0
    : Math.min(1, (frame - approachStart) / Math.max(1, approachDuration));

  // Phase 2: anticipate — hover window before click (glow builds)
  const anticipateStart = clickFrame - anticipateDuration;
  const anticipateProgress = frame < anticipateStart ? 0
    : Math.min(1, (frame - anticipateStart) / Math.max(1, anticipateDuration));

  // Phase 3: act — click squish + ripple
  const actProgress = spring({ frame: frame - clickFrame, fps, config: { damping: 8, stiffness: 450 }, durationInFrames: 22 });
  const actScale = frame < clickFrame ? 1 : interpolate(actProgress, [0, 0.25, 0.65, 1], [1, 0.96, 1.03, 1.0]);
  const rippleOpacity = interpolate(frame - clickFrame, [0, 4, 20, 45], [0, 0.7, 0.3, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const nudgeY = frame < clickFrame ? 0 : interpolate(actProgress, [0, 0.25, 1], [0, 2, 0]);

  // Phase 4: confirm — post-click success badge/check springs in
  const confirmStart = clickFrame + 8;
  const confirmProgress = spring({ frame: frame - confirmStart, fps, config: SPRING_CONFIGS.pop, durationInFrames: confirmDuration });

  return {
    approach: { progress: approachProgress },
    anticipate: { progress: anticipateProgress },
    act: { progress: actProgress, scale: actScale, rippleOpacity, nudgeY },
    confirm: { progress: confirmProgress, visible: frame >= confirmStart },
  };
}

// ---------------------------------------------------------------------------
// useVelocityAudio — velocity-based procedural sound modulation
// ---------------------------------------------------------------------------

/** Maps frame-over-frame spring velocity to audio volume + pitch.
 *  Creates organic swooshes that physically match the motion curve:
 *  fast spring = louder + higher pitch; slow settle = quiet + lower pitch.
 *
 *  getValue: pure function returning the spring value for any frame.
 *  peakFrame: approximate frame of peak motion (used for volume envelope).
 *  sensitivityMultiplier: 1 = normal, 2 = more responsive to slow motions.
 *
 *  Usage (cursor swoosh that scales with travel speed):
 *    const { volume, pitchShift } = useVelocityAudio(
 *      f => cursorX_at_frame(f) * width,  // evaluate cursor X at any frame
 *      travelMidFrame,
 *    );
 *    <Audio src={SFX_URLS.whoosh} volume={volume * 0.35} />
 *
 *  Usage (card entrance — faster spring = louder whoosh):
 *    const { volume } = useVelocityAudio(
 *      f => spring({ frame: f - startFrame, fps, config: SPRING_CONFIGS.snap }),
 *      startFrame + 4,
 *    );
 */
function useVelocityAudio(
  getValue: (frame: number) => number,
  peakFrame: number = 0,
  sensitivityMultiplier: number = 1,
): { volume: number; pitchShift: number; velocity: number } {
  const frame = useCurrentFrame();
  const cur = getValue(frame);
  const prev = frame > 0 ? getValue(frame - 1) : cur;
  const velocity = Math.abs(cur - prev) * sensitivityMultiplier;
  // Sigmoid-like curve so tiny motions don't trigger audio
  const volume = Math.min(1, Math.pow(Math.max(0, velocity / 4), 0.55));
  // Pitch: faster = higher (1.0–1.25), slower = lower (0.8–1.0)
  const pitchShift = 0.8 + 0.45 * Math.min(1, velocity / 8);
  return { volume, pitchShift, velocity };
}

// ---------------------------------------------------------------------------
// PacingProfile — deterministic rhythm constants for scene choreography
// ---------------------------------------------------------------------------

/** Pacing reference constants injected into scope.
 *  Gives LLM-generated code access to the video's intended rhythm.
 *
 *  PACING_PROFILE.tempo: "slow" | "medium" | "fast" — overall video pace
 *  PACING_PROFILE.beatFrames: frames per beat (derived from MUSIC_BPM)
 *  PACING_PROFILE.barFrames: frames per 4-beat bar
 *  PACING_PROFILE.breathFrames: minimum hold frames after animations settle (20–35)
 *  PACING_PROFILE.staggerStep: recommended stagger interval for list items (4–8f)
 *
 *  Usage (align headline entrance to downbeat rhythm):
 *    const BEAT = PACING_PROFILE.beatFrames;
 *    const h1Start = snapToDownbeat(20, MUSIC_BPM, 30);
 *    const h2Start = h1Start + BEAT * 2;
 */
const PACING_PROFILE = {
  tempo: "medium" as "slow" | "medium" | "fast",
  beatFrames: 20,   // overridden by MUSIC_BPM at runtime via useBeatClock
  barFrames: 80,    // 4 beats × 20 frames/beat
  breathFrames: 24, // minimum hold after animations settle (matches HOLD_FRAMES)
  staggerStep: 6,   // recommended frames between staggered list items
} as const;

// ---------------------------------------------------------------------------
// useEntropy — physics chaos engine for jitter → clean grid transitions
// ---------------------------------------------------------------------------

/** Physics chaos engine. Returns a per-element float offset calculator.
 *  strength: 0 (perfectly still) → 1 (maximum chaotic jitter)
 *  Usage: const entropy = useEntropy(0.8);
 *         const floatY = entropy(i, 8); // element i floats ±8px
 */
function useEntropy(strength: number = 0.5) {
  const frame = useCurrentFrame();
  // @ts-ignore — GLOBAL_FRAME_OFFSET injected into scope by compiler
  const gOffset = typeof GLOBAL_FRAME_OFFSET !== "undefined" ? GLOBAL_FRAME_OFFSET : 0;
  return (elementIndex: number, amplitude: number = 8): number => {
    const freq = (random(`e-freq-${elementIndex}`) as number) * 0.04 + 0.02;
    const phase = (random(`e-phase-${elementIndex}`) as number) * Math.PI * 2;
    const chaosFreq = freq * (1 + strength * (random(`e-chaos-${elementIndex}`) as number) * 2);
    return Math.sin((frame + gOffset) * chaosFreq + phase) * amplitude * strength;
  };
}

// ---------------------------------------------------------------------------
// useEntropyWithAttractor — chaos engine that resolves into a single attractor point
// ---------------------------------------------------------------------------

/** Upgraded entropy: elements float chaotically, then converge to targetX/Y at triggerFrame.
 *  Use for AHA moments — problem scene nodes chaotically drifting, then magnetised to the UI.
 *
 *  Returns:
 *  - getFloat(i, amplitude): float offset in px (decays to 0 as attractor fires)
 *  - attractorProgress: 0→1 spring value to lerp base positions toward the attractor target
 *  - chaosStrength: 0→1, inverse of attractorProgress — use to fade out chaos visual layers
 *
 *  Usage (problem scene — floating avatars):
 *    const { getFloat, attractorProgress } = useEntropyWithAttractor(0.8, 90);
 *    // For each avatar at base position (bx, by):
 *    const floatY = getFloat(i, 18);
 *    const x = interpolate(attractorProgress, [0, 1], [bx, targetX * width]);
 *    const y = bx + floatY + interpolate(attractorProgress, [0, 1], [by, targetY * height]);
 */
function useEntropyWithAttractor(
  strength: number = 0.5,
  triggerFrame: number = 60,
): { getFloat: (elementIndex: number, amplitude?: number) => number; attractorProgress: number; chaosStrength: number } {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // @ts-ignore — GLOBAL_FRAME_OFFSET injected into scope by compiler
  const gOffset = typeof GLOBAL_FRAME_OFFSET !== "undefined" ? GLOBAL_FRAME_OFFSET : 0;
  const attractorProgress = frame > triggerFrame
    ? spring({ frame: frame - triggerFrame, fps, config: SPRING_CONFIGS.snap })
    : 0;
  const chaosStrength = strength * Math.max(0, 1 - attractorProgress);
  const getFloat = (elementIndex: number, amplitude: number = 8): number => {
    const freq = (random(`ea-freq-${elementIndex}`) as number) * 0.04 + 0.02;
    const phase = (random(`ea-phase-${elementIndex}`) as number) * Math.PI * 2;
    return Math.sin((frame + gOffset) * freq + phase) * amplitude * chaosStrength;
  };
  return { getFloat, attractorProgress, chaosStrength };
}

// ---------------------------------------------------------------------------
// useStagger — per-element startFrame with consistent stagger offset
// ---------------------------------------------------------------------------

/** Returns the startFrame for element at `index` in a staggered array.
 *  Eliminates the "everything enters at once" problem — mandatory for lists/arrays.
 *
 *  Usage: staggered list of 6 items entering 6 frames apart:
 *    const START = 20;
 *    {items.map((item, i) => {
 *      const startFrame = useStagger(i, START, 6);
 *      const prog = spring({ frame: frame - startFrame, fps, config: SPRING_CONFIGS.entrance });
 *      return <div key={i} style={{ opacity: prog, transform: `translateY(${(1-prog)*12}px)` }}>{item}</div>
 *    })}
 *
 *  baseFrame: when the FIRST element starts (default 0)
 *  delayPerItem: frames between each element (default 6 = ~100ms at 60fps)
 */
function useStagger(index: number, baseFrame: number = 0, delayPerItem: number = 6): number {
  return baseFrame + index * delayPerItem;
}

// ---------------------------------------------------------------------------
// useCascadeTree — nested dependency-tree for cascading micro-choreography
// ---------------------------------------------------------------------------

/** Hierarchical micro-animation trigger system.
 *  Instead of flat useStagger (siblings), useCascadeTree lets each element
 *  trigger its children at its own frame + a delay — creating nested cascades
 *  like premium agency videos: card enters → header pops → badge pings 4f later.
 *
 *  Each node: { id: string, frame?: number, delay?: number, config?, children? }
 *   - frame: absolute trigger frame (for root nodes)
 *   - delay: frames after parent fires (for child nodes)
 *   - config: spring config override (default: SPRING_CONFIGS.snap)
 *
 *  Returns an object with .get(id) → spring progress 0→1
 *
 *  Usage (card with staggered sub-elements):
 *    const cascade = useCascadeTree([
 *      { id: "card", frame: 20, children: [
 *        { id: "title", delay: 4, children: [
 *          { id: "badge", delay: 6, config: SPRING_CONFIGS.pop },
 *        ]},
 *        { id: "body", delay: 8 },
 *        { id: "cta",  delay: 14 },
 *      ]},
 *    ]);
 *    const cardProg  = cascade.get("card");   // spring 0→1 from frame 20
 *    const titleProg = cascade.get("title");  // spring 0→1 from frame 24
 *    const badgeProg = cascade.get("badge");  // spring 0→1 from frame 30 (pop config)
 *    const bodyProg  = cascade.get("body");   // spring 0→1 from frame 28
 *    const ctaProg   = cascade.get("cta");    // spring 0→1 from frame 34
 *
 *  Anti-pattern: do NOT use useCascadeTree for flat lists — use useStagger instead.
 *  CASCADE is for HIERARCHICAL relationships only (card → header → badge → tooltip).
 */
function useCascadeTree(
  nodes: Array<{
    id: string;
    frame?: number;
    delay?: number;
    config?: { damping: number; stiffness: number };
    children?: any[];
  }>,
): { get: (id: string) => number; getFrame: (id: string) => number } {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const registry = new Map<string, { absFrame: number; config?: { damping: number; stiffness: number } }>();

  function flatten(nodeList: typeof nodes, parentAbsFrame: number) {
    for (const node of nodeList) {
      const absFrame = node.frame !== undefined
        ? node.frame
        : parentAbsFrame + (node.delay ?? 0);
      registry.set(node.id, { absFrame, config: node.config });
      if (node.children && node.children.length > 0) {
        flatten(node.children, absFrame);
      }
    }
  }
  flatten(nodes, 0);

  return {
    get: (id: string): number => {
      const entry = registry.get(id);
      if (!entry) return 0;
      return spring({
        frame: frame - entry.absFrame,
        fps,
        config: entry.config ?? SPRING_CONFIGS.snap,
        durationInFrames: 30,
      });
    },
    getFrame: (id: string): number => registry.get(id)?.absFrame ?? 0,
  };
}

// ---------------------------------------------------------------------------
// useVitality — organic micro-animation for static elements (avatars, cards)
// ---------------------------------------------------------------------------

/** Adds living, breathing motion to elements that would otherwise be static.
 *
 *  mode "bounce"  — periodic micro-bounce (Y dip then spring up). Great for avatars,
 *                   icons, notification badges. Each element has a random phase so they
 *                   don't all bounce at once.
 *  mode "breathe" — sinusoidal scale oscillation (±1.5%). Great for background cards,
 *                   inactive items, ambient elements. Feels like the UI is breathing.
 *  mode "float"   — gentle Y sine drift (±4px). Great for floating decorative pills,
 *                   background blobs, orbiting elements.
 *  mode "pulse"   — quick opacity flicker (0.7→1.0). Great for status dots, badge pings.
 *
 *  Returns: { scale, y, opacity } — apply whichever axes you need.
 *
 *  Usage (staggered avatar row):
 *    {avatars.map((a, i) => {
 *      const { y } = useVitality({ mode: "bounce", index: i, interval: 90 });
 *      return <div style={{ transform: `translateY(${y}px)` }}>{a}</div>
 *    })}
 *
 *  Usage (inactive card breathing):
 *    const { scale } = useVitality({ mode: "breathe", index: cardIndex, speed: 0.8 });
 *    <div style={{ transform: `scale(${scale})` }}>...</div>
 *
 *  interval: frames between bounce triggers (default 90 = ~1.5s at 60fps)
 *  index: element index — staggers phase so multiple elements don't sync
 *  speed: multiplier for breathe/float frequency (default 1.0)
 */
function useVitality({
  mode = "breathe",
  index = 0,
  interval = 90,
  speed = 1.0,
}: {
  mode?: "bounce" | "breathe" | "float" | "pulse";
  index?: number;
  interval?: number;
  speed?: number;
} = {}): { scale: number; y: number; opacity: number } {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Stable per-element phase offset (0–1) using Remotion random
  const phase = random(`vitality-phase-${index}`) as number;
  const phaseOffset = Math.floor(phase * interval);

  if (mode === "bounce") {
    // Every `interval` frames (offset by phase) do a quick dip-and-spring
    const localFrame = (frame + phaseOffset) % interval;
    const bounceDuration = Math.round(fps * 0.35); // ~21f spring settle
    const bounceY = localFrame < bounceDuration
      ? spring({ frame: localFrame, fps, config: { stiffness: 320, damping: 18, mass: 0.6 }, from: 0, to: -6 }) - 6
      : 0;
    return { scale: 1, y: bounceY, opacity: 1 };
  }

  if (mode === "float") {
    const freq = 0.018 * speed;
    const y = Math.sin(frame * freq + phase * Math.PI * 2) * 4;
    return { scale: 1, y, opacity: 1 };
  }

  if (mode === "pulse") {
    const freq = 0.06 * speed;
    const opacity = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(frame * freq + phase * Math.PI * 2));
    return { scale: 1, y: 0, opacity };
  }

  // mode === "breathe" (default)
  const freq = 0.022 * speed;
  const scale = 1 + 0.015 * Math.sin(frame * freq + phase * Math.PI * 2);
  return { scale, y: 0, opacity: 1 };
}

// ---------------------------------------------------------------------------
// useMagnetic — cursor proximity tilt (WhatAStory "hand-animated weight")
// ---------------------------------------------------------------------------

/** Returns rotateX/Y tilt toward cursor when within proximity radius.
 *  cursorX/Y: absolute px (from useCursorPos())
 *  elementX/Y: absolute px center of the element
 *  intensity: 1 = full tilt (8° max), 0.5 = subtle
 *  Usage: const { rotateX, rotateY } = useMagnetic(cx, cy, elX, elY);
 *         style={{ transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` }}
 */
function useMagnetic(
  cursorX: number,
  cursorY: number,
  elementX: number,
  elementY: number,
  intensity: number = 1,
  radius: number = 150,
): { rotateX: number; rotateY: number; active: boolean } {
  const dx = cursorX - elementX;
  const dy = cursorY - elementY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > radius) return { rotateX: 0, rotateY: 0, active: false };
  const strength = Math.max(0, 1 - dist / radius) * intensity;
  const rotateY = (dx / radius) * 8 * strength;
  const rotateX = -(dy / radius) * 8 * strength;
  return { rotateX, rotateY, active: true };
}

// ---------------------------------------------------------------------------
// useTrackedParallax — simulated camera sway for live-action composites
// ---------------------------------------------------------------------------

/** Simulates camera tracking parallax for UI overlays on live-action backgrounds.
 *  In live-action composites (office/desk footage bg), the camera sways subtly.
 *  UI elements floating over footage should drift slightly opposite to sway,
 *  giving the illusion they're spatially "locked" in 3D world space.
 *
 *  depth: 0–1 — parallax depth layer (0 = background barely moves, 1 = foreground moves most)
 *  swayAmplitude: max pixel sway at depth=1 (default 14px)
 *  swaySpeed: frequency multiplier (default 1.0)
 *
 *  Usage — foreground panel drifts more than background card:
 *    const panelSway = useTrackedParallax(0.8);
 *    const bgSway    = useTrackedParallax(0.3);
 *    <div style={{ transform: `translate(${panelSway.x}px, ${panelSway.y}px)` }}>
 *      <FloatingPanel />
 *    </div>
 *
 *  Combine with VideoPlateMockup for maximum agency realism:
 *    const { x, y } = useTrackedParallax(0.7);
 *    <div style={{ transform: `translate(${x}px, ${y}px)` }}>
 *      <AnimatedMetricCards ... />
 *    </div>
 */
function useTrackedParallax(
  depth: number = 0.5,
  swayAmplitude: number = 14,
  swaySpeed: number = 1.0,
): { x: number; y: number } {
  const frame = useCurrentFrame();
  // @ts-ignore — GLOBAL_FRAME_OFFSET injected into scope by compiler
  const gOffset = typeof GLOBAL_FRAME_OFFSET !== "undefined" ? GLOBAL_FRAME_OFFSET : 0;
  const t = (frame + gOffset) * 0.012 * swaySpeed;
  const x = Math.sin(t) * swayAmplitude * depth;
  const y = Math.sin(t * 0.7 + 0.5) * swayAmplitude * 0.6 * depth;
  return { x, y };
}

// ---------------------------------------------------------------------------
// SAFE_ZONES — agency layout grid anchor points for consistent positioning
// ---------------------------------------------------------------------------

/** Layout anchor points — use to position content without overflow risk.
 *  heroHeadline: left-aligned headline at top-left safe area
 *  heroCenter: centered hero for symmetric layouts
 *  featureCardLeft/Right: two-column card layout anchor points
 *  sectionLabel: small uppercase label in top-left
 *  statCenter / ctaButton: centered stat metric and CTA
 */
const SAFE_ZONES = {
  heroHeadline:    { x: 80,    y: 180,   maxW: "80%",  align: "left"   },
  heroCenter:      { x: "50%", y: "50%", maxW: "75%",  align: "center" },
  featureCardLeft: { x: 80,    y: 240,   w: "42%",     h: "55%"        },
  featureCardRight:{ x: "52%", y: 240,   w: "42%",     h: "55%"        },
  sectionLabel:    { x: 80,    y: 132                                   }, // 12% from top (1080 * 0.12 = 129.6 → 132)
  statCenter:      { x: "50%", y: "45%",               align: "center" },
  ctaButton:       { x: "50%", y: "65%",               align: "center" },
} as const;

// ---------------------------------------------------------------------------
// TiltWrapper — perspective tilt for the midground content plane
// Wraps UI cards with a subtle CSS 3D tilt. Use useMagnetic() to drive tiltX/tiltY
// for cursor-responsive tilt, or pass static values for a fixed cinematic lean.
// ---------------------------------------------------------------------------

/** Perspective tilt wrapper — adds 3D depth to flat UI cards.
 *  tiltX/Y: degrees of rotation (−3 to 3 for subtle, −8 to 8 for dramatic)
 *  scale: optional entry scale (1.0 = no scale change)
 *  perspective: CSS perspective value in px (600–1000 for cinematic depth)
 *
 *  Usage (static cinematic lean):
 *    <TiltWrapper tiltX={-1.5} tiltY={2}>
 *      <div style={yourCardStyle} />
 *    </TiltWrapper>
 *
 *  Usage (cursor-reactive via useMagnetic):
 *    const { rotateX, rotateY } = useMagnetic(cursorPos.x, cursorPos.y, cardCX, cardCY, 0.6);
 *    <TiltWrapper tiltX={rotateX} tiltY={rotateY}>
 *      <div style={yourCardStyle} />
 *    </TiltWrapper>
 */
const TiltWrapper = ({
  children,
  tiltX = 0,
  tiltY = 0,
  scale = 1,
  perspective = 800,
  glossy = false,
}: {
  children: React.ReactNode;
  tiltX?: number;
  tiltY?: number;
  scale?: number;
  perspective?: number;
  glossy?: boolean;
}) => {
  // Dynamic specular sheen based on tilt
  // tiltY (horizontal) moves highlight horizontally; tiltX (vertical) moves vertically
  const sheenX = 50 - tiltY * 3;
  const sheenY = 50 + tiltX * 3;

  return React.createElement("div", {
    style: {
      position: "relative",
      transform: `perspective(${perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${scale})`,
      transformStyle: "preserve-3d",
      willChange: "transform",
    },
  },
    children,
    glossy && React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        borderRadius: "inherit",
        background: `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255,255,255,0.15) 0%, transparent 50%)`,
        mixBlendMode: "overlay",
        zIndex: 10,
      } as React.CSSProperties
    })
  );
};

// ---------------------------------------------------------------------------
// SyncedWord — word-by-word spring reveal synced to WORD_TIMINGS
// ---------------------------------------------------------------------------

/** Renders a single word that springs in at its WORD_TIMINGS frame.
 *  Short punchy words (≤4 chars) use high stiffness (200) = snappy.
 *  Long flowing words (7+ chars) use low stiffness (60) = smooth.
 *  Usage: {words.map((w, i) => <SyncedWord word={w} wordIndex={i} WORD_TIMINGS={WORD_TIMINGS} brand={BRAND} />)}
 */
const SyncedWord = ({
  word,
  wordIndex,
  WORD_TIMINGS: timings = [],
  brand,
  fontSize = 72,
  fontWeight = 900,
  color,
}: {
  word: string;
  wordIndex: number;
  WORD_TIMINGS?: Array<{ word: string; startFrame: number; endFrame: number }>;
  brand?: any;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timing = timings.find(t => t.word.toLowerCase() === word.toLowerCase());
  const startFrame = timing?.startFrame ?? wordIndex * 10;
  // Short punchy words = high stiffness (snappy); long words = low stiffness (floating)
  const stiffness = word.length <= 4 ? 200 : word.length <= 7 ? 120 : 60;
  const progress = spring({ frame: frame - startFrame, fps, config: { damping: 200, stiffness } });
  return React.createElement("span", {
    style: {
      display: "inline-block",
      opacity: Math.min(Math.max(progress, 0), 1),
      transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
      color: color ?? brand?.text ?? "#ffffff",
      fontSize,
      fontWeight,
      fontFamily: brand?.font ? `${brand.font}, Inter, sans-serif` : "Inter, sans-serif",
      marginRight: "0.25em",
    },
  }, word);
};

// ---------------------------------------------------------------------------
// NarrationReveal — word-by-word color transition synced to WORD_TIMINGS
// ---------------------------------------------------------------------------

/** Renders text where each word transitions from inactiveColor to activeColor
 *  exactly as the voiceover speaks it, synced to WORD_TIMINGS.
 *  Qanapi-style: words start gray/transparent and become solid/colored as narration reaches them.
 *
 *  Props:
 *    text          — full sentence to render (split into words)
 *    timings       — WORD_TIMINGS array (auto-wired from scope)
 *    activeColor   — color when word is spoken (default: BRAND.text or black)
 *    inactiveColor — color before word is spoken (default: semi-transparent gray)
 *    fontSize      — default 64
 *    fontWeight    — default 700; can transition to 900 on active if boldOnActive=true
 *    boldOnActive  — if true, fontWeight transitions 400→700 as word activates
 *    startFrame    — delay before narration begins (default 0)
 *    brand         — for font family
 *
 *  Usage:
 *    <NarrationReveal text="In just a few clicks, you've deployed complete security"
 *      timings={WORD_TIMINGS} activeColor={BRAND.text} brand={BRAND} />
 */
const NarrationReveal = ({
  text,
  timings = [],
  activeColor,
  inactiveColor,
  fontSize = 64,
  fontWeight = 700,
  boldOnActive = false,
  startFrame = 0,
  brand,
  lineHeight = 1.3,
  maxWidth = "80%",
}: {
  text: string;
  timings?: Array<{ word: string; startFrame: number; endFrame: number }>;
  activeColor?: string;
  inactiveColor?: string;
  fontSize?: number;
  fontWeight?: number;
  boldOnActive?: boolean;
  startFrame?: number;
  brand?: any;
  lineHeight?: number;
  maxWidth?: string;
}) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);

  const active = activeColor ?? brand?.text ?? "#000000";
  const inactive = inactiveColor ?? (brand?.style === "dark" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)");
  const fontFamily = brand?.font ? `${brand.font}, Inter, sans-serif` : "Inter, sans-serif";

  return React.createElement("div", {
    style: {
      display: "flex", flexWrap: "wrap" as const, gap: "0.2em 0.3em",
      fontSize, fontWeight: boldOnActive ? 400 : fontWeight,
      fontFamily, lineHeight, maxWidth, wordBreak: "break-word" as const,
    },
  }, words.map((word, i) => {
    // Find matching timing — try exact match first, then index-based fallback
    const cleanWord = word.replace(/[.,!?;:'"()]/g, "").toLowerCase();
    const timing = timings.find(t => t.word.toLowerCase().replace(/[.,!?;:'"()]/g, "") === cleanWord)
      ?? timings[i];
    const wordStart = (timing?.startFrame ?? (startFrame + i * 8));
    const wordEnd = (timing?.endFrame ?? (wordStart + 6));

    // Progress: 0 before word, 0→1 during word, 1 after
    const progress = frame < wordStart ? 0
      : frame >= wordEnd ? 1
      : (frame - wordStart) / Math.max(1, wordEnd - wordStart);

    // Smooth easing for color transition
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

    const opacity = interpolate(eased, [0, 1], [0.3, 1]);

    return React.createElement("span", {
      key: i,
      style: {
        display: "inline-block",
        color: eased >= 0.5 ? active : inactive,
        opacity,
        fontWeight: boldOnActive ? interpolate(eased, [0, 1], [400, 700]) : fontWeight,
        transition: "color 0.1s ease",
      },
    }, word);
  }));
};

// ---------------------------------------------------------------------------
// MaskedReveal — headline slides up from an invisible baseline (overflow: hidden)
// ---------------------------------------------------------------------------

/** Wraps children in an overflow:hidden clip — inner content slides up from below.
 *  This is the WhatAStory kinetic typography standard: text is born FROM the baseline,
 *  not faded in from mid-air. Dramatically more premium than opacity-only reveals.
 *
 *  RULE: ALL main scene headlines MUST be wrapped in <MaskedReveal>.
 *  Only use opacity fades for subtitles, body copy, and small labels.
 *
 *  Usage:
 *    <MaskedReveal startFrame={20}>
 *      <div style={{ fontSize: 120, fontWeight: 900 }}>Built for scale.</div>
 *    </MaskedReveal>
 *
 *  Staggered multi-line headlines:
 *    <MaskedReveal startFrame={20}>Line 1</MaskedReveal>
 *    <MaskedReveal startFrame={20} delay={12}>Line 2</MaskedReveal>
 *
 *  direction: "up" (standard, text enters from below) | "down" (enters from above)
 */
const MaskedReveal = ({
  children,
  startFrame = 0,
  delay = 0,
  config,
  direction = "up",
}: {
  children?: React.ReactNode;
  startFrame?: number;
  delay?: number;
  config?: { damping: number; stiffness: number };
  direction?: "up" | "down";
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - (startFrame + delay),
    fps,
    config: config ?? SPRING_CONFIGS.entrance,
    durationInFrames: 45,
  });
  const translateY = interpolate(progress, [0, 1], [direction === "up" ? 110 : -110, 0]);
  return React.createElement("div", {
    style: { overflow: "hidden", display: "block" },
  },
    React.createElement("div", {
      style: {
        transform: `translateY(${translateY}%)`,
        willChange: "transform",
      },
    }, children),
  );
};

// ---------------------------------------------------------------------------
// InWorldText — typography that lives in 3D space (DepthStack integration)
// ---------------------------------------------------------------------------

/** Typography that participates in the 3D canvas depth transforms.
 *  Unlike flat overlays (text pinned to screen glass), InWorldText exists
 *  inside the spatial world — it can be pushed behind UI cards, scaled with
 *  the camera zoom, and drift on the Z-axis with DepthStack layers.
 *
 *  RULE: Use InWorldText for props IN the scene (floating stats, ambient labels,
 *  background context text). Use MaskedReveal for primary scene headlines.
 *
 *  depth: 0 = deep background (smaller, behind UI cards), 1 = foreground (larger, in front)
 *  attach: normalized 0–1 position { x, y } in video frame
 *  cameraProgress: 0→1 zoom progress from CinematicCamera or SteppedCamera —
 *    pass this to sync text scaling with camera push-in (closer = bigger)
 *  rotateY: subtle Y rotation for 3D lean (match DepthStack plane angle, default 0)
 *
 *  Usage — floating stat at mid-depth, synced with camera:
 *    <InWorldText depth={0.65} attach={{ x: 0.62, y: 0.44 }} cameraProgress={zoomProg}>
 *      <div style={{ fontSize: 48, fontWeight: 900, color: "#fff" }}>+124%</div>
 *    </InWorldText>
 *
 *  Usage — ghost label behind a glass card (reads through from depth):
 *    <InWorldText depth={0.15} attach={{ x: 0.3, y: 0.6 }}>
 *      <div style={{ fontSize: 28, opacity: 0.25, color: "#fff" }}>Revenue</div>
 *    </InWorldText>
 */
const InWorldText = ({
  children,
  depth = 0.5,
  attach = { x: 0.5, y: 0.5 },
  scale: scaleMult = 1,
  rotateY = 0,
  cameraProgress = 0,
}: {
  children: React.ReactNode;
  depth?: number;                // 0 = background, 1 = foreground
  attach?: { x: number; y: number };
  scale?: number;
  rotateY?: number;
  cameraProgress?: number;       // 0→1 from CinematicCamera / SteppedCamera
}) => {
  const { width, height } = useVideoConfig();
  // depth 0 → scale 0.55x; depth 1 → scale 1.45x
  const depthScale = 0.55 + depth * 0.9;
  const depthZ = (depth - 0.5) * 120;    // −60px at bg, +60px at fg
  const cameraBoost = 1 + cameraProgress * depth * 0.12;
  return React.createElement("div", {
    style: {
      position: "absolute",
      left: attach.x * width,
      top: attach.y * height,
      transform: `perspective(900px) translateZ(${depthZ}px) scale(${(depthScale * scaleMult * cameraBoost).toFixed(3)}) rotateY(${rotateY}deg)`,
      transformOrigin: "center center",
      willChange: "transform",
      pointerEvents: "none" as const,
    },
  }, children);
};

// ---------------------------------------------------------------------------
// useCursorState — derive reactive CURSOR_STATE from CURSOR_STEPS per frame
// ---------------------------------------------------------------------------

/** Cursor intent enum — reflects the current behavioral phase of the cursor.
 *  "searching"  — cursor is traveling or dwelling between targets (default)
 *  "hovering"   — cursor has settled on a target; hover pre-state active (hoverProgress rising)
 *  "clicking"   — click event is firing (isClicking=true, 4-frame window)
 */
type CursorIntent = "searching" | "hovering" | "clicking";

/** Default cursor state — used when no CURSOR_STEPS are present. */
const CURSOR_STATE_DEFAULT = { x: 0.5, y: 0.85, vx: 0, vy: 0, isClicking: false, speed: 0, approachPhase: 0, isHovering: false, hoverProgress: 0, dragVector: { x: 0, y: 0, magnitude: 0 }, intent: "searching" as CursorIntent };

/** Derives the current frame's cursor state from a CURSOR_STEPS array.
 *
 *  Returns: x/y (normalized 0–1), vx/vy (velocity), isClicking, speed,
 *           approachPhase (0→1 as cursor decelerates into target — last 12 frames of travel),
 *           isHovering (true from arrival until click fires — ~17 frames),
 *           hoverProgress (0→1 within the hover window — drive button glow/focus ring/scale).
 *
 *  Three-phase interaction model:
 *    1. approach  — cursor decelerates, approachPhase rises 0→1 (last 12 frames). Use: element brightens.
 *    2. hover     — cursor settled at destination, isHovering=true, hoverProgress 0→1. Use: focus ring, glow, tooltip.
 *    3. click     — isClicking fires for 4 frames. Use: button squish, ripple, state change.
 *
 *  Usage:
 *    const { x, y, approachPhase, isHovering, hoverProgress, isClicking } = useCursorState(CURSOR_STEPS);
 *    const cx = x * width, cy = y * height;
 *    // Button reacts across all 3 phases:
 *    <button style={{
 *      transform: `scale(${isClicking ? 0.94 : 1 + 0.04 * hoverProgress})`,
 *      boxShadow: `0 0 ${20 * hoverProgress}px ${BRAND.primary}40`,
 *      outline: isHovering ? `2px solid ${BRAND.primary}` : "none",
 *      filter: `brightness(${1 + 0.12 * approachPhase + 0.08 * hoverProgress})`,
 *    }}>Submit</button>
 *
 *  Guard per-element: use proximity check to only react when cursor is heading to THIS element:
 *    const targeting = Math.abs(x - elNormX) < 0.06 && Math.abs(y - elNormY) < 0.06;
 *    const glow = targeting ? hoverProgress : 0;
 */
function useCursorState(
  steps: Array<{ x: number; y: number; time: number; action?: string; dwellFrames?: number }> = [],
  magneticStrength: number = 1,
): { x: number; y: number; vx: number; vy: number; isClicking: boolean; speed: number; approachPhase: number; isHovering: boolean; hoverProgress: number; dragVector: { x: number; y: number; magnitude: number }; intent: CursorIntent } {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!steps || steps.length < 2) return CURSOR_STATE_DEFAULT;

  let segIdx = 0;
  for (let i = 0; i < steps.length - 1; i++) {
    if (frame >= steps[i].time) segIdx = i;
  }

  const from = steps[segIdx];
  const to = steps[Math.min(segIdx + 1, steps.length - 1)];

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const baseTravelFrames = dist < 0.15 ? 18 : dist > 0.4 ? 35 : 25;

  const segSeed = random(`dwell-${segIdx}`);
  const dwellVariance = Math.round(segSeed * 14) - 4;
  const effectiveDwell = (from.dwellFrames ?? 22) + dwellVariance;

  const travelStart = from.time + effectiveDwell;
  const travelEnd = travelStart + baseTravelFrames;

  // Hover window: cursor settled at destination, before click fires
  // Micro-delay hesitation: 80–150ms randomized pre-click pause (2.4–4.5f @ 30fps)
  // This is the #1 humanizing signal — the slight pause before committing to a click.
  const hesitationFrames = Math.round(2.4 + random(`hesitate-${segIdx}`) * 2.1);
  const overshootWindow = 12;
  const preClickPause = 5 + hesitationFrames; // randomized hesitation baked in
  const hoverWindowDuration = overshootWindow + preClickPause; // ~19–22 frames total

  if (frame < travelStart) {
    const dwellProgress = (frame - from.time) / Math.max(1, effectiveDwell);
    const scanX = Math.sin(dwellProgress * Math.PI * 2.5) * 0.004;
    const scanY = Math.sin(dwellProgress * Math.PI * 1.8 + 0.5) * 0.002;
    return {
      x: from.x + scanX, y: from.y + scanY,
      vx: scanX * fps, vy: scanY * fps,
      isClicking: from.action === "click" && frame >= from.time + 4 && frame <= from.time + 8,
      speed: Math.abs(scanX * fps), approachPhase: 0,
      isHovering: false, hoverProgress: 0,
      dragVector: { x: 0, y: 0, magnitude: 0 },
      intent: "searching" as CursorIntent,
    };
  }

  if (frame >= travelEnd) {
    const overshootProgress = Math.min(1, (frame - travelEnd) / overshootWindow);
    const overshootMag = 0.008 * (1 - overshootProgress);
    const overshootDir = Math.atan2(dy, dx);
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const ox = Math.cos(overshootDir) * overshootMag * (1 - easeOutCubic(overshootProgress));
    const oy = Math.sin(overshootDir) * overshootMag * (1 - easeOutCubic(overshootProgress));
    const clickReady = frame >= travelEnd + hoverWindowDuration;
    const isClicking = to.action === "click" && clickReady && frame <= travelEnd + hoverWindowDuration + 4;
    // hoverProgress: 0→1 over the hover window — drives target element glow/scale/focus ring
    // This builds anticipation: element lights up BEFORE the click fires (human pre-click signal)
    const hoverProgress = Math.min(1, (frame - travelEnd) / hoverWindowDuration);
    const intent: CursorIntent = isClicking ? "clicking" : "hovering";
    return {
      x: to.x + ox, y: to.y + oy,
      vx: 0, vy: 0,
      isClicking,
      speed: 0, approachPhase: 1,
      isHovering: !isClicking && frame < travelEnd + hoverWindowDuration + 4,
      hoverProgress,
      dragVector: { x: 0, y: 0, magnitude: 0 },
      intent,
    };
  }

  let t = (frame - travelStart) / baseTravelFrames;
  const framesLeft = travelEnd - frame;
  if (framesLeft <= 12) {
    const approachT = 1 - framesLeft / 12;
    t = t + (1 - t) * (1 - Math.pow(2, -10 * approachT)) * magneticStrength;
  }

  const pos = dist > 0.1
    ? cubicBezier({ x: from.x, y: from.y }, { x: to.x, y: to.y }, t, 0.12 + random(`arc-${segIdx}`) * 0.08)
    : { x: from.x + dx * t, y: from.y + dy * t };

  // dragVector: unit direction of travel + magnitude (0=stationary, 1=full speed)
  // Use to tilt AppShell/container in direction of cursor travel:
  //   style={{ transform: `perspective(800px) rotateY(${dragVector.x * 3}deg) rotateX(${-dragVector.y * 2}deg)` }}
  const travelDist = Math.sqrt(dx * dx + dy * dy);
  const dragMagnitude = travelDist > 0.001 ? Math.min(1, (framesLeft <= 12 ? 1 - framesLeft / 12 : 1) * 0.85) : 0;
  const dragX = travelDist > 0.001 ? (dx / travelDist) * dragMagnitude : 0;
  const dragY = travelDist > 0.001 ? (dy / travelDist) * dragMagnitude : 0;

  return {
    x: pos.x, y: pos.y,
    vx: dx * (1 / baseTravelFrames) * fps,
    vy: dy * (1 / baseTravelFrames) * fps,
    isClicking: false, speed: Math.abs(dx * t * fps),
    approachPhase: framesLeft <= 12 ? 1 - framesLeft / 12 : 0,
    isHovering: false, hoverProgress: 0,
    dragVector: { x: dragX, y: dragY, magnitude: dragMagnitude },
    intent: "searching" as CursorIntent,
  };
}

// ---------------------------------------------------------------------------
// useCursorPos — derives real-time cursor (x, y) in px from CURSOR_STEPS
// Allows UI elements to react spatially to cursor proximity (pre-click).
// ---------------------------------------------------------------------------

/** Computes the interpolated cursor position in absolute px for the current frame.
 *  Pass the same CURSOR_STEPS array used by your cursor rendering.
 *
 *  Supports two step formats:
 *  1. Time-based (CURSOR_STEPS from buildInteractionScript): steps have a `time` field.
 *     The cursor travels from step[i].time → step[i].time + TRAVEL (25f) to reach step[i+1].
 *  2. Dwell-based (legacy): steps have `dwellFrames`. moveFrames controls travel duration.
 *
 *  Returns { x, y } in absolute px within the video frame.
 *  Usage: const cursorPos = useCursorPos(CURSOR_STEPS, 30);
 */
function useCursorPos(
  steps: Array<{ x: number; y: number; time?: number; dwellFrames?: number }>,
  moveFrames = 30,
): { x: number; y: number } {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (!steps || steps.length === 0) return { x: width * 0.5, y: height * 0.5 };

  // ── Time-based path (CURSOR_STEPS with .time field) ────────────────────
  // Matches the timing model of useCursorState so both hooks agree on position.
  if (typeof steps[0].time === "number") {
    const TRAVEL = 25;
    const last = steps[steps.length - 1];
    if (frame >= (last.time ?? 0)) return { x: last.x * width, y: last.y * height };

    let prevStep = steps[0];
    let nextStep = steps[1] ?? steps[0];
    for (let i = 1; i < steps.length; i++) {
      if (frame >= steps[i - 1].time! && frame < steps[i].time!) {
        prevStep = steps[i - 1];
        nextStep = steps[i];
        break;
      }
    }
    const rawProgress = Math.min(1, Math.max(0, (frame - prevStep.time!) / TRAVEL));
    const pos = cubicBezier({ x: prevStep.x, y: prevStep.y }, { x: nextStep.x, y: nextStep.y }, rawProgress, 0.15);
    return { x: pos.x * width, y: pos.y * height };
  }

  // ── Dwell-based path (legacy steps without .time) ─────────────────────
  let accFrame = 0;
  const firstDwell = steps[0].dwellFrames ?? 18;
  if (frame <= accFrame + firstDwell) return { x: steps[0].x * width, y: steps[0].y * height };
  accFrame += firstDwell;
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1];
    const cur = steps[i];
    const moveEnd = accFrame + moveFrames;
    if (frame < moveEnd) {
      const t = Math.min(1, (frame - accFrame) / moveFrames);
      const pos = cubicBezier({ x: prev.x, y: prev.y }, { x: cur.x, y: cur.y }, t, 0.15);
      return { x: pos.x * width, y: pos.y * height };
    }
    accFrame = moveEnd;
    const dwell = cur.dwellFrames ?? 18;
    if (frame < accFrame + dwell) return { x: cur.x * width, y: cur.y * height };
    accFrame += dwell;
  }
  const last = steps[steps.length - 1];
  return { x: last.x * width, y: last.y * height };
}

/** Returns proximity-driven hover state for a UI element.
 *  elementX/Y: center of the element in absolute px (e.g. box.x * width + box.w * width / 2).
 *  cursorPos: from useCursorPos().
 *  hoverRadius: pixel radius at which hovering begins (default 150px).
 *
 *  Returns:
 *  - scale: 1.0 → 1.04 as cursor approaches (magnetism effect)
 *  - glowOpacity: 0 → 0.35 (element softly glows as cursor nears)
 *  - isHovering: true when cursor is within 40% of hoverRadius (tight hover zone)
 *
 *  Usage:
 *  const cursorPos = useCursorPos(CURSOR_STEPS, 30);
 *  const { scale, glowOpacity } = useMouseProximity(cx, cy, cursorPos, 150);
 *  <div style={{ transform: `scale(${scale})`, boxShadow: `0 0 24px rgba(99,102,241,${glowOpacity})` }}>
 */
function useMouseProximity(
  elementX: number,
  elementY: number,
  cursorPos: { x: number; y: number },
  hoverRadius = 150,
): { scale: number; glowOpacity: number; shadowDepth: number; isHovering: boolean } {
  const dx = cursorPos.x - elementX;
  const dy = cursorPos.y - elementY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const proximity = Math.max(0, 1 - dist / hoverRadius); // 0 = far, 1 = center
  const scale = interpolate(proximity, [0, 1], [1.0, 1.04], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glowOpacity = proximity * 0.35;
  const shadowDepth = proximity * 0.6; // 0 = normal shadow, 0.6 = elevated shadow
  return { scale, glowOpacity, shadowDepth, isHovering: dist < hoverRadius * 0.4 };
}

// ---------------------------------------------------------------------------
// KineticWord — headline with animated letter-spacing (organic "breathing" growth)
// WhatAStory signature: tracking expands wide at appearance, settles to tight.
// ---------------------------------------------------------------------------

/** Single word or phrase with kinetic letter-spacing animation on entrance.
 *  trackingFrom: wide tracking at start (px), gives "camera pull-in" feel (default 8px)
 *  trackingTo: final tight tracking (default -1px for display headings)
 *  duration: frames for the tracking animation to complete (default 30)
 *
 *  Usage:
 *  <KineticWord text="PROBLEM" startFrame={0} brand={BRAND} fontSize={96} />
 *  <KineticWord text="Solved." startFrame={20} brand={BRAND} trackingFrom={4} trackingTo={-2} />
 */
const KineticWord = ({
  text,
  startFrame,
  brand,
  fontSize = 88,
  fontWeight = 700,
  color,
  trackingFrom = 8,
  trackingTo = -1,
  duration = 30,
}: {
  text: string;
  startFrame: number;
  brand: BrandLike;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  trackingFrom?: number;
  trackingTo?: number;
  duration?: number;
}) => {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;
  const t = Math.min(1, Math.max(0, elapsed / duration));
  const eased = EASINGS.easeOutCubic(t);
  const letterSpacing = interpolate(eased, [0, 1], [trackingFrom, trackingTo]);
  const opacity = interpolate(t, [0, 0.35], [0, 1], { extrapolateRight: "clamp" });
  const translateY = interpolate(eased, [0, 1], [16, 0]);
  return React.createElement("div", {
    style: {
      fontSize,
      fontWeight,
      fontFamily: brand?.font ?? "Inter",
      color: color ?? brand?.text ?? "#ffffff",
      letterSpacing: `${letterSpacing.toFixed(2)}px`,
      opacity,
      transform: `translateY(${translateY}px)`,
      willChange: "letter-spacing, opacity, transform",
      display: "inline-block",
    },
  }, text);
};

// ---------------------------------------------------------------------------
// FocusOrchestrator — auto-applies depth blur to background when popups open
// Wrap the background/midground layers. Foreground (zIndex≥100) is unaffected.
// ---------------------------------------------------------------------------

/** Auto-blurs wrapped children when a popup-open or panel-slide event is active.
 *  eliminates the need for the LLM to manually apply DepthBlur at the right frames.
 *
 *  events: pass INTERACTION_EVENTS (or a subset)
 *  maxBlur: blur amount in px when fully focused (default 5px — subtle DoF)
 *
 *  Usage:
 *  <FocusOrchestrator events={INTERACTION_EVENTS} maxBlur={5}>
 *    <AppShell .../>  // background layer — gets blurred when overlay opens
 *  </FocusOrchestrator>
 *  <ModalOverlay .../> // foreground — NOT wrapped, stays sharp
 */
const FocusOrchestrator = ({
  events,
  children,
  maxBlur = 5,
  transitionFrames = 8,
}: {
  events: Array<{ frame: number; action: string; durationFrames?: number }>;
  children: React.ReactNode;
  maxBlur?: number;
  transitionFrames?: number;
}) => {
  const frame = useCurrentFrame();
  // Find the most recent popup/panel event that is currently active
  const activeEvent = [...(events ?? [])].reverse().find((e) =>
    (e.action === "popup-open" || e.action === "panel-slide" || e.action === "accordion") &&
    frame >= e.frame &&
    frame < e.frame + (e.durationFrames ?? 90),
  );
  const framesIn = activeEvent ? frame - activeEvent.frame : -1;
  const blurProgress = framesIn >= 0
    ? Math.min(1, framesIn / transitionFrames)
    : 0;
  const blurPx = blurProgress * maxBlur;
  if (blurPx < 0.3) return React.createElement(React.Fragment, null, children);
  return React.createElement("div", {
    style: { filter: `blur(${blurPx.toFixed(1)}px)`, willChange: "filter" },
  }, children);
};

// ---------------------------------------------------------------------------
// CursorAnnotationPill — ambient micro-copy pill trailing the cursor
// Shows short contextual labels ("19 Messages", "PDF Attached") near cursor.
// ---------------------------------------------------------------------------

/** Small high-contrast pill that appears near the cursor with contextual text.
 *  Appears at startFrame, fades in over 8 frames, fades out before startFrame+duration.
 *  Position: offset 24px right and 12px above the given cursor position.
 *
 *  Typically used via InteractionEvent.annotation — auto-rendered by cursor engine.
 *
 *  cursorX/Y: absolute px (from useCursorPos() or manual cursor position)
 *  text: short label, e.g. "19 Messages" or "PDF Attached"
 *
 *  Usage (manual):
 *  <CursorAnnotationPill text="Filter applied" cursorX={cx} cursorY={cy} startFrame={42} brand={BRAND} />
 *
 *  Usage (auto via InteractionEvent.annotation):
 *  The cursor engine renders this automatically when event.annotation is set.
 */
const CursorAnnotationPill = ({
  text,
  cursorX,
  cursorY,
  startFrame,
  duration = 50,
  brand,
  offsetX = 24,
  offsetY = -32,
}: {
  text: string;
  cursorX: number;
  cursorY: number;
  startFrame: number;
  duration?: number;
  brand: BrandLike;
  offsetX?: number;
  offsetY?: number;
}) => {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;
  if (elapsed < 0 || elapsed > duration) return null;
  const fadeIn = Math.min(1, elapsed / 8);
  const fadeOut = elapsed > duration - 12 ? Math.max(0, 1 - (elapsed - (duration - 12)) / 12) : 1;
  const opacity = fadeIn * fadeOut;
  const slideY = interpolate(Math.min(1, elapsed / 8), [0, 1], [6, 0], { easing: EASINGS.easeOutCubic });
  return React.createElement("div", {
    style: {
      position: "absolute",
      left: cursorX + offsetX,
      top: cursorY + offsetY,
      background: brand.text ?? "#0f172a",
      color: brand.bg?.startsWith("#f") ? "#0f172a" : "#ffffff",
      fontSize: 12,
      fontWeight: 600,
      fontFamily: brand.font ?? "Inter",
      padding: "4px 10px",
      borderRadius: 99,
      opacity,
      transform: `translateY(${slideY}px)`,
      pointerEvents: "none" as const,
      zIndex: 160,
      whiteSpace: "nowrap" as const,
      boxShadow: "0 2px 8px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.1)",
      letterSpacing: "0.01em",
    },
  }, text);
};

// ---------------------------------------------------------------------------
// Chameleon + Cinematic Components — layered overlays for cursor demo scenes
// ---------------------------------------------------------------------------

/** Covers an input field with an identical-looking overlay + typing animation. */
const ChameleonInput = ({ x, y, w, h, text, startFrame, brand }: {
  x: number; y: number; w: number; h: number;
  text: string; startFrame: number; brand: BrandLike;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { displayText, showCursor } = useTyping(text, startFrame, fps);
  const { width, height: vh } = useVideoConfig();
  const fs = Math.round(h * vh * 0.5);
  // Focus ring animation: starts right before typing, ends a bit after
  const isFocused = frame >= startFrame - 5 && frame < startFrame + 120;
  return React.createElement("div", {
    style: {
      position: "absolute", left: x * width, top: y * vh,
      width: w * width, height: h * vh,
      background: brand.surface,
      border: `1.5px solid ${isFocused ? brand.primary : brand.border}`,
      boxShadow: isFocused ? `0 0 0 3px ${brand.primary}33` : "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
      borderRadius: 6, display: "flex", alignItems: "center",
      padding: "0 10px", overflow: "hidden", zIndex: 10, boxSizing: "border-box" as const,
    }
  },
    React.createElement("span", { style: { fontSize: fs, color: brand.text, fontFamily: brand.font ?? "Inter", whiteSpace: "nowrap" } },
      displayText,
      showCursor && React.createElement("span", { style: { marginLeft: 1, color: brand.primary, fontWeight: 300 } }, "|"),
    ),
  );
};

/** Pulse-glow highlight over a button or card element at click moment. */
const ChameleonHighlight = ({ x, y, w, h, triggerFrame, brand }: {
  x: number; y: number; w: number; h: number; triggerFrame: number; brand: BrandLike;
}) => {
  const frame = useCurrentFrame();
  const { width, height: vh, fps } = useVideoConfig();
  const framesIn = frame - triggerFrame;
  if (framesIn < 0) return null;

  // Click push-in animation to simulate physical button press
  const clickPop = spring({ frame: framesIn, fps, config: { damping: 12, stiffness: 300 }, durationInFrames: 15 });
  const scale = interpolate(clickPop, [0, 0.5, 1], [1, 0.95, 1]);
  const opacity = interpolate(framesIn, [0, 3, 15, 35], [0, 0.8, 0.4, 0], { extrapolateRight: "clamp" });

  return React.createElement("div", {
    style: {
      position: "absolute", left: x * width, top: y * vh,
      width: w * width, height: h * vh,
      background: `${brand.primary}33`,
      border: `2px solid ${brand.primary}`,
      borderRadius: 6, opacity, zIndex: 10, pointerEvents: "none" as const,
      boxShadow: `0 0 15px ${brand.primary}55`,
      transform: `scale(${scale})`,
      transformOrigin: "center center",
    }
  });
};

/** Spring-in dropdown menu with glass card items. */
const DropdownMenu = ({ x, y, w, items, openFrame, closeFrame, brand }: {
  x: number; y: number; w: number; items: any[];
  openFrame: number; closeFrame?: number; brand: BrandLike;
}) => {
  const { scale, opacity } = usePopup(openFrame, closeFrame);
  const { width, height: vh } = useVideoConfig();
  const itemH = 36; const totalH = items.length * itemH + 16;
  return React.createElement("div", {
    style: {
      position: "absolute", left: x * width, top: y * vh,
      width: w * width, height: totalH,
      background: brand.surface, border: `1px solid ${brand.border}`,
      borderRadius: 10, boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      overflow: "hidden", zIndex: 20, opacity, pointerEvents: "none" as const,
      transform: `scale(${scale})`, transformOrigin: "top left",
    }
  },
    ...items.map((item, i) => React.createElement("div", {
      key: i,
      style: {
        padding: "0 16px", height: itemH, display: "flex", alignItems: "center",
        fontSize: 13, color: brand.text, fontFamily: brand.font ?? "Inter",
        background: i === 0 ? `${brand.primary}22` : "transparent",
        borderBottom: i < items.length - 1 ? `1px solid ${brand.border}` : undefined,
      }
    }, typeof item === "object" && item !== null ? (item.label || item.value || "") : item)),
  );
};

/** Slow push-in zoom + 3D perspective tilt tracking cursor target.
 *  initialZoom / initialPan — stitches scenes seamlessly when camera state carries over
 *  from a previous scene (carryOver.camera: true in FlowEdge). Supply the ending zoom/pan
 *  from the previous scene so this scene begins mid-motion instead of resetting to 1.0.
 *  Pass via INITIAL_CAMERA_ZOOM and INITIAL_CAMERA_PAN scope variables when available. */
const CinematicCamera = ({
  targetX = 0.5, targetY = 0.5, zoomTo = 1.06,
  initialZoom = 1.0, initialPan = { x: 0, y: 0 },
  children
}: {
  targetX?: number; targetY?: number; zoomTo?: number;
  /** Starting zoom level — use previous scene's end zoom for seamless continuity */
  initialZoom?: number;
  /** Starting pan offset in px — use previous scene's end pan for seamless continuity */
  initialPan?: { x: number; y: number };
  children: React.ReactNode;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const easeInOut = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  // Interpolate from initialZoom (may be >1 when carrying over) to zoomTo
  const zoom = interpolate(frame, [0, 90], [initialZoom, zoomTo], { extrapolateRight: "clamp", easing: easeInOut });
  const tiltX = interpolate(frame, [0, 150], [0, 2], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  const tiltY = interpolate(frame, [0, 150], [0, -1.5], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  const panX = (0.5 - targetX) * width * (zoom - 1) + initialPan.x * (1 - frame / 90);
  const panY = (0.5 - targetY) * height * (zoom - 1) + initialPan.y * (1 - frame / 90);
  return React.createElement("div", { style: { position: "absolute", inset: 0, overflow: "hidden", perspective: 1200 } },
    React.createElement("div", {
      style: {
        position: "absolute", inset: 0, willChange: "transform",
        transform: `scale(${zoom}) translate(${panX}px,${panY}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        transformOrigin: `${targetX * 100}% ${targetY * 100}%`,
      }
    }, children),
  );
};

// ---------------------------------------------------------------------------
// SteppedCamera — keyframed whip-pan camera with hard holds and drift
// ---------------------------------------------------------------------------

/** Hard-keyframed macro camera — whip-pan to target, freeze, drift, whip away.
 *  Unlike CinematicCamera (monotonic 90-frame drone), SteppedCamera uses
 *  keyframed phases to simulate a human camera operator:
 *    Fast Push-in (easeOutExpo, 12–20f)
 *    → Hard Hold (frozen, 30–60f)  ← viewer reads/processes the UI
 *    → Drift (slow linear, 20–40f) ← subtle organic feel
 *    → Whip Out (easeInExpo, 10–15f)
 *
 *  keyframes: ordered array of camera states. Each entry:
 *    frame: absolute frame when THIS is the destination
 *    x/y: normalized 0–1 focal point (0.5/0.5 = center)
 *    zoom: scale factor (1.0 = full frame, 1.18 = tight macro)
 *    easing: "whip" | "ease" | "hold" | "drift"
 *      "whip"  — easeOutExpo (fast snap, 15f default) — urgent zoom
 *      "ease"  — easeOutCubic (smooth, 20f default)   — standard move
 *      "hold"  — instant jump-cut (1f)                — hard freeze
 *      "drift" — slow linear (60f)                    — documentary feel
 *    duration: frames for the TRANSITION into this keyframe (overrides easing default)
 *
 *  Usage (cursor demo: snap to button → hold → drift → exit):
 *    <SteppedCamera keyframes={[
 *      { frame: 0,   x: 0.5,  y: 0.5,  zoom: 1.0,  easing: "ease"  },
 *      { frame: 20,  x: 0.62, y: 0.45, zoom: 1.18, easing: "whip", duration: 14 },
 *      { frame: 34,  x: 0.62, y: 0.45, zoom: 1.18, easing: "hold" },
 *      { frame: 90,  x: 0.60, y: 0.47, zoom: 1.14, easing: "drift" },
 *      { frame: 130, x: 0.5,  y: 0.5,  zoom: 1.0,  easing: "whip", duration: 12 },
 *    ]}>
 *      <AppShell ... />
 *    </SteppedCamera>
 *    <CursorRenderer ... />  ← ALWAYS outside the camera wrapper
 *
 *  Rules:
 *  - Keep cursor/annotation layers OUTSIDE <SteppedCamera> so they don't zoom with the frame
 *  - "hold" easing makes a hard cut — only use for dramatic emphasis
 *  - Do not exceed zoomAmount 1.25 or the composition clips
 */

// ---------------------------------------------------------------------------
// FocusController — centralizes background dimming, secondary blur, and camera zoom
// on a specific interaction target. The "Timeline Engine" attention director.
//
// Usage:
//   <FocusController focusTarget="#submit-button" triggerFrame={60} brand={BRAND}>
//     <AppShell ... />
//   </FocusController>
//
// What it does:
//   1. Background dims 0→70% opacity as focus rises (dark overlay)
//   2. Non-focused elements gain blur filter (0→6px) — visual attention narrowing
//   3. Camera gently zooms toward focusTarget center (1.0→1.08) over 20 frames
//   4. On releaseFrame, reverses all effects smoothly
//
// Props:
//   focusTarget     — CSS selector for the element to focus on (or normalized {x,y} coords)
//   triggerFrame    — frame when focus effect starts
//   releaseFrame    — frame when focus dissolves back to normal (optional)
//   dimOpacity      — background dim strength 0–1 (default: 0.55)
//   blurStrength    — blur on non-focused elements in px (default: 4)
//   zoomAmount      — camera zoom multiplier 1.0–1.12 (default: 1.06)
//   brand           — for accent color on focus ring
// ---------------------------------------------------------------------------
const FocusController = ({
  children,
  focusTarget,
  triggerFrame = 0,
  releaseFrame,
  dimOpacity = 0.55,
  blurStrength = 4,
  zoomAmount = 1.06,
  focusX = 0.5,
  focusY = 0.5,
  brand,
}: {
  children: React.ReactNode;
  focusTarget?: string;
  triggerFrame?: number;
  releaseFrame?: number;
  dimOpacity?: number;
  blurStrength?: number;
  zoomAmount?: number;
  /** Normalized 0–1 horizontal center of the focus target (for camera zoom origin) */
  focusX?: number;
  /** Normalized 0–1 vertical center of the focus target (for camera zoom origin) */
  focusY?: number;
  brand?: any;
}) => {
  const frame = useCurrentFrame();
  const focusDuration = 20;
  const relFrame = releaseFrame ?? Infinity;

  // Focus progress: 0→1 as focus engages, 1→0 as it releases
  const engageProgress = Math.min(1, Math.max(0, (frame - triggerFrame) / focusDuration));
  const releaseProgress = relFrame === Infinity ? 0 : Math.min(1, Math.max(0, (frame - relFrame) / focusDuration));
  const focusProgress = Math.max(0, engageProgress - releaseProgress);

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  const fp = easeOut(focusProgress);

  const currentZoom = 1 + (zoomAmount - 1) * fp;
  const panX = (0.5 - focusX) * currentZoom * 10 * fp;
  const panY = (0.5 - focusY) * currentZoom * 10 * fp;

  return React.createElement("div", {
    style: { position: "absolute", inset: 0, overflow: "hidden" }
  },
    // Camera zoom layer
    React.createElement("div", {
      style: {
        position: "absolute", inset: 0, willChange: "transform",
        transform: `scale(${currentZoom}) translate(${panX}px, ${panY}px)`,
        transformOrigin: `${focusX * 100}% ${focusY * 100}%`,
      }
    }, children),
    // Background dim overlay — draws attention to focus target
    fp > 0.01 ? React.createElement("div", {
      style: {
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `rgba(0,0,0,${dimOpacity * fp})`,
        backdropFilter: `blur(${blurStrength * fp}px)`,
        WebkitBackdropFilter: `blur(${blurStrength * fp}px)`,
        // Cut-out hole where the focus target is — achieved by mix-blend-mode
        mixBlendMode: "multiply" as any,
        zIndex: 50,
      }
    }) : null,
  );
};

const SteppedCamera = ({
  children,
  keyframes = [],
}: {
  children: React.ReactNode;
  keyframes: Array<{
    frame: number;
    x: number;
    y: number;
    zoom: number;
    easing?: "whip" | "ease" | "hold" | "drift";
    duration?: number;
  }>;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  if (keyframes.length === 0) return React.createElement(React.Fragment, null, children);

  // Find active keyframe pair
  let fromKf = keyframes[0];
  let toKf = keyframes[0];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (frame >= keyframes[i].frame && frame < keyframes[i + 1].frame) {
      fromKf = keyframes[i];
      toKf = keyframes[i + 1];
      break;
    }
    if (frame >= keyframes[keyframes.length - 1].frame) {
      fromKf = toKf = keyframes[keyframes.length - 1];
      break;
    }
  }

  const easingDefaults: Record<string, number> = { whip: 15, ease: 20, hold: 1, drift: 60 };
  const transDur = toKf.duration ?? easingDefaults[toKf.easing ?? "ease"] ?? 20;
  const rawT = Math.max(0, Math.min(1, (frame - (toKf.frame - transDur)) / transDur));

  const easingFns: Record<string, (t: number) => number> = {
    whip:  (t) => 1 - Math.pow(2, -10 * t),         // easeOutExpo — fast snap
    ease:  (t) => 1 - Math.pow(1 - t, 3),           // easeOutCubic — smooth
    hold:  (t) => t >= 1 ? 1 : 0,                   // instant cut
    drift: (t) => t,                                 // linear — documentary
  };
  const easeFn = easingFns[toKf.easing ?? "ease"];
  const t = easeFn(rawT);

  const zoom = fromKf.zoom + (toKf.zoom - fromKf.zoom) * t;
  const cx   = fromKf.x   + (toKf.x   - fromKf.x)   * t;
  const cy   = fromKf.y   + (toKf.y   - fromKf.y)   * t;
  const panX = (0.5 - cx) * width  * (zoom - 1);
  const panY = (0.5 - cy) * height * (zoom - 1);

  return React.createElement("div", {
    style: { position: "absolute", inset: 0, overflow: "hidden" },
  },
    React.createElement("div", {
      style: {
        position: "absolute", inset: 0, willChange: "transform",
        transform: `scale(${zoom.toFixed(4)}) translate(${panX.toFixed(1)}px, ${panY.toFixed(1)}px)`,
        transformOrigin: `${(cx * 100).toFixed(1)}% ${(cy * 100).toFixed(1)}%`,
      },
    }, children),
  );
};

// ---------------------------------------------------------------------------
// MacroCamera — extreme 2–5x zoom into a specific UI region
// ---------------------------------------------------------------------------

/** Extreme macro zoom camera — Bordio-style 3–5x close-up into a UI section.
 *  Three phases: snap zoom-in (easeOutExpo) → hold at max zoom → whip zoom-out (easeInExpo).
 *  Optional slow drift during hold for organic documentary feel.
 *
 *  Props:
 *    zoomLevel      — target scale factor (2.0–5.0). Default 3.0.
 *    focusPoint     — normalized {x, y} center of zoom (0–1). Default center.
 *    zoomInFrame    — frame when zoom begins. Default 0.
 *    holdFrames     — frames at max zoom before zoom-out. Default 60.
 *    zoomDuration   — frames for zoom-in and zoom-out transitions. Default 25.
 *    driftAmount    — pixels of slow linear drift during hold for organic feel. Default 8.
 *    zoomOutDuration — frames for zoom-out (defaults to zoomDuration).
 *
 *  Usage:
 *    <MacroCamera zoomLevel={3.5} focusPoint={{x:0.65, y:0.4}}
 *      zoomInFrame={20} holdFrames={80} zoomDuration={25}>
 *      <AppShell ... />
 *    </MacroCamera>
 *
 *  Rules:
 *  - Max 2 MacroCamera uses per video
 *  - Always pair with <SelectiveFocus> for DOF blur effect
 *  - Keep cursor layers OUTSIDE MacroCamera so they don't scale
 *  - zoomLevel > 4 only for single-element close-ups (buttons, inputs)
 */
const MacroCamera = ({
  children,
  zoomLevel = 3,
  focusPoint = { x: 0.5, y: 0.5 },
  zoomInFrame = 0,
  holdFrames = 60,
  zoomDuration = 25,
  driftAmount = 8,
  zoomOutDuration,
}: {
  children: React.ReactNode;
  zoomLevel?: number;
  focusPoint?: { x: number; y: number };
  zoomInFrame?: number;
  holdFrames?: number;
  zoomDuration?: number;
  driftAmount?: number;
  zoomOutDuration?: number;
}) => {
  const frame = useCurrentFrame();
  const outDur = zoomOutDuration ?? zoomDuration;

  // Phase boundaries
  const zoomInEnd = zoomInFrame + zoomDuration;
  const holdEnd = zoomInEnd + holdFrames;
  const zoomOutEnd = holdEnd + outDur;

  // Easing functions
  const easeOutExpo = (t: number) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const easeInExpo = (t: number) => t <= 0 ? 0 : Math.pow(2, 10 * (t - 1));

  let zoom = 1;
  let driftX = 0;
  let driftY = 0;

  if (frame < zoomInFrame) {
    // Before zoom — static at 1x
    zoom = 1;
  } else if (frame < zoomInEnd) {
    // Phase 1: Snap zoom-in (easeOutExpo — fast snap to target)
    const t = (frame - zoomInFrame) / zoomDuration;
    zoom = 1 + (zoomLevel - 1) * easeOutExpo(t);
  } else if (frame < holdEnd) {
    // Phase 2: Hold at max zoom with subtle drift
    zoom = zoomLevel;
    const holdProgress = (frame - zoomInEnd) / Math.max(1, holdFrames);
    // Gentle sinusoidal drift for organic feel
    driftX = Math.sin(holdProgress * Math.PI * 0.8) * driftAmount;
    driftY = Math.cos(holdProgress * Math.PI * 0.6) * driftAmount * 0.5;
  } else if (frame < zoomOutEnd) {
    // Phase 3: Whip zoom-out (easeInExpo — accelerating departure)
    const t = (frame - holdEnd) / outDur;
    zoom = zoomLevel - (zoomLevel - 1) * easeInExpo(t);
  } else {
    // After zoom — back to 1x
    zoom = 1;
  }

  return React.createElement("div", {
    style: { position: "absolute", inset: 0, overflow: "hidden" },
  },
    React.createElement("div", {
      style: {
        position: "absolute", inset: 0, willChange: "transform",
        transform: `scale(${zoom.toFixed(4)}) translate(${driftX.toFixed(1)}px, ${driftY.toFixed(1)}px)`,
        transformOrigin: `${(focusPoint.x * 100).toFixed(1)}% ${(focusPoint.y * 100).toFixed(1)}%`,
      },
    }, children),
  );
};

// ---------------------------------------------------------------------------
// SelectiveFocus — radial depth-of-field blur (sharp center, blurred edges)
// ---------------------------------------------------------------------------

/** Selective depth-of-field blur — renders children twice:
 *  1. Bottom layer: full blur (simulates out-of-focus background)
 *  2. Top layer: sharp, masked with radial-gradient to create a "focus circle"
 *
 *  The result mimics camera DOF: sharp in the focus area, progressively blurred outside.
 *
 *  Props:
 *    focusX, focusY — normalized 0–1 center of the sharp region. Default center.
 *    focusRadius    — how much of the frame is sharp (0–1). Default 0.35.
 *    blurAmount     — blur strength on out-of-focus areas in px. Default 8.
 *    active         — enable/disable the effect (for animated toggle). Default true.
 *
 *  Usage:
 *    <SelectiveFocus focusX={0.65} focusY={0.4} focusRadius={0.3} blurAmount={10}>
 *      <AppShell ... />
 *    </SelectiveFocus>
 *
 *  Rules:
 *  - Always pair with MacroCamera for the full macro close-up effect
 *  - focusRadius 0.25–0.4 for UI section zoom, 0.15–0.25 for single-element zoom
 *  - blurAmount 6–10px for subtle DOF, 10–16px for dramatic isolation
 */
const SelectiveFocus = ({
  children,
  focusX = 0.5,
  focusY = 0.5,
  focusRadius = 0.35,
  blurAmount = 8,
  active = true,
}: {
  children: React.ReactNode;
  focusX?: number;
  focusY?: number;
  focusRadius?: number;
  blurAmount?: number;
  active?: boolean;
}) => {
  if (!active) return React.createElement(React.Fragment, null, children);

  const cx = (focusX * 100).toFixed(1);
  const cy = (focusY * 100).toFixed(1);
  const innerR = (focusRadius * 100).toFixed(1);
  const outerR = (focusRadius * 100 + 20).toFixed(1); // feathered edge

  // radial-gradient mask: fully opaque in center, transparent at edges
  const maskImage = `radial-gradient(ellipse at ${cx}% ${cy}%, black ${innerR}%, transparent ${outerR}%)`;

  return React.createElement("div", {
    style: { position: "absolute", inset: 0 },
  },
    // Layer 1: Blurred background (full frame, behind sharp layer)
    React.createElement("div", {
      style: {
        position: "absolute", inset: 0,
        filter: `blur(${blurAmount}px)`,
        WebkitFilter: `blur(${blurAmount}px)`,
        willChange: "filter",
      },
    }, children),
    // Layer 2: Sharp foreground (masked to focus circle)
    React.createElement("div", {
      style: {
        position: "absolute", inset: 0,
        maskImage,
        WebkitMaskImage: maskImage,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
      },
    }, children),
  );
};

// ---------------------------------------------------------------------------
// FeatureContextBar — persistent header above UI during multi-feature walkthroughs
// Qanapi-style: "KMS for CSE  Google Workspace" styled bar at top of scene.
// ---------------------------------------------------------------------------
const FeatureContextBar = ({
  label,
  badge,
  icon,
  brand,
  startFrame = 0,
}: {
  label: string;
  badge?: string;
  icon?: string;
  brand: BrandLike;
  startFrame?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slideIn = spring({ frame: frame - startFrame, fps, config: { damping: 200, stiffness: 120 }, durationInFrames: 20 });
  const y = interpolate(slideIn, [0, 1], [-60, 0]);
  if (frame < startFrame) return null;
  return React.createElement("div", {
    style: {
      position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", gap: 12, padding: "12px 32px",
      background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(0,0,0,0.08)",
      transform: `translateY(${y}px)`,
      fontFamily: brand.font ?? "Inter",
    },
  },
    icon && React.createElement("span", { style: { fontSize: 20 } }, icon),
    React.createElement("span", {
      style: { fontSize: 18, fontWeight: 700, color: "#0f172a", letterSpacing: -0.3 },
    }, label),
    badge && React.createElement("span", {
      style: {
        fontSize: 12, fontWeight: 600, color: brand.primary,
        background: `${brand.primary}15`, borderRadius: 20,
        padding: "4px 12px", marginLeft: 8,
      },
    }, badge),
  );
};

// ---------------------------------------------------------------------------
// NotificationCard — white card for CRM/workflow notification scatter scenes
// Pretaa-style: 4-6 cards floating on dark bg with staggered spring entrance.
// ---------------------------------------------------------------------------
const NotificationCard = ({
  category,
  message,
  timestamp,
  avatar,
  categoryColor,
  index = 0,
  startFrame = 0,
  brand,
  x,
  y,
}: {
  category: string;
  message: string;
  timestamp?: string;
  avatar?: string;
  categoryColor?: string;
  index?: number;
  startFrame?: number;
  brand: BrandLike;
  x?: number | string;
  y?: number | string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const staggerDelay = index * 8;
  const entrance = spring({ frame: frame - startFrame - staggerDelay, fps, config: { damping: 160, stiffness: 220 }, durationInFrames: 20 });
  const scale = interpolate(entrance, [0, 1], [0.85, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  // Gentle float
  const floatY = Math.sin((frame + index * 40) / 50) * 3;
  if (frame < startFrame + staggerDelay) return null;
  const color = categoryColor ?? brand.primary;
  return React.createElement("div", {
    style: {
      position: "absolute",
      left: x ?? "auto", top: y ?? "auto",
      width: 280, padding: "16px 20px",
      background: "#ffffff", borderRadius: 14,
      boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
      transform: `scale(${scale}) translateY(${floatY}px)`,
      opacity, fontFamily: brand.font ?? "Inter",
    },
  },
    React.createElement("div", {
      style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
    },
      avatar && React.createElement("div", {
        style: {
          width: 28, height: 28, borderRadius: 14, background: `${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color,
        },
      }, avatar),
      React.createElement("span", {
        style: {
          fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const,
          letterSpacing: 1, color, background: `${color}12`,
          borderRadius: 4, padding: "2px 8px",
        },
      }, category),
      timestamp && React.createElement("span", {
        style: { fontSize: 10, color: "#94a3b8", marginLeft: "auto" },
      }, timestamp),
    ),
    React.createElement("div", {
      style: { fontSize: 13, color: "#334155", lineHeight: 1.5 },
    }, message),
  );
};

// ---------------------------------------------------------------------------
// usePathTraveler — animates a position along a series of waypoints
// Screenjar-style: paper plane / dot travels along dotted bezier path.
// ---------------------------------------------------------------------------
const usePathTraveler = (
  points: { x: number; y: number }[],
  startFrame: number,
  duration: number,
): { x: number; y: number; angle: number; progress: number } => {
  const frame = useCurrentFrame();
  if (!points || points.length < 2) return { x: points?.[0]?.x ?? 0, y: points?.[0]?.y ?? 0, angle: 0, progress: 0 };
  const t = Math.max(0, Math.min(1, (frame - startFrame) / Math.max(duration, 1)));
  const totalSegments = points.length - 1;
  const segFloat = t * totalSegments;
  const segIndex = Math.min(Math.floor(segFloat), totalSegments - 1);
  const segT = segFloat - segIndex;
  const p0 = points[segIndex];
  const p1 = points[segIndex + 1];
  const x = p0.x + (p1.x - p0.x) * segT;
  const y = p0.y + (p1.y - p0.y) * segT;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return { x, y, angle, progress: t };
};

// PaperPlane — simple triangular SVG arrow, brand-colored
const PaperPlane = ({
  x,
  y,
  angle = 0,
  size = 24,
  color,
  brand,
}: {
  x: number;
  y: number;
  angle?: number;
  size?: number;
  color?: string;
  brand?: BrandLike;
}) => {
  const fill = color ?? brand?.primary ?? "#6366f1";
  return React.createElement("div", {
    style: {
      position: "absolute",
      left: x - size / 2, top: y - size / 2,
      width: size, height: size,
      transform: `rotate(${angle}deg)`,
      zIndex: 10,
    },
  },
    React.createElement("svg", {
      viewBox: "0 0 24 24", width: size, height: size, fill: "none",
    },
      React.createElement("path", {
        d: "M2 12L22 2L18 12L22 22L2 12Z",
        fill, stroke: fill, strokeWidth: 1, strokeLinejoin: "round",
      }),
    ),
  );
};

// ---------------------------------------------------------------------------
// InAppChatPanel — team messaging overlay for collaboration tools
// Bordio-style: slide-in chat thread with avatars, timestamps, typing indicator.
// ---------------------------------------------------------------------------
const InAppChatPanel = ({
  messages = [],
  startFrame = 0,
  brand,
  side = "right",
  overlay = true,
}: {
  messages: { name: string; text: string; avatar?: string; isTyping?: boolean }[];
  startFrame?: number;
  brand: BrandLike;
  side?: "left" | "right";
  overlay?: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const panelW = Math.round(width * 0.35);
  const slideIn = spring({ frame: frame - startFrame, fps, config: { damping: 200, stiffness: 120 }, durationInFrames: 25 });
  const slideX = interpolate(slideIn, [0, 1], [panelW, 0]);
  if (frame < startFrame) return null;
  const isRight = side === "right";
  return React.createElement(React.Fragment, null,
    overlay && React.createElement("div", {
      style: {
        position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)",
        opacity: interpolate(slideIn, [0, 1], [0, 1]), zIndex: 45, pointerEvents: "none" as const,
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute", [isRight ? "right" : "left"]: 0, top: 0, bottom: 0, width: panelW,
        background: brand.style === "dark" ? "rgba(20,20,30,0.95)" : "rgba(255,255,255,0.97)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderLeft: isRight ? `1px solid ${brand.border}` : "none",
        borderRight: isRight ? "none" : `1px solid ${brand.border}`,
        boxShadow: isRight ? "-12px 0 40px rgba(0,0,0,0.15)" : "12px 0 40px rgba(0,0,0,0.15)",
        transform: `translateX(${isRight ? slideX : -slideX}px)`,
        padding: "24px 16px", zIndex: 46, display: "flex", flexDirection: "column" as const, gap: 0,
        fontFamily: brand.font ?? "Inter", overflow: "hidden",
      },
    },
      // Header
      React.createElement("div", {
        style: { fontSize: 15, fontWeight: 700, color: brand.text, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${brand.border}` },
      }, "Messages"),
      // Messages
      ...messages.map((msg, i) => {
        const msgDelay = startFrame + 12 + i * 10;
        const msgEntrance = spring({ frame: frame - msgDelay, fps, config: { damping: 160, stiffness: 180 }, durationInFrames: 18 });
        if (frame < msgDelay) return null;
        if (msg.isTyping) {
          return React.createElement("div", {
            key: i,
            style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", opacity: interpolate(msgEntrance, [0, 1], [0, 1]) },
          },
            React.createElement("div", {
              style: { width: 28, height: 28, borderRadius: 14, background: `${brand.primary}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: brand.primary },
            }, msg.avatar ?? msg.name[0]),
            React.createElement("div", {
              style: { display: "flex", gap: 4, padding: "6px 12px", background: brand.surface, borderRadius: 12 },
            },
              ...[0, 1, 2].map(d => React.createElement("div", {
                key: d,
                style: {
                  width: 6, height: 6, borderRadius: 3, background: brand.textMuted,
                  opacity: interpolate(Math.sin((frame + d * 8) / 10), [-1, 1], [0.3, 1]),
                },
              })),
            ),
          );
        }
        return React.createElement("div", {
          key: i,
          style: {
            display: "flex", gap: 8, padding: "8px 0",
            opacity: interpolate(msgEntrance, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(msgEntrance, [0, 1], [12, 0])}px)`,
          },
        },
          React.createElement("div", {
            style: { width: 28, height: 28, borderRadius: 14, background: `${brand.primary}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: brand.primary, flexShrink: 0 },
          }, msg.avatar ?? msg.name[0]),
          React.createElement("div", { style: { flex: 1, minWidth: 0 } },
            React.createElement("div", {
              style: { fontSize: 12, fontWeight: 600, color: brand.text, marginBottom: 2 },
            }, msg.name),
            React.createElement("div", {
              style: { fontSize: 13, color: brand.textMuted, lineHeight: 1.45 },
            }, msg.text),
          ),
        );
      }),
    ),
  );
};

// ---------------------------------------------------------------------------
// ConcentricRings — expanding ring emanation from center (Screenjar/Viable style)
// ---------------------------------------------------------------------------
const ConcentricRings = ({
  rings = 4,
  centerX = 0.5,
  centerY = 0.5,
  maxRadius = 200,
  color,
  startFrame = 0,
  brand,
}: {
  rings?: number;
  centerX?: number;
  centerY?: number;
  maxRadius?: number;
  color?: string;
  startFrame?: number;
  brand?: BrandLike;
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const stroke = color ?? brand?.primary ?? "#6366f1";
  const cx = centerX * width;
  const cy = centerY * height;
  return React.createElement("svg", {
    style: { position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" as const },
    width, height, viewBox: `0 0 ${width} ${height}`,
  },
    ...Array.from({ length: rings }, (_, i) => {
      const delay = startFrame + i * 10;
      const expand = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 50 }, durationInFrames: 40 });
      const r = interpolate(expand, [0, 1], [0, maxRadius * ((i + 1) / rings)]);
      const opacity = interpolate(expand, [0, 1], [0, 0.6 - i * 0.1]);
      const dashPatterns = ["8 6", "4 8", "12 4", "2 10", "16 8"];
      return React.createElement("circle", {
        key: i, cx, cy, r: Math.max(r, 0),
        fill: "none", stroke, strokeWidth: 1.5,
        strokeDasharray: dashPatterns[i % dashPatterns.length],
        opacity: Math.max(opacity, 0),
      });
    }),
  );
};

// ---------------------------------------------------------------------------
// SVG Icon Library + DrawOnIcon — consistent line-art icons with draw-on animation
// ---------------------------------------------------------------------------
const ICON_PATHS: Record<string, string> = {
  shield: "M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L12 2z",
  lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z",
  key: "M12.65 10A5.99 5.99 0 007 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 005.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
  clock: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z",
  calendar: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z",
  dollar: "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  "chart-up": "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z",
  person: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  team: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  message: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z",
  bell: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
  mail: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  cloud: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z",
  code: "M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z",
  gear: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  lightning: "M7 2v11h3v9l7-12h-4l4-8H7z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z",
  warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  target: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  database: "M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2-6-1.5-6-2 2.13-2 6-2zM4 17v-2.34c1.37 1.05 3.54 1.73 6 1.88v2.41c-3.34-.21-6-1.36-6-1.95zm14 0c0 .59-2.66 1.74-6 1.95v-2.41c2.46-.15 4.63-.83 6-1.88V17z",
  globe: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  phone: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
};

const DrawOnIcon = ({
  icon,
  path,
  size = 80,
  color,
  startFrame = 0,
  drawDuration = 30,
  brand,
}: {
  icon?: string;
  path?: string;
  size?: number;
  color?: string;
  startFrame?: number;
  drawDuration?: number;
  brand?: BrandLike;
}) => {
  const frame = useCurrentFrame();
  const d = path ?? (icon ? ICON_PATHS[icon] : undefined) ?? ICON_PATHS.check;
  const stroke = color ?? brand?.primary ?? "#6366f1";
  const progress = Math.max(0, Math.min(1, (frame - startFrame) / Math.max(drawDuration, 1)));
  // Approximate path length — 300 works well for 24x24 viewBox icons
  const pathLen = 300;
  const dashOffset = pathLen * (1 - progress);
  return React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: size, height: size,
    fill: "none",
    style: { overflow: "visible" },
  },
    React.createElement("path", {
      d,
      stroke,
      strokeWidth: 1.5,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      strokeDasharray: pathLen,
      strokeDashoffset: dashOffset,
      fill: progress >= 1 ? `${stroke}15` : "none",
    }),
  );
};

/** Glass panel slides in from the right. */
const TaskDetailPanel = ({ openFrame, title, fields, brand }: {
  openFrame: number; title: string; fields: any[]; brand: BrandLike;
}) => {
  const { opacity } = usePopup(openFrame);
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const slideProgress = spring({ frame: frame - openFrame, fps, config: { damping: 18, stiffness: 100 }, durationInFrames: 30 });
  const panelW = Math.round(width * 0.38);
  const slideX = frame < openFrame ? panelW : interpolate(slideProgress, [0, 1], [panelW, 0]);
  return React.createElement("div", {
    style: {
      position: "absolute", right: 0, top: 0, bottom: 0, width: panelW,
      background: "rgba(255,255,255,0.08)", backdropFilter: "blur(24px) saturate(150%)", WebkitBackdropFilter: "blur(24px) saturate(150%)",
      borderLeft: `1px solid ${brand.border}`, boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
      opacity, transform: `translateX(${slideX}px)`, padding: "32px 24px", zIndex: 30,
    }
  },
    React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: brand.text, marginBottom: 24, fontFamily: brand.font ?? "Inter" } }, title),
    ...fields.map((f, i) => React.createElement("div", { key: i, style: { marginBottom: 16 } },
      React.createElement("div", { style: { fontSize: 11, color: brand.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 4, fontFamily: brand.font ?? "Inter" } }, typeof f.label === "object" && f.label !== null ? (f.label.label || f.label.value || "") : f.label),
      React.createElement("div", { style: { fontSize: 14, color: brand.text, fontFamily: brand.font ?? "Inter" } }, typeof f.value === "object" && f.value !== null ? (f.value.label || f.value.value || "") : f.value),
    )),
  );
};

/** Centered glass modal with backdrop blur. */
const ModalOverlay = ({ openFrame, closeFrame, title, brand }: {
  openFrame: number; closeFrame?: number; title?: string; brand: BrandLike;
}) => {
  const { scale, opacity, visible } = usePopup(openFrame, closeFrame);
  const { width, height } = useVideoConfig();
  if (!visible && scale === 0) return null;
  const mW = Math.round(width * 0.5); const mH = Math.round(height * 0.55);
  return React.createElement(React.Fragment, null,
    React.createElement("div", { style: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", opacity, zIndex: 40, pointerEvents: "none" as const } }),
    React.createElement("div", {
      style: {
        position: "absolute", left: (width - mW) / 2, top: (height - mH) / 2, width: mW, height: mH,
        background: "rgba(255,255,255,0.09)", backdropFilter: "blur(24px) saturate(150%)", WebkitBackdropFilter: "blur(24px) saturate(150%)",
        borderTop: "1px solid rgba(255,255,255,0.22)", borderLeft: "1px solid rgba(255,255,255,0.16)", borderRight: `1px solid ${brand.border}`, borderBottom: `1px solid ${brand.border}`, borderRadius: 20,
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
        opacity, transform: `scale(${scale})`, padding: 32, zIndex: 41,
      }
    },
      title && React.createElement("div", { style: { fontSize: 22, fontWeight: 700, color: brand.text, marginBottom: 20, fontFamily: brand.font ?? "Inter" } }, title),
    ),
  );
};

// ---------------------------------------------------------------------------
// Sprint 2 App Shell Components — full SaaS layout for Bordio-level scenes
// ---------------------------------------------------------------------------

/** Standalone text input with typing cursor and optional focus ring. */
const InputField = ({ value, placeholder, label, focused, brand, width = "100%" }: {
  value: string; placeholder?: string; label?: string; focused?: boolean;
  brand: BrandLike; width?: string | number;
}) => {
  const frame = useCurrentFrame();
  const showCursor = focused && Math.floor(frame / 15) % 2 === 0;
  return React.createElement("div", { style: { width, fontFamily: brand.font ?? "Inter" } },
    label && React.createElement("div", { style: { fontSize: 11, color: brand.textMuted, marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: 0.8 } }, label),
    React.createElement("div", {
      style: {
        background: brand.surface, border: `1.5px solid ${focused ? brand.primary : brand.border}`,
        borderRadius: 7, padding: "0 12px", height: 38, display: "flex", alignItems: "center",
        boxShadow: focused ? `0 0 0 3px ${brand.primary}33` : "none",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }
    },
      React.createElement("span", { style: { fontSize: 14, color: value ? brand.text : brand.textMuted } },
        value || placeholder || "",
        showCursor && React.createElement("span", { style: { marginLeft: 1, opacity: 0.8, color: brand.primary } }, "|"),
      ),
    ),
  );
};

/** Single chat message bubble with author dot — springs in at appearFrame. */
const ChatBubble = ({ message, author, color, appearFrame, brand }: {
  message: string; author: string; color?: string; appearFrame: number; brand: BrandLike;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - appearFrame, fps, config: { damping: 14, stiffness: 200 }, durationInFrames: 20 });
  if (frame < appearFrame - 2) return null;
  const dotColor = color ?? brand.primary;
  return React.createElement("div", {
    style: {
      display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12,
      opacity: Math.min(prog, 1), transform: `translateY(${(1 - prog) * 10}px)`,
    }
  },
    React.createElement("div", {
      style: { width: 30, height: 30, borderRadius: "50%", background: dotColor, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700, fontFamily: brand.font ?? "Inter" }
    }, author.charAt(0).toUpperCase()),
    React.createElement("div", {
      style: { background: brand.surface, border: `1px solid ${brand.border}`, borderRadius: "4px 12px 12px 12px", padding: "8px 14px", maxWidth: "80%" }
    },
      React.createElement("div", { style: { fontSize: 11, color: brand.textMuted, marginBottom: 3, fontFamily: brand.font ?? "Inter" } }, author),
      React.createElement("div", { style: { fontSize: 13, color: brand.text, lineHeight: 1.5, fontFamily: brand.font ?? "Inter" } }, message),
    ),
  );
};

/** Dark sidebar navigation with active highlight + optional badges. */
const SidebarNav = ({ appName, items, activeItem, brand }: {
  appName?: string;
  items: { label: string; badge?: string | number; icon?: string }[];
  activeItem?: string;
  brand: BrandLike;
}) => {
  return React.createElement("div", {
    style: {
      width: 220, height: "100%", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(24px) saturate(150%)", WebkitBackdropFilter: "blur(24px) saturate(150%)",
      borderRight: `1px solid ${brand.border}`, display: "flex", flexDirection: "column" as const, padding: "16px 0", flexShrink: 0,
    }
  },
    appName && React.createElement("div", {
      style: { padding: "0 16px 16px", borderBottom: `1px solid ${brand.border}`, marginBottom: 8, fontSize: 16, fontWeight: 700, color: brand.text, fontFamily: brand.font ?? "Inter" }
    }, appName),
    ...items.map((item, i) => {
      const isActive = item.label === activeItem;
      return React.createElement("div", {
        key: i,
        style: {
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 16px", margin: "1px 8px", borderRadius: 7, cursor: "default" as const,
          background: isActive ? `${brand.primary}22` : "transparent",
          borderLeft: isActive ? `3px solid ${brand.primary}` : "3px solid transparent",
        }
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
          item.icon && React.createElement("span", { style: { fontSize: 15 } }, item.icon),
          React.createElement("span", { style: { fontSize: 13, color: isActive ? brand.text : brand.textMuted, fontWeight: isActive ? 600 : 400, fontFamily: brand.font ?? "Inter" } }, item.label),
        ),
        item.badge && React.createElement("span", {
          style: { background: brand.primary, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, fontFamily: brand.font ?? "Inter" }
        }, String(item.badge)),
      );
    }),
  );
};

/** Full SaaS app layout: sidebar + optional topbar + main content area. */
const AppShell = ({ sidebar, topbar, children, brand, zoom = 1, chromeColor }: {
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
  children?: React.ReactNode;
  brand: BrandLike;
  zoom?: number;
  /** Brand-colored title bar (Viable-style). When set, replaces default dark chrome. */
  chromeColor?: string;
}) => {
  const { width, height } = useVideoConfig();
  const topbarBg = chromeColor
    ? chromeColor
    : "rgba(0,0,0,0.4)";
  const topbarText = chromeColor
    ? (parseInt(chromeColor.replace("#", "").slice(0, 2), 16) > 128 ? "#0f172a" : "#ffffff")
    : brand.text;
  return React.createElement("div", {
    style: {
      position: "absolute", inset: 0, background: brand.bg,
      transform: `scale(${zoom})`, transformOrigin: "top left",
      width: width / zoom, height: height / zoom,
      display: "flex", flexDirection: "column" as const, overflow: "hidden",
      fontFamily: brand.font ?? "Inter",
    }
  },
    topbar && React.createElement("div", {
      style: {
        height: 52, background: topbarBg, backdropFilter: chromeColor ? "none" : "blur(24px) saturate(150%)", WebkitBackdropFilter: chromeColor ? "none" : "blur(24px) saturate(150%)",
        borderBottom: `1px solid ${brand.border}`, display: "flex", alignItems: "center",
        padding: "0 20px", flexShrink: 0, zIndex: 5, color: topbarText,
      }
    }, topbar),
    React.createElement("div", { style: { display: "flex", flex: 1, overflow: "hidden" } },
      sidebar,
      React.createElement("div", { style: { flex: 1, overflow: "hidden", position: "relative" } }, children),
    ),
  );
};

// ---------------------------------------------------------------------------
// HeroSplit — pre-built 2-col layout (text left, visual right)
// ---------------------------------------------------------------------------

/** Symmetric 2-column layout with centered alignment for both halves.
 *  Eliminates LLM pixel-guessing on AbsoluteFill positioning.
 *
 *  left: text/headline content (left column)
 *  right: UI mockup, device, chart, or illustration (right column)
 *  leftWeight / rightWeight: flex ratios (default 1:1; use 1.2:0.8 for text-heavy layouts)
 *  gap: horizontal gutter between columns (default 80px)
 *
 *  Usage:
 *    <HeroSplit
 *      left={<div>...<MaskedReveal startFrame={20}><h1>Your headline</h1></MaskedReveal>...</div>}
 *      right={<ContentCard brand={BRAND}><AppShell .../></ContentCard>}
 *      brand={BRAND}
 *    />
 */
const HeroSplit = ({
  left,
  right,
  brand,
  leftWeight = 1,
  rightWeight = 1,
  gap = 80,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  brand: BrandLike;
  leftWeight?: number;
  rightWeight?: number;
  gap?: number;
}) => {
  return React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      padding: GLOBAL_STYLE.contentPadding,
      gap,
    },
  },
    React.createElement("div", {
      style: { flex: leftWeight, display: "flex", flexDirection: "column" as const, justifyContent: "center" },
    }, left),
    React.createElement("div", {
      style: { flex: rightWeight, display: "flex", alignItems: "center", justifyContent: "center" },
    }, right),
  );
};

// ---------------------------------------------------------------------------
// cubicBezier — quadratic bezier interpolation for natural cursor arcs
// ---------------------------------------------------------------------------

/** Natural cursor arc movement between two points.
 *  controlOffset: perpendicular offset (0.15 = gentle arc, 0.3 = dramatic arc)
 *  t: 0→1 spring progress
 *  Returns { x, y } in the same coordinate space as from/to.
 */
const cubicBezier = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  t: number,
  /** tension: 0 = straight line, 1 = sharp arc. Default 0.15 (subtle curve).
   *  Alias for the old `controlOffset` param — fully backward-compatible. */
  tension = 0.15,
): { x: number; y: number } => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Control point perpendicular to movement vector
  const cx = (from.x + to.x) / 2 + dy * tension;
  const cy = (from.y + to.y) / 2 - dx * tension;
  const mt = 1 - t;
  return {
    x: mt * mt * from.x + 2 * mt * t * cx + t * t * to.x,
    y: mt * mt * from.y + 2 * mt * t * cy + t * t * to.y,
  };
};

// ---------------------------------------------------------------------------
// LightArcBg — animated near-white background with concentric arc lines
// ---------------------------------------------------------------------------

/** Pre-built light-theme arc background — use instead of flat bg for B2B SaaS videos.
 *  Place as first child of AbsoluteFill: <LightArcBg brand={BRAND} />
 */
const LightArcBg = ({ brand, variant = "arcs", globalFrameOffset = 0 }: { brand?: any; variant?: "arcs" | "grid" | "dots"; globalFrameOffset?: number }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const bgColor = brand?.bg || "#f8f9fc";
  const primary = brand?.primary || "#6366f1";
  const secondary = brand?.secondary || "#ec4899";

  if (variant === "grid") {
    return React.createElement("div", { style: { position: "absolute", inset: 0, background: "#f5f5f5" } },
      React.createElement("svg", { width, height, style: { position: "absolute", inset: 0, opacity: 0.025 } },
        React.createElement("defs", null,
          React.createElement("pattern", { id: "lgrid", width: 60, height: 60, patternUnits: "userSpaceOnUse" },
            React.createElement("line", { x1: 0, y1: 0, x2: 60, y2: 0, stroke: "#000", strokeWidth: 0.5 }),
            React.createElement("line", { x1: 0, y1: 0, x2: 0, y2: 60, stroke: "#000", strokeWidth: 0.5 }),
          ),
        ),
        React.createElement("rect", { width: "100%", height: "100%", fill: "url(#lgrid)" }),
      ),
    );
  }

  if (variant === "dots") {
    return React.createElement("div", { style: { position: "absolute", inset: 0, background: bgColor } },
      React.createElement("svg", { width, height, style: { position: "absolute", inset: 0, opacity: 0.035 } },
        React.createElement("defs", null,
          React.createElement("pattern", { id: "ldots", width: 24, height: 24, patternUnits: "userSpaceOnUse" },
            React.createElement("circle", { cx: 12, cy: 12, r: 1.5, fill: "#000" }),
          ),
        ),
        React.createElement("rect", { width: "100%", height: "100%", fill: "url(#ldots)" }),
      ),
    );
  }

  // Default: "arcs" variant — concentric animated arc lines + corner blobs
  const ARC_COUNT = 8;
  const ORIGIN_X = width * 0.3;
  const ORIGIN_Y = height * 0.6;

  const arcs = Array.from({ length: ARC_COUNT }, (_, i) => ({
    radius: 180 + i * 130,
    opacity: Math.max(0, 0.04 - i * 0.003),
    dashArray: `${55 + i * 18} ${180 + i * 36}`,
    dashOffset: i * 40,
  }));

  const rotation = (frame + globalFrameOffset) * 0.05;

  return React.createElement("div", { style: { position: "absolute", inset: 0, background: bgColor } },
    React.createElement("div", {
      style: {
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at 0% 100%, ${primary}12 0%, transparent 50%), radial-gradient(ellipse at 100% 0%, ${secondary}0e 0%, transparent 45%), radial-gradient(ellipse at 100% 100%, ${primary}0b 0%, transparent 40%)`,
      },
    }),
    React.createElement("svg", {
      style: { position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" },
    },
      ...arcs.map((arc, i) =>
        React.createElement("circle", {
          key: i,
          cx: ORIGIN_X,
          cy: ORIGIN_Y,
          r: arc.radius,
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
};

// ---------------------------------------------------------------------------
// useMorphEntrance — spring-driven shape morph from exported rect to natural position
// ---------------------------------------------------------------------------

/** Morphs a UI element from a source rect (from a previous scene) into its natural position in this scene.
 *  Use this for dramatic cross-scene shape transitions: floating badge → AppShell, icon circle → feature card.
 *
 *  fromRect: normalized 0–1 rect where the element STARTS (from morphExport on previous scene). Pass MORPH_FROM.
 *  toRect:   normalized 0–1 rect where the element LIVES in this scene.
 *  startFrame: frame when morph begins (default 0).
 *
 *  Returns `{ style, progress }` — apply style to the morphing container.
 *  Border-radius interpolates: 50% (circular blob) → card corners (12px) as progress 0→1.
 *
 *  Usage:
 *    const { style, progress } = useMorphEntrance(MORPH_FROM, { x: 0.1, y: 0.15, w: 0.8, h: 0.65 });
 *    <div style={{ ...style, background: BRAND.primary }}>
 *      {progress > 0.5 && <AppShellContent />}
 *    </div>
 *
 *  If MORPH_FROM is null (no morph import on this scene), style is empty and progress springs to 1 immediately.
 */
function useMorphEntrance(
  fromRect: { x: number; y: number; w: number; h: number } | null,
  toRect: { x: number; y: number; w: number; h: number },
  startFrame: number = 0,
): { style: React.CSSProperties; progress: number } {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const rawProgress = spring({ frame: frame - startFrame, fps: 30, config: SPRING_CONFIGS.snap });
  const progress = Math.min(rawProgress, 1);
  if (!fromRect) return { style: {}, progress };

  const fromLeft = fromRect.x * width;
  const fromTop = fromRect.y * height;
  const fromW = fromRect.w * width;
  const fromH = fromRect.h * height;
  const toLeft = toRect.x * width;
  const toTop = toRect.y * height;
  const toW = toRect.w * width;
  const toH = toRect.h * height;

  const left = fromLeft + (toLeft - fromLeft) * progress;
  const top = fromTop + (toTop - fromTop) * progress;
  const w = fromW + (toW - fromW) * progress;
  const h = fromH + (toH - fromH) * progress;
  // Border radius: 50% (blob/circle) → 12px (card corner) as progress 0→1
  const bRadius = `${50 - 38 * progress}%`;

  return {
    style: {
      position: "absolute" as const,
      left,
      top,
      width: w,
      height: h,
      borderRadius: bRadius,
    },
    progress,
  };
}

// ---------------------------------------------------------------------------
// AnimatedConnectionLine — SVG path draw-on between two floating elements
// ---------------------------------------------------------------------------

/** Draws an animated SVG line or dotted path between two normalized (0–1) positions.
 *  The line "draws itself" from x1/y1 to x2/y2 over `duration` frames.
 *  Use to connect floating avatars, node cards, feature icons, or UI elements.
 *
 *  x1, y1, x2, y2: normalized 0–1 positions within the video frame
 *  dashed: true for dotted connector (WhatAStory node-graph style)
 *  curved: true for a subtle quadratic bezier arc (more organic)
 *  color: stroke color (default: semi-transparent dark)
 *
 *  Usage (two avatars connected by an animated line):
 *    <AnimatedConnectionLine x1={0.25} y1={0.45} x2={0.60} y2={0.35} startFrame={20} dashed color={BRAND.primary + "55"} />
 *
 *  For a live connection that tracks dynamic positions, use SVG inline:
 *    <svg style={{position:"absolute",inset:0,pointerEvents:"none"}} width={width} height={height}>
 *      <path d={`M ${ax} ${ay} L ${bx} ${by}`} stroke={BRAND.primary} strokeDasharray="5 8" />
 *    </svg>
 */
const AnimatedConnectionLine = ({
  x1, y1, x2, y2,
  startFrame = 0,
  duration = 30,
  color,
  dashed = false,
  strokeWidth = 1.5,
  curved = false,
}: {
  x1: number; y1: number; x2: number; y2: number;
  startFrame?: number;
  duration?: number;
  color?: string;
  dashed?: boolean;
  strokeWidth?: number;
  curved?: boolean;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const progress = interpolate(frame - startFrame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASINGS.easeOutCubic,
  });
  const ax = x1 * width, ay = y1 * height;
  const bx = x2 * width, by = y2 * height;
  // Quadratic bezier control point — bows upward
  const cmx = (ax + bx) / 2;
  const cmy = (ay + by) / 2 - Math.abs(bx - ax) * 0.18;
  const dx = bx - ax, dy = by - ay;
  const pathLength = Math.sqrt(dx * dx + dy * dy) * (curved ? 1.08 : 1);
  const d = curved
    ? `M ${ax} ${ay} Q ${cmx} ${cmy} ${bx} ${by}`
    : `M ${ax} ${ay} L ${bx} ${by}`;
  const strokeColor = color ?? "rgba(0,0,0,0.22)";
  const dashArray = dashed ? "5 9" : `${pathLength + 2} ${pathLength + 2}`;
  const dashOffset = dashed
    ? `${(1 - progress) * (pathLength + 20)}`
    : `${pathLength * (1 - progress)}`;
  return React.createElement("svg", {
    style: { position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" },
    width,
    height,
  },
    React.createElement("path", {
      d,
      fill: "none",
      stroke: strokeColor,
      strokeWidth,
      strokeDasharray: dashArray,
      strokeDashoffset: dashOffset,
      strokeLinecap: "round" as const,
    }),
  );
};

// ---------------------------------------------------------------------------
// DynamicConnectorLine — live-position SVG connector with arrowhead, dot, label
// ---------------------------------------------------------------------------

/** Upgraded AnimatedConnectionLine that accepts live {x,y} position objects
 *  and adds arrowhead, traveling dot, and endpoint label support.
 *
 *  from/to: normalized 0–1 positions — can be computed from state/spring each frame.
 *  arrowHead: SVG polygon triangle at the endpoint.
 *  dot: small circle that travels from `from` → `to` as line draws.
 *  label: pill text that fades in once the line completes.
 *  labelOffset: px offset from endpoint (default: above endpoint).
 *
 *  Usage — InWorldText to UI element connection:
 *    <DynamicConnectorLine
 *      from={{ x: 0.18, y: 0.30 }} to={{ x: 0.45, y: 0.52 }}
 *      startFrame={20} duration={25} color={BRAND.primary} curved arrowHead dot
 *      label="Revenue ↑12%" labelOffset={{ x: 0, y: -20 }}
 *    />
 */
const DynamicConnectorLine = ({
  from,
  to,
  startFrame = 0,
  duration = 30,
  color,
  dashed = false,
  strokeWidth = 1.5,
  curved = false,
  arrowHead = false,
  dot = false,
  label,
  labelOffset = { x: 0, y: -18 },
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  startFrame?: number;
  duration?: number;
  color?: string;
  dashed?: boolean;
  strokeWidth?: number;
  curved?: boolean;
  arrowHead?: boolean;
  dot?: boolean;
  label?: string;
  labelOffset?: { x: number; y: number };
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const progress = interpolate(frame - startFrame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASINGS.easeOutCubic,
  });
  const ax = from.x * width, ay = from.y * height;
  const bx = to.x * width, by = to.y * height;
  const cmx = (ax + bx) / 2;
  const cmy = (ay + by) / 2 - Math.abs(bx - ax) * 0.18;
  const dx = bx - ax, dy = by - ay;
  const pathLength = Math.sqrt(dx * dx + dy * dy) * (curved ? 1.08 : 1);
  const d = curved
    ? `M ${ax} ${ay} Q ${cmx} ${cmy} ${bx} ${by}`
    : `M ${ax} ${ay} L ${bx} ${by}`;
  const strokeColor = color ?? "rgba(0,0,0,0.22)";
  const dashArray = dashed ? "5 9" : `${pathLength + 2} ${pathLength + 2}`;
  const dashOffset = dashed
    ? `${(1 - progress) * (pathLength + 20)}`
    : `${pathLength * (1 - progress)}`;
  // Traveling dot: spring-driven from start → end
  const dotSpring = spring({ frame: frame - startFrame, fps: 30, config: SPRING_CONFIGS.entrance });
  const dotP = Math.min(dotSpring, 1);
  const dotX = ax + (bx - ax) * dotP;
  const dotY = ay + (by - ay) * dotP;
  // Arrowhead rotation angle
  const arrowAngle = Math.atan2(by - ay, bx - ax) * (180 / Math.PI);
  // Label fades in when line is nearly complete
  const labelOpacity = interpolate(progress, [0.85, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return React.createElement(React.Fragment, null,
    React.createElement("svg", {
      style: { position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" },
      width,
      height,
    },
      React.createElement("path", {
        d, fill: "none", stroke: strokeColor, strokeWidth,
        strokeDasharray: dashArray, strokeDashoffset: dashOffset,
        strokeLinecap: "round" as const,
      }),
      arrowHead && progress > 0.1 && React.createElement("polygon", {
        points: "0,-5 10,0 0,5",
        fill: strokeColor,
        transform: `translate(${bx},${by}) rotate(${arrowAngle})`,
        opacity: progress,
      }),
      dot && React.createElement("circle", {
        cx: dotX, cy: dotY, r: 5,
        fill: strokeColor,
        opacity: Math.min(progress * 4, 1),
      }),
    ),
    label && React.createElement("div", {
      style: {
        position: "absolute",
        left: bx + (labelOffset?.x ?? 0),
        top: by + (labelOffset?.y ?? -18),
        opacity: labelOpacity,
        background: "rgba(0,0,0,0.72)",
        color: "#fff",
        fontSize: 12,
        padding: "3px 10px",
        borderRadius: 20,
        fontWeight: 500,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        transform: "translateX(-50%)",
      },
    }, label),
  );
};

// ---------------------------------------------------------------------------
// VideoPlateMockup — live-action compositing: real photo/video environment bg
// ---------------------------------------------------------------------------

/** Renders an environment background (real photo or live-action still) with
 *  Ken Burns slow zoom, vignette, and a content slot for UI elements that
 *  "float in the real world" — the Viable/WhatAStory live-action composite look.
 *
 *  src: image/video URL. Typically ATTACHED_IMAGES[0] (user-uploaded env photo).
 *  kenBurnsScale: max zoom multiplier (1.04 = subtle 4% push-in over 90 frames)
 *  darkOverlay: 0–1 darkness over the plate for text/UI contrast
 *  children: UI elements to float over the plate (TiltWrapper recommended)
 *
 *  Usage (brand env photo + floating UI card):
 *    <VideoPlateMockup src={ATTACHED_IMAGES[0]} darkOverlay={0.35}>
 *      <div style={{ position: "absolute", top: "15%", right: "8%" }}>
 *        <TiltWrapper tiltX={-2} tiltY={3}>
 *          <ContentCard brand={BRAND} startFrame={20}>
 *            <AnimatedMetricCards cards={[...]} brand={BRAND} />
 *          </ContentCard>
 *        </TiltWrapper>
 *      </div>
 *    </VideoPlateMockup>
 *
 *  Usage (screen-tracked UI — monitor in photo shows the actual product):
 *    // Position children to align with the monitor's screen area in the photo
 *    // Use TiltWrapper with tilt values matching the monitor's perspective angle
 */
const VideoPlateMockup = ({
  src,
  kenBurns = true,
  kenBurnsScale = 1.04,
  darkOverlay = 0.28,
  vignetteStrength = 0.5,
  children,
}: {
  src: string;
  kenBurns?: boolean;
  kenBurnsScale?: number;
  darkOverlay?: number;
  vignetteStrength?: number;
  children?: React.ReactNode;
}) => {
  const frame = useCurrentFrame();
  const scale = kenBurns
    ? interpolate(frame, [0, 90], [1, kenBurnsScale], { extrapolateRight: "clamp" })
    : 1;
  return React.createElement("div", {
    style: { position: "absolute", inset: 0, overflow: "hidden" },
  },
    // Photo plate with Ken Burns zoom
    React.createElement("div", {
      style: {
        position: "absolute", inset: 0,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        willChange: "transform",
      },
    },
      React.createElement(Img, {
        src,
        style: { width: "100%", height: "100%", objectFit: "cover" },
      } as any),
    ),
    // Dark overlay for legibility
    darkOverlay > 0 && React.createElement("div", {
      style: { position: "absolute", inset: 0, background: `rgba(0,0,0,${darkOverlay})` },
    }),
    // Radial vignette — darker edges, lighter center
    vignetteStrength > 0 && React.createElement("div", {
      style: {
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteStrength * 0.6}) 100%)`,
        pointerEvents: "none" as const,
      },
    }),
    // Content slot — UI elements floating over the plate
    children,
  );
};

// ---------------------------------------------------------------------------
// GLOBAL_STYLE — visual consistency constants across all scenes
// ---------------------------------------------------------------------------

const GLOBAL_STYLE = {
  // WhatAStory layout standard: 120px preferred padding (80px is the hard minimum)
  contentPadding: 120,
  cardRadius: 20,
  // WhatAStory headline standard: 96–128px for hero; 108 is the studio default
  headlineSize: 108,
  shadowScale: "medium" as const,
  // 3-tier shadow depth scale (light-theme cards):
  // LOW  — subtle lift: barely-there shadow for secondary/background cards
  // MED  — standard card elevation: default for most UI components
  // HIGH — foreground card: prominent, used for featured or hero cards
  shadowLow:    "0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.06)",
  shadowMedium: "0 2px 8px rgba(0,0,0,0.06), 0 8px 28px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.05)",
  shadowHigh:   "0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.14), 0 40px 80px rgba(0,0,0,0.10)",
};

// ---------------------------------------------------------------------------
// FilmGrain — subtle noise overlay for organic, non-digital feel
// ---------------------------------------------------------------------------

const FilmGrain = ({ opacity = 0.03 }: { opacity?: number }) => {
  const frame = useCurrentFrame();
  // Shift pattern every frame for animated grain
  const shift = (frame * 37) % 100;
  return React.createElement("div", {
    style: {
      position: "absolute", inset: 0, zIndex: 9999, pointerEvents: "none",
      opacity,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: "180px 180px",
      backgroundPosition: `${shift}px ${shift * 0.7}px`,
      mixBlendMode: "multiply" as const,
    },
  });
};

// ---------------------------------------------------------------------------
// ContextualSectionHeader — large bold text above UI during cursor demos
// ---------------------------------------------------------------------------

const ContextualSectionHeader = ({ text, subtext, icon, startFrame, exitFrame, brand }: {
  text: string;
  subtext?: string;
  icon?: string;
  startFrame: number;
  exitFrame?: number;
  brand: BrandLike;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterProgress = spring({ frame: frame - startFrame, fps, config: { damping: 200, stiffness: 100 } });
  const exitProgress = exitFrame ? spring({ frame: frame - exitFrame, fps, config: { damping: 200, stiffness: 150 } }) : 0;
  const opacity = Math.max(0, Math.min(1, enterProgress) - exitProgress);
  const translateY = (1 - enterProgress) * -20 + exitProgress * -12;

  return React.createElement("div", {
    style: {
      position: "absolute", top: 60, left: 80, right: 80,
      opacity, transform: `translateY(${translateY}px)`,
      zIndex: 50, pointerEvents: "none",
    },
  },
    React.createElement("div", {
      style: {
        display: "flex", alignItems: "center", gap: 16,
      },
    },
      icon && React.createElement("span", { style: { fontSize: 48 } }, icon),
      React.createElement("div", null,
        React.createElement("div", {
          style: {
            fontSize: 56, fontWeight: 800, color: brand.text || "#0f172a",
            fontFamily: brand.font || "Inter", letterSpacing: "-0.03em", lineHeight: 1.1,
          },
        }, text),
        subtext && React.createElement("div", {
          style: {
            fontSize: 24, fontWeight: 500, color: brand.textMuted || "rgba(15,23,42,0.5)",
            fontFamily: brand.font || "Inter", marginTop: 4,
          },
        }, subtext),
      ),
    ),
  );
};

// ---------------------------------------------------------------------------
// SfxSequencer — places Audio elements at frame offsets for SFX events
// ---------------------------------------------------------------------------

// SfxSequencer reads URLs from the SFX_URLS scope variable injected by compileCode.
// Falls back to empty (silent) when a sound isn't available.
const SfxSequencer = ({
  events,
  sfxUrls = {},
}: {
  events: Array<{ frame: number; sfx?: string }>;
  sfxUrls?: Record<string, string>;
}) => {
  const sfxEvents = events.filter((e) => e.sfx && sfxUrls[e.sfx]);
  if (sfxEvents.length === 0) return null;
  return React.createElement(React.Fragment, null,
    ...sfxEvents.map((e, i) =>
      React.createElement(
        Sequence as any,
        { key: i, from: e.frame, durationInFrames: 30 },
        React.createElement(Audio, { src: sfxUrls[e.sfx!], volume: 0.35 }),
      ),
    ),
  );
};

// ---------------------------------------------------------------------------
// AnimatedSidebar — staggered sidebar nav with spring animations
// ---------------------------------------------------------------------------

const AnimatedSidebar = ({ appName, items, brand, startFrame = 0 }: {
  appName: string;
  items: { label: string; icon: string; isActive?: boolean; badge?: number }[];
  brand: BrandLike;
  startFrame?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const SIDEBAR_W = 240;
  const ITEM_H = 44;

  const appProgress = spring({ frame: frame - startFrame, fps, config: { damping: 200, stiffness: 120 } });

  return React.createElement("div", {
    style: {
      position: "absolute", left: 0, top: 0, bottom: 0, width: SIDEBAR_W,
      background: brand.style === "light" ? "white" : brand.surface || "rgba(255,255,255,0.06)",
      borderRight: `1px solid ${brand.border || "rgba(0,0,0,0.08)"}`,
      display: "flex", flexDirection: "column" as const, padding: "24px 0",
      boxShadow: brand.style === "light" ? "2px 0 8px rgba(0,0,0,0.04)" : "none",
    },
  },
    // App name
    React.createElement("div", {
      style: {
        padding: "0 20px 24px",
        fontSize: 18, fontWeight: 700, color: brand.text || "#0f172a",
        fontFamily: brand.font || "Inter",
        opacity: appProgress,
        transform: `translateX(${(1 - appProgress) * -16}px)`,
      },
    }, appName),
    // Nav items
    ...items.map((item, i) => {
      const itemProgress = spring({ frame: frame - (startFrame + 4 + i * 6), fps, config: { damping: 200, stiffness: 110 } });
      const borderProgress = item.isActive
        ? spring({ frame: frame - (startFrame + 8 + i * 6), fps, config: { damping: 200, stiffness: 150 } })
        : 0;

      return React.createElement("div", {
        key: i,
        style: {
          display: "flex", alignItems: "center", gap: 12,
          padding: "0 16px", height: ITEM_H, position: "relative",
          background: item.isActive ? `${brand.primary}12` : "transparent",
          opacity: itemProgress,
          transform: `translateX(${(1 - itemProgress) * -20}px)`,
          cursor: "pointer",
        },
      },
        // Active indicator
        React.createElement("div", {
          style: {
            position: "absolute", left: 0, top: "20%", bottom: "20%",
            width: borderProgress * 3,
            background: brand.primary, borderRadius: "0 2px 2px 0",
          },
        }),
        React.createElement("span", { style: { fontSize: 18 } }, item.icon),
        React.createElement("span", {
          style: {
            fontSize: 14, fontWeight: item.isActive ? 600 : 400,
            color: item.isActive ? brand.primary : brand.textMuted || "rgba(15,23,42,0.5)",
            fontFamily: brand.font || "Inter", flex: 1,
          },
        }, item.label),
        item.badge && React.createElement("div", {
          style: {
            background: brand.primary, color: "white", borderRadius: 99,
            fontSize: 11, fontWeight: 700, padding: "2px 7px",
            fontFamily: brand.font || "Inter",
          },
        }, item.badge),
      );
    }),
  );
};

// ---------------------------------------------------------------------------
// AnimatedTopbar — tabs with sliding underline, breadcrumb, search, avatar
// ---------------------------------------------------------------------------

const AnimatedTopbar = ({ tabs, breadcrumb, hasSearch, hasAvatar, brand, startFrame = 0, activeTabIndex = 0, height = 48 }: {
  tabs?: { label: string; isActive?: boolean }[];
  breadcrumb?: string;
  hasSearch?: boolean;
  hasAvatar?: boolean;
  brand: BrandLike;
  startFrame?: number;
  activeTabIndex?: number;
  height?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const barProgress = spring({ frame: frame - startFrame, fps, config: { damping: 200, stiffness: 120 } });

  const TAB_WIDTH = 110;
  const TAB_GAP = 8;
  const underlineX = activeTabIndex * (TAB_WIDTH + TAB_GAP);
  const underlineSpring = spring({ frame: frame - (startFrame + 15), fps, config: { damping: 200, stiffness: 100 } });

  return React.createElement("div", {
    style: {
      position: "relative",
      height,
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      borderBottom: `1px solid ${brand.border || "rgba(0,0,0,0.08)"}`,
      background: brand.style === "light" ? "white" : brand.surface || "rgba(255,255,255,0.04)",
      opacity: barProgress,
      transform: `translateY(${(1 - barProgress) * -12}px)`,
    },
  },
    breadcrumb && React.createElement("div", {
      style: {
        fontSize: 13,
        color: brand.textMuted || "rgba(15,23,42,0.5)",
        fontFamily: brand.font || "Inter",
        marginRight: 24,
        opacity: spring({ frame: frame - (startFrame + 8), fps, config: { damping: 200, stiffness: 100 } }),
      },
    }, breadcrumb),
    tabs && React.createElement("div", {
      style: { display: "flex", gap: TAB_GAP, position: "relative", height: "100%" },
    },
      ...tabs.map((tab, i) => {
        const tabProgress = spring({ frame: frame - (startFrame + 6 + i * 4), fps, config: { damping: 200, stiffness: 110 } });
        return React.createElement("div", {
          key: i,
          style: {
            display: "flex", alignItems: "center", justifyContent: "center",
            width: TAB_WIDTH, height: "100%",
            fontSize: 13, fontWeight: tab.isActive ? 600 : 400,
            color: tab.isActive ? brand.primary : brand.textMuted || "rgba(15,23,42,0.5)",
            fontFamily: brand.font || "Inter",
            opacity: tabProgress,
            cursor: "pointer",
          },
        }, tab.label);
      }),
      React.createElement("div", {
        style: {
          position: "absolute",
          bottom: 0,
          left: underlineX,
          width: TAB_WIDTH,
          height: 2,
          background: brand.primary,
          borderRadius: 1,
          transform: `scaleX(${underlineSpring})`,
          transformOrigin: "left",
        },
      }),
    ),
    React.createElement("div", { style: { flex: 1 } }),
    hasSearch && React.createElement("div", {
      style: {
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 14px", borderRadius: 8,
        background: brand.style === "light" ? "#f1f5f9" : "rgba(255,255,255,0.06)",
        opacity: spring({ frame: frame - (startFrame + 12), fps, config: { damping: 200, stiffness: 100 } }),
        marginRight: 16,
      },
    },
      React.createElement("span", { style: { fontSize: 14, opacity: 0.4 } }, "🔍"),
      React.createElement("span", {
        style: { fontSize: 12, color: brand.textMuted || "rgba(15,23,42,0.4)", fontFamily: brand.font || "Inter" },
      }, "Search..."),
    ),
    hasAvatar && React.createElement("div", {
      style: {
        width: 32, height: 32, borderRadius: 99,
        background: `${brand.primary}20`,
        border: `2px solid ${brand.primary}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 600, color: brand.primary,
        fontFamily: brand.font || "Inter",
        opacity: spring({ frame: frame - (startFrame + 14), fps, config: { damping: 200, stiffness: 100 } }),
      },
    }, "J"),
  );
};

// ---------------------------------------------------------------------------
// AnimatedMetricCards — staggered cards with count-up numbers
// ---------------------------------------------------------------------------

const AnimatedMetricCards = ({ cards, brand, startFrame = 0, columns = 3 }: {
  cards: Array<{ label: string; value: string; numericValue: number; trend?: "up" | "down" | "neutral"; trendValue?: string }>;
  brand: BrandLike;
  startFrame?: number;
  columns?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 16,
    },
  },
    ...cards.map((card, i) => {
      const cardProgress = spring({ frame: frame - (startFrame + i * 8), fps, config: { damping: 200, stiffness: 120 } });
      const countProgress = interpolate(frame - (startFrame + i * 8), [0, 30], [0, 1], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASINGS.easeOutCubic,
      });
      const trendProgress = spring({ frame: frame - (startFrame + i * 8 + 30), fps, config: { damping: 200, stiffness: 100 } });

      // Count up: use numericValue for animation, display value for final
      const isInteger = Number.isInteger(card.numericValue);
      const counted = card.numericValue * countProgress;
      const displayValue = countProgress >= 0.99 ? card.value :
        card.value.replace(/[\d,.]+/, isInteger ? Math.round(counted).toLocaleString() : counted.toFixed(1));

      const trendColor = card.trend === "up" ? "#10b981" : card.trend === "down" ? "#ef4444" : brand.textMuted || "#94a3b8";

      return React.createElement("div", {
        key: i,
        style: {
          background: "white",
          borderRadius: 16,
          padding: "20px 24px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.06)",
          opacity: cardProgress,
          transform: `translateY(${(1 - cardProgress) * 12}px)`,
        },
      },
        React.createElement("div", {
          style: {
            fontSize: 13, fontWeight: 500, color: brand.textMuted || "rgba(15,23,42,0.5)",
            fontFamily: brand.font || "Inter", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.06em",
          },
        }, card.label),
        React.createElement("div", {
          style: {
            fontSize: 32, fontWeight: 700, color: brand.text || "#0f172a",
            fontFamily: brand.font || "Inter", letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
          },
        }, displayValue),
        card.trendValue && React.createElement("div", {
          style: {
            fontSize: 13, fontWeight: 500, color: trendColor,
            fontFamily: brand.font || "Inter", marginTop: 6,
            opacity: trendProgress,
            transform: `translateY(${(1 - trendProgress) * 8}px)`,
          },
        }, `${card.trend === "up" ? "↑" : card.trend === "down" ? "↓" : "→"} ${card.trendValue}`),
      );
    }),
  );
};

// ---------------------------------------------------------------------------
// StatusBadge + TableActionButton — typed cell content helpers
// ---------------------------------------------------------------------------

const StatusBadge = ({ text, color }: { text: string; color: string }) =>
  React.createElement("span", {
    style: {
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      background: `${color}18`,
      color: color,
      textTransform: "capitalize" as const,
    },
  }, text);

const TableActionButton = ({ text, color }: { text: string; color: string }) =>
  React.createElement("span", {
    style: {
      display: "inline-block",
      padding: "6px 14px",
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 600,
      background: color,
      color: "white",
    },
  }, text);

// ---------------------------------------------------------------------------
// AnimatedTable — header + staggered row reveal
// ---------------------------------------------------------------------------

const AnimatedTable = ({ columns, rows, brand, startFrame = 0 }: {
  columns: Array<{ label: string; width: "narrow" | "medium" | "wide" }>;
  rows: Array<{ cells: any[]; isHighlighted?: boolean }>;
  brand: BrandLike;
  startFrame?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerProgress = spring({ frame: frame - startFrame, fps, config: { damping: 200, stiffness: 120 } });

  return React.createElement("div", {
    style: {
      background: "white", borderRadius: 16,
      boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
      border: "1px solid rgba(0,0,0,0.06)",
      overflow: "hidden",
    },
  },
    // Header
    React.createElement("div", {
      style: {
        display: "flex", padding: "12px 20px",
        background: `${brand.primary}08`,
        borderBottom: `1px solid ${brand.border || "rgba(0,0,0,0.08)"}`,
        opacity: headerProgress,
      },
    },
      ...columns.map((col, i) => React.createElement("div", {
        key: i,
        style: {
          flex: col.width === "wide" ? 3 : col.width === "medium" ? 2 : 1,
          fontSize: 12, fontWeight: 600, color: brand.textMuted || "rgba(15,23,42,0.5)",
          fontFamily: brand.font || "Inter", textTransform: "uppercase" as const, letterSpacing: "0.08em",
        },
      }, col.label)),
    ),
    // Rows
    ...rows.map((row, i) => {
      const rowProgress = spring({ frame: frame - (startFrame + 8 + i * 4), fps, config: { damping: 200, stiffness: 100 } });
      return React.createElement("div", {
        key: i,
        style: {
          display: "flex", padding: "14px 20px",
          borderBottom: i < rows.length - 1 ? `1px solid ${brand.border || "rgba(0,0,0,0.06)"}` : "none",
          opacity: rowProgress,
          transform: `translateY(${(1 - rowProgress) * 8}px)`,
          background: row.isHighlighted ? `${brand.primary}06` : "transparent",
          borderLeft: row.isHighlighted ? `3px solid ${brand.primary}` : "3px solid transparent",
        },
      },
        ...row.cells.map((cell, j) => {
          const renderCell = (c: any): any => {
            if (typeof c === "string" || typeof c === "number") return String(c);
            if (c && typeof c === "object") {
              if (c.type === "badge" || c.type === "status") {
                return React.createElement(StatusBadge, { text: c.value || c.label || "", color: c.color || "#10b981" });
              }
              if (c.type === "button" || c.type === "action") {
                return React.createElement(TableActionButton, { text: c.value || c.label || "", color: c.color || brand.primary });
              }
              if (c.type === "checkbox") {
                return React.createElement("div", {
                  style: {
                    width: 16, height: 16, borderRadius: 4,
                    border: `2px solid ${brand.border || "rgba(0,0,0,0.2)"}`,
                    background: c.checked ? brand.primary : "transparent",
                  },
                });
              }
              return c.value || c.label || "";
            }
            return "";
          };
          return React.createElement("div", {
            key: j,
            style: {
              flex: columns[j]?.width === "wide" ? 3 : columns[j]?.width === "medium" ? 2 : 1,
              fontSize: 14, fontWeight: 400, color: brand.text || "#0f172a",
              fontFamily: brand.font || "Inter",
              display: "flex", alignItems: "center",
            },
          }, renderCell(cell));
        }),
      );
    }),
  );
};

// ---------------------------------------------------------------------------
// AnimatedChart — SVG-based animated charts
// ---------------------------------------------------------------------------

const AnimatedChart = ({ type, title, dataPoints, color, brand, startFrame = 0 }: {
  type: "line" | "bar" | "donut" | "area";
  title?: string;
  dataPoints: number[];
  color: string;
  brand: BrandLike;
  startFrame?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame - startFrame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASINGS.easeOutCubic,
  });
  const titleProgress = spring({ frame: frame - startFrame, fps, config: { damping: 200, stiffness: 120 } });

  const W = 320, H = 160;
  const PADDING = 20;
  const chartW = W - PADDING * 2;
  const chartH = H - PADDING * 2 - (title ? 30 : 0);
  const offsetY = title ? 30 : 0;

  const maxVal = Math.max(...dataPoints, 1);
  const points = dataPoints.map((v, i) => ({
    x: PADDING + (i / (dataPoints.length - 1)) * chartW,
    y: PADDING + offsetY + chartH - (v / maxVal) * chartH,
  }));

  let chartContent: React.ReactNode = null;

  if (type === "line" || type === "area") {
    const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = points.length
      ? `M ${points[0].x} ${PADDING + offsetY + chartH} L ${lineD.slice(2)} L ${points[points.length - 1].x} ${PADDING + offsetY + chartH} Z`
      : "";
    const pathLen = dataPoints.length * (chartW / (dataPoints.length - 1));
    const drawnLen = pathLen * progress;

    chartContent = React.createElement(React.Fragment, null,
      type === "area" && React.createElement("path", {
        d: areaD,
        fill: `${color}18`,
        strokeWidth: 0,
      }),
      React.createElement("polyline", {
        points: points.map((p) => `${p.x},${p.y}`).join(" "),
        fill: "none",
        stroke: color,
        strokeWidth: 2.5,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeDasharray: `${pathLen} ${pathLen}`,
        strokeDashoffset: pathLen - drawnLen,
      }),
      ...points.map((p, i) => React.createElement("circle", {
        key: i,
        cx: p.x, cy: p.y, r: 3,
        fill: color,
        opacity: progress > i / dataPoints.length ? 1 : 0,
      })),
    );
  } else if (type === "bar") {
    const barW = (chartW / dataPoints.length) * 0.6;
    chartContent = React.createElement(React.Fragment, null,
      ...dataPoints.map((v, i) => {
        const barH = (v / maxVal) * chartH * progress;
        const barX = PADDING + (i / dataPoints.length) * chartW + ((chartW / dataPoints.length) * 0.2);
        return React.createElement("rect", {
          key: i,
          x: barX, y: PADDING + offsetY + chartH - barH,
          width: barW, height: barH,
          fill: color, rx: 3, ry: 3,
          opacity: 0.8 + (i % 2) * 0.2,
        });
      }),
    );
  } else if (type === "donut") {
    const cx = W / 2, cy = H / 2 + offsetY / 2;
    const R = Math.min(W, H) / 2 - PADDING;
    const circumference = 2 * Math.PI * R;
    const drawn = circumference * progress;
    chartContent = React.createElement(React.Fragment, null,
      React.createElement("circle", { cx, cy, r: R, fill: "none", stroke: `${color}18`, strokeWidth: 20 }),
      React.createElement("circle", {
        cx, cy, r: R, fill: "none", stroke: color, strokeWidth: 20,
        strokeDasharray: `${drawn} ${circumference}`,
        strokeLinecap: "round",
        transform: `rotate(-90 ${cx} ${cy})`,
      }),
    );
  }

  return React.createElement("div", {
    style: {
      background: "white", borderRadius: 16, padding: 16,
      boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
      border: "1px solid rgba(0,0,0,0.06)",
    },
  },
    title && React.createElement("div", {
      style: {
        fontSize: 14, fontWeight: 600, color: brand.text || "#0f172a",
        fontFamily: brand.font || "Inter", marginBottom: 12,
        opacity: titleProgress,
      },
    }, title),
    React.createElement("svg", { width: W, height: H, style: { display: "block" } },
      chartContent,
    ),
  );
};

// ---------------------------------------------------------------------------
// AnimatedForm — sequential field reveal with typing and focus ring
// ---------------------------------------------------------------------------

const AnimatedForm = ({ title, fields, submitLabel, brand, startFrame = 0 }: {
  title: string;
  fields: Array<{ label: string; type: string; placeholder?: string; value?: string; options?: string[] }>;
  submitLabel: string;
  brand: BrandLike;
  startFrame?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProgress = spring({ frame: frame - startFrame, fps, config: { damping: 200, stiffness: 120 } });

  return React.createElement("div", {
    style: {
      background: "white", borderRadius: 20, padding: "28px 32px",
      boxShadow: "0 4px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.08), 0 32px 64px rgba(0,0,0,0.06)",
      border: "1px solid rgba(0,0,0,0.06)",
      minWidth: 360,
    },
  },
    React.createElement("div", {
      style: {
        fontSize: 20, fontWeight: 700, color: brand.text || "#0f172a",
        fontFamily: brand.font || "Inter", marginBottom: 20, letterSpacing: "-0.02em",
        opacity: titleProgress, transform: `translateY(${(1 - titleProgress) * -10}px)`,
      },
    }, title),
    ...fields.map((field, i) => {
      const fieldProgress = spring({ frame: frame - (startFrame + 12 + i * 12), fps, config: { damping: 200, stiffness: 110 } });
      const isFocused = frame >= startFrame + 12 + i * 12 && frame < startFrame + 12 + (i + 1) * 12 + 30;

      return React.createElement("div", {
        key: i,
        style: {
          marginBottom: 16, opacity: fieldProgress,
          transform: `translateY(${(1 - fieldProgress) * 10}px)`,
        },
      },
        React.createElement("label", {
          style: {
            fontSize: 13, fontWeight: 500, color: brand.textMuted || "rgba(15,23,42,0.5)",
            fontFamily: brand.font || "Inter", display: "block", marginBottom: 6,
          },
        }, field.label),
        React.createElement("div", {
          style: {
            height: 40, borderRadius: 8,
            border: `1.5px solid ${isFocused ? brand.primary : brand.border || "rgba(0,0,0,0.12)"}`,
            boxShadow: isFocused ? `0 0 0 3px ${brand.primary}20` : "none",
            background: "white",
            display: "flex", alignItems: "center", padding: "0 12px",
            fontSize: 14, color: brand.text || "#0f172a",
            fontFamily: brand.font || "Inter",
          },
        },
          field.value
            ? React.createElement("span", null, field.value)
            : React.createElement("span", { style: { color: brand.textMuted || "rgba(15,23,42,0.4)" } }, field.placeholder || ""),
          field.type === "dropdown" && React.createElement("span", {
            style: { marginLeft: "auto", color: brand.textMuted || "rgba(15,23,42,0.4)", fontSize: 12 },
          }, "▾"),
        ),
      );
    }),
    // Submit button
    React.createElement("div", {
      style: {
        marginTop: 20,
        opacity: spring({ frame: frame - (startFrame + 12 + fields.length * 12), fps, config: { damping: 200, stiffness: 100 } }),
      },
    },
      React.createElement("button", {
        style: {
          width: "100%", height: 44, borderRadius: 8,
          background: brand.primary, color: "white",
          fontSize: 14, fontWeight: 600, border: "none",
          fontFamily: brand.font || "Inter", cursor: "pointer",
          boxShadow: `0 4px 12px ${brand.primary}40`,
        },
      }, submitLabel),
    ),
  );
};

// ---------------------------------------------------------------------------
// SectionTitle — centered chapter title card for scene transitions
// ---------------------------------------------------------------------------

const SectionTitle = ({ title, subtitle, icon, brand, startFrame = 0 }: {
  title: string;
  subtitle?: string;
  icon?: string;
  brand: BrandLike;
  startFrame?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const iconProgress = spring({ frame: frame - startFrame, fps, config: { damping: 200, stiffness: 100 } });
  const subtitleProgress = spring({ frame: frame - (startFrame + 16), fps, config: { damping: 200, stiffness: 100 } });

  return React.createElement(AbsoluteFill, {
    style: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center" },
  },
    icon && React.createElement("div", {
      style: {
        fontSize: 48,
        marginBottom: 16,
        opacity: iconProgress,
        transform: `scale(${0.5 + iconProgress * 0.5}) translateY(${(1 - iconProgress) * 20}px)`,
      },
    }, icon),
    // WhatAStory rule: headline ALWAYS uses MaskedReveal — never raw opacity fade
    React.createElement(MaskedReveal, { startFrame: startFrame + 8 },
      React.createElement("div", {
        style: {
          fontSize: 48,
          fontWeight: 700,
          color: brand.primary,
          fontFamily: brand.font || "Inter",
          letterSpacing: "-0.02em",
          textAlign: "center" as const,
          maxWidth: width * 0.7,
        },
      }, title),
    ),
    subtitle && React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 400,
        color: brand.textMuted || "rgba(15,23,42,0.5)",
        fontFamily: brand.font || "Inter",
        marginTop: 12,
        opacity: subtitleProgress,
        transform: `translateY(${(1 - subtitleProgress) * 12}px)`,
        textAlign: "center" as const,
      },
    }, subtitle),
  );
};

// ---------------------------------------------------------------------------
// PersistentSectionLabel — top-left corner feature label, WhatAStory style
// ---------------------------------------------------------------------------
// Stays pinned to top-left throughout a UI demo scene.
// Shows: "Feature Name  [Icon]" with feature name in brand color.
// Use inside any showcase/cursor scene that belongs to a named feature section.

const PersistentSectionLabel = ({ featureName, integrationIcon, integrationName, brand, startFrame = 0 }: {
  featureName: string;
  integrationIcon?: string; // emoji or short text, e.g. "📊" or "Docs"
  integrationName?: string; // e.g. "Google Docs"
  brand: BrandLike;
  startFrame?: number;
}) => {
  const frame = useCurrentFrame();
  const t = Math.min(1, Math.max(0, (frame - startFrame) / 18));
  const opacity = t;
  const y = (1 - t) * -8;

  return React.createElement("div", {
    style: {
      position: "absolute",
      top: 28, left: 36,
      zIndex: 200,
      display: "flex", alignItems: "center", gap: 8,
      opacity,
      transform: `translateY(${y}px)`,
    },
  },
    React.createElement("span", {
      style: {
        fontSize: 18, fontWeight: 600, fontFamily: brand?.font || "Inter",
        color: brand?.primary || "#6366f1",
        letterSpacing: "-0.01em",
      },
    }, featureName),
    integrationIcon || integrationName
      ? React.createElement("span", {
          style: {
            fontSize: 15, fontWeight: 400, fontFamily: brand?.font || "Inter",
            color: "rgba(15,23,42,0.45)",
            display: "flex", alignItems: "center", gap: 4,
          },
        },
          React.createElement("span", { style: { opacity: 0.35 } }, "·"),
          integrationIcon
            ? React.createElement("span", { style: { fontSize: 16 } }, integrationIcon)
            : null,
          integrationName
            ? React.createElement("span", {}, integrationName)
            : null,
        )
      : null,
  );
};

// ---------------------------------------------------------------------------
// HAND_CURSOR — WhatAStory-standard pointing-hand SVG (hotspot at fingertip)
// ---------------------------------------------------------------------------
// WhatAStory Standard #6: ALL cursor/demo scenes MUST use a hand cursor.
// Standard arrow cursors look robotic and impersonal. Use HAND_CURSOR.
// Render at (cursorX - 4, cursorY - 2) so the fingertip hotspot is exact.
// Apply scale: 1 → 0.88 on click, spring back to 1 after 14 frames.
//
// Usage:
//   <div style={{ position: "absolute", left: cursorX - 4, top: cursorY - 2,
//     transform: `scale(${clickSqueeze})`, transformOrigin: "12px 4px",
//     zIndex: 150, pointerEvents: "none" }}>
//     {HAND_CURSOR}
//   </div>
const HAND_CURSOR = React.createElement("svg", {
  width: 32, height: 36, viewBox: "0 0 32 36", fill: "none",
},
  React.createElement("path", {
    d: "M10 30 C10 33 12 35 15 35 L22 35 C26 35 28 32 28 29 L28 18 C28 16 27 15 25 15 L24 15 L24 10 C24 8 23 7 21 7 C19 7 18 8 18 10 L18 15 L16 15 L16 6 C16 4 15 3 13 3 C11 3 10 4 10 6 L10 15 C9 15 8 16 8 18 L8 24 Z",
    fill: "white",
    stroke: "#1e293b",
    strokeWidth: 1.2,
  }),
  React.createElement("path", {
    d: "M10 18 L10 24",
    stroke: "#1e293b",
    strokeWidth: 1,
    strokeLinecap: "round" as const,
  }),
);

// ---------------------------------------------------------------------------
// EntropyDust — ambient bokeh particles for dark-theme scenes (MANDATORY)
// ---------------------------------------------------------------------------
// WhatAStory Standard #4: ALL dark-theme scenes MUST have entropy dust.
// 18 particles at 5–30% opacity. Their absence makes dark scenes feel "dead."
// Define DUST_PARTICLES OUTSIDE the component to prevent per-frame regeneration.
//
// Usage (outside component):
//   const DUST = EntropyDust.generateParticles(); // or use the default below
//
// Usage (inside JSX):
//   <EntropyDust brand={BRAND} />
//
// If you need custom particle count or color:
//   <EntropyDust brand={BRAND} count={22} color={BRAND.secondary} />

// Particle definitions OUTSIDE any component — stable reference, never regenerates
const ENTROPY_DUST_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: (random(`edust-x-${i}`) as number) * 0.92 + 0.04,
  y: (random(`edust-y-${i}`) as number) * 0.92 + 0.04,
  size: (random(`edust-s-${i}`) as number) * 3 + 1.5,     // 1.5–4.5px
  speed: (random(`edust-sp-${i}`) as number) * 0.4 + 0.2,
  phase: (random(`edust-p-${i}`) as number) * Math.PI * 2,
  opacity: (random(`edust-o-${i}`) as number) * 0.25 + 0.05, // 0.05–0.30
}));

export const EntropyDust = ({ brand, count, color, zIndex = 1 }: {
  brand: BrandLike;
  count?: number;      // override particle count (default 18)
  color?: string;      // override color (default BRAND.primary)
  zIndex?: number;     // z-index layer (default 1 — behind all content)
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const dustColor = color ?? brand?.primary ?? "#6366f1";
  // Use a subset if count is specified (still from stable array — no regeneration)
  const particles = count != null && count < ENTROPY_DUST_PARTICLES.length
    ? ENTROPY_DUST_PARTICLES.slice(0, count)
    : ENTROPY_DUST_PARTICLES;

  return React.createElement("div", {
    style: { position: "absolute", inset: 0, pointerEvents: "none", zIndex },
  },
    ...particles.map((p, i) => React.createElement("div", {
      key: i,
      style: {
        position: "absolute",
        left: p.x * width + Math.sin(frame * p.speed * 0.03 + p.phase) * 12,
        top:  p.y * height + Math.cos(frame * p.speed * 0.025 + p.phase) * 8,
        width: p.size,
        height: p.size,
        borderRadius: "50%",
        background: dustColor,
        opacity: p.opacity,
        filter: `blur(${(p.size * 0.6).toFixed(1)}px)`,
        pointerEvents: "none" as const,
      },
    })),
  );
};

// ---------------------------------------------------------------------------
// FloatingShapes — small sharp geometric primitives for concept/hook scenes
// ---------------------------------------------------------------------------
// WhatAStory style: scatter 10-14 tiny shapes (outlines + fills) around the
// frame. Each bobs gently with a unique phase. Much simpler than orbs —
// these are crisp SVGs, not blurry blobs.

const SHAPE_DEFS = [
  { type: "diamond", size: 10, x: 0.12, y: 0.22, color: "primary", filled: true },
  { type: "circle",  size: 16, x: 0.82, y: 0.18, color: "primary", filled: false },
  { type: "diamond", size: 8,  x: 0.68, y: 0.72, color: "secondary", filled: true },
  { type: "circle",  size: 22, x: 0.28, y: 0.78, color: "primary", filled: false },
  { type: "arrow",   size: 14, x: 0.15, y: 0.55, color: "muted",   filled: true },
  { type: "square",  size: 10, x: 0.88, y: 0.44, color: "secondary", filled: true },
  { type: "circle",  size: 12, x: 0.55, y: 0.88, color: "primary", filled: false },
  { type: "diamond", size: 14, x: 0.92, y: 0.72, color: "primary", filled: false },
  { type: "square",  size: 8,  x: 0.08, y: 0.38, color: "secondary", filled: false },
  { type: "circle",  size: 28, x: 0.46, y: 0.14, color: "muted",   filled: false },
  { type: "arrow",   size: 10, x: 0.76, y: 0.56, color: "primary", filled: true },
  { type: "diamond", size: 7,  x: 0.35, y: 0.62, color: "secondary", filled: true },
];

const FloatingShapes = ({ brand, startFrame = 0 }: { brand: BrandLike; startFrame?: number }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const primary = brand?.primary || "#6366f1";
  const secondary = brand?.secondary || "#a78bfa";
  const muted = "rgba(15,23,42,0.12)";

  const colorMap: Record<string, string> = { primary, secondary, muted };

  return React.createElement("div", { style: { position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" } },
    ...SHAPE_DEFS.map((s, i) => {
      const elapsed = frame - startFrame;
      const fadeIn = Math.min(1, elapsed / 24);
      const bob = Math.sin(elapsed * 0.018 + i * 1.2) * 6;
      const drift = Math.cos(elapsed * 0.011 + i * 0.8) * 3;
      const x = s.x * width + drift;
      const y = s.y * height + bob;
      const col = colorMap[s.color] ?? primary;
      const fillColor = s.filled ? col : "none";
      const strokeColor = s.filled ? "none" : col;
      const sw = s.filled ? 0 : 1.5;

      let shape: React.ReactElement;
      if (s.type === "diamond") {
        const h = s.size; const w2 = h * 0.72;
        shape = React.createElement("svg", { width: w2 * 2, height: h * 2, viewBox: `0 0 ${w2 * 2} ${h * 2}` },
          React.createElement("polygon", {
            points: `${w2},0 ${w2 * 2},${h} ${w2},${h * 2} 0,${h}`,
            fill: fillColor, stroke: strokeColor, strokeWidth: sw,
          }),
        );
      } else if (s.type === "circle") {
        shape = React.createElement("svg", { width: s.size * 2, height: s.size * 2 },
          React.createElement("circle", {
            cx: s.size, cy: s.size, r: s.size - sw / 2,
            fill: fillColor, stroke: strokeColor, strokeWidth: sw,
          }),
        );
      } else if (s.type === "square") {
        shape = React.createElement("svg", { width: s.size * 2, height: s.size * 2 },
          React.createElement("rect", {
            x: sw / 2, y: sw / 2, width: s.size * 2 - sw, height: s.size * 2 - sw,
            rx: 2,
            fill: fillColor, stroke: strokeColor, strokeWidth: sw,
          }),
        );
      } else {
        // arrow (right-pointing triangle)
        const sz = s.size;
        shape = React.createElement("svg", { width: sz * 2, height: sz * 1.6, viewBox: `0 0 ${sz * 2} ${sz * 1.6}` },
          React.createElement("polygon", {
            points: `0,0 ${sz * 2},${sz * 0.8} 0,${sz * 1.6}`,
            fill: fillColor || col,
          }),
        );
      }

      return React.createElement("div", {
        key: i,
        style: {
          position: "absolute",
          left: x, top: y,
          opacity: fadeIn * (s.filled ? 0.7 : 0.45),
          transform: `rotate(${i % 2 === 0 ? drift * 0.5 : -drift * 0.5}deg)`,
          willChange: "transform",
        },
      }, shape);
    }),
  );
};

// ---------------------------------------------------------------------------
// AmbientEnvironment — breathing background wrapper (cinematic zoom + orbs + dust)
// ---------------------------------------------------------------------------
// Wraps scene content with: slow 1.0→1.06 camera push, two corner atmospheric orbs,
// and 18-particle entropy dust. Eliminates "dead flat background" on ANY scene.
// DUST_PARTICLES must be defined OUTSIDE the component to prevent flicker.

const _AMBIENT_DUST = Array.from({ length: 18 }, (_, i) => ({
  left:    `${(i * 13.7) % 100}%`,
  size:    i % 3 === 0 ? 4 : 2,
  blur:    i % 3 === 0 ? 2 : 0,
  speed:   0.2 + (i * 0.03),
  opacity: 0.1 + (i * 0.01),
}));

const AmbientEnvironment = ({ brand, children }: { brand?: any; children?: React.ReactNode }) => {
  const frame = useCurrentFrame();
  const cameraZoom = interpolate(frame, [0, 150], [1.0, 1.06], { extrapolateRight: "clamp" as const });
  const primary   = brand?.primary   || "#6366f1";
  const secondary = brand?.secondary || "#38bdf8";
  const bg        = brand?.bg        || "#0f172a";

  return React.createElement("div", {
    style: { position: "absolute", inset: 0, backgroundColor: bg, overflow: "hidden" },
  },
    // Top-left orb (brand primary)
    React.createElement("div", {
      style: {
        position: "absolute", top: "-20%", left: "-10%",
        width: "65vw", height: "65vw", borderRadius: "50%",
        background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        opacity: 0.15, filter: "blur(120px)",
        transform: `translateY(${Math.sin(frame * 0.02) * 40}px)`,
        pointerEvents: "none",
      },
    }),
    // Bottom-right orb (brand secondary)
    React.createElement("div", {
      style: {
        position: "absolute", bottom: "-30%", right: "-10%",
        width: "80vw", height: "80vw", borderRadius: "50%",
        background: `radial-gradient(circle, ${secondary} 0%, transparent 70%)`,
        opacity: 0.10, filter: "blur(140px)",
        transform: `translateY(${Math.cos(frame * 0.015) * -50}px)`,
        pointerEvents: "none",
      },
    }),
    // Camera wrapper + dust + content
    React.createElement("div", {
      style: { position: "absolute", inset: 0, transform: `scale(${cameraZoom})`, transformOrigin: "center center" },
    },
      // Entropy dust (z:1, behind content)
      React.createElement("div", { style: { position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" } },
        ..._AMBIENT_DUST.map((p, i) => {
          const yDrift = (frame * p.speed * 30) % 1080;
          return React.createElement("div", {
            key: i,
            style: {
              position: "absolute", left: p.left, bottom: yDrift - 20,
              width: p.size, height: p.size, backgroundColor: "white",
              borderRadius: "50%", opacity: p.opacity,
              filter: p.blur > 0 ? `blur(${p.blur}px)` : undefined,
            },
          });
        }),
      ),
      // Scene content (z:10)
      React.createElement("div", { style: { position: "absolute", inset: 0, zIndex: 10 } }, children),
    ),
  );
};

// ---------------------------------------------------------------------------
// DepthStack — true 2.5D layer separation with preserve-3d
// ---------------------------------------------------------------------------
// Takes an array of layers with z-depth values and physically separates them
// on the Z-axis using CSS transform-style: preserve-3d + perspective.
// Kills the "flat tilt" fake — layers actually diverge when camera rotates.
//
// Usage:
//   <DepthStack
//     layers={[
//       { content: <AppShellBg />,          z: -60 },   // furthest back
//       { content: <AppContent />,          z: 0   },   // mid-ground
//       { content: <FloatingGlassCard />,   z: 80  },   // foreground
//       { content: <AvatarRow />,           z: 140 },   // closest
//     ]}
//     cameraRotateY={-12}
//     cameraRotateX={3}
//   />
//
// Each layer is positioned inset:0 so children use AbsoluteFill-style layout.
// Higher z = closer to camera = larger apparent size (natural parallax).

const DepthStack = ({
  layers,
  cameraRotateX = 2,
  cameraRotateY = -12,
  perspective = 1200,
  animated = true,
  children,
}: {
  layers: Array<{
    content: React.ReactNode;
    z: number;         // Z offset in px — positive = closer to viewer
    x?: number;        // optional horizontal offset px
    y?: number;        // optional vertical offset px
    scale?: number;    // default 1.0
    opacity?: number;  // default 1.0
  }>;
  cameraRotateX?: number;   // camera tilt X degrees (default 2)
  cameraRotateY?: number;   // camera pan Y degrees (default -12, left-leaning)
  perspective?: number;     // perspective depth px (default 1200)
  animated?: boolean;       // if true, adds slow breathing rotation (±1deg)
  children?: React.ReactNode;
}) => {
  const frame = useCurrentFrame();
  const breatheX = animated ? Math.sin(frame * 0.008) * 0.8 : 0;
  const breatheY = animated ? Math.cos(frame * 0.006) * 0.5 : 0;

  return React.createElement("div", {
    style: {
      position: "absolute", inset: 0,
      perspective: perspective,
      perspectiveOrigin: "55% 50%",  // slightly off-center for natural feel
    },
  },
    React.createElement("div", {
      style: {
        position: "absolute", inset: 0,
        transformStyle: "preserve-3d" as const,
        transform: `rotateY(${cameraRotateY + breatheY}deg) rotateX(${cameraRotateX + breatheX}deg)`,
      },
    },
      ...layers.map((layer, i) =>
        React.createElement("div", {
          key: i,
          style: {
            position: "absolute", inset: 0,
            transform: `translateZ(${layer.z}px) translateX(${layer.x ?? 0}px) translateY(${layer.y ?? 0}px) scale(${layer.scale ?? 1})`,
            opacity: layer.opacity ?? 1,
          },
        }, layer.content)
      ),
      children,
    ),
  );
};

// ---------------------------------------------------------------------------
// AnimatedHighlighter — SVG marker/underline/circle that draws behind text
// ---------------------------------------------------------------------------
// Place this as a sibling of your text with position:absolute to underlay it.
// The highlight draws in from left-to-right using strokeDashoffset animation.
//
// Usage (marker behind a word):
//   <div style={{ position: "relative", display: "inline-block" }}>
//     <AnimatedHighlighter startFrame={20} color={BRAND.primary} width={220} height={32} style="marker" />
//     <span style={{ position: "relative", zIndex: 1 }}>Revenue</span>
//   </div>
//
// Usage (circle around a button):
//   <div style={{ position: "relative" }}>
//     <AnimatedHighlighter startFrame={35} color={BRAND.primary} width={160} height={52} style="circle" />
//     <button>Click Me</button>
//   </div>

const AnimatedHighlighter = ({
  startFrame,
  color,
  width = 200,
  height = 24,
  style: hlStyle = "marker",
  roughness = 3,
  delay = 0,
  opacity: hlOpacity = 0.32,
}: {
  startFrame: number;
  color: string;
  width?: number;
  height?: number;
  style?: "marker" | "underline" | "circle";
  roughness?: number;     // wiggle amplitude in px (default 3)
  delay?: number;         // extra frame delay
  opacity?: number;       // highlight opacity (default 0.32)
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drawProgress = Math.min(1, Math.max(0,
    spring({ frame: frame - (startFrame + delay), fps, config: { damping: 30, stiffness: 80 }, durationInFrames: 20 })
  ));

  if (hlStyle === "underline") {
    const segments = 10;
    let d = `M 0 ${roughness}`;
    for (let i = 1; i <= segments; i++) {
      const x = (i / segments) * width;
      const y = roughness + (i % 2 === 0 ? roughness : -roughness) * 0.7;
      d += ` L ${x} ${y}`;
    }
    const approxLen = width * 1.05;
    return React.createElement("svg", {
      style: { position: "absolute", bottom: -6, left: 0, overflow: "visible", pointerEvents: "none", zIndex: 0 },
      width, height: roughness * 4,
    },
      React.createElement("path", {
        d, stroke: color, strokeWidth: 3, fill: "none", strokeLinecap: "round",
        strokeDasharray: approxLen,
        strokeDashoffset: approxLen * (1 - drawProgress),
        opacity: 0.9,
      })
    );
  }

  if (hlStyle === "circle") {
    const rx = width / 2 + roughness * 2;
    const ry = height / 2 + roughness * 2;
    const circum = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);
    return React.createElement("svg", {
      style: { position: "absolute", top: -roughness * 2, left: -roughness * 2, overflow: "visible", pointerEvents: "none", zIndex: 0 },
      width: width + roughness * 4, height: height + roughness * 4,
    },
      React.createElement("ellipse", {
        cx: rx, cy: ry, rx, ry,
        stroke: color, strokeWidth: 3, fill: "none", strokeLinecap: "round",
        strokeDasharray: circum,
        strokeDashoffset: circum * (1 - drawProgress),
        transform: `rotate(-90 ${rx} ${ry})`,
        opacity: 0.9,
      })
    );
  }

  // Default "marker" — filled rect sliding in from left, like a highlighter swipe
  return React.createElement("div", {
    style: {
      position: "absolute", top: "10%", left: 0,
      width: `${drawProgress * 110}%`,  // slightly overshoots for realism
      height: "85%",
      backgroundColor: color,
      opacity: hlOpacity,
      borderRadius: 3,
      pointerEvents: "none",
      zIndex: 0,
      mixBlendMode: "multiply" as const,
    },
  });
};

// ---------------------------------------------------------------------------
// ContentCard — clean minimal browser/app frame, WhatAStory style
// ---------------------------------------------------------------------------
// White rounded rectangle, soft shadow, no chrome/bezel. Use instead of
// full device mockups when showing app content without hardware context.

const ContentCard = ({ children, brand, width: cardWidth, height: cardHeight, startFrame = 0 }: {
  children?: React.ReactNode;
  brand: BrandLike;
  width?: number | string;
  height?: number | string;
  startFrame?: number;
}) => {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;
  const t = Math.min(1, Math.max(0, elapsed / 22));
  const scale = 0.88 + t * 0.12;
  const opacity = t;

  return React.createElement("div", {
    style: {
      width: cardWidth ?? "75%",
      height: cardHeight ?? "76%",
      background: "#ffffff",
      borderRadius: 16,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.04)",
      overflow: "hidden",
      transform: `scale(${scale})`,
      opacity,
      willChange: "transform, opacity",
    },
  }, children);
};

// ---------------------------------------------------------------------------
// NotificationToast — floating notification that slides in from the right
// ---------------------------------------------------------------------------

const NotificationToast = ({ icon, title, body, brand, startFrame = 0, duration = 90 }: {
  icon?: string;
  title: string;
  body?: string;
  brand: BrandLike;
  startFrame?: number;
  duration?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame || frame > startFrame + duration) return null;

  const enterProgress = spring({ frame: frame - startFrame, fps, config: { damping: 200, stiffness: 120 } });
  const exitProgress = frame > startFrame + duration - 20
    ? spring({ frame: frame - (startFrame + duration - 20), fps, config: { damping: 200, stiffness: 150 } })
    : 0;

  const translateX = interpolate(enterProgress, [0, 1], [300, 0]) + interpolate(exitProgress, [0, 1], [0, 300]);
  const opacity = Math.min(enterProgress, 1 - exitProgress);

  return React.createElement("div", {
    style: {
      position: "absolute",
      top: 24,
      right: 24,
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 20px",
      background: "white",
      borderRadius: 14,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.12)",
      border: "1px solid rgba(0,0,0,0.06)",
      transform: `translateX(${translateX}px)`,
      opacity,
      zIndex: 100,
    },
  },
    icon && React.createElement("div", {
      style: { fontSize: 20, flexShrink: 0 },
    }, icon),
    React.createElement("div", null,
      React.createElement("div", {
        style: {
          fontSize: 14, fontWeight: 600, color: brand.text || "#0f172a",
          fontFamily: brand.font || "Inter",
        },
      }, title),
      body && React.createElement("div", {
        style: {
          fontSize: 12, color: brand.textMuted || "rgba(15,23,42,0.5)",
          fontFamily: brand.font || "Inter", marginTop: 2,
        },
      }, body),
    ),
  );
};

// ---------------------------------------------------------------------------
// ReconstructedAppShell — orchestrates sidebar + content from UISchema
// ---------------------------------------------------------------------------

const ReconstructedAppShell = ({ uiSchema, brand }: {
  uiSchema?: any;
  brand: BrandLike;
}) => {
  if (!uiSchema) {
    return React.createElement("div", {
      style: { position: "absolute", inset: 0, background: brand.bg, display: "flex", alignItems: "center", justifyContent: "center" },
    }, React.createElement("span", { style: { color: brand.textMuted, fontFamily: brand.font } }, "No UI schema"));
  }

  const hasSidebar = uiSchema.layout?.type === "sidebar-main" && uiSchema.layout?.sidebar;
  const SIDEBAR_W = hasSidebar ? 240 : 0;

  return React.createElement("div", {
    style: { position: "absolute", inset: 0, background: brand.bg || "#f8f9fc", display: "flex" },
  },
    hasSidebar ? React.createElement(AnimatedSidebar, {
      appName: uiSchema.layout.sidebar.appName,
      items: uiSchema.layout.sidebar.items,
      brand,
      startFrame: 0,
    }) : null,
    React.createElement("div", {
      style: {
        flex: 1, marginLeft: hasSidebar ? SIDEBAR_W : 0,
        padding: 24, overflow: "hidden",
        display: "flex", flexDirection: "column" as const, gap: 20,
      },
    },
      // Render content sections
      ...((uiSchema.mainContent?.sections || []) as any[]).map((section: any, i: number) => {
        const sectionStart = 25 + i * 15;
        if (section.type === "metric-cards") {
          return React.createElement(AnimatedMetricCards, {
            key: i, cards: section.data || [], brand, startFrame: sectionStart,
          });
        }
        if (section.type === "table") {
          return React.createElement(AnimatedTable, {
            key: i,
            columns: section.data?.columns || [],
            rows: section.data?.rows || [],
            brand, startFrame: sectionStart,
          });
        }
        if (section.type === "chart") {
          return React.createElement(AnimatedChart, {
            key: i,
            type: section.data?.type || "line",
            title: section.data?.title,
            dataPoints: section.data?.dataPoints || [],
            color: brand.primary,
            brand, startFrame: sectionStart,
          });
        }
        if (section.type === "form") {
          return React.createElement(AnimatedForm, {
            key: i,
            title: section.data?.title || "Form",
            fields: section.data?.fields || [],
            submitLabel: section.data?.submitLabel || "Submit",
            brand, startFrame: sectionStart,
          });
        }
        return null;
      }).filter(Boolean),
    ),
  );
};

// ---------------------------------------------------------------------------
// AbstractSkeletonUI — cognitive masking: renders UISchema as geometric blocks
// ---------------------------------------------------------------------------

/** Renders any UISchema (or a generic layout) as pure geometric skeleton shapes.
 *  NO readable text — only rounded rectangles, bars, and metric blocks.
 *  Use for BACKGROUND/unfocused UI elements to reduce cognitive load.
 *
 *  RULE: When a scene's UI is NOT the primary focus (e.g. background behind floating text),
 *  use <AbstractSkeletonUI> instead of <ReconstructedAppShell> or literal screenshots.
 *  Only render legible text/UI for the EXACT feature being demoed in that scene.
 *
 *  Usage:
 *    <AbstractSkeletonUI brand={BRAND} uiSchema={UI_SCHEMA} opacity={0.7} />
 *
 *  Without a schema (fallback):
 *    <AbstractSkeletonUI brand={BRAND} /> // renders generic sidebar + cards
 */
const AbstractSkeletonUI = ({
  uiSchema,
  brand,
  opacity = 0.85,
  startFrame = 0,
}: {
  uiSchema?: any;
  brand: BrandLike;
  opacity?: number;
  startFrame?: number;
}) => {
  const frame = useCurrentFrame();
  const fadeIn = Math.min(1, Math.max(0, (frame - startFrame) / 20)) * opacity;
  const hasSidebar = uiSchema?.layout?.type === "sidebar-main";
  const sections: any[] = uiSchema?.mainContent?.sections ?? [];
  return React.createElement("div", {
    style: { position: "absolute", inset: 0, background: brand.bg, opacity: fadeIn },
  },
    // Sidebar skeleton
    hasSidebar && React.createElement("div", {
      style: {
        position: "absolute", left: 0, top: 0, bottom: 0, width: 220,
        background: "rgba(0,0,0,0.04)",
        borderRight: `1px solid ${brand.border || "rgba(0,0,0,0.08)"}`,
      },
    },
      ...Array.from({ length: 6 }, (_, i) => React.createElement("div", {
        key: i,
        style: {
          height: 10, borderRadius: 5, margin: `${18 + i * 2}px 16px 0`,
          background: i === 1 ? `${brand.primary}28` : `${brand.primary}10`,
          width: i === 1 ? "78%" : `${50 + (i % 3) * 12}%`,
        },
      })),
    ),
    // Main content skeleton
    React.createElement("div", {
      style: {
        position: "absolute",
        left: hasSidebar ? 240 : 0, right: 0, top: 0, bottom: 0,
        padding: 24, display: "flex", flexDirection: "column" as const, gap: 16,
      },
    },
      // Metric cards row (always render at top)
      React.createElement("div", { style: { display: "flex", gap: 12 } },
        ...Array.from({ length: 3 }, (_, i) => React.createElement("div", {
          key: i,
          style: {
            flex: 1, height: 72, background: "white", borderRadius: 12,
            boxShadow: GLOBAL_STYLE.shadowLow,
            display: "flex", flexDirection: "column" as const, padding: "14px 16px", gap: 8,
          },
        },
          React.createElement("div", { style: { height: 8, borderRadius: 4, background: `${brand.primary}14`, width: "55%" } }),
          React.createElement("div", { style: { height: 14, borderRadius: 4, background: `${brand.primary}22`, width: "40%" } }),
        )),
      ),
      // Content blocks — infer from schema or fallback to 2 generic blocks
      ...(sections.length > 0 ? sections : [{ type: "table" }, { type: "chart" }]).map((section: any, i: number) =>
        React.createElement("div", {
          key: i,
          style: {
            flex: section.type === "chart" ? 1 : undefined,
            height: section.type === "table" ? 160 : undefined,
            background: "white", borderRadius: 12,
            boxShadow: GLOBAL_STYLE.shadowLow,
            padding: 16, display: "flex", flexDirection: "column" as const, gap: 10,
          },
        },
          // Header bar
          React.createElement("div", { style: { height: 10, borderRadius: 4, background: `${brand.primary}14`, width: "35%" } }),
          // Row skeletons
          ...Array.from({ length: section.type === "table" ? 3 : 2 }, (_, j) =>
            React.createElement("div", {
              key: j, style: {
                height: section.type === "chart" ? (28 + j * 8) : 10,
                borderRadius: section.type === "chart" ? 4 : 4,
                background: section.type === "chart"
                  ? `${brand.primary}${Math.round(16 + j * 6).toString(16).padStart(2, "0")}`
                  : `rgba(0,0,0,0.06)`,
                width: section.type === "chart" ? `${40 + j * 18}%` : "90%",
              },
            }),
          ),
        ),
      ),
    ),
  );
};

// ---------------------------------------------------------------------------
// ChunkCard — oversized "toy" UI card for stylized abstract representation
// ---------------------------------------------------------------------------

/** An oversized, heavily abstracted UI card — the WhatAStory "toy UI" aesthetic.
 *  Large border-radius (24px), oversized padding, skeleton bars for text content.
 *  Use INSTEAD of literal dashboard panels when the scene is NOT a cursor demo.
 *
 *  RULE: For background UI context (problem scenes, mid-hold b-roll), use
 *  ChunkCard instead of ReconstructedAppShell. Only use literal UI for the
 *  EXACT feature being demoed with a cursor in that scene.
 *
 *  showMetric: render a large bold number (e.g. "+42%") as a hero stat
 *  lines: number of skeleton text bars below the metric
 *  accent: left border in BRAND.primary
 *
 *  Usage:
 *    <ChunkCard title="Monthly Revenue" metric="$42K" trend="up" brand={BRAND}
 *               startFrame={20} width={300} height={180} />
 */
const ChunkCard = ({
  title,
  metric,
  trend,
  lines = 2,
  brand,
  startFrame = 0,
  accent = true,
  width: w = 280,
  height: h = 160,
}: {
  title?: string;
  metric?: string;
  trend?: "up" | "down" | "neutral";
  lines?: number;
  brand: BrandLike;
  startFrame?: number;
  accent?: boolean;
  width?: number;
  height?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - startFrame, fps, config: SPRING_CONFIGS.snap });
  const isLight = brand.style === "light";
  const trendColors = { up: "#10b981", down: "#ef4444", neutral: brand.textMuted ?? "#94a3b8" };
  const trendArrows = { up: "↑", down: "↓", neutral: "→" };
  return React.createElement("div", {
    style: {
      position: "relative",
      width: w, height: h,
      background: isLight ? "white" : "rgba(255,255,255,0.07)",
      borderRadius: 24,
      padding: "20px 22px",
      boxShadow: isLight
        ? "0 4px 8px rgba(0,0,0,0.04), 0 16px 40px rgba(0,0,0,0.08)"
        : "0 12px 40px rgba(0,0,0,0.4), 0 1px 1px rgba(255,255,255,0.12) inset",
      borderLeft: accent ? `4px solid ${brand.primary}` : undefined,
      border: !accent ? `1px solid ${brand.border ?? "rgba(255,255,255,0.08)"}` : undefined,
      opacity: prog,
      transform: `translateY(${((1 - prog) * 18).toFixed(1)}px) scale(${(0.94 + prog * 0.06).toFixed(3)})`,
      overflow: "hidden",
      flexShrink: 0,
      boxSizing: "border-box" as const,
    },
  },
    title && React.createElement("div", {
      style: {
        fontSize: 12, fontWeight: 600, fontFamily: brand.font ?? "Inter",
        color: brand.textMuted ?? (isLight ? "rgba(15,23,42,0.5)" : "rgba(255,255,255,0.5)"),
        textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8,
      },
    }, title),
    metric && React.createElement("div", {
      style: { display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 },
    },
      React.createElement("div", {
        style: {
          fontSize: Math.min(42, Math.round(h * 0.28)), fontWeight: 900,
          fontFamily: brand.font ?? "Inter",
          color: brand.text ?? (isLight ? "#0f172a" : "#ffffff"),
          letterSpacing: "-0.04em", lineHeight: 1,
        },
      }, metric),
      trend && trend !== "neutral" && React.createElement("div", {
        style: { fontSize: 14, fontWeight: 700, color: trendColors[trend] },
      }, trendArrows[trend]),
    ),
    ...Array.from({ length: lines }, (_, i) => React.createElement("div", {
      key: i,
      style: {
        height: 8, borderRadius: 4,
        background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.09)",
        width: `${[62, 82, 72, 90][i % 4]}%`, marginBottom: 6,
      },
    })),
  );
};

// ---------------------------------------------------------------------------
// SkeletonTextBlock — abstract skeleton bars replacing literal body copy
// ---------------------------------------------------------------------------

/** Renders abstract skeleton bars instead of actual paragraph text.
 *  More cinematic than readable copy — matches WhatAStory's "chunky" aesthetic.
 *
 *  RULE: When text content exists but is NOT the primary focus, replace it
 *  with SkeletonTextBlock. Never render paragraphs of copy in SaaS scenes —
 *  viewers cannot read it at video pace and it makes scenes look cluttered.
 *
 *  animated: subtle width-breathing animation per bar (staggered by row index)
 *
 *  Usage:
 *    <SkeletonTextBlock lines={3} color={BRAND.primary} startFrame={20} />
 */
const SkeletonTextBlock = ({
  lines = 3,
  color,
  animated = true,
  startFrame = 0,
  gap = 10,
  lineHeight = 10,
}: {
  lines?: number;
  color?: string;
  animated?: boolean;
  startFrame?: number;
  gap?: number;
  lineHeight?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const widths = [92, 78, 86, 95, 71, 83];
  const baseColor = color ?? "rgba(255,255,255,0.12)";
  return React.createElement("div", { style: { display: "flex", flexDirection: "column" as const, gap } },
    ...Array.from({ length: lines }, (_, i) => {
      const prog = spring({ frame: frame - (startFrame + i * 5), fps, config: SPRING_CONFIGS.entrance });
      const breathe = animated ? 0.92 + Math.sin(frame * 0.025 + i * 0.8) * 0.08 : 1;
      return React.createElement("div", {
        key: i,
        style: {
          height: lineHeight,
          borderRadius: lineHeight / 2,
          background: baseColor,
          width: `${widths[i % widths.length] * breathe}%`,
          opacity: prog,
          transform: `scaleX(${(0.6 + prog * 0.4).toFixed(3)})`,
          transformOrigin: "left center",
        },
      });
    }),
  );
};

// ---------------------------------------------------------------------------
// ActionCamera — reactive snap-zoom to INTERACTION_SCRIPT click targets
// ---------------------------------------------------------------------------

/** Reactive macro-focus camera that snap-zooms to upcoming click targets.
 *  Unlike CinematicCamera (slow drone), ActionCamera reacts to CURSOR_STEPS:
 *  - Begins easeOutExpo zoom toward the target `previewFrames` before the click
 *  - Holds focus for `holdFrames` after the click fires
 *  - Releases back with easeInExpo over `easeFrames`
 *
 *  Wrap the entire scene content layer (NOT the cursor/annotation layer):
 *    <ActionCamera interactionScript={CURSOR_STEPS} zoomAmount={1.18}>
 *      <AppShell ... />
 *    </ActionCamera>
 *    <CursorRenderer ... />  ← keep cursor OUTSIDE ActionCamera
 *
 *  interactionScript: CURSOR_STEPS array — steps with action:"click" trigger
 *    zoom. If no steps have action:"click", all time-based steps are used.
 *  zoomAmount: 1.10–1.25 typical (1.10 = subtle, 1.20 = strong)
 *  trackingInertia: 0 (no track) → 1 (aggressive track). Default 0.4.
 *    Smoothly follows the cursor path even when not clicking.
 *  previewFrames: frames before click to start zoom-in (default 15)
 *  holdFrames: frames to hold zoom after click (default 30)
 *  easeFrames: frames to ease back to full view (default 25)
 */
const ActionCamera = ({
  children,
  interactionScript = [],
  zoomAmount = 1.15,
  trackingInertia = 0.4,
  previewFrames = 15,
  holdFrames = 30,
  easeFrames = 25,
}: {
  children: React.ReactNode;
  interactionScript?: Array<{ time?: number; x: number; y: number; action?: string }>;
  zoomAmount?: number;
  trackingInertia?: number;
  previewFrames?: number;
  holdFrames?: number;
  easeFrames?: number;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const allSteps = (interactionScript ?? []).filter((s) => typeof s.time === "number");
  if (allSteps.length === 0) return React.createElement(React.Fragment, null, children);

  // 1. Calculate base tracking position (lerped between steps)
  let trackX = 0.5;
  let trackY = 0.5;

  const currentStepIdx = allSteps.findIndex((s, i) =>
    frame >= (s.time as number) && (i === allSteps.length - 1 || frame < (allSteps[i + 1].time as number))
  );

  if (currentStepIdx !== -1) {
    const s1 = allSteps[currentStepIdx];
    const s2 = allSteps[currentStepIdx + 1];
    if (s2) {
      const duration = (s2.time as number) - (s1.time as number);
      const elapsed = frame - (s1.time as number);
      const t = Math.min(1, elapsed / duration);
      // Quadratic bezier path for natural tracking arc (matching cursor logic)
      const dx = s2.x - s1.x;
      const dy = s2.y - s1.y;
      const tension = 0.15;
      const cx = (s1.x + s2.x) / 2 + dy * tension;
      const cy = (s1.y + s2.y) / 2 - dx * tension;
      const mt = 1 - t;
      trackX = mt * mt * s1.x + 2 * mt * t * cx + t * t * s2.x;
      trackY = mt * mt * s1.y + 2 * mt * t * cy + t * t * s2.y;
    } else {
      trackX = s1.x;
      trackY = s1.y;
    }
  } else if (frame < (allSteps[0].time as number)) {
    trackX = allSteps[0].x;
    trackY = allSteps[0].y;
  }

  // 2. Calculate Snap Zoom
  const clickSteps = allSteps.filter((s) => s.action === "click");
  const zoomTargets = clickSteps.length > 0 ? clickSteps : allSteps;

  let zoomProgress = 0;
  let zoomX = trackX;
  let zoomY = trackY;

  for (const step of zoomTargets) {
    const t = step.time as number;
    const windowStart = t - previewFrames;
    const windowEnd = t + holdFrames + easeFrames;
    if (frame < windowStart || frame >= windowEnd) continue;

    zoomX = step.x;
    zoomY = step.y;

    if (frame < t + holdFrames) {
      const raw = Math.min(1, Math.max(0, (frame - windowStart) / previewFrames));
      zoomProgress = raw >= 1 ? 1 : 1 - Math.pow(2, -10 * raw);
    } else {
      const raw = Math.min(1, Math.max(0, (frame - (t + holdFrames)) / easeFrames));
      zoomProgress = 1 - (raw >= 1 ? 1 : 1 - Math.pow(2, -10 * raw));
    }
    break;
  }

  // 3. Combine tracking + zoom
  // Inertia: blend between center (0.5) and trackX based on trackingInertia
  const finalTargetX = 0.5 + (trackX - 0.5) * trackingInertia * (1 - zoomProgress) + (zoomX - 0.5) * zoomProgress;
  const finalTargetY = 0.5 + (trackY - 0.5) * trackingInertia * (1 - zoomProgress) + (zoomY - 0.5) * zoomProgress;

  const scale = 1 + (zoomAmount - 1) * zoomProgress;
  // Subtle drift: even when not tracking, the camera does a micro-move
  const driftX = Math.sin(frame * 0.02) * 0.002;
  const driftY = Math.cos(frame * 0.015) * 0.002;

  const panX = (0.5 - (finalTargetX + driftX)) * width * (scale - 1);
  const panY = (0.5 - (finalTargetY + driftY)) * height * (scale - 1);

  return React.createElement("div", { style: { position: "absolute", inset: 0, overflow: "hidden" } },
    React.createElement("div", {
      style: {
        position: "absolute", inset: 0, willChange: "transform",
        transform: `scale(${scale.toFixed(4)}) translate(${panX.toFixed(1)}px, ${panY.toFixed(1)}px)`,
        transformOrigin: "center center",
      },
    }, children),
  );
};

// ---------------------------------------------------------------------------
// SpotlightCutout — SVG mask overlay punching a glowing hole over a target
// ---------------------------------------------------------------------------

/** Dark full-screen overlay with a transparent cutout over the active UI element.
 *  Uses SVG <mask> — works identically in browser preview and renderMedia().
 *  Provides cognitive masking: dims everything EXCEPT the element being demoed.
 *
 *  target: element bounds in normalized 0–1 coords { x, y, w, h }
 *    x/y = top-left corner, w/h = dimensions of the element
 *  startFrame: when the spotlight fades in (12-frame ease)
 *  endFrame: when it fades out (10-frame ease). Omit to hold until scene end.
 *  darkOpacity: overlay darkness (0.4 = subtle context, 0.65 = dramatic focus)
 *  padX/padY: breathing room around the cutout in px (default 20/12)
 *  glowColor: accent ring around the cutout (defaults to brand.primary)
 *
 *  Z-index: 90 — above Product UI (z:50) but below Cursor/Annotations (z:100+)
 *
 *  Usage:
 *    <SpotlightCutout
 *      target={{ x: 0.10, y: 0.28, w: 0.55, h: 0.11 }}
 *      startFrame={25}
 *      darkOpacity={0.58}
 *      glowColor={BRAND.primary}
 *    />
 */
const SpotlightCutout = ({
  target,
  startFrame = 0,
  endFrame,
  darkOpacity = 0.55,
  padX = 20,
  padY = 12,
  borderRadius = 10,
  glowColor,
  brand,
}: {
  target: { x: number; y: number; w: number; h: number };
  startFrame?: number;
  endFrame?: number;
  darkOpacity?: number;
  padX?: number;
  padY?: number;
  borderRadius?: number;
  glowColor?: string;
  brand?: BrandLike;
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const glowCol = glowColor ?? brand?.primary ?? "#6366f1";
  const framesIn = frame - startFrame;
  if (framesIn < 0) return null;

  const fadeIn = Math.min(1, framesIn / 12);
  const fadeOut = endFrame !== undefined && frame > endFrame
    ? Math.min(1, (frame - endFrame) / 10)
    : 0;
  const opacity = darkOpacity * fadeIn * (1 - fadeOut);
  if (opacity < 0.01) return null;

  // Lock-on: cutout scales from slightly large → exact size as it settles
  const lockProgress = spring({ frame: framesIn, fps, config: { damping: 14, stiffness: 180 }, durationInFrames: 20 });
  const cutoutScale = interpolate(lockProgress, [0, 1], [1.08, 1.0]);

  const tx = target.x * width - padX;
  const ty = target.y * height - padY;
  const tw = target.w * width + padX * 2;
  const th = target.h * height + padY * 2;
  const cx = tx + tw / 2;
  const cy = ty + th / 2;
  const stw = tw * cutoutScale;
  const sth = th * cutoutScale;
  const stx = cx - stw / 2;
  const sty = cy - sth / 2;

  const maskId = `sc-${Math.round(target.x * 1000)}-${Math.round(target.y * 1000)}`;
  const ringOpacity = fadeIn * (1 - fadeOut) * 0.85;

  return React.createElement("svg", {
    style: { position: "absolute", inset: 0, zIndex: 90, pointerEvents: "none", overflow: "visible" },
    width, height,
  },
    React.createElement("defs", null,
      React.createElement("mask", { id: maskId },
        React.createElement("rect", { width, height, fill: "white" }),
        React.createElement("rect", { x: stx, y: sty, width: stw, height: sth, rx: borderRadius, ry: borderRadius, fill: "black" }),
      ),
    ),
    // Dark overlay with cutout hole
    React.createElement("rect", { width, height, fill: "rgba(0,0,0,1)", opacity, mask: `url(#${maskId})` }),
    // Soft outer glow halo
    React.createElement("rect", { x: stx - 5, y: sty - 5, width: stw + 10, height: sth + 10, rx: borderRadius + 5, ry: borderRadius + 5, fill: "none", stroke: glowCol, strokeWidth: 8, opacity: ringOpacity * 0.12 }),
    // Mid glow ring
    React.createElement("rect", { x: stx - 2, y: sty - 2, width: stw + 4, height: sth + 4, rx: borderRadius + 2, ry: borderRadius + 2, fill: "none", stroke: glowCol, strokeWidth: 3, opacity: ringOpacity * 0.28 }),
    // Crisp accent border
    React.createElement("rect", { x: stx, y: sty, width: stw, height: sth, rx: borderRadius, ry: borderRadius, fill: "none", stroke: glowCol, strokeWidth: 1.5, opacity: ringOpacity }),
  );
};

// ---------------------------------------------------------------------------
// GhostHighlight — animated border snapping between UI elements
// ---------------------------------------------------------------------------

/** Keyboard-driven or "magical" navigation indicator.
 *  A glowing animated border that spring-transitions between UI elements to
 *  show state changes without requiring a physical cursor travel path.
 *  Use for: tab focus rings, wizard step progression, settings selections,
 *  filter activations, and any "state changed" moments.
 *
 *  targets: ordered array of highlight positions. Each entry fires when
 *    the given `frame` is reached.
 *    { frame, x, y, w, h } — all coords normalized 0–1
 *    Optional `label` renders as small text above the border.
 *
 *  Z-index: 95 — above product UI (z:50), below cursor layer (z:100)
 *
 *  Usage:
 *    <GhostHighlight
 *      targets={[
 *        { frame: 20, x: 0.08, y: 0.28, w: 0.42, h: 0.09 },
 *        { frame: 48, x: 0.08, y: 0.40, w: 0.42, h: 0.09 },
 *        { frame: 76, x: 0.08, y: 0.52, w: 0.42, h: 0.09, label: "Selected" },
 *      ]}
 *      brand={BRAND}
 *    />
 *
 *  padX/padY: breathing room around each target in px (default 6/4)
 *  borderRadius: corner rounding (default 8)
 *  color: override glow color (defaults to brand.primary)
 */
const GhostHighlight = ({
  targets = [],
  brand,
  padX = 6,
  padY = 4,
  borderRadius = 8,
  color,
}: {
  targets: Array<{ frame: number; x: number; y: number; w: number; h: number; label?: string }>;
  brand?: BrandLike;
  padX?: number;
  padY?: number;
  borderRadius?: number;
  color?: string;
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  if (!targets || targets.length === 0) return null;

  const glowCol = color ?? brand?.primary ?? "#6366f1";

  // Find the most recently activated target
  let currentIdx = -1;
  for (let i = targets.length - 1; i >= 0; i--) {
    if (frame >= targets[i].frame) { currentIdx = i; break; }
  }
  if (currentIdx === -1) return null;

  const current = targets[currentIdx];
  const prev = currentIdx > 0 ? targets[currentIdx - 1] : null;
  const framesIn = frame - current.frame;

  // Spring-slide from previous position to current
  const transProgress = spring({ frame: framesIn, fps, config: { damping: 14, stiffness: 260 }, durationInFrames: 18 });
  // Scale pulse: slight grow → settle (tactile snap feel)
  const pulseProg = spring({ frame: framesIn, fps, config: { damping: 8, stiffness: 400 }, durationInFrames: 15 });
  const scalePulse = interpolate(pulseProg, [0, 0.4, 1], [1.06, 0.98, 1.0]);

  const fromX = prev ? prev.x : current.x;
  const fromY = prev ? prev.y : current.y;
  const fromW = prev ? prev.w : current.w;
  const fromH = prev ? prev.h : current.h;

  const rx = interpolate(transProgress, [0, 1], [fromX, current.x]) * width - padX;
  const ry = interpolate(transProgress, [0, 1], [fromY, current.y]) * height - padY;
  const rw = interpolate(transProgress, [0, 1], [fromW, current.w]) * width + padX * 2;
  const rh = interpolate(transProgress, [0, 1], [fromH, current.h]) * height + padY * 2;

  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const sw = rw * scalePulse;
  const sh = rh * scalePulse;
  const sx = cx - sw / 2;
  const sy = cy - sh / 2;

  const glowOpacity = Math.min(1, framesIn / 8);

  return React.createElement("svg", {
    style: { position: "absolute", inset: 0, zIndex: 95, pointerEvents: "none", overflow: "visible" },
    width, height,
  },
    // Outer diffuse glow halo
    React.createElement("rect", { x: sx - 5, y: sy - 5, width: sw + 10, height: sh + 10, rx: borderRadius + 5, ry: borderRadius + 5, fill: "none", stroke: glowCol, strokeWidth: 7, opacity: glowOpacity * 0.13 }),
    // Mid glow ring
    React.createElement("rect", { x: sx - 2, y: sy - 2, width: sw + 4, height: sh + 4, rx: borderRadius + 2, ry: borderRadius + 2, fill: "none", stroke: glowCol, strokeWidth: 3, opacity: glowOpacity * 0.28 }),
    // Fill tint
    React.createElement("rect", { x: sx, y: sy, width: sw, height: sh, rx: borderRadius, ry: borderRadius, fill: glowCol, opacity: glowOpacity * 0.07 }),
    // Crisp 1.5px border
    React.createElement("rect", { x: sx, y: sy, width: sw, height: sh, rx: borderRadius, ry: borderRadius, fill: "none", stroke: glowCol, strokeWidth: 1.5, opacity: glowOpacity }),
    // Optional label
    current.label && React.createElement("text", {
      x: cx, y: sy - 7,
      textAnchor: "middle",
      fill: glowCol,
      fontSize: 11,
      fontFamily: brand?.font ?? "Inter",
      fontWeight: 600,
      opacity: glowOpacity * 0.85,
    }, current.label),
  );
};

export interface CompilationError {
  message: string;
  /** 1-based line number in the original LLM-generated code, or null if not parseable */
  line: number | null;
  /** 1-based column number, or null */
  column: number | null;
  /** The offending line of source code, or null */
  snippet: string | null;
}

export interface CompilationResult {
  Component: React.ComponentType | null;
  error: string | null;
  /** Structured error details when error is non-null */
  compilationError?: CompilationError;
}

/**
 * Parse a Babel/runtime error message into structured form.
 * Babel errors typically look like:
 *   "SyntaxError: /dynamic-animation.tsx: Unexpected token (12:5)"
 *   "ReferenceError: foo is not defined"
 */
export function parseCompilerError(
  errorMessage: string,
  sourceCode: string,
): CompilationError {
  let line: number | null = null;
  let column: number | null = null;

  // Match "... (line:col)" pattern from Babel
  const babelMatch = errorMessage.match(/\((\d+):(\d+)\)/);
  if (babelMatch) {
    line = parseInt(babelMatch[1], 10);
    column = parseInt(babelMatch[2], 10);
  }

  // Match "line N" pattern from some runtime errors
  if (!line) {
    const lineMatch = errorMessage.match(/\bline\s+(\d+)\b/i);
    if (lineMatch) {
      line = parseInt(lineMatch[1], 10);
    }
  }

  // Extract the source snippet if we have a line number
  let snippetStr: string | null = null;
  if (line !== null && sourceCode) {
    const lines = sourceCode.split("\n");
    // line is 1-based; the compiler wraps code in "const DynamicAnimation = () => {\n"
    // so subtract 1 to account for the wrapper prefix line
    const adjustedLine = line - 1;
    if (adjustedLine >= 1 && adjustedLine <= lines.length) {
      snippetStr = lines[adjustedLine - 1]?.trim() ?? null;
    }
  }

  // Clean up the message — strip the file path prefix Babel adds
  const cleanMessage = errorMessage
    .replace(/^[^:]+:\s*\/[^:]+:\s*/, "") // remove "SyntaxError: /file.tsx: "
    .trim();

  return {
    message: cleanMessage || errorMessage,
    line,
    column,
    snippet: snippetStr,
  };
}

// Strip imports and extract component body from LLM-generated code
// Safety layer in case LLM includes full ES6 syntax despite instructions
export function extractComponentBody(code: string): string {
  // Strip all import statements (handles multi-line imports with newlines in braces)
  let cleaned = code;

  // Remove type imports: import type { ... } from "...";
  cleaned = cleaned.replace(
    /import\s+type\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g,
    "",
  );
  // Remove combined default + named imports: import X, { ... } from "...";
  cleaned = cleaned.replace(
    /import\s+\w+\s*,\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g,
    "",
  );
  // Remove multi-line named imports: import { ... } from "...";
  cleaned = cleaned.replace(
    /import\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g,
    "",
  );
  // Remove namespace imports: import * as X from "...";
  cleaned = cleaned.replace(
    /import\s+\*\s+as\s+\w+\s+from\s*["'][^"']+["'];?/g,
    "",
  );
  // Remove default imports: import X from "...";
  cleaned = cleaned.replace(/import\s+\w+\s+from\s*["'][^"']+["'];?/g, "");
  // Remove side-effect imports: import "...";
  cleaned = cleaned.replace(/import\s*["'][^"']+["'];?/g, "");

  cleaned = cleaned.trim();

  // Strip module-syntax prefixes before extraction.
  // The generator often emits `export const MyAnimation = ...` plus helper declarations.
  // We normalize them here so downstream extraction sees plain declarations.
  cleaned = cleaned.replace(/\bexport\s+default\s+(?=(?:function|class|const)\s)/g, "");
  cleaned = cleaned.replace(/\bexport\s+(?=(?:function|class|const)\s)/g, "");
  cleaned = cleaned.replace(/^export\s+default\s+\w+\s*;?\s*$/gm, "");

  const findMatchingDelimiter = (
    source: string,
    startIndex: number,
    openChar: string,
    closeChar: string,
  ): number => {
    let depth = 0;
    let inStr: string | null = null;
    let inLineComment = false;
    let inBlockComment = false;
    for (let i = startIndex; i < source.length; i++) {
      const char = source[i];
      const next = source[i + 1];

      if (inLineComment) {
        if (char === "\n") inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (char === "*" && next === "/") {
          inBlockComment = false;
          i++;
        }
        continue;
      }
      if (inStr) {
        if (char === "\\") {
          i++;
          continue;
        }
        if (char === inStr) inStr = null;
        continue;
      }
      if (char === "/" && next === "/") {
        inLineComment = true;
        i++;
        continue;
      }
      if (char === "/" && next === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        inStr = char;
        continue;
      }
      if (char === openChar) depth++;
      else if (char === closeChar) {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  };

  type ComponentCandidate = {
    index: number;
    name: string;
    bodyStart: number;
    bodyEnd: number;
    kind: "block" | "implicit";
    score: number;
  };

  const candidates: ComponentCandidate[] = [];

  const stripComponentDeclarations = (source: string, exceptName?: string): string => {
    if (!source.trim()) return "";
    const ranges: Array<{ start: number; end: number }> = [];

    const removeArrowDecls = /(?:^|\n)\s*const\s+([A-Z]\w*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*=>\s*/g;
    let match: RegExpExecArray | null;
    while ((match = removeArrowDecls.exec(source)) !== null) {
      const name = match[1];
      if (name === exceptName) continue;
      const matchText = match[0];
      const start = (match.index ?? 0) + matchText.lastIndexOf("const");
      const afterArrow = (match.index ?? 0) + matchText.length;
      const nextNonWsRel = source.slice(afterArrow).search(/\S/);
      if (nextNonWsRel === -1) continue;
      const bodyStart = afterArrow + nextNonWsRel;
      const nextChar = source[bodyStart];
      let end = -1;
      if (nextChar === "{") {
        const bodyEnd = findMatchingDelimiter(source, bodyStart, "{", "}");
        if (bodyEnd !== -1) end = bodyEnd + 1;
      } else if (nextChar === "(") {
        const bodyEnd = findMatchingDelimiter(source, bodyStart, "(", ")");
        if (bodyEnd !== -1) end = bodyEnd + 1;
      }
      if (end !== -1) {
        while (end < source.length && /[\s;]/.test(source[end]!)) end++;
        ranges.push({ start, end });
      }
    }

    const removeFuncDecls = /(?:^|\n)\s*function\s+([A-Z]\w*)\s*\([^)]*\)\s*\{/g;
    while ((match = removeFuncDecls.exec(source)) !== null) {
      const name = match[1];
      if (name === exceptName) continue;
      const matchText = match[0];
      const start = (match.index ?? 0) + matchText.lastIndexOf("function");
      const bodyStart = source.indexOf("{", start);
      if (bodyStart === -1) continue;
      let end = findMatchingDelimiter(source, bodyStart, "{", "}");
      if (end !== -1) {
        end += 1;
        while (end < source.length && /[\s;]/.test(source[end]!)) end++;
        ranges.push({ start, end });
      }
    }

    if (ranges.length === 0) return source.trim();
    ranges.sort((a, b) => a.start - b.start);
    let cursor = 0;
    let out = "";
    for (const range of ranges) {
      if (range.start < cursor) continue;
      out += source.slice(cursor, range.start);
      cursor = range.end;
    }
    out += source.slice(cursor);
    return out.trim();
  };

  const arrowDeclRe = /(?:^|\n)\s*const\s+([A-Z]\w*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*=>\s*/g;
  let arrowMatch: RegExpExecArray | null;
  while ((arrowMatch = arrowDeclRe.exec(cleaned)) !== null) {
    const name = arrowMatch[1];
    const matchText = arrowMatch[0];
    const startIndex = (arrowMatch.index ?? 0) + matchText.lastIndexOf("const");
    const afterArrowIndex = (arrowMatch.index ?? 0) + matchText.length;
    const nextNonWsRel = cleaned.slice(afterArrowIndex).search(/\S/);
    if (nextNonWsRel === -1) continue;
    const bodyStart = afterArrowIndex + nextNonWsRel;
    const nextChar = cleaned[bodyStart];
    if (nextChar === "{") {
      const bodyEnd = findMatchingDelimiter(cleaned, bodyStart, "{", "}");
      if (bodyEnd !== -1) {
        const body = cleaned.slice(bodyStart + 1, bodyEnd);
        let score = /(DynamicAnimation|MyAnimation)/.test(name) ? 20 : /^Scene\d+$/.test(name) ? 0 : 10;
        if (/\breturn\b/.test(body)) score += 40;
        if (/<AbsoluteFill\b/.test(body)) score += 60;
        if (/<(?:Sequence|Audio|Img|OffthreadVideo)\b/.test(body)) score += 10;
        if (/const\s+Scene\d+\s*=/.test(body) && !/\breturn\b/.test(body)) score -= 80;
        candidates.push({ index: startIndex, name, bodyStart, bodyEnd, kind: "block", score });
      }
    } else if (nextChar === "(") {
      const bodyEnd = findMatchingDelimiter(cleaned, bodyStart, "(", ")");
      if (bodyEnd !== -1) {
        candidates.push({
          index: startIndex,
          name,
          bodyStart,
          bodyEnd,
          kind: "implicit",
          score: (/(DynamicAnimation|MyAnimation)/.test(name) ? 20 : /^Scene\d+$/.test(name) ? 0 : 10) + 70,
        });
      }
    }
  }

  const funcDeclRe = /(?:^|\n)\s*function\s+([A-Z]\w*)\s*\([^)]*\)\s*\{/g;
  let funcMatch: RegExpExecArray | null;
  while ((funcMatch = funcDeclRe.exec(cleaned)) !== null) {
    const name = funcMatch[1];
    const matchText = funcMatch[0];
    const startIndex = (funcMatch.index ?? 0) + matchText.lastIndexOf("function");
    const bodyStart = cleaned.indexOf("{", startIndex);
    if (bodyStart === -1) continue;
    const bodyEnd = findMatchingDelimiter(cleaned, bodyStart, "{", "}");
    if (bodyEnd !== -1) {
      const body = cleaned.slice(bodyStart + 1, bodyEnd);
      let score = /(DynamicAnimation|MyAnimation)/.test(name) ? 20 : /^Scene\d+$/.test(name) ? 0 : 10;
      if (/\breturn\b/.test(body)) score += 40;
      if (/<AbsoluteFill\b/.test(body)) score += 60;
      if (/<(?:Sequence|Audio|Img|OffthreadVideo)\b/.test(body)) score += 10;
      if (/const\s+Scene\d+\s*=/.test(body) && !/\breturn\b/.test(body)) score -= 80;
      candidates.push({ index: startIndex, name, bodyStart, bodyEnd, kind: "block", score });
    }
  }

  const prioritized = [...candidates].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.index - a.index;
  });

  const chosen = prioritized[0];
  if (chosen) {
    const prefix = cleaned.slice(0, chosen.index).trim();
    let suffix = cleaned.slice(chosen.bodyEnd + 1).trim();
    suffix = suffix.replace(/^;+\s*/, "").trim();
    suffix = suffix.replace(/^\/\/\s*EOF\s*$/gm, "").trim();

    const body =
      chosen.kind === "block"
        ? cleaned.slice(chosen.bodyStart + 1, chosen.bodyEnd).trim()
        : `return (\n${cleaned.slice(chosen.bodyStart + 1, chosen.bodyEnd).trim()}\n);`;

    const trailingHelpers = /(?:^|\n)\s*(?:const|let|var|function|class)\s+\w+/m.test(suffix) ? suffix : "";
    const shouldStripComponentHelpers = /^Scene\d+$/.test(chosen.name);
    const allHelpers = [
      shouldStripComponentHelpers ? stripComponentDeclarations(prefix, chosen.name) : prefix.trim(),
      shouldStripComponentHelpers ? stripComponentDeclarations(trailingHelpers, chosen.name) : trailingHelpers.trim(),
    ].filter(Boolean).join("\n\n");
    return allHelpers ? `${allHelpers}\n\n${body}` : body;
  }

  return cleaned;
}

// Standalone compile function for use outside React components
/**
 * Strip `const BRAND = { ... };` from generated code.
 * BRAND is injected as a compiler scope variable so the LLM can reference it
 * directly without declaring it. If the LLM declared it anyway, this prevents
 * a "Identifier 'BRAND' has already been declared" conflict.
 */
function stripBrandDeclaration(code: string): string {
  const marker = "const BRAND = {";
  const idx = code.indexOf(marker);
  if (idx === -1) return code;
  let depth = 0;
  let i = idx + marker.length - 1; // opening {
  for (; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}") {
      depth--;
      if (depth === 0) {
        let end = i + 1;
        while (end < code.length && (code[end] === ";" || code[end] === "\n" || code[end] === "\r")) end++;
        return code.slice(0, idx) + code.slice(end);
      }
    }
  }
  return code;
}

// ---------------------------------------------------------------------------
// Phase 1 new scope components
// ---------------------------------------------------------------------------

const STOCK_AVATARS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
];

const HandwrittenLabel = ({ text, x, y, targetX, targetY, startFrame, brand, rotation }: any) => {
  const frame = useCurrentFrame();
  const progress = spring({ frame: frame - (startFrame || 0), fps: 30, config: { damping: 200, stiffness: 120 } });
  const rot = rotation ?? (random(`label-rot-${text}`) * 6 - 3);
  return React.createElement("div", {
    style: {
      position: "absolute", left: `${(x || 0.5) * 100}%`, top: `${(y || 0.5) * 100}%`,
      transform: `translate(-50%, -50%) rotate(${rot}deg) translateY(${interpolate(progress, [0,1], [20,0])}px)`,
      opacity: progress, fontFamily: "'Caveat', cursive",
      fontSize: 28, color: brand?.textMuted || "rgba(0,0,0,0.5)",
      whiteSpace: "nowrap", zIndex: 80,
    }
  },
    text,
    targetX !== undefined && targetY !== undefined ? React.createElement("svg", {
      style: { position: "absolute", top: "100%", left: "50%", overflow: "visible", width: 1, height: 1, zIndex: 79 }
    }, React.createElement("line", {
      x1: 0, y1: 0,
      x2: (targetX - (x || 0.5)) * 1920, y2: (targetY - (y || 0.5)) * 1080,
      stroke: brand?.textMuted || "rgba(0,0,0,0.3)", strokeWidth: 1.5,
      strokeDasharray: "4 4", opacity: progress * 0.5
    })) : null
  );
};

const PersonCard = ({ photoIndex, name, role, accentColor, startFrame, brand, size }: any) => {
  const frame = useCurrentFrame();
  const sz = size || 80;
  const progress = spring({ frame: frame - (startFrame || 0), fps: 30, config: SPRING_CONFIGS.snap });
  const accent = accentColor || brand?.primary || "#6366f1";
  const imgSrc = STOCK_AVATARS[(photoIndex || 0) % STOCK_AVATARS.length];
  return React.createElement("div", {
    style: {
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      opacity: progress, transform: `scale(${interpolate(progress, [0,1], [0.8,1])})`,
    }
  },
    React.createElement("div", {
      style: {
        width: sz + 10, height: sz + 10, borderRadius: "50%", overflow: "hidden",
        border: "3px solid white", boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)",
        background: accent, padding: 3,
      }
    }, React.createElement(Img, { src: imgSrc, style: { width: sz, height: sz, borderRadius: "50%", objectFit: "cover" } })),
    name ? React.createElement("div", { style: { fontFamily: brand?.font || "Inter", fontSize: 14, fontWeight: 600, color: brand?.text || "#0f172a" } }, name) : null,
    role ? React.createElement("div", { style: { fontFamily: brand?.font || "Inter", fontSize: 11, fontWeight: 500, color: "white", background: accent, borderRadius: 20, padding: "2px 10px" } }, role) : null,
  );
};

const GarbledText = ({ finalText, resolveFrame, scrambleStrength, startFrame, style }: any) => {
  const frame = useCurrentFrame();
  const strength = scrambleStrength ?? 0.8;
  const chars = "??#$%&*@!><{}[]|^~";
  const start = startFrame || 0;
  const resolve = resolveFrame || 999;
  const resolveProgress = frame >= resolve ? Math.min(1, (frame - resolve) / 20) : 0;
  const text = (finalText || "Loading...").split("").map((char: string, i: number) => {
    if (char === " ") return " ";
    if (resolveProgress >= 1) return char;
    const shouldScramble = random(`garble-${i}-${Math.floor((frame - start) / 3)}`) < strength * (1 - resolveProgress);
    if (shouldScramble) {
      const idx = Math.floor(random(`char-${i}-${frame}`) * chars.length);
      return chars[idx];
    }
    return char;
  }).join("");
  return React.createElement("span", { style }, text);
};

const OrbitRing = ({ centerX, centerY, radius, color, startFrame, dotSpeed, brand }: any) => {
  const frame = useCurrentFrame();
  const cx = (centerX ?? 0.5) * 1920;
  const cy = (centerY ?? 0.5) * 1080;
  const r = radius || 200;
  const c = color || brand?.primary || "#6366f1";
  const progress = spring({ frame: frame - (startFrame || 0), fps: 30, config: SPRING_CONFIGS.entrance });
  const speed = dotSpeed || 0.02;
  const dotAngle = frame * speed;
  return React.createElement("svg", {
    style: { position: "absolute", top: 0, left: 0, width: 1920, height: 1080, zIndex: 3, pointerEvents: "none" }
  },
    React.createElement("circle", { cx, cy, r: r * progress, fill: "none", stroke: c, strokeWidth: 1.5, strokeDasharray: "6 6", opacity: 0.25 * progress }),
    React.createElement("circle", {
      cx: cx + r * progress * Math.cos(dotAngle),
      cy: cy + r * progress * Math.sin(dotAngle),
      r: 4, fill: c, opacity: 0.6 * progress
    })
  );
};

const BoldColorBg = ({ color, vignetteStrength }: any) => {
  const v = vignetteStrength ?? 0.15;
  return React.createElement(AbsoluteFill, { style: { backgroundColor: color || "#6366f1" } },
    v > 0 ? React.createElement("div", {
      style: {
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${v}) 100%)`,
      }
    }) : null
  );
};

// ---------------------------------------------------------------------------
// Phase 2: postProcessCode — auto-fixes before Babel transpilation
// ---------------------------------------------------------------------------
function postProcessCode(code: string): string {
  let processed = code;
  const hasBalancedDelimiter = (
    source: string,
    openChar: string,
    closeChar: string,
  ): boolean => {
    let depth = 0;
    let inStr: string | null = null;
    let inLineComment = false;
    let inBlockComment = false;
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      const next = source[i + 1];
      if (inLineComment) {
        if (ch === "\n") inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (ch === "*" && next === "/") {
          inBlockComment = false;
          i++;
        }
        continue;
      }
      if (inStr) {
        if (ch === "\\") {
          i++;
          continue;
        }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === "/" && next === "/") {
        inLineComment = true;
        i++;
        continue;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inStr = ch;
        continue;
      }
      if (ch === openChar) depth++;
      else if (ch === closeChar) depth--;
    }
    return depth <= 0;
  };
  // Strip leaked standalone markdown fence language labels (e.g. a bare `javascript` token)
  // before Babel sees them. These can appear without backticks and are invalid JS.
  processed = processed.replace(/^\s*(javascript|typescript|jsx|tsx)\s*$/gmi, "");

  // Some test fixtures and partial generations include an explicit comment describing the
  // missing closure, for example: `// missing close: }));`. Turn that back into code.
  processed = processed.replace(
    /^(\s*)\/\/\s*missing close:\s*([^\n]+)\s*$/gm,
    (_match: string, indent: string, closure: string) => `${indent}${closure.trim()}`,
  );

  // Repair unclosed top-level array declarations that precede the exported component.
  // Common pattern: `const CURSOR_STEPS = [` then the model jumps to `export const ...`
  // without closing the array, causing Babel to choke before any other healing can run.
  {
    const exportIdx = processed.indexOf("export const");
    if (exportIdx !== -1) {
      const prefix = processed.slice(0, exportIdx);
      const suffix = processed.slice(exportIdx);

      // Find any `const X = [` in the prefix that doesn't have a matching `]` before export.
      const declRe = /(?:^|\n)\s*(?:const|let|var)\s+([A-Z][A-Z0-9_]*)\s*=\s*\[/g;
      let m: RegExpExecArray | null;
      let repairedPrefix = prefix;
      let offset = 0;

      while ((m = declRe.exec(prefix)) !== null) {
        const matchIdx = (m.index ?? 0) + offset;
        const arrStart = repairedPrefix.indexOf("[", matchIdx);
        if (arrStart === -1) continue;

        // Walk from arrStart to see if the bracket ever closes inside the prefix.
        let depth = 0;
        let inStr: string | null = null;
        let closed = false;
        for (let i = arrStart; i < repairedPrefix.length; i++) {
          const ch = repairedPrefix[i];
          if (inStr) {
            if (ch === "\\") { i++; continue; }
            if (ch === inStr) inStr = null;
            continue;
          }
          if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
          if (ch === "[") depth++;
          else if (ch === "]") {
            depth--;
            if (depth === 0) { closed = true; break; }
          }
        }

        if (!closed) {
          // Insert closure right before export. Also add semicolon defensively.
          repairedPrefix = repairedPrefix.trimEnd() + "\n];\n\n";
          break; // one repair is enough; export boundary is imminent
        }
      }

      processed = repairedPrefix + suffix;
    }
  }

  // Repair declarations whose array/object initializer was interrupted by the next statement.
  // Real-world failure: `const ITEMS = Array.from(... => ({` and the model jumps to `const NEXT = ...`
  // before closing `}));`, or `const FOO = [` before the next declaration.
  {
    const declarationBoundary = "\n\\s*(?:const|let|var|function|if|return)\\b";
    const brokenArrayDecl = new RegExp(
      `((?:^|\\n)\\s*(?:const|let|var)\\s+\\w+\\s*=\\s*\\[[\\s\\S]*?)(?=${declarationBoundary})`,
      "g",
    );
    processed = processed.replace(brokenArrayDecl, (match: string) => {
      return hasBalancedDelimiter(match, "[", "]") ? match : `${match}\n  ];`;
    });

    const brokenArrayFromDecl = new RegExp(
      `((?:^|\\n)\\s*(?:const|let|var)\\s+\\w+\\s*=\\s*Array\\.from\\([\\s\\S]*?)(?=${declarationBoundary})`,
      "g",
    );
    processed = processed.replace(brokenArrayFromDecl, (match: string) => {
      const needsParen = !hasBalancedDelimiter(match, "(", ")");
      const needsBrace = !hasBalancedDelimiter(match, "{", "}");
      if (!needsParen && !needsBrace) return match;
      return `${match}\n  ${needsBrace ? "}" : ""}${needsParen ? "))" : ""};`;
    });

    const interruptedArrayFromObject = new RegExp(
      `((?:^|\\n)\\s*(?:const|let|var)\\s+\\w+\\s*=\\s*Array\\.from\\([\\s\\S]*?=>\\s*\\(\\{[\\s\\S]*?)(\\n\\s*(?:const|let|var|function|if|return)\\b)`,
      "g",
    );
    processed = processed.replace(
      interruptedArrayFromObject,
      (match: string, prefix: string, nextDecl: string) => {
        return hasBalancedDelimiter(prefix, "(", ")") && hasBalancedDelimiter(prefix, "{", "}")
          ? match
          : `${prefix}\n  }));${nextDecl}`;
      },
    );
  }

  // Remove bare ternary tails that lost their condition entirely.
  processed = processed.replace(
    /^\s*\?[\s\S]*?\n\s*:\s*[^\n;]+;?\s*$/gm,
    "",
  );

  // Drop orphan template-literal post-processing fragments like:
  //   `.replace(...)
  //     ...
  //   }));
  processed = processed.replace(
    /^\s*`\.replace\([\s\S]*?(?:(?:^\s*\}\)\);?\s*$|^\s*\)\)\);?\s*$)\n?)+/gm,
    "",
  );

  // Clean up orphan close-chain lines left behind after removing broken template processing.
  processed = processed.replace(/^\s*\)\);\s*$/gm, "");
  // Auto-pair WebkitBackdropFilter — handles simple and compound filter strings
  // Matches: "blur(24px)", "blur(24px) saturate(150%)", etc.
  // Only injects if WebkitBackdropFilter is not already present nearby.
  processed = processed.replace(
    /backdropFilter:\s*["']([^"']+)["'](?!\s*,\s*WebkitBackdropFilter)/g,
    (match: string, filterVal: string) => `${match}, WebkitBackdropFilter: "${filterVal}"`
  );
  // Strip TypeScript return type annotations on arrow functions before pattern extraction.
  // e.g., `= (): JSX.Element => {` → `= () => {`
  // Without this, extractComponentBody's regex fails to match and leaves `export const`
  // inside the wrapped body, causing Babel to throw "export may only appear at top level".
  processed = processed.replace(
    /\)\s*:\s*(?:JSX\.Element|React\.(?:FC|ReactElement|ReactNode|Component|ComponentType)|void|never|unknown|any|boolean|string|number|null|Element|ReactElement)\b[^={]*?(?=\s*=>)/g,
    ')',
  );

  // Ensure first bare AbsoluteFill has backgroundColor if none exists
  if (processed.includes("<AbsoluteFill>") && !processed.includes("backgroundColor")) {
    processed = processed.replace(
      "<AbsoluteFill>",
      "<AbsoluteFill style={{ backgroundColor: BRAND.bg }}>"
    );
  }
  // Hoist CURSOR_STEPS declaration to prevent temporal dead zone errors.
  // The LLM sometimes calls useCursorState(CURSOR_STEPS) before declaring
  // `const CURSOR_STEPS = [...]`, causing a TDZ ReferenceError at runtime.
  if (processed.includes("const CURSOR_STEPS")) {
    const declStart = processed.indexOf("const CURSOR_STEPS");
    const arrStart = processed.indexOf("[", declStart);
    if (arrStart !== -1) {
      // Walk character-by-character tracking bracket depth while ignoring
      // brackets inside string literals (single or double quotes).
      let depth = 0, end = arrStart, inStr = "", i = arrStart;
      while (i < processed.length) {
        const ch = processed[i];
        if (inStr) {
          if (ch === "\\" ) { i += 2; continue; } // skip escaped char
          if (ch === inStr) inStr = "";
        } else {
          if (ch === '"' || ch === "'") { inStr = ch; }
          else if (ch === "[") { depth++; }
          else if (ch === "]") { depth--; if (depth === 0) { end = i; break; } }
        }
        i++;
      }
      const semiEnd = processed.indexOf(";", end);
      if (semiEnd !== -1) {
        const fullDecl = processed.slice(declStart, semiEnd + 1);
        processed = processed.slice(0, declStart) + processed.slice(semiEnd + 1);
        processed = fullDecl + "\n" + processed;
      }
    }
  }

  // Hoist SCENE_TIMELINE declaration to prevent temporal dead zone errors.
  // Same pattern as CURSOR_STEPS — LLM references SCENE_TIMELINE before declaring it.
  if (processed.includes("const SCENE_TIMELINE")) {
    const declStart = processed.indexOf("const SCENE_TIMELINE");
    const arrStart = processed.indexOf("[", declStart);
    if (arrStart !== -1) {
      let depth = 0, end = arrStart, inStr = "", i = arrStart;
      while (i < processed.length) {
        const ch = processed[i];
        if (inStr) {
          if (ch === "\\" ) { i += 2; continue; }
          if (ch === inStr) inStr = "";
        } else {
          if (ch === '"' || ch === "'") { inStr = ch; }
          else if (ch === "[") { depth++; }
          else if (ch === "]") { depth--; if (depth === 0) { end = i; break; } }
        }
        i++;
      }
      const semiEnd = processed.indexOf(";", end);
      if (semiEnd !== -1) {
        const fullDecl = processed.slice(declStart, semiEnd + 1);
        processed = processed.slice(0, declStart) + processed.slice(semiEnd + 1);
        processed = fullDecl + "\n" + processed;
      }
    }
  }

  // Hoist timing constants like TRAVEL_DURATION, DWELL, ZOOM_IN to appear before CURSOR_STEPS
  // so they can be safely referenced in CURSOR_STEPS time offsets without TDZ errors.
  const timingConstants = [
    'TRAVEL_DURATION', 'DWELL_DURATION', 'CLICK_DURATION', 
    'TRAVEL', 'DWELL', 'CLICK', 'ZOOM_IN', 'ZOOM_OUT', 'ZOOM_HOLD'
  ];
  for (const tc of timingConstants) {
    const regex = new RegExp(`(?:const|let|var)\\s+${tc}\\s*=\\s*[-0-9.]+(?:\\s*\\*\\s*[-0-9.]+)*;?`, 'g');
    const matches = Array.from(processed.matchAll(regex));
    for (const match of matches) {
      processed = processed.replace(match[0], '');
      processed = match[0] + (match[0].endsWith(';') ? '' : ';') + '\n' + processed;
    }
  }

  // ── Shared helpers for undeclared-identifier detection ──────────────────
  // Strip string/template literals so identifiers inside quotes are ignored.
  const _noStr = (s: string) =>
    s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
  const _noStrCode = _noStr(processed);

  // ── (A) Auto-fallback for undeclared ALL_CAPS constants ──────────────────
  // LLM often invents frame-offset constants (NODE_FADE_IN_START, etc.)
  // without declaring them.  Inject `const X = 0;` for each unknown one.
  {
    const KNOWN = new Set([
      // Scope constants
      'BRAND','ATTACHED_IMAGES','VOICEOVER_AUDIO_URL','VOICEOVER_URLS',
      'WORD_TIMINGS','DETECTED_ELEMENTS','DETECTED_SECTIONS','UI_SCHEMA',
      'GLOBAL_BG','GLOBAL_FRAME_OFFSET','GLOBAL_STYLE','SPRING_CONFIGS',
      'INITIAL_CAMERA_ZOOM','INITIAL_CAMERA_PAN','SCENE_TIMELINE',
      'EASINGS','HAND_CURSOR','ENTROPY_DUST_PARTICLES','SAFE_ZONES',
      'STOCK_AVATARS','CURSOR_STEPS','SFX_URLS','MUSIC_BPM','MORPH_FROM','STOCK_VIDEO_URL',
      'CURSOR_STATE_DEFAULT',
      // New scope variables (added with compileCode param expansion)
      'VISUAL_STATE','SKILL_COMPOSITION','BRAND_LOGO','HIGHLIGHT_WORDS',
      'VISUAL_ANCHOR','MUSIC_MOOD','PIPELINE_CURSOR_STEPS','MUSIC_URL',
      'FEATURE_HEADER',
      // JS built-ins (ALL_CAPS subset)
      'NaN','Infinity','Math','JSON','URL','NOT','AND','OR','NULL','TRUE','FALSE',
      // Remotion / React
      'AbsoluteFill','Audio','Img','Sequence','React',
    ]);
    const used = new Set<string>();
    const declared = new Set<string>();
    let cm: RegExpExecArray | null;
    const useRe = /\b([A-Z][A-Z0-9_]{2,})\b/g;
    while ((cm = useRe.exec(_noStrCode)) !== null) used.add(cm[1]);
    const declRe = /(?:const|let|var)\s+([A-Z][A-Z0-9_]{2,})\b/g;
    while ((cm = declRe.exec(_noStrCode)) !== null) declared.add(cm[1]);
    const fallbacks: string[] = [];
    Array.from(used).forEach((name) => {
      if (!KNOWN.has(name) && !declared.has(name)) fallbacks.push(`const ${name} = 0;`);
    });
    if (fallbacks.length > 0) processed = fallbacks.join('\n') + '\n' + processed;
  }

  // ── (B) Auto-fallback for undeclared PascalCase components ───────────────
  // LLM often invents component names like <StatCard />, <FeatureItem /> etc.
  // Inject `const Name = ({children,...p}) => React.createElement('div',p,children);`
  {
    const KNOWN_COMPONENTS = new Set([
      // Remotion / React shapes
      'AbsoluteFill','Sequence','Img','Audio','TransitionSeries',
      'Rect','Circle','Triangle','Star','Polygon','Ellipse','Heart','Pie',
      // Scope components (all 64 PascalCase entries from the Function() call)
      'TiltWrapper','ChameleonInput','ChameleonHighlight','DropdownMenu',
      'CinematicCamera','SteppedCamera','MacroCamera','SelectiveFocus','NarrationReveal','OffthreadVideo','TaskDetailPanel','ModalOverlay',
      'FeatureContextBar','NotificationCard','PaperPlane','InAppChatPanel','ConcentricRings','DrawOnIcon',
      'InputField','ChatBubble','SidebarNav','AppShell','HeroSplit',
      'AnimatedConnectionLine','DynamicConnectorLine','VideoPlateMockup',
      'FilmGrain','ContextualSectionHeader','SfxSequencer','AnimatedSidebar',
      'AnimatedMetricCards','AnimatedTable','AnimatedChart','AnimatedForm',
      'ReconstructedAppShell','AbstractSkeletonUI','ChunkCard','SkeletonTextBlock',
      'AnimatedTopbar','SectionTitle','NotificationToast','StatusBadge',
      'TableActionButton','PersistentSectionLabel','FloatingShapes',
      'AmbientEnvironment','DepthStack','AnimatedHighlighter','ContentCard',
      'EntropyDust','MeshGradientBg','WrappedMeshGradientBg','CameraMotionBlur',
      'SheenOverlay','ParallaxLayer','MotionBlurWhip',
      'ChromaticAberration','GlowBloom','DepthBlur','ActionCamera',
      'SpotlightCutout','GhostHighlight','HandwrittenLabel','PersonCard',
      'GarbledText','OrbitRing','BoldColorBg','SyncedWord','KineticWord',
      'MaskedReveal','InWorldText','FocusOrchestrator','FocusController','CursorAnnotationPill',
      'ContextualBgPulse','LightArcBg','WrappedLightArcBg',
      // React built-ins (PascalCase that show up)
      'Fragment','StrictMode','Suspense','Lottie','ThreeCanvas',
    ]);
    // Find JSX usages: <ComponentName or <ComponentName[space/>/]
    const usedComps = new Set<string>();
    const declared = new Set<string>();
    let cm: RegExpExecArray | null;
    const jsxRe = /<([A-Z][a-zA-Z0-9]+)[\s/>]/g;
    while ((cm = jsxRe.exec(_noStrCode)) !== null) usedComps.add(cm[1]);
    // Find already-defined in code: const/let/var/function Foo or class Foo
    const defRe = /(?:const|let|var|function|class)\s+([A-Z][a-zA-Z0-9]+)\b/g;
    while ((cm = defRe.exec(_noStrCode)) !== null) declared.add(cm[1]);
    const fallbacks: string[] = [];
    Array.from(usedComps).forEach((name) => {
      if (!KNOWN_COMPONENTS.has(name) && !declared.has(name)) {
        fallbacks.push(
          `const ${name} = ({children, ...p}) => React.createElement(React.Fragment, null, children ?? null);`
        );
      }
    });
    if (fallbacks.length > 0) processed = fallbacks.join('\n') + '\n' + processed;
  }

  // ── (C) Auto-fallback for undeclared camelCase functions ─────────────────
  // LLM invents helpers like `statStagger(i, n)`, `fadeDelay(i)`, etc.
  // Inject `const fn = (...args) => args[0] ?? 0;` for each unknown call.
  {
    const KNOWN_FUNCS = new Set([
      // JS reserved keywords that can appear before ( e.g. return(...), typeof(x), new Foo()
      // JS reserved keywords + short built-ins that can precede (
      'return','typeof','instanceof','delete','void','throw','new',
      'switch','case','default','break','continue','if','else',
      'for','while','do','try','catch','finally','async','await','yield',
      'import','export','from','class','extends','super','this',
      'true','false','null','undefined','in','of','let','var','const',
      'get','set','has','add','use','ref','key','ref','tag','run','log',
      // JS built-ins
      'parseInt','parseFloat','isNaN','isFinite','encodeURIComponent',
      'decodeURIComponent','setTimeout','clearTimeout','setInterval',
      'clearInterval','fetch','console','Boolean','Number','String',
      'Object','Array','JSON','Math','Date','Promise','Map','Set',
      // Common LLM-invented helpers that are actually valid patterns
      'interpolateColor','clamp','lerp','easeIn','easeOut','easeInOut',
      'hexToRgb','hexToRgba','rgbToHex','formatNumber','formatTime',
      'transition','transform','translate','rotate','scale','opacity',
      // Array methods commonly called as standalone
      'map','filter','reduce','forEach','find','findIndex','some','every',
      'flat','flatMap','includes','indexOf','join','slice','sort','splice',
      'push','pop','shift','unshift','reverse','keys','values','entries',
      // String methods
      'trim','split','replace','replaceAll','startsWith','endsWith','padStart',
      // Object methods
      'assign','keys','values','entries','freeze','create','fromEntries',
      // Math methods
      'min','max','abs','floor','ceil','round','sqrt','pow','log','sin','cos',
      // Remotion
      'spring','interpolate','random','staticFile',
      'useCurrentFrame','useVideoConfig',
      // React
      'useState','useEffect','useMemo','useCallback','useRef',
      'useContext','useReducer','createElement','cloneElement','memo',
      'forwardRef','createContext',
      // Scope hooks & functions (camelCase only)
      'useEntropy','useEntropyWithAttractor','useStagger','useCascadeTree',
      'useVitality','useMagnetic','useTrackedParallax','useCursorState',
      'useHumanizedCursor','useVelocityMomentum','useVelocityAudio',
      'usePreFocusCamera','useInteractionCycle',
      'useCursorPos','useMouseProximity','useInteractionFeedback',
      'useTyping','usePopup','useAccordion','useDragItem','useMorphEntrance',
      'useAudioSync','useBeat','useBeatClock','snapToDownbeat','usePathTraveler',
      'cubicBezier','getGlassCard','glowBloomStyle','safeInterpolate','hex',
      'linearTiming','springTiming','fade','slide','wipe','flip','clockWipe',
      'makeRect','makeCircle','makeTriangle','makeStar','makePolygon',
      'makeEllipse','makeHeart','makePie',
      // Additional JS built-ins
      'require','Symbol','WeakMap','WeakSet','Proxy','Reflect',
      'queueMicrotask','structuredClone','globalThis',
      // Additional Math methods (may appear after `const { sin, cos } = Math`)
      'atan','atan2','tan','asin','acos','exp','hypot','sign','trunc','cbrt',
    ]);
    const usedFns = new Set<string>();
    const declared = new Set<string>();
    let cm: RegExpExecArray | null;
    // Calls: someFunc( — camelCase, ≥3 chars; exclude method calls (obj.method) and partial words
    // \b ensures we match whole words only (no "uffix" from "suffix"); (?<!\.) excludes method calls
    const callRe = /(?<!\.)\b([a-z][a-zA-Z0-9]{2,})\s*\(/g;
    while ((cm = callRe.exec(_noStrCode)) !== null) usedFns.add(cm[1]);
    // Simple declarations: const/let/var/function name
    const defRe = /(?:const|let|var|function)\s+([a-z][a-zA-Z0-9]{2,})\b/g;
    while ((cm = defRe.exec(_noStrCode)) !== null) declared.add(cm[1]);
    // Array destructuring: const [a, setA, ...rest] = ...
    const arrDestructRe = /(?:const|let|var)\s*\[([^\]]+)\]/g;
    while ((cm = arrDestructRe.exec(_noStrCode)) !== null) {
      cm[1].split(',').forEach(n => {
        const t = n.trim().replace(/^\.\.\./, '').split(/\s*=\s*/)[0].trim();
        if (/^[a-z][a-zA-Z0-9]+$/.test(t)) declared.add(t);
      });
    }
    // Object destructuring: const { a, b: alias } = ...
    const objDestructRe = /(?:const|let|var)\s*\{([^}]+)\}/g;
    while ((cm = objDestructRe.exec(_noStrCode)) !== null) {
      cm[1].split(',').forEach(part => {
        const alias = part.trim().split(':').pop()?.trim().replace(/^\.\.\./, '') ?? '';
        if (/^[a-z][a-zA-Z0-9]+$/.test(alias)) declared.add(alias);
      });
    }
    // Named arrow function / callback params: (item, index) => or item =>
    // Catches .map((item, i) => ...) style — prevents false fallbacks for callback params
    const arrowParamRe = /\b([a-z][a-zA-Z0-9]{2,})\s*(?:,\s*[a-z]\w*)?\s*\)\s*=>/g;
    while ((cm = arrowParamRe.exec(_noStrCode)) !== null) declared.add(cm[1]);
    // Single-param arrow: item => expr
    const singleParamRe = /\b([a-z][a-zA-Z0-9]{2,})\s*=>/g;
    while ((cm = singleParamRe.exec(_noStrCode)) !== null) declared.add(cm[1]);
    const fallbacks: string[] = [];
    Array.from(usedFns).forEach((name) => {
      // Skip React state setters (set+Uppercase), event handlers (on+Uppercase),
      // and names already declared (including via destructuring)
      if (
        /^set[A-Z]/.test(name) ||
        /^on[A-Z]/.test(name) ||
        KNOWN_FUNCS.has(name) ||
        declared.has(name)
      ) return;
      fallbacks.push(`const ${name} = (...args) => args[0] ?? 0;`);
    });
    if (fallbacks.length > 0) processed = fallbacks.join('\n') + '\n' + processed;
  }

  // ── Duplicate top-level const detection ─────────────────────────────────
  // Hoisting passes (CURSOR_STEPS, SCENE_TIMELINE, timing consts) can introduce
  // duplicate declarations if the bracket-walk fails to extract the full decl.
  // Detect and warn — the second declaration will shadow the first at runtime.
  {
    const seen = new Map<string, number>();
    const dupRe = /(?:^|\n)\s*const\s+([A-Z][A-Z0-9_]{2,})\s*=/g;
    let m: RegExpExecArray | null;
    while ((m = dupRe.exec(processed)) !== null) {
      const name = m[1];
      const count = (seen.get(name) ?? 0) + 1;
      seen.set(name, count);
      if (count === 2) console.warn(`[postProcessCode] DUPLICATE CONST: ${name} declared twice — hoisting may have gone wrong`);
    }
  }

  // ── FINAL_SYNTAX_GUARD: dangling ternary after comment ───────────────────
  // LLM sometimes writes a comment between a ternary condition and its `?` operator:
  //   const avgGap = WORD_TIMINGS.length > 1
  //   // Calculate something here
  //     ? heavyStiffness
  //     : lightStiffness;
  // Babel parses the `?` as an Unexpected token because the comment line breaks the
  // expression context. Strip comment-only lines that sit between a non-terminated
  // expression (no trailing `;`, `{`, `(`, `[`, or `,`) and a bare `?` continuation.
  {
    const ternaryCommentRe = /([^;\n{\(\[,])\n((?:\s*\/\/[^\n]*\n)+)(\s*\?)/g;
    const repaired = processed.replace(ternaryCommentRe, (_, before, _comments, ternary) => {
      return `${before}\n${ternary}`;
    });
    if (repaired !== processed) {
      console.log('[postProcessCode] FINAL_SYNTAX_GUARD: stripped comment(s) between ternary condition and ?');
      processed = repaired;
    }
  }

  return processed;
}

export function compileCode(
  code: string,
  attachedImages: string[] = [],
  brand: Record<string, string> = {},
  voiceoverAudioUrl: string | null = null,
  wordTimings: Array<{ word: string; startFrame: number; endFrame: number }> = [],
  uiSchema: Record<string, unknown> | null = null,
  globalBg: string = "arcs",
  globalFrameOffset: number = 0,
  morphFrom: { x: number; y: number; w: number; h: number } | null = null,
  sfxUrls: Record<string, string> = {},
  voiceoverUrls: Record<string, string> = {},
  /** Camera state from the end of the previous scene — enables seamless zoom continuity.
   *  Pass the previous scene's ending zoom (typically 1.06) and pan offset in px.
   *  Use when FlowEdge.carryOver.camera === true between two scenes. */
  initialCameraState: { zoom: number; panX: number; panY: number } = { zoom: 1.0, panX: 0, panY: 0 },
  /** Stock video URL for background compositing (Fronter/Viable-style office footage). */
  stockVideoUrl: string | null = null,
  /** Persistent feature context header for Qanapi-style walkthroughs. */
  featureHeaderData: { label: string; badge?: string; icon?: string } | null = null,
  /** Background music URL — injected as MUSIC_URL so generated scenes can reference it for sync. */
  musicUrl: string | null = null,
  /** Brand logo image URL — injected as BRAND_LOGO scope variable. */
  brandLogoUrl: string | null = null,
  /** 1–2 headline words to render in accent color — injected as HIGHLIGHT_WORDS. */
  highlightWords: string[] = [],
  /** Director visual state carry-over string — injected as VISUAL_STATE. */
  visualState: string | null = null,
  /** Visual anchor object that transforms across scenes — injected as VISUAL_ANCHOR. */
  visualAnchor: { icon?: string; label?: string; colorFrom?: string; colorTo?: string } | null = null,
  /** Per-scene music mood — injected as MUSIC_MOOD. */
  musicMood: string = "energetic-precise",
  /** Structured skill composition (primary/secondary/modifiers) — injected as SKILL_COMPOSITION. */
  skillComposition: { primary: string; secondary?: string[]; modifiers?: string[] } | null = null,
  /** Pre-computed cursor steps from user-confirmed waypoints — injected as PIPELINE_CURSOR_STEPS. */
  pipelineCursorSteps: Array<{ x: number; y: number; time: number; label?: string; box?: object }> = [],
): CompilationResult {
  if (!code?.trim()) {
    return { Component: null, error: "No code provided" };
  }

  try {
    const componentBody = extractComponentBody(stripBrandDeclaration(postProcessCode(code)))
      .replace(/^\s*\)\);\s*$/gm, "");
    const wrappedSource = `const DynamicAnimation = () => {\n${componentBody}\n};`;

    const transpiled = Babel.transform(wrappedSource, {
      presets: ["react", "typescript"],
      filename: "dynamic-animation.tsx",
    });

    if (!transpiled.code) {
      return { Component: null, error: "Transpilation failed" };
    }

    // Safe interpolate: sanitizes both ranges before passing to Remotion.
    // Remotion throws synchronously inside checkInfiniteRange — sanitizing here
    // prevents the throw entirely rather than trying to catch it after.
    const safeInterpolate: typeof interpolate = (input, inputRange, outputRange, options?) => {
      // Guard null/undefined inputs
      if (!Array.isArray(inputRange) || !Array.isArray(outputRange)) return 0;
      if ((inputRange?.length ?? 0) < 2) return (outputRange?.[0] ?? 0) as number;

      // Coerce every outputRange value to a safe finite number.
      // typeof check + isFinite together handle strings, null, undefined, NaN, Infinity.
      const safeOut = (outputRange as unknown[]).map((v) =>
        typeof v === "number" && Number.isFinite(v) ? v : 0
      ) as number[];

      // Coerce inputRange the same way (Remotion also validates this array).
      const safeIn = inputRange.map((v) =>
        typeof v === "number" && Number.isFinite(v) ? v : 0
      );

      // Sort + dedupe if inputRange is non-monotonic.
      const pairs = safeIn.map((f, i) => [f, (typeof safeOut[i] === "number" && Number.isFinite(safeOut[i])) ? safeOut[i] : (safeOut[safeOut.length - 1] ?? 0)] as [number, number]);
      pairs.sort((a, b) => a[0] - b[0]);
      const deduped = pairs.filter((p, i) => i === 0 || p[0] > pairs[i - 1][0]);
      if (deduped.length < 2) return (safeOut[0] ?? 0) as number;

      try {
        return interpolate(
          input,
          deduped.map((p) => p[0]),
          deduped.map((p) => p[1]),
          options as any,
        );
      } catch {
        return (safeOut[safeOut.length - 1] ?? 0) as number;
      }
    };

    const deriveAudioSpringConfig = (timings: Array<{ word: string; startFrame: number; endFrame: number }>) => {
      if (!Array.isArray(timings) || timings.length < 2) {
        return { stiffness: 140, damping: 18 };
      }
      const gaps: number[] = [];
      for (let i = 1; i < timings.length; i++) {
        const prev = timings[i - 1]?.startFrame;
        const next = timings[i]?.startFrame;
        if (typeof prev === "number" && typeof next === "number" && Number.isFinite(prev) && Number.isFinite(next)) {
          gaps.push(Math.max(1, next - prev));
        }
      }
      const avgGap = gaps.length > 0 ? gaps.reduce((sum, g) => sum + g, 0) / gaps.length : 20;
      if (avgGap <= 8) return { stiffness: 220, damping: 14 };
      if (avgGap <= 14) return { stiffness: 190, damping: 16 };
      if (avgGap <= 24) return { stiffness: 160, damping: 18 };
      return { stiffness: 130, damping: 20 };
    };

    const safeSpring: typeof spring = ((options: Parameters<typeof spring>[0]) => {
      const fallback = deriveAudioSpringConfig(wordTimings);
      const input = (options ?? {}) as Record<string, unknown>;
      const config = (typeof input.config === "object" && input.config !== null)
        ? (input.config as Record<string, unknown>)
        : {};
      const stiffness = typeof config.stiffness === "number" && Number.isFinite(config.stiffness) && config.stiffness > 0
        ? config.stiffness
        : fallback.stiffness;
      const damping = typeof config.damping === "number" && Number.isFinite(config.damping) && config.damping > 0
        ? config.damping
        : fallback.damping;
      return spring({
        ...(options as Parameters<typeof spring>[0]),
        config: {
          ...config,
          stiffness,
          damping,
        },
      } as Parameters<typeof spring>[0]);
    }) as typeof spring;

    const Remotion = {
      AbsoluteFill,
      interpolate: safeInterpolate,
      useCurrentFrame,
      useVideoConfig,
      spring: safeSpring,
      Sequence,
      Img,
    };

    const derivedAudioSpring = deriveAudioSpringConfig(wordTimings);
    const wrappedCode = `const AUDIO_STIFFNESS = ${JSON.stringify(derivedAudioSpring.stiffness)};
const AUDIO_DAMPING = ${JSON.stringify(derivedAudioSpring.damping)};
${transpiled.code}
return DynamicAnimation;`;

    // Wrap background components to automatically include globalFrameOffset
    const WrappedLightArcBg = (props: any) =>
      React.createElement(LightArcBg, { ...props, globalFrameOffset });
    const WrappedMeshGradientBg = (props: any) =>
      React.createElement(MeshGradientBg, { ...props, globalFrameOffset });

    const createComponent = new Function(
      "React",
      "Remotion",
      "RemotionShapes",
      "Lottie",
      "ThreeCanvas",
      "THREE",
      "AbsoluteFill",
      "interpolate",
      "interpolateColor",
      "useCurrentFrame",
      "useVideoConfig",
      "spring",
      "Sequence",
      "Img",
      "Audio",
      "hex",
      "getGlassCard",
      "ParallaxLayer",
      "SheenOverlay",
      "MotionBlurWhip",
      "SPRING_CONFIGS",
      "EASINGS",
      "useState",
      "useEffect",
      "useMemo",
      "useCallback",
      "useContext",
      "useReducer",
      "useRef",
      "Rect",
      "Circle",
      "Triangle",
      "Star",
      "Polygon",
      "Ellipse",
      "Heart",
      "Pie",
      "makeRect",
      "makeCircle",
      "makeTriangle",
      "makeStar",
      "makePolygon",
      "makeEllipse",
      "makeHeart",
      "makePie",
      // Transitions
      "TransitionSeries",
      "linearTiming",
      "springTiming",
      "fade",
      "slide",
      "wipe",
      "flip",
      "clockWipe",
      // Behavioral hooks — entropy, magnetic tilt, cursor state, attractor, cascade
      "useEntropy",
      "useEntropyWithAttractor",
      "useStagger",
      "useCascadeTree",
      "useVitality",
      "useMagnetic",
      "useTrackedParallax",
      "SAFE_ZONES",
      "TiltWrapper",
      "CURSOR_STATE_DEFAULT",
      "useCursorState",
      "useHumanizedCursor",
      "useVelocityMomentum",
      "useVelocityAudio",
      "UITransition",
      "usePreFocusCamera",
      "useInteractionCycle",
      "PACING_PROFILE",
      "SyncedWord",
      // GAP 1: Spatial proximity (cursor magnetism)
      "useCursorPos",
      "useMouseProximity",
      // GAP 2: Kinetic typography — letter-spacing + masked baseline reveal + in-world text
      "KineticWord",
      "MaskedReveal",
      "InWorldText",
      // GAP 4: Auto depth-blur on popup/panel events
      "FocusOrchestrator",
      // Timeline Engine: centralized background dim + blur + camera zoom on a target
      "FocusController",
      // GAP 5: Ambient cursor annotation pills
      "CursorAnnotationPill",
      // Interaction feedback + contextual bg
      "useInteractionFeedback",
      "ContextualBgPulse",
      // Chameleon overlay hooks + components
      "useTyping",
      "usePopup",
      "useAccordion",
      "useDragItem",
      "ChameleonInput",
      "ChameleonHighlight",
      "DropdownMenu",
      "CinematicCamera",
      "SteppedCamera",
      "MacroCamera",
      "SelectiveFocus",
      "NarrationReveal",
      "FeatureContextBar",
      "NotificationCard",
      "usePathTraveler",
      "PaperPlane",
      "InAppChatPanel",
      "ConcentricRings",
      "ICON_PATHS",
      "DrawOnIcon",
      "FEATURE_HEADER",
      "OffthreadVideo",
      "STOCK_VIDEO_URL",
      "TaskDetailPanel",
      "ModalOverlay",
      "InputField",
      "ChatBubble",
      "SidebarNav",
      "AppShell",
      "HeroSplit",
      "cubicBezier",
      "LightArcBg",
      "AnimatedConnectionLine",
      "DynamicConnectorLine",
      "useMorphEntrance",
      "MORPH_FROM",
      "SFX_URLS",
      "VideoPlateMockup",
      "GLOBAL_STYLE",
      "FilmGrain",
      "ContextualSectionHeader",
      "SfxSequencer",
      "AnimatedSidebar",
      "AnimatedMetricCards",
      "AnimatedTable",
      "AnimatedChart",
      "AnimatedForm",
      "ReconstructedAppShell",
      "AbstractSkeletonUI",
      "ChunkCard",
      "SkeletonTextBlock",
      "AnimatedTopbar",
      "SectionTitle",
      "NotificationToast",
      "StatusBadge",
      "TableActionButton",
      "PersistentSectionLabel",
      "FloatingShapes",
      "AmbientEnvironment",
      "DepthStack",
      "AnimatedHighlighter",
      "ContentCard",
      // WhatAStory mandatory primitives — hand cursor + entropy dust
      "HAND_CURSOR",
      "EntropyDust",
      "ENTROPY_DUST_PARTICLES",
      "GLOBAL_BG",
      "ATTACHED_IMAGES",
      "BRAND",
      "DETECTED_ELEMENTS",
      "DETECTED_SECTIONS",
      "VOICEOVER_AUDIO_URL",
      "VOICEOVER_URLS",
      "WORD_TIMINGS",
      "UI_SCHEMA",
      // Phase 3: audio sync hooks + beat choreography
      "useAudioSync",
      "useBeat",
      "useBeatClock",
      "snapToDownbeat",
      "MUSIC_BPM",
      // Phase 2: mesh gradient background + cinematic motion blur
      "MeshGradientBg",
      "CameraMotionBlur",
      // Phase 2: deterministic random (Remotion built-in)
      "random",
      // Cinematic effects — Tier 1
      "ChromaticAberration",
      "GlowBloom",
      "glowBloomStyle",
      "DepthBlur",
      // Level 2 premium camera + cognitive masking
      "ActionCamera",
      "SpotlightCutout",
      "GhostHighlight",
      "GLOBAL_FRAME_OFFSET",
      // Camera continuity — initial state from previous scene for seamless stitching
      "INITIAL_CAMERA_ZOOM",
      "INITIAL_CAMERA_PAN",
      // Phase 1: new scope components
      "HandwrittenLabel",
      "PersonCard",
      "STOCK_AVATARS",
      "GarbledText",
      "OrbitRing",
      "BoldColorBg",
      // New scope variables — continuity, branding, composition
      "VISUAL_STATE",
      "SKILL_COMPOSITION",
      "BRAND_LOGO",
      "HIGHLIGHT_WORDS",
      "VISUAL_ANCHOR",
      "MUSIC_MOOD",
      "PIPELINE_CURSOR_STEPS",
      "MUSIC_URL",
      wrappedCode,
    );

    // Provide safe defaults for variables the LLM might assume are globally available
    // because they were mentioned in the prompt, but failed to explicitly declare.
    const DETECTED_ELEMENTS = [{ label: "mock_element", x: 0.5, y: 0.5 }];
    const DETECTED_SECTIONS = ["mock_section"];
    const ATTACHED_IMAGES = attachedImages;
    const BRAND = brand;
    const VOICEOVER_AUDIO_URL = voiceoverAudioUrl ?? null;
    const VOICEOVER_URLS = voiceoverUrls;
    const WORD_TIMINGS = wordTimings;
    const UI_SCHEMA = uiSchema ?? null;
    const GLOBAL_BG = globalBg ?? "arcs";
    const MUSIC_BPM: number = TRACK_BPM[brand.musicStyle as string] ?? 90;
    const MORPH_FROM = morphFrom ?? null;
    const SFX_URLS = sfxUrls ?? {};
    const INITIAL_CAMERA_ZOOM = initialCameraState.zoom;
    const INITIAL_CAMERA_PAN = { x: initialCameraState.panX, y: initialCameraState.panY };
    const STOCK_VIDEO_URL = stockVideoUrl;
    const FEATURE_HEADER = featureHeaderData;
    // New scope variables
    const MUSIC_URL = musicUrl ?? null;
    const BRAND_LOGO = brandLogoUrl ?? null;
    const HIGHLIGHT_WORDS = highlightWords ?? [];
    // VISUAL_STATE: try to parse as JSON object (for future structured continuity),
    // fall back to the raw string — optional chaining in generated code handles either.
    const VISUAL_STATE: unknown = (() => {
      if (!visualState) return null;
      try { return JSON.parse(visualState); } catch { return visualState; }
    })();
    const VISUAL_ANCHOR = visualAnchor ?? null;
    const MUSIC_MOOD = musicMood ?? "energetic-precise";
    const SKILL_COMPOSITION = skillComposition ?? null;
    const PIPELINE_CURSOR_STEPS = pipelineCursorSteps ?? [];

    const Component = createComponent(
      React,
      Remotion,
      RemotionShapes,
      Lottie,
      ThreeCanvas,
      THREE,
      AbsoluteFill,
      safeInterpolate,
      interpolateColor,
      useCurrentFrame,
      useVideoConfig,
      safeSpring,
      Sequence,
      Img,
      Audio,
      hex,
      getGlassCard,
      ParallaxLayer,
      SheenOverlay,
      MotionBlurWhip,
      SPRING_CONFIGS,
      EASINGS,
      useState,
      useEffect,
      useMemo,
      useCallback,
      useContext,
      useReducer,
      useRef,
      RemotionShapes.Rect,
      RemotionShapes.Circle,
      RemotionShapes.Triangle,
      RemotionShapes.Star,
      RemotionShapes.Polygon,
      RemotionShapes.Ellipse,
      RemotionShapes.Heart,
      RemotionShapes.Pie,
      RemotionShapes.makeRect,
      RemotionShapes.makeCircle,
      RemotionShapes.makeTriangle,
      RemotionShapes.makeStar,
      RemotionShapes.makePolygon,
      RemotionShapes.makeEllipse,
      RemotionShapes.makeHeart,
      RemotionShapes.makePie,
      // Transitions
      TransitionSeries,
      linearTiming,
      springTiming,
      fade,
      slide,
      wipe,
      flip,
      clockWipe,
      // Behavioral hooks — entropy, magnetic tilt, cursor state, attractor, cascade
      useEntropy,
      useEntropyWithAttractor,
      useStagger,
      useCascadeTree,
      useVitality,
      useMagnetic,
      useTrackedParallax,
      SAFE_ZONES,
      TiltWrapper,
      CURSOR_STATE_DEFAULT,
      useCursorState,
      useHumanizedCursor,
      useVelocityMomentum,
      useVelocityAudio,
      UITransition,
      usePreFocusCamera,
      useInteractionCycle,
      { ...PACING_PROFILE, beatFrames: Math.round(30 * 60 / MUSIC_BPM), barFrames: Math.round(30 * 60 / MUSIC_BPM) * 4 },
      SyncedWord,
      // GAP 1: Spatial proximity (cursor magnetism)
      useCursorPos,
      useMouseProximity,
      // GAP 2: Kinetic typography — letter-spacing + masked baseline reveal + in-world text
      KineticWord,
      MaskedReveal,
      InWorldText,
      // GAP 4: Auto depth-blur on popup/panel events
      FocusOrchestrator,
      // Timeline Engine: centralized background dim + blur + camera zoom on a target
      FocusController,
      // GAP 5: Ambient cursor annotation pills
      CursorAnnotationPill,
      // Interaction feedback + contextual bg
      useInteractionFeedback,
      ContextualBgPulse,
      // Chameleon overlay hooks + components
      useTyping,
      usePopup,
      useAccordion,
      useDragItem,
      ChameleonInput,
      ChameleonHighlight,
      DropdownMenu,
      CinematicCamera,
      SteppedCamera,
      MacroCamera,
      SelectiveFocus,
      NarrationReveal,
      FeatureContextBar,
      NotificationCard,
      usePathTraveler,
      PaperPlane,
      InAppChatPanel,
      ConcentricRings,
      ICON_PATHS,
      DrawOnIcon,
      FEATURE_HEADER,
      OffthreadVideo,
      STOCK_VIDEO_URL,
      TaskDetailPanel,
      ModalOverlay,
      InputField,
      ChatBubble,
      SidebarNav,
      AppShell,
      HeroSplit,
      cubicBezier,
      WrappedLightArcBg,
      AnimatedConnectionLine,
      DynamicConnectorLine,
      useMorphEntrance,
      MORPH_FROM,
      SFX_URLS,
      VideoPlateMockup,
      GLOBAL_STYLE,
      FilmGrain,
      ContextualSectionHeader,
      SfxSequencer,
      AnimatedSidebar,
      AnimatedMetricCards,
      AnimatedTable,
      AnimatedChart,
      AnimatedForm,
      ReconstructedAppShell,
      AbstractSkeletonUI,
      ChunkCard,
      SkeletonTextBlock,
      AnimatedTopbar,
      SectionTitle,
      NotificationToast,
      StatusBadge,
      TableActionButton,
      PersistentSectionLabel,
      FloatingShapes,
      AmbientEnvironment,
      DepthStack,
      AnimatedHighlighter,
      ContentCard,
      // WhatAStory mandatory primitives — hand cursor + entropy dust
      HAND_CURSOR,
      EntropyDust,
      ENTROPY_DUST_PARTICLES,
      GLOBAL_BG,
      ATTACHED_IMAGES,
      BRAND,
      DETECTED_ELEMENTS,
      DETECTED_SECTIONS,
      VOICEOVER_AUDIO_URL,
      VOICEOVER_URLS,
      WORD_TIMINGS,
      UI_SCHEMA,
      useAudioSync,
      useBeat,
      useBeatClock,
      snapToDownbeat,
      MUSIC_BPM,
      WrappedMeshGradientBg,
      CameraMotionBlur,
      random,
      // Cinematic effects — Tier 1
      ChromaticAberration,
      GlowBloom,
      glowBloomStyle,
      DepthBlur,
      // Level 2 premium camera + cognitive masking
      ActionCamera,
      SpotlightCutout,
      GhostHighlight,
      globalFrameOffset,
      // Camera continuity — initial state from previous scene for seamless stitching
      INITIAL_CAMERA_ZOOM,
      INITIAL_CAMERA_PAN,
      // Phase 1: new scope components
      HandwrittenLabel,
      PersonCard,
      STOCK_AVATARS,
      GarbledText,
      OrbitRing,
      BoldColorBg,
      // New scope variables — must match new Function param names above
      VISUAL_STATE,
      SKILL_COMPOSITION,
      BRAND_LOGO,
      HIGHLIGHT_WORDS,
      VISUAL_ANCHOR,
      MUSIC_MOOD,
      PIPELINE_CURSOR_STEPS,
      MUSIC_URL,
    );


    if (typeof Component !== "function") {
      return {
        Component: null,
        error: "Code must be a function that returns a React component",
      };
    }

    return { Component, error: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown compilation error";
    return {
      Component: null,
      error: errorMessage,
      compilationError: parseCompilerError(errorMessage, code),
    };
  }
}
