---
title: Premium Floating Path Nodes
impact: HIGH
impactDescription: dark green background with aurora nebula wave, floating outline circles and pill nodes, dotted curved SVG path that draws in with an animated dot traveling along it
tags: dark, nodes, circles, pills, path, floating, nebula, aurora, dotted, traveling-dot, problem, desklog, dark-theme
---

## Floating Path Nodes Pattern

A very dark background with a flowing aurora/nebula blob on the right side. Empty outline circles (stroke only, no fill) float at scattered positions in various sizes. Some evolve into rounded-rectangle pill shapes with label text. A dotted curved SVG path draws from off-screen, and a small filled dot travels along it.

**Typical use case**: Problem scenes for dark-themed tech/analytics products. Shows complexity, disconnected data silos, scattered systems — the "chaos" that the product solves.

**Quality bar**: The reference for this skill is the Desklog hook/problem sequence — icon on pitch-black bg, teal neon glow pool, arcs drawing, organic aurora nebula. Every scene using this skill must achieve that level of cinematic depth.

---

## Cinematic Hook Opener (Scene 1 / Intro Variant)

When used as the **first scene**, start with a central brand reveal before the nodes emerge. This gives the scene a dramatic opening anchor:

```tsx
// Phase 1: Brand icon springs in (frames 0–40)
const iconSpring = spring({ frame, fps, config: { stiffness: 80, damping: 18 } });
const iconScale = interpolate(iconSpring, [0, 1], [0.4, 1]);
const heartbeat = Math.sin(frame * 0.07) * 0.018 * Math.min(iconSpring, 1);

// Phase 2: Scene headline slides up (frames 20–60)
const headlineProgress = spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 100 } });
const headlineY = interpolate(headlineProgress, [0, 1], [30, 0]);

// Render brand identity at center before nodes appear
{frame < 60 && (
  <div style={{
    position: "absolute", left: "50%", top: "50%",
    transform: `translate(-50%, -50%) scale(${iconScale + heartbeat})`,
    zIndex: 40,
  }}>
    {/* Brand wordmark — use BRAND.name in large bold font */}
    <div style={{
      fontSize: 72, fontWeight: 900, letterSpacing: "-0.04em",
      color: BRAND_COLOR, fontFamily: "Inter, sans-serif",
      textShadow: `0 0 40px ${BRAND_COLOR}80, 0 0 80px ${BRAND_COLOR}30`,
      lineHeight: 1,
    }}>
      {BRAND.name}
    </div>
  </div>
)}

{/* Headline line (tagline or scene context) — slides up from below */}
<div style={{
  position: "absolute", bottom: 90, left: 0, right: 0,
  textAlign: "center",
  transform: `translateY(${headlineY}px)`,
  opacity: Math.min(headlineProgress * 2, 1),
  zIndex: 35,
}}>
  <div style={{
    fontSize: 22, fontWeight: 600, letterSpacing: "0.12em",
    color: `${BRAND_COLOR}aa`, fontFamily: "Inter, sans-serif",
    textTransform: "uppercase",
  }}>
    {/* e.g. "Scattered. Siloed. Slow." — the problem hook */}
    The Complexity You Face
  </div>
</div>
```

---

## Scene Title Overlay (Top-Left Label)

Every scene should have a bold section label that anchors the viewer:

```tsx
// Label slides in from left at frame 8
const labelProgress = spring({ frame: frame - 8, fps, config: { damping: 22, stiffness: 120 } });

<div style={{
  position: "absolute", top: 56, left: 72,
  transform: `translateX(${interpolate(labelProgress, [0, 1], [-40, 0])}px)`,
  opacity: Math.min(labelProgress * 2, 1),
  zIndex: 50,
}}>
  {/* Accent bar */}
  <div style={{
    width: interpolate(labelProgress, [0, 1], [0, 36]),
    height: 3, borderRadius: 2,
    background: BRAND_COLOR,
    marginBottom: 10,
  }} />
  <div style={{
    fontSize: 13, fontWeight: 700, letterSpacing: "0.18em",
    color: `${BRAND_COLOR}bb`, fontFamily: "Inter, sans-serif",
    textTransform: "uppercase",
  }}>
    {/* Use the scene purpose: "The Problem" / "The Chaos" / "Status Quo" */}
    The Challenge
  </div>
</div>
```

