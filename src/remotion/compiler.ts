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
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ---------------------------------------------------------------------------
// Pre-built style constants — injected into every generated component's scope
// so the LLM can reference them directly without re-declaring.
// ---------------------------------------------------------------------------

const getGlassCard = (brand?: any) => {
  const isLight = brand?.style === "light";
  return {
    background: isLight ? "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)" : "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: isLight ? "1px solid rgba(255,255,255,0.7)" : "1px solid rgba(255,255,255,0.10)",
    borderTop: isLight ? "1px solid rgba(255,255,255,0.95)" : "1px solid rgba(255,255,255,0.22)",
    borderLeft: isLight ? "1px solid rgba(255,255,255,0.8)" : "1px solid rgba(255,255,255,0.16)",
    borderRadius: 20,
    boxShadow: isLight
      ? "0 8px 32px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.04) inset"
      : "0 12px 40px rgba(0,0,0,0.45), 0 1px 1px rgba(255,255,255,0.18) inset, 0 -1px 0 rgba(0,0,0,0.3) inset",
  };
};

// Phase 2: Pro-standard spring configs
// damping:200 = crisp inertial settle (no overshoot) — cinema/agency standard
// damping:8   = elastic pop — only for playful/bouncy elements
const SPRING_CONFIGS = {
  entrance: { damping: 200, stiffness: 120 },   // crisp UI reveal — cards, panels, overlays
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

/** Returns a 0–1 beat pulse value synced to a given BPM, peaking on each beat. */
function useBeat(bpm: number = 120, offset: number = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatProgress = ((frame + offset) / fps * (bpm / 60)) % 1;
  // Sharp attack, slow decay — mimics a sidechain compressor
  return beatProgress < 0.15 ? beatProgress / 0.15 : Math.pow(1 - (beatProgress - 0.15) / 0.85, 2);
}

// ---------------------------------------------------------------------------
// Phase 2: MeshGradientBg — animated multi-radial mesh gradient background
// ---------------------------------------------------------------------------

/** Hardware-friendly animated mesh gradient using layered CSS radial-gradients.
 *  Provide 4 hex/rgba colors; if omitted, falls back to brand primary/secondary tones. */
const MeshGradientBg = ({ colors, animate = true, speed = 1, children }: {
  colors?: [string, string, string, string];
  animate?: boolean;
  speed?: number;
  children?: React.ReactNode;
}) => {
  const frame = useCurrentFrame();
  const t = animate ? frame * 0.004 * speed : 0;
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
  x: number; y: number; w: number; items: string[];
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
    }, item)),
  );
};

