---
title: Premium Reconstructed UI
impact: HIGH
impactDescription: Builds stylized, staggered, and physically layered UI replicas that animate into existence piece-by-piece within a 40/60 split.
tags: ui, app-window, cascade, micro-stagger, glassmorphism, isometric, dashboard, 40-60-split, sidebar, table
qualityBar: The UI feels like a tangible, layered physical object occupying the right 60% of the screen. It arrives as a blank glass shell, and its internal components cascade into place with high-speed micro-staggers. It utilizes deep shadows and subtle borders to separate it from the cinematic background.
---

## Scene Purpose

To abstract and simplify a complex software interface so the viewer focuses *only* on the value proposition. Instead of showing a cluttered real screenshot, we build a clean, stylized replica of the UI that animates beautifully and guides the eye — paired with authoritative contextual text.

## Visual Blueprint

```text
[      Cinematic Camera Wrapper (1.0 -> 1.05 Zoom)              ]
[                                                               ]
[   (Left 40%: The 3-Layer Stack)    (Right 60%: Isometric UI)  ]
[                                                               ]
[   A U T O M A T E D                     . . .                 ]
[                                    +------------------------+ ]
[   Workflows that                   | [Sidebar]   [Header]   | ]
[   build themselves.                |             [Row 1]    | ]
[                                    |             [Row 2]    | ]
[   Connect your data and            |             [Row 3]    | ]
[   let the engine run.              +------------------------+ ]
[                                                               ]
```

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const ReconstructedUIScene = ({ BRAND, textStack }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. TIMING CONSTANTS (The Cascade)
  const TEXT_START    = 5;
  const BASE_START    = 15;
  const SIDEBAR_START = 22;
  const HEADER_START  = 26;
  const ROW_START     = 30;

  // 2. SPRINGS — Strict Premium Weights across ALL elements
  // stiffness:140 + damping:16 = snappy but highly controlled
  const labelSpring    = spring({ frame: frame - TEXT_START,        fps, config: { damping: 16, stiffness: 140 } });
  const headlineSpring = spring({ frame: frame - (TEXT_START + 5),  fps, config: { damping: 16, stiffness: 140 } });
  const sublineSpring  = spring({ frame: frame - (TEXT_START + 12), fps, config: { damping: 16, stiffness: 140 } });

  const baseSpring    = spring({ frame: frame - BASE_START,    fps, config: { damping: 16, stiffness: 140 } });
  const sidebarSpring = spring({ frame: frame - SIDEBAR_START, fps, config: { damping: 16, stiffness: 140 } });
  const headerSpring  = spring({ frame: frame - HEADER_START,  fps, config: { damping: 16, stiffness: 140 } });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", overflow: "hidden" }}>

      {/* GLOBAL CINEMATIC ZOOM */}
      <div style={{
        position: "absolute", inset: 0,
        transform: `scale(${interpolate(frame, [0, 150], [1.0, 1.05])})`,
        display: "flex", width: "100%", height: "100%",
      }}>

        {/* LEFT 40%: TEXT STACK */}
        <div style={{ width: "40%", paddingLeft: "8%", display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 20 }}>
          {/* Section Label */}
          <div style={{ overflow: "hidden", marginBottom: 16 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase",
              color: BRAND.primary || "#6366f1", fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(labelSpring, [0, 1], [100, 0])}%)`,
            }}>
              {textStack.label}
            </div>
          </div>
          {/* Hero Headline */}
          <div style={{ overflow: "hidden", paddingBottom: 4, marginBottom: 24 }}>
            <div style={{
              fontSize: 80, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#ffffff",
              fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(headlineSpring, [0, 1], [100, 0])}%)`,
            }}>
              {textStack.headline}
            </div>
          </div>
          {/* Sub-line */}
          <div style={{ overflow: "hidden" }}>
            <div style={{
              fontSize: 24, fontWeight: 400, lineHeight: 1.5, color: "#94a3b8",
              maxWidth: "90%", fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(sublineSpring, [0, 1], [100, 0])}%)`,
              opacity: sublineSpring,
            }}>
              {textStack.subline}
            </div>
          </div>
        </div>

        {/* RIGHT 60%: RECONSTRUCTED UI CASCADE */}
        <div style={{ width: "60%", display: "flex", alignItems: "center", paddingLeft: "5%", perspective: 1200 }}>

          {/* Base Window Shell — tilted for 3D presence */}
          <div style={{
            width: "110%", height: "70%", // Bleeds off right edge
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(24px)",
            borderRadius: 16,
            border: "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.02)",
            transformStyle: "preserve-3d",
            transform: `
              rotateY(-8deg) rotateX(2deg)
              translateY(${interpolate(baseSpring, [0, 1], [60, 0])}px)
              scale(${interpolate(baseSpring, [0, 1], [0.95, 1])})
            `,
            opacity: baseSpring,
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>

            {/* WINDOW CHROME — macOS dots */}
            <div style={{
              height: 40, background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex", alignItems: "center",
              padding: "0 16px", gap: 6, flexShrink: 0,
            }}>
              {["#f87171", "#fbbf24", "#34d399"].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

              {/* SIDEBAR — slides in from left */}
              <div style={{
                width: 200, background: "#f1f5f9",
                borderRight: "1px solid #e2e8f0",
                padding: 20, flexShrink: 0,
                transform: `translateX(${interpolate(sidebarSpring, [0, 1], [-20, 0])}px)`,
                opacity: sidebarSpring,
              }}>
                {/* Active nav item */}
                <div style={{ width: "100%", height: 32, borderRadius: 6, background: BRAND.primary || "#6366f1", marginBottom: 8, opacity: 0.9 }} />
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: "100%", height: 24, borderRadius: 4, background: "#cbd5e1", marginBottom: 8, opacity: 0.5 }} />
                ))}
              </div>

              {/* MAIN CONTENT AREA */}
              <div style={{ flex: 1, padding: 28, display: "flex", flexDirection: "column" }}>

                {/* HEADER ROW — drops in from top */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: 28,
                  transform: `translateY(${interpolate(headerSpring, [0, 1], [-12, 0])}px)`,
                  opacity: headerSpring,
                }}>
                  <div style={{ width: 180, height: 28, borderRadius: 6, background: "#94a3b8" }} />
                  <div style={{ width: 100, height: 32, borderRadius: 8, background: BRAND.primary || "#6366f1" }} />
                </div>

                {/* CASCADING TABLE ROWS — 3-frame stagger */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[0, 1, 2].map((i) => {
                    const rowSpring = spring({
                      frame: frame - (ROW_START + i * 3),
                      fps,
                      config: { damping: 16, stiffness: 140 },
                    });
                    return (
                      <div key={i} style={{
                        height: 60, background: "#ffffff",
                        border: "1px solid #e2e8f0", borderRadius: 8,
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                        transform: `translateY(${interpolate(rowSpring, [0, 1], [20, 0])}px)`,
                        opacity: rowSpring,
                        display: "flex", alignItems: "center", padding: "0 16px", gap: 14,
                      }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#cbd5e1", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ width: "40%", height: 11, borderRadius: 2, background: "#94a3b8", marginBottom: 6 }} />
                          <div style={{ width: "25%", height: 9,  borderRadius: 2, background: "#cbd5e1" }} />
                        </div>
                        {/* Status pill */}
                        <div style={{ width: 60, height: 22, borderRadius: 99, background: `${BRAND.primary || "#6366f1"}22` }} />
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};
```

