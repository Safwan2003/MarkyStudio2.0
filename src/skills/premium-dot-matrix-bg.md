---
title: Premium Dot-Matrix Background
impact: HIGH
impactDescription: creates a sophisticated light-themed halftone dot-grid texture background with floating teal accent dots and dark dash marks — the signature look of modern SaaS brands like JustCall
tags: background, dot-matrix, halftone, light-theme, dots, texture, floating, accent, minimal, clean
---

## Dot-Matrix Background Pattern

A clean, airy light-gray background with a repeating halftone dot grid created via CSS `repeating-radial-gradient`. Floating teal/brand-color accent dots and small dark dash marks drift independently across the frame. Works as the base layer under kinetic text, logo reveals, or any light-themed product scene.

---

## Core Background (CSS Dot Grid)

```tsx
// The dot grid is built with a repeating-radial-gradient — no images needed
<AbsoluteFill style={{
  background: "#f0f2f5", // light gray base
  backgroundImage: "radial-gradient(circle, rgba(30,40,70,0.18) 1px, transparent 1px)",
  backgroundSize: "22px 22px", // dot spacing
}} />
```

Adjust the `1px` radius and `0.18` opacity to control dot density. Common configurations:
- **Dense**: `backgroundSize: "16px 16px"` — busier, more texture
- **Airy** (JustCall style): `backgroundSize: "22px 22px"` — light, barely-there
- **Dark grid**: change dot color to `rgba(255,255,255,0.12)` on a dark background

---

## Floating Accent Dots (Teal/Brand Color)

Large-ish soft dots (12–18px) scattered across the frame. Each bobs slowly with phase-offset sine motion — no spring needed, pure Math.sin for continuous idle loop.

```tsx
const ACCENT_DOTS = [
  { x: 0.18, y: 0.62, size: 14, delay: 0,  speed: 28, amp: 8 },
  { x: 0.44, y: 0.78, size: 10, delay: 12, speed: 35, amp: 6 },
  { x: 0.72, y: 0.20, size: 12, delay: 5,  speed: 32, amp: 7 },
  { x: 0.85, y: 0.65, size: 16, delay: 20, speed: 26, amp: 9 },
  { x: 0.30, y: 0.30, size: 8,  delay: 8,  speed: 40, amp: 5 },
  { x: 0.60, y: 0.50, size: 6,  delay: 16, speed: 38, amp: 4 },
];

// Fade in at start
const accentFadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

{ACCENT_DOTS.map((dot, i) => {
  const floatY = Math.sin((frame - dot.delay) / dot.speed) * dot.amp;
  const floatX = Math.cos((frame - dot.delay) / (dot.speed * 1.3)) * (dot.amp * 0.5);
  return (
    <div key={i} style={{
      position: "absolute",
      left:   dot.x * width  - dot.size / 2,
      top:    dot.y * height - dot.size / 2,
      width:  dot.size,
      height: dot.size,
      borderRadius: "50%",
      background: BRAND.primary || "#2dd4bf", // teal / brand accent
      opacity: accentFadeIn * 0.85,
      transform: `translate(${floatX}px, ${floatY}px)`,
    }} />
  );
})}
```

---

## Floating Dash Marks (Dark Navy)

Small dark rectangular dashes (4×2px, or 6×2px) at slight angles — they look like pen strokes or typographic accents scattered across the frame. Very subtle; think of them as punctuation in the background composition.

```tsx
const DASH_MARKS = [
  { x: 0.78, y: 0.18, angle: -45, delay: 0  },
  { x: 0.82, y: 0.24, angle:  30, delay: 6  },
  { x: 0.25, y: 0.85, angle: -20, delay: 3  },
  { x: 0.55, y: 0.12, angle:  55, delay: 10 },
  { x: 0.68, y: 0.88, angle: -35, delay: 8  },
];

const dashFadeIn = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });

{DASH_MARKS.map((dash, i) => {
  // Slow drift — dashes move less than accent dots
  const floatY = Math.sin((frame - dash.delay) / 45 + i) * 5;
  const floatX = Math.cos((frame - dash.delay) / 55 + i) * 3;
  return (
    <div key={i} style={{
      position: "absolute",
      left:   dash.x * width,
      top:    dash.y * height,
      width:  6,
      height: 2,
      borderRadius: 1,
      background: "#1e2846", // dark navy
      opacity: dashFadeIn * 0.55,
      transform: `translate(${floatX}px, ${floatY}px) rotate(${dash.angle}deg)`,
    }} />
  );
})}
```

