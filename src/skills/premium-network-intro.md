---
title: Premium Network & Integration Intro
impact: HIGH
impactDescription: Generates a high-energy, 3D network of connected nodes to show integrations, user networks, or data flow.
tags: network, nodes, integrations, svg-lines, pulse, 3d-depth, data-flow, avatars, polka-dot
qualityBar: The central hub pops in with authority. Surrounding nodes stagger into existence across the Z-axis (varying scale/blur). Smooth, curved SVG lines animate outward from the center to connect the nodes, followed by a bright "data pulse" traveling down the paths.
---

## Scene Purpose

Used to visually demonstrate integrations (e.g., "Connects with all your tools"), global reach ("Used by teams worldwide"), or data consolidation ("All your data in one place"). It physicalizes the concept of connectivity.

## Visual Blueprint

```text
[      Cinematic Camera Wrapper (1.0 -> 1.05 Zoom)      ]
[                                                       ]
[    [Node] (Blur: 4px)                [Node] (Blur: 0) ]
[        \                             /                ]
[         \___                     ___/                 ]
[             \___             ___/                     ]
[                 \           /                         ]
[                  [HERO HUB]                           ]
[                 /           \                         ]
[             ___/             \___                     ]
[         ___/                     \___                 ]
[        /                             \                ]
[    [Node] (Blur: 2px)                [Node] (Blur: 8) ]
[                                                       ]
```

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const NetworkIntroScene = ({ BRAND, centerLogo, integrationLogos }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 1. TIMING (3-beat rhythm: Hub → Nodes → Lines)
  const HUB_START       = 5;
  const NODE_START      = 15;
  const LINE_DRAW_START = 25;

  // 2. HUB SPRING & PULSE
  const hubSpring = spring({ frame: frame - HUB_START, fps, config: { damping: 14, stiffness: 180 } }); // Snappy pop
  const hubPulse  = interpolate(Math.sin((frame - 30) * 0.1), [-1, 1], [0.95, 1.05]); // Ambient breathing

  // 3. NODE SLOTS — Pre-mapped for 3D depth and balanced layout
  // x/y are ratios from center hub (0,0). scale/blur simulate Z-axis depth.
  const SATELLITE_SLOTS = [
    { x: -0.35, y: -0.35, scale: 0.8, blur: 0 },  // Top Left — sharp (background)
    { x:  0.40, y: -0.25, scale: 1.2, blur: 4 },  // Top Right — medium foreground
    { x: -0.45, y:  0.20, scale: 1.5, blur: 8 },  // Bottom Left — heavy foreground
    { x:  0.30, y:  0.35, scale: 0.6, blur: 0 },  // Bottom Right — sharp (background)
    { x:  0.0,  y: -0.45, scale: 0.7, blur: 2 },  // Top Center
    { x: -0.50, y: -0.05, scale: 0.9, blur: 0 },  // Far Left
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", overflow: "hidden" }}>

      {/* 3D CAMERA WRAPPER */}
      <div style={{
        position: "absolute", inset: 0,
        transform: `scale(${interpolate(frame, [0, 150], [1.0, 1.05])})`,
        display: "flex", justifyContent: "center", alignItems: "center",
      }}>

        {/* SVG LAYER — CONNECTING LINES (Z: 10) */}
        <svg style={{ position: "absolute", width: "100%", height: "100%", zIndex: 10, overflow: "visible" }}>
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={BRAND.primary || "#6366f1"} stopOpacity="0.8" />
              <stop offset="100%" stopColor={BRAND.primary || "#6366f1"} stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {integrationLogos.slice(0, SATELLITE_SLOTS.length).map((_, i) => {
            const slot = SATELLITE_SLOTS[i];

            // Absolute positions from screen center
            const startX = width / 2;
            const startY = height / 2;
            const endX   = startX + (slot.x * width);
            const endY   = startY + (slot.y * height);

            // Quadratic Bezier — organic curve instead of rigid straight line
            const controlX = startX + (endX - startX) * 0.5;
            const controlY = startY;
            const pathData  = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

            // Draw from center outward via strokeDashoffset
            const lineProgress = spring({
              frame: frame - (LINE_DRAW_START + i * 4),
              fps,
              config: { damping: 20, stiffness: 100 },
            });
            const PATH_LENGTH = 2500; // Safe max — slightly over screen diagonal

            return (
              <path
                key={i}
                d={pathData}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth={2}
                strokeDasharray={PATH_LENGTH}
                strokeDashoffset={interpolate(lineProgress, [0, 1], [PATH_LENGTH, 0])}
                style={{ opacity: lineProgress }}
              />
            );
          })}
        </svg>

        {/* HERO HUB NODE (Z: 30) */}
        <div style={{
          position: "absolute",
          zIndex: 30,
          width: 120, height: 120,
          borderRadius: 24,
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          border: `2px solid ${BRAND.primary || "#6366f1"}`,
          boxShadow: `0 0 60px ${BRAND.primary || "#6366f1"}40`,
          display: "flex", justifyContent: "center", alignItems: "center",
          transform: `scale(${interpolate(hubSpring, [0, 1], [0, 1])}) scale(${frame > 30 ? hubPulse : 1})`,
        }}>
          {centerLogo ? (
            <img src={centerLogo} style={{ width: 64, height: 64, objectFit: "contain" }} />
          ) : (
            <div style={{
              width: 64, height: 64,
              borderRadius: 14,
              backgroundColor: BRAND.primary || "#6366f1",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 800, color: "white", fontFamily: "Inter, sans-serif",
            }}>
              {(BRAND.name || "?")[0]}
            </div>
          )}
        </div>

        {/* SATELLITE NODES (Z: 20) */}
        {integrationLogos.slice(0, SATELLITE_SLOTS.length).map((logo, i) => {
          const slot       = SATELLITE_SLOTS[i];
          const nodeSpring = spring({
            frame: frame - (NODE_START + i * 3),
            fps,
            config: { damping: 15, stiffness: 160 },
          });
          const floatY = Math.sin((frame + i * 100) / 45) * 8;

          return (
            <div key={i} style={{
              position: "absolute",
              zIndex: 20 + i,
              left: `calc(50% + ${slot.x * 100}%)`,
              top:  `calc(50% + ${slot.y * 100}%)`,
              width: 80, height: 80,
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              display: "flex", justifyContent: "center", alignItems: "center",
              transform: `translate(-50%, -50%) scale(${interpolate(nodeSpring, [0, 1], [0, slot.scale])}) translateY(${floatY}px)`,
              filter: `blur(${slot.blur}px)`,
              opacity: nodeSpring,
            }}>
              <img src={logo} style={{ width: 40, height: 40, objectFit: "contain" }} />
            </div>
          );
        })}

      </div>
    </AbsoluteFill>
  );
};
```

---

## Spring / Timing Reference

| Element | Start Frame | Config | Description |
|---|---|---|---|
| **Hero Hub** | `5` | `stiff:180, damp:14` | High-energy pop |
| **Satellites** | `15 + (i*3)` | `stiff:160, damp:15` | Rapid, bouncy cascade |
| **Line Draw** | `25 + (i*4)` | `stiff:100, damp:20` | Smooth, deliberate path trace |

---

## Avatar Network Variant (Polka-Dot Paths + Ripple)

For B2B, HR, and community products — avatar nodes connected by animated dot paths:

```tsx
const NODES = [
  { id: 0, x: width * 0.25, y: height * 0.32, size: 190, src: ATTACHED_IMAGES[0] ?? null, label: "A" },
  { id: 1, x: width * 0.75, y: height * 0.28, size: 160, src: ATTACHED_IMAGES[1] ?? null, label: "B" },
  { id: 2, x: width * 0.32, y: height * 0.72, size: 170, src: ATTACHED_IMAGES[2] ?? null, label: "C" },
  { id: 3, x: width * 0.72, y: height * 0.68, size: 165, src: ATTACHED_IMAGES[3] ?? null, label: "D" },
];
```

### Polka-Dot Connection Path

```tsx
const ConnectionPath = ({ start, end, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dx   = end.x - start.x;
  const dy   = end.y - start.y;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const cpX  = midX - dy * 0.2;  // Organic arch
  const cpY  = midY + dx * 0.2;

  const path = `M ${start.x} ${start.y} Q ${cpX} ${cpY} ${end.x} ${end.y}`;
  const len  = Math.sqrt(dx * dx + dy * dy) * 1.2;

  const progress   = spring({ frame: frame - delay, fps, config: { stiffness: 40, damping: 20 } });
  const dashOffset = interpolate(progress, [0, 1], [len, 0]);

  return (
    <path
      d={path}
      stroke="#94a3b8"
      strokeWidth="3.5"
      strokeLinecap="round"  // Creates polka-dot look with wide gap
      strokeDasharray="0 16" // 0px dash + 16px gap = dots 16px apart
      strokeDashoffset={dashOffset}
      fill="none"
      style={{ opacity: 0.5 }}
    />
  );
};
```

**The polka-dot trick**: `strokeDasharray="0 16"` with `strokeLinecap="round"` creates dots. Adjust `16` for dot spacing.

### Avatar Node with Ripple + Float

```tsx
const AvatarNode = ({ src, x, y, size, delay, label = "?" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < delay) return null;

  const scale       = spring({ frame: frame - delay, fps, config: { stiffness: 160, damping: 12, mass: 1.2 } }); // Overshoot!
  const rippleFrame   = frame - delay;
  const rippleScale   = interpolate(rippleFrame, [0, 30], [0.8, 2.2], { extrapolateRight: "clamp" });
  const rippleOpacity = interpolate(rippleFrame, [0, 25], [0.5, 0],   { extrapolateRight: "clamp" });
  const floatY        = Math.sin((frame / 50) + x * 0.001) * 6;

  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 20 }}>
      {/* Ripple ring */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        width: size, height: size, borderRadius: "50%",
        border: `2px solid ${BRAND.primary || "#6366f1"}`,
        transform: `translate(-50%, -50%) scale(${rippleScale})`,
        opacity: rippleOpacity,
      }} />
      {/* Avatar */}
      <div style={{
        width: size, height: size,
        transform: `translate(-50%, calc(-50% + ${floatY}px)) scale(${scale})`,
        borderRadius: "50%",
        background: "white",
        padding: 8,
        boxShadow: "0 30px 60px rgba(0,0,0,0.12), 0 18px 36px rgba(0,0,0,0.08)",
      }}>
        {src ? (
          <img src={src} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            backgroundColor: BRAND.primary || "#6366f1",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: size * 0.38, fontWeight: 800, color: "white", fontFamily: "Inter, sans-serif",
          }}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
};
```

**Rule**: Always guard `ATTACHED_IMAGES[i]` with `?? null` — use colored initial fallback when no image is provided.

---

## Light Background Variant

```tsx
<AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
  <div style={{
    position: "absolute",
    left: width * 0.2, top: height * 0.3,
    width: 1000, height: 1000, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(241,245,249,0.8) 0%, transparent 60%)",
    filter: "blur(60px)",
    transform: `translate(-50%, -50%) translateY(${Math.sin(frame * 0.01) * 30}px)`,
  }} />
  <div style={{
    position: "absolute",
    left: width * 0.8, top: height * 0.7,
    width: 1000, height: 1000, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(237,233,254,0.6) 0%, transparent 60%)",
    filter: "blur(60px)",
    transform: `translate(-50%, -50%) translateY(${Math.cos(frame * 0.01) * 20}px)`,
  }} />