---

## Particle Depth Field

Add 18–22 micro-particles scattered behind the main nodes for depth. DEFINE outside the component to avoid flicker:

```tsx
// ── OUTSIDE component (stable — defined once) ─────────────────────────────
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 137.5) % 100,       // golden-ratio spread
  y: (i * 97.3 + 11) % 100,
  size: 1 + (i % 3),          // 1–3 px
  phase: i * 0.62,
  speed: 0.008 + (i % 5) * 0.002,
  opacity: 0.08 + (i % 4) * 0.05,
}));

// ── Inside component ────────────────────────────────────────────────────────
<div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
  {PARTICLES.map((p, i) => (
    <div key={i} style={{
      position: "absolute",
      left: `${p.x}%`,
      top: `${p.y + Math.sin(frame * p.speed + p.phase) * 1.5}%`,
      width: p.size, height: p.size,
      borderRadius: "50%",
      background: BRAND_COLOR,
      opacity: p.opacity,
    }} />
  ))}
</div>
```

---

## Upgraded Node Rendering — Glow + Depth

Replace the plain border-only circles with nodes that have inner glow, making them feel like energy nodes:

```tsx
// Circle node (upgraded — glow halo)
<div key={node.id} style={{
  position: "absolute",
  left: px, top: py,
  transform: `translate(-50%, -50%) scale(${nodeSpring}) translate(${floatX}px, ${floatY}px)`,
  width: node.size, height: node.size,
  borderRadius: "50%",
  border: `1.5px solid ${BRAND_COLOR}`,
  opacity: 0.7 * nodeSpring,
  // Inner + outer glow for energy node feel
  boxShadow: `0 0 ${node.size * 0.3}px ${BRAND_COLOR}20, inset 0 0 ${node.size * 0.4}px ${BRAND_COLOR}08`,
  background: `radial-gradient(circle at 40% 35%, ${BRAND_COLOR}06, transparent 65%)`,
}} />

// Pill node (upgraded — semi-transparent fill)
<div key={node.id} style={{
  position: "absolute",
  left: px, top: py,
  transform: `translate(-50%, -50%) scale(${nodeSpring}) translate(${floatX}px, ${floatY}px)`,
  width: node.size * 1.6, height: node.size * 0.6,
  borderRadius: 9999,
  border: `1.5px solid ${BRAND_COLOR}`,
  background: `${BRAND_COLOR}0f`,  // 6% opacity fill — gives it body
  boxShadow: `0 0 20px ${BRAND_COLOR}15, inset 0 0 12px ${BRAND_COLOR}08`,
  display: "flex", alignItems: "center", justifyContent: "center",
  opacity: nodeSpring,
}}>
  {/* Accent dot before label */}
  <div style={{
    width: 5, height: 5, borderRadius: "50%",
    background: BRAND_COLOR, marginRight: 8, opacity: 0.8,
    boxShadow: `0 0 6px ${BRAND_COLOR}`,
  }} />
  <span style={{
    fontSize: node.size * 0.18,
    color: BRAND_COLOR,
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    opacity: 0.9,
    letterSpacing: "0.03em",
  }}>
    {node.label}
  </span>
</div>
```

---

## Dual Aurora — Left + Right

Add a second aurora on the left to balance the composition:

