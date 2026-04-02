---
title: Premium Cursor Engine
impact: HIGH
impactDescription: creates realistic, human-feeling cursor walkthroughs using a magnetic hand cursor, intent pills during travel, and dwell-jitter before clicks
tags: cursor, click, walkthrough, interaction, spring, ui-demo, product-demo, hand-cursor, intent-pill
qualityBar: The cursor feels like a real human hand navigating the UI with purpose. It travels in smooth arcs, displays its intent while moving, dwells with a tiny jitter before clicking, and triggers a tactile double-ripple and "squeeze" on click, while the camera subtly punches in on the action.
---

## Scene Purpose
Demonstrates how a user interacts with the product. It transforms static UI screenshots or reconstructed components into a living, breathing application tour. It is the core of the "show, don't tell" methodology.

## Visual Blueprint
```text
[      Cinematic Camera Wrapper (1.0 -> 1.06 Zoom)      ]
[                                                        ]
[   [UI Element]            [UI Element]                 ]
[                                                        ]
[                     (Travel Arc)                       ]
[           +-----------------------+                    ]
[           |                       v                    ]
[   [UI Element]               [Target Element]          ]
[                              ((Ripple))                ]
[                              👆 (Hand Cursor)          ]
[                              [Intent Pill]             ]
```

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