</AbsoluteFill>
```

---

## Anti-Patterns

- **NEVER animate SVG lines with basic opacity.** It looks like a cheap crossfade. Use `strokeDasharray` + `strokeDashoffset` math to physically draw the line from center outward.
- **NEVER draw straight rigid lines** (`<line x1="..." y1="..." />`). Use `<path d="M... Q... " />` (Quadratic Bezier) for organic curves.
- **NEVER randomly position nodes.** Use `SATELLITE_SLOTS` to guarantee balanced 3D depth-of-field (mixing large/blurred foreground nodes with small/sharp background nodes).
- **NEVER start all animations on frame 0.** Follow the strict 3-beat rhythm: Hub pop → Nodes pop → Lines draw.
- **NEVER skip the hub pulse.** `Math.sin((frame-30)*0.1)` mapped to `[0.95, 1.05]` is the signal that the hub is "live" and the network is active.

---

## Quality Checklist

- [ ] Central hub node has ambient pulse effect (`Math.sin` mapped to `[0.95, 1.05]`)
- [ ] Nodes mapped via `SATELLITE_SLOTS` for 3D scale/blur depth variation
- [ ] Connection paths use `<path d="M... Q...">` (Bezier), not `<line>`
- [ ] Lines use `strokeDashoffset` animated from `PATH_LENGTH→0` (not opacity)
- [ ] Strict 3-beat sequence: Hub(f:5) → Nodes(f:15+i*3) → Lines(f:25+i*4)
- [ ] Scene wrapped in continuous zoom wrapper (`1.0→1.05` over 150f)
- [ ] Hub fallback renders brand initial when no `centerLogo` image provided