```tsx
{/* Left aurora — cooler, dimmer counterpart */}
<div style={{
  position: "absolute",
  left: "-15%", top: "30%",
  width: "50%", height: "60%",
  background: `radial-gradient(ellipse 55% 90% at 20% 50%, ${BRAND_COLOR}0d 0%, transparent 65%)`,
  transform: `rotate(15deg) scaleX(0.6) translateY(${Math.cos(frame * 0.011) * 18}px)`,
  filter: "blur(45px)",
  opacity: 0.6,
}} />
```

---

## Multi-Path Network (Advanced — 3 connected segments)

For richer "network chaos" scenes, connect the nodes with 3 path segments that draw in sequence:

```tsx
const PATHS = [
  // Main bottom sweep
  { d: `M -60 ${height * 0.82} Q ${width * 0.30} ${height * 0.92} ${width * 0.60} ${height * 0.72}`, len: 750, delay: 35 },
  // Branch connecting upper nodes
  { d: `M ${width * 0.18} ${height * 0.62} Q ${width * 0.35} ${height * 0.45} ${width * 0.53} ${height * 0.28}`, len: 480, delay: 65 },
  // Third tendril reaching upper right
  { d: `M ${width * 0.53} ${height * 0.28} Q ${width * 0.68} ${height * 0.18} ${width * 0.79} ${height * 0.10}`, len: 320, delay: 90 },
];

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", zIndex: 8 }}>
  <defs>
    <filter id="pathGlow"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
  </defs>
  {PATHS.map((p, i) => {
    const prog = spring({ frame: frame - p.delay, fps, config: { stiffness: 32 - i * 3, damping: 20 } });
    const offset = interpolate(prog, [0, 1], [p.len, 0]);
    const dotT = Math.min(Math.max(prog, 0), 1);
    // Parse bezier for dot position (quadratic: only works if d is a Q command)
    // For traveling dot, use: render a circle that fades to invisible after path completes
    return (
      <g key={i}>
        <path
          d={p.d} stroke={BRAND_COLOR} strokeWidth={i === 0 ? 2 : 1.5}
          fill="none" strokeLinecap="round"
          strokeDasharray={`0 ${11 - i * 2}`}  // denser dots on branches
          strokeDashoffset={offset}
          filter="url(#pathGlow)"
          opacity={i === 0 ? 0.65 : 0.4}
        />
      </g>
    );
  })}
</svg>
```

---

## Dark Background + Aurora Nebula

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const BRAND_COLOR = BRAND.primary || "#00e5a0"; // teal/neon green

<AbsoluteFill style={{ backgroundColor: "#020c06", overflow: "hidden" }}>
  {/* Base dark gradient */}
  <div style={{
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at 20% 50%, #071a0e 0%, #020c06 70%)",
  }} />

  {/* Aurora / nebula blob — right side, irregular flowing shape */}
  {/* Implemented as a blurred, rotated, highly elliptical radial gradient */}
  <div style={{
    position: "absolute",
    right: "-10%", top: "15%",
    width: "60%", height: "70%",
    background: `radial-gradient(ellipse 60% 100% at 80% 50%, ${BRAND_COLOR}22 0%, ${BRAND_COLOR}0a 40%, transparent 70%)`,
    transform: `rotate(-20deg) scaleX(0.7) translateY(${Math.sin(frame * 0.012) * 20}px)`,
    filter: "blur(40px)",
    opacity: 0.9,
  }} />

  {/* Secondary nebula tendril — curves differently for organic feel */}
  <div style={{
    position: "absolute",
    right: "5%", top: "40%",
    width: "45%", height: "50%",
    background: `radial-gradient(ellipse 50% 80% at 70% 60%, ${BRAND_COLOR}18 0%, transparent 65%)`,
    transform: `rotate(15deg) translateY(${Math.cos(frame * 0.015) * 15}px)`,
    filter: "blur(50px)",
    opacity: 0.7,
  }} />