/** Slow push-in zoom + 3D perspective tilt tracking cursor target. */
const CinematicCamera = ({ targetX = 0.5, targetY = 0.5, zoomTo = 1.12, children }: {
  targetX?: number; targetY?: number; zoomTo?: number; children: React.ReactNode;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const easeInOut = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const zoom = interpolate(frame, [0, 90], [1, zoomTo], { extrapolateRight: "clamp", easing: easeInOut });
  const tiltX = interpolate(frame, [0, 150], [0, 2], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  const tiltY = interpolate(frame, [0, 150], [0, -1.5], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  const panX = (0.5 - targetX) * width * (zoom - 1);
  const panY = (0.5 - targetY) * height * (zoom - 1);
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

/** Glass panel slides in from the right. */
const TaskDetailPanel = ({ openFrame, title, fields, brand }: {
  openFrame: number; title: string; fields: { label: string; value: string }[]; brand: BrandLike;
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
      background: "rgba(255,255,255,0.08)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      borderLeft: `1px solid ${brand.border}`, boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
      opacity, transform: `translateX(${slideX}px)`, padding: "32px 24px", zIndex: 30,
    }
  },
    React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: brand.text, marginBottom: 24, fontFamily: brand.font ?? "Inter" } }, title),
    ...fields.map((f, i) => React.createElement("div", { key: i, style: { marginBottom: 16 } },
      React.createElement("div", { style: { fontSize: 11, color: brand.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 4, fontFamily: brand.font ?? "Inter" } }, f.label),
      React.createElement("div", { style: { fontSize: 14, color: brand.text, fontFamily: brand.font ?? "Inter" } }, f.value),
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
        background: "rgba(255,255,255,0.09)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: `1px solid ${brand.border}`, borderRadius: 20,
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
      width: 220, height: "100%", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
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
const AppShell = ({ sidebar, topbar, children, brand, zoom = 1 }: {
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
  children?: React.ReactNode;
  brand: BrandLike;
  zoom?: number;
}) => {
  const { width, height } = useVideoConfig();
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
        height: 52, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${brand.border}`, display: "flex", alignItems: "center",
        padding: "0 20px", flexShrink: 0, zIndex: 5,
      }
    }, topbar),
    React.createElement("div", { style: { display: "flex", flex: 1, overflow: "hidden" } },
      sidebar,
      React.createElement("div", { style: { flex: 1, overflow: "hidden", position: "relative" } }, children),
    ),
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
  controlOffset = 0.15,
): { x: number; y: number } => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Control point perpendicular to movement vector
  const cx = (from.x + to.x) / 2 + dy * controlOffset;
  const cy = (from.y + to.y) / 2 - dx * controlOffset;
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
const LightArcBg = ({ brand }: { brand?: any }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const bgColor = brand?.bg || "#f8f9fc";
  const primary = brand?.primary || "#6366f1";
  const secondary = brand?.secondary || "#ec4899";

  const ARC_COUNT = 8;
  const ORIGIN_X = width * 0.3;
  const ORIGIN_Y = height * 0.6;

  const arcs = Array.from({ length: ARC_COUNT }, (_, i) => ({
    radius: 180 + i * 130,
    opacity: Math.max(0, 0.04 - i * 0.003),
    dashArray: `${55 + i * 18} ${180 + i * 36}`,
    dashOffset: i * 40,
  }));

  const rotation = frame * 0.05;

  return React.createElement("div", { style: { position: "absolute", inset: 0, background: bgColor } },
    // Corner gradient blobs
    React.createElement("div", {
      style: {
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at 0% 100%, ${primary}12 0%, transparent 50%), radial-gradient(ellipse at 100% 0%, ${secondary}0e 0%, transparent 45%), radial-gradient(ellipse at 100% 100%, ${primary}0b 0%, transparent 40%)`,
      },
    }),
    // Animated concentric arc lines
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
// GLOBAL_STYLE — visual consistency constants across all scenes
// ---------------------------------------------------------------------------

const GLOBAL_STYLE = {
  contentPadding: 80,
  cardRadius: 20,
  headlineSize: 88,
  shadowScale: "medium" as const,
  shadowMedium: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.04)",
  shadowHigh: "0 4px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.08), 0 32px 64px rgba(0,0,0,0.06)",
  shadowLow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)",
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

const SFX_MAP: Record<string, string> = {
  click:   "https://cdn.pixabay.com/audio/2022/03/15/audio_8e4dcdc8a0.mp3",
  whoosh:  "https://cdn.pixabay.com/audio/2022/09/01/audio_d1c8f71ac7.mp3",
  pop:     "https://cdn.pixabay.com/audio/2023/06/14/audio_5a7d7b7b7e.mp3",
  type:    "https://cdn.pixabay.com/audio/2022/11/17/audio_febc508520.mp3",
  success: "https://cdn.pixabay.com/audio/2023/03/17/audio_c1ab6d7a3e.mp3",
  swoosh:  "https://cdn.pixabay.com/audio/2022/10/30/audio_27a9c0d733.mp3",
};

