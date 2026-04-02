---
title: Premium SaaS Showcase
impact: HIGH
impactDescription: The workhorse scene for displaying UI features, strictly enforcing the 40/60 split layout and isometric product presentation.
tags: showcase, split-layout, isometric, ui-demo, 40-60, browser, dashboard
qualityBar: The scene uses a strict 40/60 split. The left 40% holds the 3-Layer Text Stack. The right 60% holds the product UI, tilted in 3D space, anchored by a floating glass feature badge, with a slow cinematic zoom wrapping the entire scene.
---

## Scene Purpose

The core "Show, Don't Tell" scene. Introduces a specific feature by pairing highly readable contextual text with a dynamic, physicalized view of the product interface.

## Visual Blueprint

```text
[      Cinematic Camera Wrapper (1.0 -> 1.05 Zoom)              ]
[                                                               ]
[   (Left 40%: The 3-Layer Stack)    (Right 60%: Isometric UI)  ]
[                                                               ]
[   S E A M L E S S   S Y N C             [Floating Badge]      ]
[                                               \               ]
[   Connect all your                           +-----------+    ]
[   favorite tools.                           / Screenshot/     ]
[                                            /   or UI   /      ]
[   No coding required. Just                /   Replica /       ]
[   click, authenticate, and go.           +-----------+        ]
[                                                               ]
```

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const SaasShowcaseScene = ({ BRAND, textStack, uiImage, badgeText }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. TIMING
  const TEXT_START  = 5;
  const UI_START    = 15;
  const BADGE_START = 28;

  // 2. TEXT SPRINGS
  const labelSpring    = spring({ frame: frame - TEXT_START,        fps, config: { damping: 16, stiffness: 140 } });
  const headlineSpring = spring({ frame: frame - (TEXT_START + 5),  fps, config: { damping: 18, stiffness: 120 } });
  const sublineSpring  = spring({ frame: frame - (TEXT_START + 12), fps, config: { damping: 18, stiffness: 120 } });

  // 3. UI + BADGE SPRINGS
  const uiSpring    = spring({ frame: frame - UI_START,    fps, config: { damping: 18, stiffness: 110 } });
  const badgeSpring = spring({ frame: frame - BADGE_START, fps, config: { damping: 14, stiffness: 150 } }); // Snappy pop

  // 4. SCENE SETTLE (zoom out for finality if this is a CTA-adjacent scene)
  const cameraZoom = interpolate(frame, [0, 150], [1.0, 1.05], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${cameraZoom})`, transformOrigin: "center center", display: "flex", flexDirection: "row" }}>

        {/* LEFT 40%: TEXT STACK */}
        <div style={{
          width: "40%",
          paddingLeft: "8%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          zIndex: 20,
        }}>
          {/* Section Label */}
          <div style={{ overflow: "hidden", marginBottom: 16 }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: BRAND.primary || "#6366f1",
              fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(labelSpring, [0, 1], [100, 0])}%)`,
            }}>
              {textStack.label}
            </div>
          </div>
          {/* Hero Headline */}
          <div style={{ overflow: "hidden", paddingBottom: 4, marginBottom: 24 }}>
            <div style={{
              fontSize: 80, fontWeight: 900, lineHeight: 1.05,
              letterSpacing: "-0.04em", color: "#ffffff",
              fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(headlineSpring, [0, 1], [100, 0])}%)`,
            }}>
              {textStack.headline}
            </div>
          </div>
          {/* Sub-line */}
          <div style={{ overflow: "hidden" }}>
            <div style={{
              fontSize: 24, fontWeight: 400, lineHeight: 1.5,
              color: "#94a3b8", maxWidth: "90%",
              fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(sublineSpring, [0, 1], [100, 0])}%)`,
              opacity: sublineSpring,
            }}>
              {textStack.subline}
            </div>
          </div>
        </div>

        {/* RIGHT 60%: ISOMETRIC UI */}
        <div style={{
          width: "60%",
          position: "relative",
          perspective: 1200,
          display: "flex",
          alignItems: "center",
          paddingLeft: "5%",
        }}>

          {/* Main UI Container — intentionally bleeds off right edge */}
          <div style={{
            width: "120%", // Bleeds off the right edge to imply expansive software
            height: "70%",
            transformStyle: "preserve-3d",
            transform: `
              rotateY(-12deg) rotateX(4deg)
              translateY(${interpolate(uiSpring, [0, 1], [100, 0])}px)
              scale(${interpolate(uiSpring, [0, 1], [0.9, 1])})
            `,
            opacity: uiSpring,
            borderRadius: 24,
            boxShadow: "-30px 40px 80px rgba(0,0,0,0.4)", // Shadow leans left (matches rotation)
            border: "1px solid rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}>
            {uiImage ? (
              <img src={uiImage} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "left top" }} />
            ) : (
              // Fallback reconstructed UI shell
              <div style={{ width: "100%", height: "100%", background: "#1e293b", display: "flex" }}>
                {/* Sidebar */}
                <div style={{ width: 240, height: "100%", background: "#0f172a", borderRight: "1px solid rgba(255,255,255,0.08)" }} />
                {/* Content */}
                <div style={{ flex: 1, padding: 32 }}>
                  <div style={{ height: 24, width: 200, background: "rgba(255,255,255,0.1)", borderRadius: 6, marginBottom: 16 }} />
                  <div style={{ height: 16, width: 320, background: "rgba(255,255,255,0.06)", borderRadius: 4 }} />
                </div>
              </div>
            )}
          </div>

          {/* Floating Feature Badge — bridges text and UI columns */}
          {badgeText && (
            <div style={{
              position: "absolute",
              left: "-5%", // Hangs off the left edge of the UI panel
              top: "30%",
              transform: `translateZ(50px) scale(${badgeSpring}) translateY(${interpolate(Math.sin(frame * 0.05), [-1, 1], [-8, 8])}px)`,
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(24px) saturate(150%)",
              WebkitBackdropFilter: "blur(24px) saturate(150%)",
              borderTop: "1px solid rgba(255,255,255,0.3)",
              borderLeft: "1px solid rgba(255,255,255,0.15)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              padding: "16px 24px",
              borderRadius: 16,
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", gap: 12,
              zIndex: 30,
            }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: BRAND.primary || "#6366f1" }} />
              <span style={{ color: "#fff", fontSize: 20, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>{badgeText}</span>
            </div>
          )}
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
| Headline | `10` | `stiff:120, damp:18` | MaskedReveal translateY |
| Subline | `17` | `stiff:120, damp:18` | MaskedReveal translateY |
| UI panel | `15` | `stiff:110, damp:18` | Rise + scale entrance |
| Feature badge | `28` | `stiff:150, damp:14` | Snappy pop after UI settles |

---

## Browser Frame Variant (Classic Mockup)

For showing web apps in a realistic browser window — use when the product is web-first and the URL/nav chrome adds credibility:

```tsx
{/* Browser frame — traffic lights + URL bar */}
<div style={{
  width: "90%", maxWidth: 1100,
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
  border: "1px solid rgba(255,255,255,0.12)",
  transform: `translateY(${BROWSER_Y + floatY}px)`,
}}>
  {/* Chrome */}
  <div style={{ height: 44, background: "#1e293b", display: "flex", alignItems: "center", padding: "0 16px", gap: 8 }}>
    {/* Traffic lights */}
    {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => (
      <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: c }} />
    ))}
    {/* URL bar */}
    <div style={{ flex: 1, marginLeft: 12, height: 26, background: "rgba(255,255,255,0.08)", borderRadius: 6, display: "flex", alignItems: "center", paddingLeft: 12 }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif" }}>
        app.{BRAND.name?.toLowerCase() || "product"}.com/dashboard
      </span>
    </div>
  </div>
  {/* Content */}
  <div style={{ height: 480, background: "#0f172a" }}>
    {uiImage && <img src={uiImage} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />}
  </div>
</div>
```

**Use browser frame when:** the user's product is web-based and the URL/nav adds realism.
**Use isometric directly when:** showing mobile, multi-platform, or abstract product capabilities.

---

## AGENCY UPGRADE MANDATES (added 2026-03)

These mandates close the gap between "functional" and "WhatAStory-quality":

**1. BrowserMockup for ALL screenshots — no raw `<img>` tags**
When UI_SCHEMA is present: use `<ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} />` — no screenshots at all.
When showing screenshot directly: ALWAYS wrap in the browser chrome frame (traffic lights + URL bar) shown in "Browser Frame Variant" below. A raw `<img>` floating in the scene is a quality fail.

**2. useVitality on hold-phase elements (>60f holds)**
During the hold phase, the floating badge and UI panel must breathe:
```tsx
const vBadge = useVitality("float", 0);    // badge floats: translateY(v * -6px)
const vPanel = useVitality("breathe", 1);  // panel breathes: scale(1 + v * 0.008)
```

**3. SteppedCamera when this scene has cursor interactions**
If the LLM adds cursor waypoints to this scene, use usePreFocusCamera:
```tsx
const { zoom, panX, panY } = usePreFocusCamera(cursorTargetX, cursorTargetY, arrivalFrame - 15);
```

**4. rotateY(-8deg) for lighter tilt when using BrowserMockup**
When the UI is in a browser frame (not raw isometric), use `rotateY(-8deg)` instead of `-12deg` for a more natural perspective.

---

## Anti-Patterns

- **NEVER use a raw `<img>` tag for product screenshots.** Always wrap in browser chrome or use ReconstructedAppShell. Raw screenshots look like a PowerPoint slide.
- **NEVER center the UI and put text below.** It creates dead space and kills readability. Always use the 40/60 split.
- **NEVER present the UI completely flat** unless doing a direct cursor interaction. Use `perspective:1200` + `rotateY(-12deg)` to create an isometric volume.
- **NEVER fit the UI perfectly inside the 60% column.** Set width to `120%` so it bleeds off the right edge — this implies a larger, expansive software system.
- **NEVER skip the floating badge.** The badge physically bridges the gap between the text column and UI panel — without it, the two halves feel disconnected.
- **NEVER use `rotateY` without a matching shadow direction.** If `rotateY(-12deg)` (leaning left), the shadow must fall bottom-left: `boxShadow: "-30px 40px 80px rgba(0,0,0,0.4)"`.

---

## Quality Checklist

- [ ] Scene uses 40/60 split (not centered layout)
- [ ] Text follows 3-Layer Stack: label → headline (MaskedReveal) → subline
- [ ] UI container has `perspective:1200` + `rotateY(-12deg) rotateX(4deg)` (or -8deg for browser frame)
- [ ] UI shadow direction matches rotation (left tilt = shadow falls bottom-left)
- [ ] UI width is `120%` to bleed off right edge
- [ ] Floating badge uses High-Depth glass formula with directional borders
- [ ] Scene wrapped in slow cinematic zoom (`1.0→1.05` over 150f)
- [ ] **No raw `<img>` tags** — all screenshots inside browser frame or ReconstructedAppShell
- [ ] Hold phase elements use `useVitality` (float/breathe/bounce)