---

## Spring / Timing Reference

| Element | Start Frame | Config | Description |
|---|---|---|---|
| Section label | `5` | `stiff:140, damp:16` | MaskedReveal translateY |
| Headline | `10` | `stiff:140, damp:16` | MaskedReveal translateY |
| Subline | `17` | `stiff:140, damp:16` | MaskedReveal translateY |
| Base shell | `15` | `stiff:140, damp:16` | Rise + scale from bottom |
| Sidebar | `22` | `stiff:140, damp:16` | Slide from left |
| Header row | `26` | `stiff:140, damp:16` | Drop from top |
| Table rows | `30 + i*3` | `stiff:140, damp:16` | 3-frame cascade up |

**Rule**: Every animation in a reconstructed UI scene uses `{ stiffness: 140, damping: 16 }`. Consistency makes the cascade feel like one choreographed system, not a bag of parts.

---

## "Come Alive" Crossfade Variant

For transitions from skeleton → populated UI (e.g., loading state → data arrives):

```tsx
const SKELETON_FRAMES = 45;  // Skeleton shows for 45 frames
const ALIVE_START = 50;      // Real content fades in at frame 50

const skeletonOpacity = interpolate(frame, [SKELETON_FRAMES, ALIVE_START], [1, 0], { extrapolateRight: "clamp" });
const aliveOpacity    = interpolate(frame, [SKELETON_FRAMES, ALIVE_START], [0, 1], { extrapolateLeft: "clamp" });

{/* Skeleton layer */}
<div style={{ position: "absolute", inset: 0, opacity: skeletonOpacity }}>
  {/* Skeleton rows — gray placeholder bars */}
  {[0, 1, 2].map(i => (
    <div key={i} style={{ height: 60, background: "#f1f5f9", borderRadius: 8, marginBottom: 12 }}>
      <div style={{ height: "100%", borderRadius: 8, background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
    </div>
  ))}
</div>

{/* Live data layer */}
<div style={{ position: "absolute", inset: 0, opacity: aliveOpacity }}>
  {/* Actual content */}
</div>
```

---

## Anti-Patterns

- **NEVER center the reconstructed UI without a text stack.** Use the 40/60 split to contextualize what the UI is doing.
- **NEVER fade the entire UI in at once.** Always use the Cascade Build (Base → Sidebar → Header → Rows with 3-frame stagger between rows).
- **NEVER use pure flat colors without borders or window chrome.** Without macOS dots + divider lines, the UI looks like a flat vector drawing instead of an application.
- **NEVER use inconsistent spring configs.** Every element must use `{ stiffness: 140, damping: 16 }` — mixing configs makes the cascade feel chaotic.
- **NEVER make the window fit perfectly inside the 60% column.** Set width to `110%` to bleed off the right edge, implying scale.

---

## Quality Checklist

- [ ] Scene wrapped in slow cinematic zoom (`1.0→1.05` over 150f)
- [ ] Follows 40/60 split with 3-Layer Text Stack on the left
- [ ] All animations use `{ stiffness: 140, damping: 16 }` uniformly
- [ ] Base shell has `rotateY(-8deg) rotateX(2deg)` — breaks the 2D plane
- [ ] Window chrome (3 macOS dots + title bar) present
- [ ] Sidebar slides from `translateX(-20px)`, header drops from `translateY(-12px)`
- [ ] Table rows use 3-frame stagger (`ROW_START + i * 3`)
- [ ] Window width is `110%` to bleed off right edge