---

## Full Background Component

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate } from "remotion";

export const DotMatrixBackground = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const ACCENT_DOTS = [
    { x: 0.14, y: 0.68, size: 13, delay: 0,  speed: 28, amp: 9 },
    { x: 0.42, y: 0.82, size: 9,  delay: 10, speed: 36, amp: 6 },
    { x: 0.74, y: 0.18, size: 11, delay: 4,  speed: 32, amp: 8 },
    { x: 0.88, y: 0.60, size: 15, delay: 18, speed: 26, amp: 7 },
    { x: 0.28, y: 0.32, size: 7,  delay: 7,  speed: 40, amp: 5 },
    { x: 0.58, y: 0.52, size: 5,  delay: 15, speed: 38, amp: 4 },
    { x: 0.50, y: 0.92, size: 10, delay: 22, speed: 30, amp: 6 },
  ];

  const DASH_MARKS = [
    { x: 0.79, y: 0.17, angle: -45 },
    { x: 0.83, y: 0.23, angle:  28 },
    { x: 0.24, y: 0.84, angle: -22 },
    { x: 0.55, y: 0.11, angle:  52 },
    { x: 0.67, y: 0.89, angle: -38 },
    { x: 0.10, y: 0.44, angle:  15 },
  ];

  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: "#f0f2f5",
      backgroundImage: "radial-gradient(circle, rgba(30,40,70,0.16) 1px, transparent 1px)",
      backgroundSize: "22px 22px",
    }}>
      {/* Teal accent dots */}
      {ACCENT_DOTS.map((dot, i) => (
        <div key={`dot-${i}`} style={{
          position: "absolute",
          left:   dot.x * width  - dot.size / 2,
          top:    dot.y * height - dot.size / 2,
          width:  dot.size,
          height: dot.size,
          borderRadius: "50%",
          background: BRAND.primary || "#2dd4bf",
          opacity: fadeIn * 0.9,
          transform: `translate(${Math.cos((frame - dot.delay) / (dot.speed * 1.3)) * dot.amp * 0.5}px, ${Math.sin((frame - dot.delay) / dot.speed) * dot.amp}px)`,
        }} />
      ))}
      {/* Dark dash marks */}
      {DASH_MARKS.map((dash, i) => (
        <div key={`dash-${i}`} style={{
          position: "absolute",
          left:   dash.x * width,
          top:    dash.y * height,
          width:  6, height: 2,
          borderRadius: 1,
          background: "#1e2846",
          opacity: fadeIn * 0.5,
          transform: `translate(${Math.cos((frame / 55) + i) * 3}px, ${Math.sin((frame / 45) + i) * 5}px) rotate(${dash.angle}deg)`,
        }} />
      ))}
    </AbsoluteFill>
  );
};
```

---

## Usage with Content Layers

Always render the dot-matrix background first (lowest z-index), then stack content above it:

```tsx
<AbsoluteFill>
  {/* Layer 0: Dot-matrix bg */}
  <DotMatrixBackground />

  {/* Layer 1: Product device frame / text / logo etc. */}
  <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
    {/* ... your scene content ... */}
  </div>
</AbsoluteFill>
```

---

## Variants

| Variant | Change |
|---|---|
| **Brand-tinted bg** | Replace `#f0f2f5` with `rgba(45,212,191,0.04)` for a faint teal wash |
| **Darker dots** | Increase dot opacity to `0.28`, reduce `backgroundSize` to `18px` |
| **Minimal** | Remove dash marks entirely; only 3–4 accent dots |
| **Dark mode** | `background: "#0f172a"`, dot color `rgba(255,255,255,0.1)`, accent dots to `rgba(99,102,241,1)` |

---

## When to Use

- Any light-themed SaaS product video (especially for productivity, communication, or analytics tools)
- Under `premium-kinetic-text` scenes for a more polished, branded feel than plain white
- Under logo reveal scenes — the dots create depth without competing with the brand mark
- Under simple CTA / logo-only scenes — adds texture without visual noise
- **Do NOT** combine with `premium-ambient-environment` (conflicting texture styles); choose one or the other