const SfxSequencer = ({ events }: { events: Array<{ frame: number; sfx?: string }> }) => {
  const sfxEvents = events.filter((e) => e.sfx && SFX_MAP[e.sfx]);
  if (sfxEvents.length === 0) return null;
  return React.createElement(React.Fragment, null,
    ...sfxEvents.map((e, i) =>
      React.createElement(
        Sequence as any,
        { key: i, from: e.frame, durationInFrames: 30 },
        React.createElement(Audio, { src: SFX_MAP[e.sfx!], volume: 0.35 }),
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
// AnimatedTable — header + staggered row reveal
// ---------------------------------------------------------------------------

const AnimatedTable = ({ columns, rows, brand, startFrame = 0 }: {
  columns: Array<{ label: string; width: "narrow" | "medium" | "wide" }>;
  rows: Array<{ cells: string[]; isHighlighted?: boolean }>;
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
        ...row.cells.map((cell, j) => React.createElement("div", {
          key: j,
          style: {
            flex: columns[j]?.width === "wide" ? 3 : columns[j]?.width === "medium" ? 2 : 1,
            fontSize: 14, fontWeight: 400, color: brand.text || "#0f172a",
            fontFamily: brand.font || "Inter",
          },
        }, cell)),
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
    hasSidebar && React.createElement(AnimatedSidebar, {
      appName: uiSchema.layout.sidebar.appName,
      items: uiSchema.layout.sidebar.items,
      brand,
      startFrame: 0,
    }),
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

  // Extract body from "export const MyAnimation = () => { ... };"
  const match = cleaned.match(
    /^([\s\S]*?)export\s+const\s+\w+\s*=\s*\(\s*\)\s*=>\s*\{([\s\S]*)\};?\s*$/,
  );

  if (match) {
    const helpers = match[1].trim();
    const body = match[2].trim();
    return helpers ? `${helpers}\n\n${body}` : body;
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

export function compileCode(
  code: string,
  attachedImages: string[] = [],
  brand: Record<string, string> = {},
  voiceoverAudioUrl: string | null = null,
  wordTimings: Array<{ word: string; startFrame: number; endFrame: number }> = [],
  uiSchema: Record<string, unknown> | null = null,
): CompilationResult {
  if (!code?.trim()) {
    return { Component: null, error: "No code provided" };
  }

  try {
    const componentBody = extractComponentBody(stripBrandDeclaration(code));
    const wrappedSource = `const DynamicAnimation = () => {\n${componentBody}\n};`;

    const transpiled = Babel.transform(wrappedSource, {
      presets: ["react", "typescript"],
      filename: "dynamic-animation.tsx",
    });

    if (!transpiled.code) {
      return { Component: null, error: "Transpilation failed" };
    }

    const Remotion = {
      AbsoluteFill,
      interpolate,
      useCurrentFrame,
      useVideoConfig,
      spring,
      Sequence,
      Img,
    };

    const wrappedCode = `${transpiled.code}\nreturn DynamicAnimation;`;

    const createComponent = new Function(
      "React",
      "Remotion",
      "RemotionShapes",
      "Lottie",
      "ThreeCanvas",
      "THREE",
      "AbsoluteFill",
      "interpolate",
      "useCurrentFrame",
      "useVideoConfig",
      "spring",
      "Sequence",
      "Img",
      "Audio",
      "getGlassCard",
      "ParallaxLayer",
      "SheenOverlay",
      "MotionBlurWhip",
      "SPRING_CONFIGS",
      "EASINGS",
      "useState",
      "useEffect",
      "useMemo",
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
      // Chameleon overlay hooks + components
      "useTyping",
      "usePopup",
      "useAccordion",
      "useDragItem",
      "ChameleonInput",
      "ChameleonHighlight",
      "DropdownMenu",
      "CinematicCamera",
      "TaskDetailPanel",
      "ModalOverlay",
      "InputField",
      "ChatBubble",
      "SidebarNav",
      "AppShell",
      "cubicBezier",
      "LightArcBg",
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
      "ATTACHED_IMAGES",
      "BRAND",
      "DETECTED_ELEMENTS",
      "DETECTED_SECTIONS",
      "VOICEOVER_AUDIO_URL",
      "WORD_TIMINGS",
      "UI_SCHEMA",
      // Phase 3: audio sync hooks
      "useAudioSync",
      "useBeat",
      // Phase 2: mesh gradient background + cinematic motion blur
      "MeshGradientBg",
      "CameraMotionBlur",
      // Phase 2: deterministic random (Remotion built-in)
      "random",
      wrappedCode,
    );

    // Provide safe defaults for variables the LLM might assume are globally available
    // because they were mentioned in the prompt, but failed to explicitly declare.
    const DETECTED_ELEMENTS = [{ label: "mock_element", x: 0.5, y: 0.5 }];
    const DETECTED_SECTIONS = ["mock_section"];
    const ATTACHED_IMAGES = attachedImages;
    const BRAND = brand;
    const VOICEOVER_AUDIO_URL = voiceoverAudioUrl ?? null;
    const WORD_TIMINGS = wordTimings;
    const UI_SCHEMA = uiSchema ?? null;

    const Component = createComponent(
      React,
      Remotion,
      RemotionShapes,
      Lottie,
      ThreeCanvas,
      THREE,
      AbsoluteFill,
      interpolate,
      useCurrentFrame,
      useVideoConfig,
      spring,
      Sequence,
      Img,
      Audio,
      getGlassCard,
      ParallaxLayer,
      SheenOverlay,
      MotionBlurWhip,
      SPRING_CONFIGS,
      EASINGS,
      useState,
      useEffect,
      useMemo,
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
      // Chameleon overlay hooks + components
      useTyping,
      usePopup,
      useAccordion,
      useDragItem,
      ChameleonInput,
      ChameleonHighlight,
      DropdownMenu,
      CinematicCamera,
      TaskDetailPanel,
      ModalOverlay,
      InputField,
      ChatBubble,
      SidebarNav,
      AppShell,
      cubicBezier,
      LightArcBg,
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
      ATTACHED_IMAGES,
      BRAND,
      DETECTED_ELEMENTS,
      DETECTED_SECTIONS,
      VOICEOVER_AUDIO_URL,
      WORD_TIMINGS,
      UI_SCHEMA,
      useAudioSync,
      useBeat,
      MeshGradientBg,
      CameraMotionBlur,
      random,
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
