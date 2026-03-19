---
title: Premium Ink / Blob Logo Reveal
impact: HIGH
impactDescription: brand logo that forms from an organic paint-blob shape — the blob appears first, morphs into the brand icon via border-radius animation, then the wordmark slides in beside it; cinematic brand moment
tags: logo, brand, reveal, ink, blob, morph, brand-reveal, logo-reveal, paint, cinematic, intro
---

## Ink Logo Reveal Pattern

The brand mark "forms" out of an ink drop or paint blob. The blob starts soft and rounded, then transitions through border-radius morphing and scale to become the brand icon shape. The wordmark text springs in beside it after the icon settles. JustCall uses this to bridge their problem scene (just the blob) into the solution reveal (full logo).

---

## Core Animation Phases

| Phase | Frames | What Happens |
|---|---|---|
| **Blob** | 0–20 | Soft round blob appears via scale spring, slightly shifts position |
| **Morph** | 20–50 | `border-radius` morphs from round → brand icon shape; `clip-path` tightens |
| **Wordmark** | 40–70 | Brand name springs in from the right of the icon |
| **Hold** | 70+ | Settled logo; slight continuous breathing scale (1.0→1.01→1.0) |

---

## Full Component

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

export const InkLogoReveal = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Phase 1: blob appears
  const blobProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
    durationInFrames: 30,
  });

  // Phase 2: morph into icon shape (linear interpolate, NOT spring — we want controlled timing)
  const MORPH_START = 20;
  const MORPH_DUR   = 30;
  const morphProgress = interpolate(
    frame,
    [MORPH_START, MORPH_START + MORPH_DUR],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Phase 3: wordmark entrance
  const WORD_START = 40;
  const wordProgress = spring({
    frame: frame - WORD_START,
    fps,
    config: { damping: 20, stiffness: 140 },
    durationInFrames: 22,
  });

  // Blob: starts very round (50% = circle), morphs to brand-icon shape
  // For a rounded-square brand icon: morph to ~28% border-radius
  // For a leaf/phone shape: morph to "55% 45% 55% 45% / 55% 45% 55% 45%"
  // Adjust the target border-radius to match your brand icon silhouette
  const blobBorderRadius = interpolate(morphProgress, [0, 1], [50, 30]); // % → square-ish

  // Blob color: starts as brand primary, stays as brand primary (the icon IS the blob)
  const blobScale  = interpolate(blobProgress, [0, 1], [0.4, 1]);
  const blobOpacity = interpolate(blobProgress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

  // Icon size — the blob IS the brand icon
  const ICON_SIZE = Math.min(width, height) * 0.10; // 10% of shortest dimension

  // Wordmark slide + fade
  const wordX      = interpolate(wordProgress, [0, 1], [20, 0]);
  const wordOpacity = interpolate(wordProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Breathing (very subtle continuous scale after settle)
  const breathe = frame > 70
    ? 1 + Math.sin((frame - 70) / 40) * 0.008
    : 1;

  // Layout: icon + wordmark centered
  const centerX = width  / 2;
  const centerY = height / 2;

  return (
    <AbsoluteFill>
      {/* Combined logo lockup: icon + wordmark */}
      <div style={{
        position: "absolute",
        left:      centerX,
        top:       centerY,
        transform: `translate(-50%, -50%) scale(${breathe})`,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        {/* Brand icon — the ink blob that morphs */}
        <div style={{
          width:  ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: `${blobBorderRadius}%`,
          background: BRAND.primary || "#2dd4bf",
          transform: `scale(${blobScale})`,
          opacity: blobOpacity,
          transformOrigin: "center center",
          // Optional: add a small white inner mark to indicate the icon's detail
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
          {/* Inner icon detail — replace with brand-specific SVG */}
          <div style={{
            width:  ICON_SIZE * 0.45,
            height: ICON_SIZE * 0.45,
            borderRadius: "50% 50% 50% 0",
            background: "rgba(0,0,0,0.25)",
            transform: "rotate(-45deg)",
          }} />
        </div>

        {/* Wordmark */}
        <div style={{
          opacity:   wordOpacity,
          transform: `translateX(${wordX}px)`,
          fontSize:  ICON_SIZE * 0.65,
          fontWeight: 800,
          color: "#1e2846",
          fontFamily: "Inter, sans-serif",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}>
          {BRAND.name || "Brand"}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

---

## Morphing Border-Radius Reference

The blob-to-icon transition is controlled by the `border-radius` values at `morphProgress = 1`. Common brand icon shapes:

| Shape | CSS border-radius at end |
|---|---|
| Circle (pill) | `"50%"` — stays circular |
| Rounded square | `"24%"` |
| Leaf / droplet | `"72% 28% 72% 28% / 28% 72% 28% 72%"` |
| Shield | `"50% 50% 20% 20%"` |
| Squircle | `"35%"` |

Apply via interpolating from the initial `50%` to your target value. For multi-value border-radius, switch from numeric interpolation to a direct `morphProgress > 0.5 ? targetShape : "50%"` snap at the midpoint.

---

## Two-Stage Reveal (Blob First, Then Logo)

For scenes where the blob appears alone first (like JustCall's problem scene), then the full logo reveals:

```tsx
// Stage 1: blob alone — problem_1 style
// Stage 2: full logo — problem_2 style
// Controlled by an overall scene timer

const STAGE_1_END   = 60; // hold the blob for 2s
const STAGE_2_START = 60; // then start morphing to logo

// Only begin morph phase when stage 2 starts
const morphProgress = interpolate(
  frame,
  [STAGE_2_START, STAGE_2_START + 30],
  [0, 1],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
);

// Blob wanders slightly during Stage 1 (pre-logo idle)
const blobWanderX = frame < STAGE_1_END
  ? Math.sin(frame / 18) * 14
  : interpolate(frame, [STAGE_1_END, STAGE_2_START + 10], [Math.sin(STAGE_1_END / 18) * 14, 0], { extrapolateRight: "clamp" });
const blobWanderY = frame < STAGE_1_END
  ? Math.cos(frame / 22) * 10
  : interpolate(frame, [STAGE_1_END, STAGE_2_START + 10], [Math.cos(STAGE_1_END / 22) * 10, 0], { extrapolateRight: "clamp" });

// Apply to the icon div's transform:
// transform: `translate(${blobWanderX}px, ${blobWanderY}px) scale(${blobScale})`
```

---

## Underline Accent (Wordmark Decoration)

After the wordmark appears, optionally draw a thin colored underline beneath the brand name:

```tsx
const UNDERLINE_START = 60;
const underlineWidth = interpolate(
  frame,
  [UNDERLINE_START, UNDERLINE_START + 20],
  [0, 1],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
);

// Render beneath the wordmark text:
<div style={{
  height: 2,
  width: `${underlineWidth * 100}%`,
  background: BRAND.primary || "#2dd4bf",
  borderRadius: 1,
  marginTop: 4,
  transformOrigin: "left center",
}} />
```

---

## When to Use

- Opening or transition scenes where you need to establish the brand identity dramatically
- Problem→Solution transitions: show the blob on the problem scene, reveal the full logo on the solution scene
- Any scene immediately before the CTA where you want a strong brand moment
- Combine with `premium-dot-matrix-bg` for the JustCall aesthetic
- **Do NOT** use for secondary logo appearances in the middle of UI demo scenes — keep those to simple fade-ins