</AbsoluteFill>
```

---

## Floating Outline Nodes (Circles)

Nodes are circles with only a stroke, no fill. They vary in size and float independently:

```tsx
const NODES = [
  { id: 0, x: 0.53, y: 0.28, size: 100, delay:  5, floatPhase: 0.0, type: "circle" },
  { id: 1, x: 0.79, y: 0.10, size: 130, delay: 15, floatPhase: 1.2, type: "circle" },
  { id: 2, x: 0.18, y: 0.62, size: 115, delay: 25, floatPhase: 2.5, type: "circle" },
  { id: 3, x: 0.88, y: 0.08, size:  24, delay: 20, floatPhase: 0.8, type: "dot"    },
  { id: 4, x: 0.62, y: 0.30, size:  12, delay: 30, floatPhase: 1.5, type: "dot"    },
  // Pill nodes (rounded rectangle) — appear later
  { id: 5, x: 0.15, y: 0.55, size: 115, delay: 40, floatPhase: 0.3, type: "pill", label: "Active Delivery" },
  { id: 6, x: 0.70, y: 0.72, size:  80, delay: 55, floatPhase: 1.8, type: "pill", label: "F&I" },
];

{NODES.map((node) => {
  const nodeSpring = spring({
    frame: frame - node.delay,
    fps,
    config: { stiffness: 90, damping: 18, mass: 1 },
  });
  if (frame < node.delay) return null;

  const floatY = Math.sin((frame / 55) + node.floatPhase) * 8;
  const floatX = Math.cos((frame / 75) + node.floatPhase) * 4;
  const px = node.x * width;
  const py = node.y * height;

  if (node.type === "dot") {
    return (
      <div key={node.id} style={{
        position: "absolute",
        left: px, top: py,
        transform: `translate(-50%, -50%) scale(${nodeSpring}) translate(${floatX}px, ${floatY}px)`,
        width: node.size, height: node.size,
        borderRadius: "50%",
        border: `1.5px solid ${BRAND_COLOR}`,
        opacity: 0.5 * nodeSpring,
      }} />
    );
  }

  if (node.type === "pill") {
    return (
      <div key={node.id} style={{
        position: "absolute",
        left: px, top: py,
        transform: `translate(-50%, -50%) scale(${nodeSpring}) translate(${floatX}px, ${floatY}px)`,
        width: node.size * 1.6, height: node.size * 0.6,
        borderRadius: 9999,
        border: `1.5px solid ${BRAND_COLOR}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: nodeSpring,
      }}>
        <span style={{
          fontSize: node.size * 0.18,
          color: BRAND_COLOR,
          fontFamily: "Inter, sans-serif",
          fontWeight: 500,
          opacity: 0.85,
          letterSpacing: "0.02em",
        }}>
          {node.label}
        </span>
      </div>
    );
  }

  // Default: circle
  return (
    <div key={node.id} style={{
      position: "absolute",
      left: px, top: py,
      transform: `translate(-50%, -50%) scale(${nodeSpring}) translate(${floatX}px, ${floatY}px)`,
      width: node.size, height: node.size,
      borderRadius: "50%",
      border: `1.5px solid ${BRAND_COLOR}`,
      opacity: 0.6 * nodeSpring,
    }} />
  );
})}
```

---

## Dotted Curved Path with Traveling Dot

The path draws in from the left/bottom while a bright dot travels along it. Use a quadratic bezier that curves organically across the lower portion of the frame:

```tsx
// Path: starts bottom-left, curves across the bottom of the scene
const PATH_START_X = -60;
const PATH_START_Y = height * 0.82;
const PATH_CP_X    = width * 0.30;
const PATH_CP_Y    = height * 0.92;
const PATH_END_X   = width * 0.60;
const PATH_END_Y   = height * 0.72;

const PATH_D = `M ${PATH_START_X} ${PATH_START_Y} Q ${PATH_CP_X} ${PATH_CP_Y} ${PATH_END_X} ${PATH_END_Y}`;
const PATH_LENGTH = 750; // approximate arc length in px

// Path draws in from frame 35
const PATH_DRAW_DELAY = 35;
const pathProgress = spring({
  frame: frame - PATH_DRAW_DELAY,
  fps,
  config: { stiffness: 32, damping: 20 },
});
const pathDashOffset = interpolate(pathProgress, [0, 1], [PATH_LENGTH, 0]);

// Traveling dot: linear interpolation along the quadratic bezier
// t goes from 0 to 1 as path draws
const travelT = Math.min(Math.max(pathProgress, 0), 1);

// Quadratic bezier point formula: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
const dotX = Math.pow(1 - travelT, 2) * PATH_START_X
           + 2 * (1 - travelT) * travelT * PATH_CP_X
           + Math.pow(travelT, 2) * PATH_END_X;
const dotY = Math.pow(1 - travelT, 2) * PATH_START_Y
           + 2 * (1 - travelT) * travelT * PATH_CP_Y
           + Math.pow(travelT, 2) * PATH_END_Y;

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
  <defs>
    <filter id="pathGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>

  {/* Dotted path */}
  <path
    d={PATH_D}
    stroke={BRAND_COLOR}
    strokeWidth={2}
    fill="none"
    strokeLinecap="round"
    strokeDasharray="0 14"     // polka-dot trick: 0px dot + 14px gap
    strokeDashoffset={pathDashOffset}
    filter="url(#pathGlow)"
    opacity={0.6}
  />

  {/* Traveling dot — follows the path tip */}
  {frame > PATH_DRAW_DELAY && (
    <circle
      cx={dotX}
      cy={dotY}
      r={6}
      fill="white"
      filter="url(#pathGlow)"
      opacity={Math.min(pathProgress * 3, 1)}
    />
  )}
</svg>
```

---

## Multiple Path Segments (Advanced)

For more complex scenes, add a second path segment that branches off from the first:

```tsx
// Branch path connecting two nodes
const BRANCH_D = `M ${width * 0.18} ${height * 0.62} Q ${width * 0.35} ${height * 0.50} ${width * 0.53} ${height * 0.28}`;
const BRANCH_LENGTH = 500;

const BRANCH_DELAY = 70;
const branchProgress = spring({
  frame: frame - BRANCH_DELAY,
  fps,
  config: { stiffness: 28, damping: 18 },
});
const branchDashOffset = interpolate(branchProgress, [0, 1], [BRANCH_LENGTH, 0]);

{/* Render alongside main path in same SVG */}
<path
  d={BRANCH_D}
  stroke={BRAND_COLOR}
  strokeWidth={1.5}
  fill="none"
  strokeLinecap="round"
  strokeDasharray="0 14"
  strokeDashoffset={branchDashOffset}
  filter="url(#pathGlow)"
  opacity={0.4}
/>
```

---

## Scene Choreography

Recommended timing for a 210-frame scene:

```
Frames 0–10:   Background + nebula fades in
Frames 5–30:   Circles pop in sequentially (each 10 frames apart)
Frames 35–90:  Main path draws in + traveling dot follows tip
Frames 40–70:  Pills animate in (after circles)
Frames 70–110: Branch path draws (if using multiple paths)
Frames 90+:    Traveling dot pauses at end, gentle float continues
```

---

## Usage Notes

- All nodes use `border: 1.5px solid BRAND_COLOR` — no background fill. This creates the "outline only" look
- Keep `opacity` on circles at 0.5–0.7 — they should feel ghostly, not solid
- The aurora nebula uses `filter: blur(40–50px)` on a highly stretched ellipse — this is what creates the organic flowing shape without any SVG path
- `strokeDasharray="0 14"` with `strokeLinecap="round"` is the polka-dot trick. Decrease `14` for denser dots
- The traveling dot uses the analytic quadratic bezier formula — no DOM refs or `getTotalLength()` needed
- For cubic bezier paths, use: `B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3`
