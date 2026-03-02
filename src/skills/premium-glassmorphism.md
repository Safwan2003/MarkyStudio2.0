---
title: Premium Glassmorphism, Blend Modes & Parallax Depth
impact: HIGH
impactDescription: glass UI cards, glowing orbs with blend modes, and layered parallax camera movement — the techniques that separate agency-quality from DIY
tags: glassmorphism, glass, blur, backdrop-filter, blend-mode, parallax, depth, glow, orbs, dark-mode, premium-look
---

## Glassmorphism Pattern

The "glass card" effect: frosted glass with a 1px semi-transparent border, radial glow behind it, and content on top. Use on dark backgrounds only.

```tsx
{/* The glow sits BEHIND the card — place it first */}
<div style={{
  position: "absolute",
  top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  width: 480, height: 480,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)",
  filter: "blur(60px)",
  pointerEvents: "none",
}} />

{/* Glass card */}
<div style={{
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 24,
  padding: "32px 40px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
}}>
  {/* content */}
</div>
```

### Tuning Table

| Use Case | blur | bg opacity | border opacity |
|---|---|---|---|
| Subtle card | 8px | 0.04 | 0.08 |
| Standard card | 14px | 0.06 | 0.12 |
| Heavy glass | 22px | 0.10 | 0.18 |
| Full panel | 32px | 0.14 | 0.20 |

---

## Glowing Orbs with CSS Blend Modes

Orbs that sit *naturally* in the scene using `mix-blend-mode`. Works for animated background spheres, light streaks, and color washes.

```tsx
const frame = useCurrentFrame();

// Slow drift — each orb moves independently
const orb1X = Math.sin(frame * 0.018) * 80;
const orb1Y = Math.cos(frame * 0.014) * 60;
const orb2X = Math.sin(frame * 0.022 + 1.5) * 100;
const orb2Y = Math.cos(frame * 0.016 + 2) * 70;
```

```tsx
<AbsoluteFill style={{ background: "#080c14", overflow: "hidden" }}>

  {/* Orb 1 — indigo, screen blend */}
  <div style={{
    position: "absolute",
    top: "20%", left: "15%",
    width: 600, height: 600,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.7) 0%, transparent 65%)",
    filter: "blur(80px)",
    transform: `translate(${orb1X}px, ${orb1Y}px)`,
    mixBlendMode: "screen",
    pointerEvents: "none",
  }} />

  {/* Orb 2 — teal, screen blend */}
  <div style={{
    position: "absolute",
    bottom: "10%", right: "10%",
    width: 500, height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(20,184,166,0.6) 0%, transparent 65%)",
    filter: "blur(70px)",
    transform: `translate(${orb2X}px, ${orb2Y}px)`,
    mixBlendMode: "screen",
    pointerEvents: "none",
  }} />

  {/* Content sits on top */}
</AbsoluteFill>
```

### Blend Mode Cheat Sheet

| Mode | Effect | Best For |
|---|---|---|
| `screen` | Brightens — dark areas become transparent | Glowing orbs on dark bg |
| `overlay` | Deepens contrast | Text glow sweeps |
| `multiply` | Darkens — white areas become transparent | Vignette overlays |
| `color-dodge` | Dramatic light burst | Flash transitions |

---

## Light Sweep Across Text

A diagonal shine that sweeps across a headline — standard agency technique:

```tsx
const { width } = useVideoConfig();
const sweepX = interpolate(
  frame,
  [20, 80],
  [-width, width * 0.5],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);
```

```tsx
<div style={{ position: "relative", display: "inline-block" }}>
  <h1 style={{
    fontSize: 72, fontWeight: 900, color: "white",
    fontFamily: "Inter, sans-serif", margin: 0,
  }}>
    Your Headline
  </h1>
  {/* Sweep overlay — blend mode makes it glow only over text */}
  <div style={{
    position: "absolute", inset: 0,
    background: `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)`,
    transform: `translateX(${sweepX}px)`,
    mixBlendMode: "overlay",
    pointerEvents: "none",
  }} />
</div>
```

---

## Parallax Depth System

Background, midground, and foreground scale/pan at **different rates** on the same camera move — creates true 3D depth without Three.js.

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Camera push-in: 0 → 1 over 90 frames
const cameraProgress = interpolate(
  frame,
  [0, 90],
  [0, 1],
  {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t,
  }
);

// Each layer gets a different multiplier — background moves least
const bgScale    = interpolate(cameraProgress, [0, 1], [1.00, 1.06]);  // barely moves
const gridScale  = interpolate(cameraProgress, [0, 1], [1.00, 1.14]);  // mid
const cardScale  = interpolate(cameraProgress, [0, 1], [1.00, 1.28]);  // most
const cursorScale = interpolate(cameraProgress, [0, 1], [1.00, 1.45]); // cursor overtakes fastest

// Pan offset (if camera tracks left→right)
const bgPanX    = interpolate(cameraProgress, [0, 1], [0, -20]);
const gridPanX  = interpolate(cameraProgress, [0, 1], [0, -50]);
const cardPanX  = interpolate(cameraProgress, [0, 1], [0, -100]);
```

```tsx
<AbsoluteFill style={{ background: "#0a0f1e", overflow: "hidden" }}>

  {/* Layer 0: Background gradient — barely moves */}
  <div style={{
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)",
    transform: `scale(${bgScale}) translateX(${bgPanX}px)`,
    transformOrigin: "center center",
  }} />

  {/* Layer 1: Dot grid — moves a little more */}
  <div style={{
    position: "absolute", inset: 0,
    opacity: 0.15,
    backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
    backgroundSize: "32px 32px",
    transform: `scale(${gridScale}) translateX(${gridPanX}px)`,
    transformOrigin: "center center",
  }} />

  {/* Layer 2: Background UI cards — inactive / blurred */}
  <div style={{
    position: "absolute",
    top: "20%", left: "5%",
    transform: `scale(${bgScale}) translateX(${bgPanX * 1.5}px)`,
    transformOrigin: "center center",
    opacity: 0.4,
    filter: "blur(2px)",
  }}>
    {/* ghost cards */}
    {[0,1].map(i => (
      <div key={i} style={{
        width: 200, height: 120, marginBottom: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
      }} />
    ))}
  </div>

  {/* Layer 3: Foreground hero card — moves the most */}
  <div style={{
    position: "absolute",
    top: "50%", left: "50%",
    transform: `translate(-50%, -50%) scale(${cardScale}) translateX(${cardPanX}px)`,
    transformOrigin: "center center",
  }}>
    <div style={{
      width: 520, height: 320,
      background: "rgba(255,255,255,0.07)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 20,
      boxShadow: "0 40px 80px rgba(0,0,0,0.4)",
    }}>
      {/* card content */}
    </div>
  </div>

</AbsoluteFill>
```

---

## Key Rules

- **`WebkitBackdropFilter`** — always mirror `backdropFilter` for Safari/Chrome compatibility
- **Orbs behind content**: render orb `<div>`s before the card `<div>`s in the JSX
- **`mix-blend-mode: "screen"`**: only works on dark backgrounds — on white, use `"multiply"`
- **Parallax multipliers**: background 1.06, midground 1.14, foreground 1.28+ — the bigger the gap between layers, the more "depth"
- **`transformOrigin: "center center"`** on all parallax layers — otherwise they scale from top-left
- **Never animate `filter: blur()` per-frame** — it's GPU-expensive; use a fixed blur on static "depth" layers only