export const CursorShowcase = ({ BRAND, ATTACHED_IMAGES }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 1. DEFINE WAYPOINTS (normalize 0-1 coordinates)
  const CURSOR_STEPS = [
    { x: 0.50, y: 1.10, label: "",               time: 0,   action: "none"  }, // start off-screen bottom
    { x: 0.45, y: 0.38, label: "Open Dashboard", time: 30,  action: "click" },
    { x: 0.62, y: 0.55, label: "View Analytics", time: 92,  action: "click" }, // prev.time + TRAVEL(22) + DWELL(10) + CLICK(14) + hold(~16)
    { x: 0.50, y: 0.80, label: "",               time: 154, action: "none"  },
  ];

  // Optional but recommended: add elementType so CursorRenderer can switch icons
  // elementType: "button" | "input" | "dropdown" | "card" | "nav"
  // Example:
  // { x:0.45, y:0.38, label:"Open Dashboard", time:30, action:"click", elementType:"nav" }

  // 2. TIMING CONSTANTS (MANDATORY EXACT VALUES)
  const TRAVEL = 22;   // fast, snappy travel
  const DWELL  = 10;   // pause before clicking — makes it feel human
  const CLICK  = 14;   // squeeze and release

  // 3. DETERMINE CURRENT STATE
  const stepIndex = Math.max(0, CURSOR_STEPS.findLastIndex((s) => frame >= s.time));
  const cur  = CURSOR_STEPS[stepIndex];
  const prev = CURSOR_STEPS[Math.max(0, stepIndex - 1)];

  const timeSinceStep = frame - cur.time;

  // 4. MAGNETIC SNAP MOTION PROFILE (stiffness:160, damping:12 = subtle overshoot)
  const travelSpring = spring({
    frame: timeSinceStep,
    fps,
    config: { stiffness: 160, damping: 12 },
    durationInFrames: TRAVEL,
  });

  // 5. BEZIER ARC INTERPOLATION (cubicBezier is in scope — do NOT declare it)
  const pos = cubicBezier(
    { x: prev.x * width, y: prev.y * height },
    { x: cur.x * width,  y: cur.y * height },
    travelSpring,
    0.15, // arc intensity: 0.15 subtle, 0.25 dramatic
  );

  let cursorX = pos.x;
  let cursorY = pos.y;

  // 6. DWELL PHASE — arrives after TRAVEL, dwells for DWELL frames
  const DWELL_START = cur.time + TRAVEL;
  const isDwelling  = frame >= DWELL_START && frame < DWELL_START + DWELL;

  // Micro-jitter during dwell: sine/cosine tremor simulates human hand
  if (isDwelling && cur.action !== "none") {
    cursorX += Math.sin(frame * 1.8) * 1.2;
    cursorY += Math.cos(frame * 2.1) * 0.8;
  }

  // 7. CLICK — fires AFTER dwell
  const CLICK_START       = DWELL_START + DWELL;
  const framesAfterClick  = frame - CLICK_START;
  const isClicking        = cur.action === "click" && framesAfterClick >= 0 && framesAfterClick < CLICK;

  // Hand squeezes down on click
  const clickSqueeze = isClicking
    ? interpolate(framesAfterClick, [0, 4, CLICK], [1, 0.84, 1])
    : 1;

  // Double ripple (ring 2 delayed 3 frames after ring 1)
  const RIPPLE_DUR = 16;
  const ripple1Scale   = isClicking ? interpolate(framesAfterClick,     [0, RIPPLE_DUR], [0.1, 2.8]) : 0;
  const ripple1Opacity = isClicking ? interpolate(framesAfterClick,     [0, RIPPLE_DUR], [0.7, 0])   : 0;
  const ripple2Scale   = isClicking && framesAfterClick >= 3 ? interpolate(framesAfterClick - 3, [0, RIPPLE_DUR], [0.1, 2.2]) : 0;
  const ripple2Opacity = isClicking && framesAfterClick >= 3 ? interpolate(framesAfterClick - 3, [0, RIPPLE_DUR], [0.5, 0])   : 0;

  // 8. INTENT PILL — shows during travel for significant distances (> 200px)
  const isTraveling = timeSinceStep >= 0 && timeSinceStep < TRAVEL;
  const distPx      = Math.hypot((cur.x - prev.x) * width, (cur.y - prev.y) * height);
  const showPill    = isTraveling && cur.label && distPx > 200;
  const travelPct   = timeSinceStep / TRAVEL; // 0 → 1
  const pillOpacity = showPill
    ? travelPct < 0.65
      ? interpolate(timeSinceStep, [0, 6], [0, 1], { extrapolateRight: "clamp" })
      : interpolate(travelPct, [0.65, 1.0], [1, 0])
    : 0;

  // 9. CLICK-ZOOM — camera punches in on click, eases back out
  const ZOOM_IN = 18; const ZOOM_HOLD = 20; const ZOOM_OUT = 22;
  const shouldZoom = cur.action === "click" && framesAfterClick >= 0;
  const zoomScale  = shouldZoom
    ? framesAfterClick < ZOOM_IN
      ? interpolate(framesAfterClick, [0, ZOOM_IN], [1.0, 1.06])
      : framesAfterClick < ZOOM_IN + ZOOM_HOLD
        ? 1.06
        : interpolate(framesAfterClick, [ZOOM_IN + ZOOM_HOLD, ZOOM_IN + ZOOM_HOLD + ZOOM_OUT], [1.06, 1.0], { extrapolateRight: "clamp" })
    : 1.0;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a" }}>

      {/* Screenshot layer — zooms in on click, origin at click point */}
      <div style={{
        position: "absolute", inset: 0,
        transform: `scale(${zoomScale})`,
        transformOrigin: `${cur.x * 100}% ${cur.y * 100}%`,
      }}>
        {ATTACHED_IMAGES[0] ? (
          <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#0f172a" }} />
        )}
        {/* Chameleon overlays go inside this div at z=10 */}
      </div>

      {/* Cursor layer (always outside zoom/camera wrappers, at z=150) */}
      {/* Preferred: use CursorRenderer so icon switching is automatic */}
      {/* <CursorRenderer steps={CURSOR_STEPS} uiSchema={UI_SCHEMA} /> */}

      {/* Manual cursor rendering (fallback) */}
      <div style={{ position: "absolute", left: cursorX, top: cursorY, zIndex: 150, pointerEvents: "none" }}>

        {/* Double ripple */}
        <div style={{ position: "absolute", width: 44, height: 44, borderRadius: "50%", border: `2px solid ${BRAND.primary || "#6366f1"}`, transform: `translate(-50%,-50%) scale(${ripple1Scale})`, opacity: ripple1Opacity, left: 8, top: 8 }} />
        <div style={{ position: "absolute", width: 32, height: 32, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.6)", transform: `translate(-50%,-50%) scale(${ripple2Scale})`, opacity: ripple2Opacity, left: 8, top: 8 }} />

        {/* HAND_CURSOR — use the scope variable, NEVER create inline SVG */}
        <div style={{ transform: `scale(${clickSqueeze})`, transformOrigin: "12px 4px" }}>
          {HAND_CURSOR}
        </div>

        {/* Intent pill — visible during long-distance travel, fades as cursor decelerates */}
        <div style={{
          position: "absolute", left: 24, top: 10,
          background: "#1e293b", color: "#fff",
          padding: "6px 12px", borderRadius: 8,
          fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
          fontFamily: "Inter, sans-serif",
          opacity: pillOpacity,
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          transform: `translateY(${interpolate(pillOpacity, [0, 1], [4, 0])}px)`,
          pointerEvents: "none",
        }}>
          {cur.label}…
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

## Spring / Timing Reference

| Event | Start Frame | Config | Description |
|---|---|---|---|
| **Travel** | `cur.time` | `dur: 22`, `stiff: 160, damp: 12` | Magnetic snap with subtle overshoot. |
| **Dwell** | `cur.time + 22` | `dur: 10`, `sin(f*1.8)*1.2` | Pause + micro-tremor before click. |
| **Click/Squeeze** | `cur.time + 32` | `dur: 14`, `interp([0,4,14],[1,.84,1])` | Finger curls into click position. |
| **Ripple 1** | `cur.time + 32` | `dur: 16`, `scale(0.1→2.8)`, brand color | First ring, fast expand. |
| **Ripple 2** | `cur.time + 35` | `dur: 16`, `scale(0.1→2.2)`, white | Second ring, delayed 3f. |
| **Click-Zoom In** | `cur.time + 32` | `18f`, `scale(1.0→1.06)` | Camera punches in on click. |
| **Click-Zoom Hold** | `cur.time + 50` | `20f at 1.06` | Hold at peak zoom. |
| **Click-Zoom Out** | `cur.time + 70` | `22f`, `scale(1.06→1.0)` | Ease back to normal. |

## CURSOR_STEPS Timing Formula

With `TRAVEL=22 + DWELL=10 + CLICK=14 + hold≈16`, each step needs **62+ frames** minimum:

```tsx
const CURSOR_STEPS = [
  { x: 0.50, y: 1.10, label: "",               time: 0,   action: "none"  }, // off-screen entry
  { x: 0.45, y: 0.38, label: "Open Dashboard", time: 20,  action: "click" }, // arrives f:42, click f:52
  { x: 0.62, y: 0.52, label: "View Analytics", time: 82,  action: "click" }, // arrives f:104, click f:114
  { x: 0.30, y: 0.65, label: "Export Report",  time: 144, action: "click" }, // arrives f:166, click f:176
  { x: 0.50, y: 0.50, label: "",               time: 206, action: "none"  }, // settle
];
```

---

## Variants

### Progressive Camera Follow
Camera slowly lerps toward the cursor's general area, like a real videographer:

```tsx
const CAMERA_LAG = 35;
const camProg = Math.min(Math.max(timeSinceStep + CAMERA_LAG, 0) / CAMERA_LAG, 1);
const cameraX = prev.x + (cur.x - prev.x) * camProg;
const cameraY = prev.y + (cur.y - prev.y) * camProg;

// Pass to CinematicCamera (keep zoomTo at 1.06 max with progressive zoom)
<CinematicCamera targetX={cameraX} targetY={cameraY} zoomTo={1.06}>
  {/* scene content */}
</CinematicCamera>
```

### Full-Screen Screenshot with Browser Chrome
```tsx
<AbsoluteFill style={{ background: "#0a0a14" }}>
  {/* Thin browser chrome bar */}
  <div style={{
    position: "absolute", top: 0, left: 0, right: 0, height: "6%",
    background: "#1e1e2e", borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex", alignItems: "center", padding: "0 16px", gap: 8, zIndex: 50,
  }}>
    <div style={{ display: "flex", gap: 6 }}>
      {["#ef4444", "#eab308", "#22c55e"].map((c, i) => (
        <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
      ))}
    </div>
    <div style={{ flex: 1, maxWidth: 360, height: 20, marginLeft: 12, background: "rgba(255,255,255,0.08)", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 8, fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif" }}>
      app.yourproduct.com
    </div>
  </div>
  {/* Screenshot fills below chrome (6%→100%) */}
  <div style={{ position: "absolute", top: "6%", left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
    {ATTACHED_IMAGES[0] && (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top",
        transform: `scale(${zoomScale})`, transformOrigin: `${cur.x * 100}% ${cur.y * 100}%` }} />
    )}
  </div>
  {/* Cursor at z=100 */}
</AbsoluteFill>
```

---

## Additional Techniques

### Cursor Motion Trail (Glow Afterimage)
```tsx
const TRAIL_LENGTH = 8;
const TRAIL_SPACING = 3;

function getCursorPos(atFrame: number, steps: typeof CURSOR_STEPS, w: number, h: number, fpsVal: number) {
  const si  = steps.findLastIndex((s) => atFrame >= s.time);
  const cur = steps[Math.max(0, si)];
  const prv = steps[Math.max(0, si - 1)];
  const prog = spring({ frame: atFrame - cur.time, fps: fpsVal, config: { stiffness: 160, damping: 12 }, durationInFrames: 22 });
  const pos = cubicBezier({ x: prv.x * w, y: prv.y * h }, { x: cur.x * w, y: cur.y * h }, prog, 0.15);
  return pos;
}

const isMoving = timeSinceStep < TRAVEL;
const trailDots = isMoving
  ? Array.from({ length: TRAIL_LENGTH }, (_, i) => {
      const pastFrame = Math.max(0, frame - (i + 1) * TRAIL_SPACING);
      return {
        pos: getCursorPos(pastFrame, CURSOR_STEPS, width, height, fps),
        opacity: interpolate(i, [0, TRAIL_LENGTH - 1], [0.4, 0]),
        size: interpolate(i, [0, TRAIL_LENGTH - 1], [9, 3]),
      };
    })
  : [];

{/* Render at z=99, before cursor div */}
{trailDots.map((dot, i) => (
  <div key={i} style={{
    position: "absolute",
    left: dot.pos.x - dot.size / 2, top: dot.pos.y - dot.size / 2,
    width: dot.size, height: dot.size, borderRadius: "50%",
    background: `rgba(${BRAND.primary ? "99,102,241" : "99,102,241"},${dot.opacity})`,
    zIndex: 99, pointerEvents: "none",
  }} />
))}
```

### I-Beam Morphing (Input Fields)
When `elementType === "input"`, swap to an I-beam cursor:
```tsx
{cur.elementType === "input" ? (
  <svg width="16" height="28" viewBox="0 0 16 28" style={{ transform: `scale(${clickSqueeze})`, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}>
    <line x1="2" y1="4" x2="14" y2="4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <line x1="2" y1="24" x2="14" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="4" x2="8" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
) : (
  // Hand cursor SVG (see above)
)}
```

### Keyboard Key Pill (Input Steps)
Show `Enter ↵` or `Tab ⇥` near end of typing step:
```tsx
const isTypingStep = cur.elementType === "input";
const nextStep = CURSOR_STEPS[Math.min(stepIndex + 1, CURSOR_STEPS.length - 1)];
const KEY_SHOW_AT = (cur.dwellFrames ?? 30) - 15;
const showKeyPill = isTypingStep && framesAfterClick > KEY_SHOW_AT && framesAfterClick < KEY_SHOW_AT + 20;
const keyLabel = nextStep?.elementType === "input" ? "Tab ⇥" : "Enter ↵";

{showKeyPill && (
  <div style={{
    position: "absolute", left: cursorX - 20, top: cursorY + 28,
    background: "rgba(30,30,50,0.92)", border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff", padding: "4px 12px", borderRadius: 8,
    fontSize: 12, fontWeight: 600, fontFamily: "monospace",
    opacity: interpolate(framesAfterClick, [KEY_SHOW_AT, KEY_SHOW_AT+6, KEY_SHOW_AT+14, KEY_SHOW_AT+20], [0,1,1,0]),
    zIndex: 102, pointerEvents: "none",
  }}>
    {keyLabel}
  </div>
)}
```

### Element Highlight Pulse
Pulse a selection ring on the target element when cursor arrives:
```tsx
const TARGET_BOXES: Record<number, { x: number; y: number; w: number; h: number }> = {
  1: { x: 0.40, y: 0.33, w: 0.12, h: 0.06 },
  2: { x: 0.57, y: 0.47, w: 0.10, h: 0.10 },
};

{TARGET_BOXES[stepIndex] && (() => {
  const box = TARGET_BOXES[stepIndex];
  const framesIn = frame - cur.time - TRAVEL;
  if (framesIn < 0) return null;
  const pulseOpacity = interpolate(framesIn, [0, 5, 30, 50], [0, 0.5, 0.3, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute",
      left: box.x * width, top: box.y * height,
      width: box.w * width, height: box.h * height,
      border: `2px solid ${BRAND.primary}`,
      borderRadius: 8,
      boxShadow: `0 0 12px ${BRAND.primary}66`,
      opacity: pulseOpacity, pointerEvents: "none",
    }} />
  );
})()}
```

### Reconstructed UI Targeting (Named Target System)
For cursor scenes over `AnimatedSidebar`, `AnimatedTopbar`, `AnimatedTable`:
```tsx
const SIDEBAR_W = 240;
const TOPBAR_H  = 48;

const TARGETS = {
  "sidebar-dashboard":   { x: SIDEBAR_W / 2 / width,         y: 0.15 },
  "sidebar-reports":     { x: SIDEBAR_W / 2 / width,         y: 0.22 },
  "topbar-tab-0":        { x: (SIDEBAR_W + 60) / width,      y: TOPBAR_H / 2 / height },
  "topbar-tab-1":        { x: (SIDEBAR_W + 175) / width,     y: TOPBAR_H / 2 / height },
  "table-row-1":         { x: 0.6,  y: 0.45 },
  "form-submit":         { x: 0.65, y: 0.75 },
};

// Sidebar item y by index: (80 + index * 44 + 22) / height
```

State changes fire 10 frames after click (DWELL_START + DWELL):
```tsx
const activeTab      = frame >= /* click frame */ + 10 ? 1 : 0;
const highlightedRow = frame >= /* click frame */ + 10 ? 0 : -1;

<AnimatedTopbar activeTabIndex={activeTab} ... />
<AnimatedTable rows={rows.map((r, i) => ({ ...r, isHighlighted: i === highlightedRow }))} ... />
```

### DETECTED_ELEMENTS Injection Pattern
When `DETECTED_ELEMENTS` is injected in the prompt, copy coordinates verbatim:
```tsx
// System injects: DETECTED_ELEMENTS = [{ label, x, y }, ...]
const CURSOR_STEPS = [
  { x: 0.50, y: 1.10, label: "", time: 0, action: "none" },
  { x: DETECTED_ELEMENTS[0].x, y: DETECTED_ELEMENTS[0].y, label: DETECTED_ELEMENTS[0].label, time: 20,  action: "click" },
  { x: DETECTED_ELEMENTS[1].x, y: DETECTED_ELEMENTS[1].y, label: DETECTED_ELEMENTS[1].label, time: 82,  action: "click" },
  { x: DETECTED_ELEMENTS[2].x, y: DETECTED_ELEMENTS[2].y, label: DETECTED_ELEMENTS[2].label, time: 144, action: "click" },
  { x: 0.5, y: 0.5, label: "", time: 206, action: "none" },
];
```

---

## Hover Pre-State (Three-Phase Interaction Model)

**This is the most important quality upgrade for cursor scenes.**
WhatAStory UI elements react *before* the click — not just *during* it. Use `useCursorState` which returns `approachPhase`, `isHovering`, and `hoverProgress` to drive all three phases.

```
Phase 1 — approach   (last 12 travel frames):  approachPhase 0→1  → element brightens
Phase 2 — hover      (17 frames pre-click):    isHovering=true, hoverProgress 0→1  → focus ring, glow, scale-up
Phase 3 — click      (4 frames):               isClicking=true  → squish, ripple, state change
```

### Pattern: Full Three-Phase Button

```tsx
const { x, y, approachPhase, isHovering, hoverProgress, isClicking } = useCursorState(CURSOR_STEPS);
const cursorX = x * width;
const cursorY = y * height;

// Only react when cursor is near this specific button (proximity guard)
const BTN = { x: 0.62, y: 0.55, w: 0.18, h: 0.07 }; // normalized box
const isTargeted = x >= BTN.x && x <= BTN.x + BTN.w && y >= BTN.y && y <= BTN.y + BTN.h;
const glowActive = isTargeted ? hoverProgress : 0;

<div style={{
  position: "absolute",
  left: BTN.x * width, top: BTN.y * height,
  width: BTN.w * width, height: BTN.h * height,
  background: BRAND.primary,
  borderRadius: 10,
  // Phase 1 — brighten as cursor approaches
  filter: `brightness(${1 + 0.15 * approachPhase * (isTargeted ? 1 : 0)})`,
  // Phase 2 — glow + focus ring + scale up
  boxShadow: `0 0 ${24 * glowActive}px ${BRAND.primary}88`,
  outline: isHovering && isTargeted ? `2px solid ${BRAND.primary}` : "none",
  transform: `scale(${isClicking && isTargeted ? 0.94 : 1 + 0.04 * glowActive})`,
  transition: "none", // Remotion does not use CSS transitions
}}>
  Submit
</div>
```

### Pattern: Tooltip on Hover

```tsx
const tooltipOpacity = isHovering && isTargeted
  ? interpolate(hoverProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" })
  : 0;

{/* Tooltip appears above the button during hover */}
<div style={{
  position: "absolute",
  left: BTN.x * width + (BTN.w * width / 2), top: BTN.y * height - 40,
  transform: `translateX(-50%) translateY(${interpolate(tooltipOpacity, [0,1], [8,0])}px)`,
  background: "#1e293b", color: "#fff",
  padding: "5px 10px", borderRadius: 6,
  fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
  opacity: tooltipOpacity, pointerEvents: "none", zIndex: 101,
  fontFamily: "Inter, sans-serif",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
}}>
  Click to submit
  {/* Small arrow */}
  <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1e293b" }} />
</div>
```

### Pattern: Input Focus Ring (typing steps)

```tsx
// For elementType === "input" steps — show focus ring when cursor hovers over the field
const INPUT_BOX = { x: 0.28, y: 0.44, w: 0.45, h: 0.06 };
const inputTargeted = x >= INPUT_BOX.x && x <= INPUT_BOX.x + INPUT_BOX.w;
const focusRingOpacity = isHovering && inputTargeted ? hoverProgress : 0;

<div style={{
  position: "absolute",
  left: INPUT_BOX.x * width, top: INPUT_BOX.y * height,
  width: INPUT_BOX.w * width, height: INPUT_BOX.h * height,
  outline: `2px solid ${BRAND.primary}`,
  outlineOffset: 2,
  borderRadius: 6,
  opacity: focusRingOpacity,
  boxShadow: `0 0 0 4px ${BRAND.primary}20`,
  pointerEvents: "none", zIndex: 10,
}} />
```

### Timing Reference (with hover phases added)

| Phase | Frame offset | Duration | State |
|---|---|---|---|
| **Travel** | `cur.time` | 22f | `approachPhase` rises last 12f |
| **Overshoot settle** | `cur.time + 22` | 12f | `isHovering=true`, `hoverProgress` 0→0.7 |
| **Pre-click pause** | `cur.time + 34` | 5f | `isHovering=true`, `hoverProgress` 0.7→1.0 |
| **Click/Squeeze** | `cur.time + 39` | 4f | `isClicking=true` |
| **Post-click** | `cur.time + 43` | — | `hoverProgress` stays at 1.0 |

**Update the checklist item:** Step timing now needs TRAVEL(22) + HOVER(17) + CLICK(4) = **43f minimum** between steps (previously 32f).

---

## When to Use the Hand Cursor

- Any cursor-engine scene for a SaaS explainer, tutorial, or product demo video
- Particularly when the brand style is friendly, consumer-facing, or the video tone is "watch how easy this is"
- **Do NOT** use for technical/dev tool brands — those look better with the default arrow cursor
- The flat cartoon pointing-hand is the #1 cursor style in SaaS explainer videos (Fronter, Arcade, Loom). It reads as a human demonstrating the product rather than a system cursor.

## Anti-Patterns (NEVER do these)
- **NEVER create an inline `<svg>` for the cursor**. Always use `{HAND_CURSOR}` from scope. Creating your own SVG is a quality violation.
- **NEVER add headline text, subtitles, or floating text to a cursor scene**. The screenshot + cursor IS the content. Text goes in separate scenes.
- **NEVER use the arrow SVG** (`M0 0 L0 20...`). It looks robotic. Always use `{HAND_CURSOR}`.
- **NEVER skip hover pre-states**. Buttons that don't react before the click feel like slideshows, not products.
- **NEVER click the instant the cursor arrives**. Zero-dwell feels artificial. Always add 10-frame DWELL with micro-jitter.
- **NEVER move in straight lines**. Use `cubicBezier()` for natural arcs.
- **NEVER use stiffness:90** for cursor travel. Use `stiffness:160, damping:12` for magnetic snap.
- **NEVER skip the click-zoom**. Even 1.0→1.06 centered on the click point adds enormous production value.
- **NEVER show intent pill for short hops** (< 200px). Only show for significant cross-screen travel.

## AGENCY UPGRADE MANDATES (added 2026-03)

**SteppedCamera — MANDATORY for all cursor scenes**
The camera must anticipate the cursor, not follow it. Use usePreFocusCamera:
```tsx
// Camera pre-locks on next target 15f before cursor arrives
const nextTarget = CURSOR_STEPS[stepIndex + 1];
const { zoom, panX, panY } = usePreFocusCamera(
  nextTarget?.x ?? curX, nextTarget?.y ?? curY,
  (nextTarget?.time ?? frame) - 15
);
```
Camera sequence per click: drift toward target → hard lock (hold 20f) → cursor arrives → click.

**Anticipation Rule — cursor arrives 10–15f before click**
The hover pre-state (glow/focus-ring) MUST be visible for at least 10 frames before the click triggers. This is the #1 difference between agency-quality and robotic cursor demos. The `isHovering` state from useHumanizedCursor handles this automatically — just make sure the UI element reacts to `hoverProgress`.

**Context-aware cursor icon (WhatAStory style)**
- Use `CursorRenderer` (in scope) to auto-switch icons:
  - buttons/tabs: hand cursor
  - inputs: I‑beam
  - elsewhere: pointer
- If you render cursor manually, you must still switch the icon based on `elementType`.

**Premium path smoothing**
If you need UI elements to react to cursor proximity, compute cursor position with Catmull–Rom smoothing:
```tsx
const cursorPos = useCursorPos(CURSOR_STEPS, 30, { smoothing: "catmullRom", tension: 0.5 });
```

**Tactile Feedback — mandatory at every click**
Every click MUST trigger `useInteractionFeedback`:
```tsx
const { squish, nudgeX, nudgeY, glowRadius } = useInteractionFeedback(clickFrame, "down");
// Apply to clicked element: scale(squish) and GlowBloom behind it
```

**No raw screenshots**
UI elements MUST use ReconstructedAppShell (when UI_SCHEMA present) or AppShell/TaskDetailPanel/ModalOverlay components. Never `<img>` tags in cursor scenes.

---

## Quality Checklist
- [ ] Hand cursor SVG (realistic pointing finger with knuckle crease), NOT arrow
- [ ] TRAVEL = 22 frames, `stiffness: 160, damping: 12` (magnetic snap with overshoot)
- [ ] `cubicBezier()` arc interpolation (not linear)
- [ ] **usePreFocusCamera** active — camera leads cursor by 15f to each target
- [ ] **Approach phase**: target element brightens as cursor decelerates into it (`approachPhase` 0→1)
- [ ] **Hover pre-state**: focus ring / glow / scale-up appears when cursor arrives (`isHovering`, `hoverProgress`) — minimum 10f before click
- [ ] **useInteractionFeedback** on every click (squish + GlowBloom)
- [ ] **Click squish**: element scales to 0.94 during `isClicking`, springs back
- [ ] Intent pill visible during travel, fades as cursor decelerates into target
- [ ] Intent pill only shows for travel distance > 200px
- [ ] Double ripple on click (ring 1 brand color, ring 2 white, 3-frame delay)
- [ ] Click-zoom: screenshot scales 1.0→1.06, origin at click coordinates, eases back out
- [ ] Cursor rendered OUTSIDE any zoom/camera wrapper (stays at z=100)
- [ ] Step timing accounts for TRAVEL(22) + HOVER(17) + CLICK(4) + hold — minimum 43f per step (use 60f+ for readability)
- [ ] No raw `<img>` tags — UI in AppShell/ReconstructedAppShell components
