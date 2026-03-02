---
title: Premium Cursor Engine
impact: HIGH
impactDescription: creates realistic cursor walkthroughs over UI elements with spring-physics movement, click ripples, and tooltip labels
tags: cursor, click, walkthrough, interaction, spring, ui-demo, product-demo
---

## Premium Cursor Walkthrough Pattern

For product demos that show "someone using the app", animate a cursor that:
1. **Springs** between target coordinates (organic, not linear)
2. **Clicks** with a scale-pulse + ripple effect
3. Optionally shows a **tooltip label** at each stop

---

## Core Cursor State Machine

Define your interaction sequence as an array of waypoints:

```tsx
const CURSOR_STEPS = [
  { x: 0.45, y: 0.38, label: "Click Dashboard", time: 30,  action: "click" },
  { x: 0.62, y: 0.52, label: "Open Analytics",  time: 80,  action: "click" },
  { x: 0.30, y: 0.65, label: "Filter by Month", time: 130, action: "click" },
  { x: 0.50, y: 0.50, label: "",                time: 180, action: "none"  },
];
// x, y are fractions of video width/height (0–1)
// time is the frame number when the cursor arrives at this step
// action: "click" | "hover" | "move" | "none"
```

---

## Cursor Position Interpolation with Spring

For each transition segment, spring from the previous position to the next:

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Find which step we're in
const stepIndex = CURSOR_STEPS.findLastIndex((s) => frame >= s.time);
const currentStep = CURSOR_STEPS[Math.max(0, stepIndex)];
const prevStep    = CURSOR_STEPS[Math.max(0, stepIndex - 1)];

// Spring progress from prev → current step
const TRAVEL_DURATION = 30; // frames to travel between waypoints
const travelProgress = spring({
  frame: frame - currentStep.time,
  fps,
  config: { damping: 18, stiffness: 120 },
  durationInFrames: TRAVEL_DURATION,
});

const cursorX = interpolate(travelProgress, [0, 1], [prevStep.x * width,  currentStep.x * width]);
const cursorY = interpolate(travelProgress, [0, 1], [prevStep.y * height, currentStep.y * height]);
```

---

## Cursor SVG Element

```tsx
// Click pulse: scale from 1 → 0.85 → 1 at the moment of click
const CLICK_ANIM_DURATION = 12;
const framesAfterArrival = frame - currentStep.time - TRAVEL_DURATION;
const isClickFrame = currentStep.action === "click" && framesAfterArrival >= 0 && framesAfterArrival < CLICK_ANIM_DURATION;
const clickPulse = isClickFrame
  ? interpolate(framesAfterArrival, [0, 6, CLICK_ANIM_DURATION], [1, 0.8, 1])
  : 1;

// Ripple: expands out from click point
const rippleScale   = isClickFrame ? interpolate(framesAfterArrival, [0, CLICK_ANIM_DURATION], [0.2, 2.5]) : 0;
const rippleOpacity = isClickFrame ? interpolate(framesAfterArrival, [0, CLICK_ANIM_DURATION], [0.6, 0]) : 0;

<div style={{ position: "absolute", left: cursorX, top: cursorY, transform: "translate(-4px, -2px)", zIndex: 100 }}>
  {/* Click ripple */}
  <div style={{
    position: "absolute",
    width: 40, height: 40,
    borderRadius: "50%",
    border: "2px solid rgba(99,102,241,0.8)",
    transform: `translate(-50%, -50%) scale(${rippleScale})`,
    opacity: rippleOpacity,
    left: 8, top: 8,
  }} />

  {/* Cursor SVG */}
  <svg
    width="24" height="28"
    viewBox="0 0 24 28"
    style={{ transform: `scale(${clickPulse})`, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
  >
    <path d="M0 0 L0 20 L5 15 L10 26 L13 25 L8 14 L15 14 Z" fill="white" />
    <path d="M0 0 L0 20 L5 15 L10 26 L13 25 L8 14 L15 14 Z" fill="none" stroke="#1e293b" strokeWidth="1.5" />
  </svg>

  {/* Tooltip label */}
  {currentStep.label && framesAfterArrival >= 0 && (
    <div style={{
      position: "absolute",
      left: 20, top: -8,
      background: "#1e293b",
      color: "white",
      padding: "4px 10px",
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 500,
      whiteSpace: "nowrap",
      fontFamily: "Inter, sans-serif",
      opacity: interpolate(framesAfterArrival, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
      transform: `translateY(${interpolate(framesAfterArrival, [0, 8], [6, 0], { extrapolateRight: "clamp" })}px)`,
    }}>
      {currentStep.label}
    </div>
  )}
</div>
```

---

## Cursor Motion Trail (Glow Afterimage)

Add a glowing trail of fading dots behind the cursor during movement between waypoints. Trail dots appear only while the cursor is actively traveling (before arrival), then fade out.

```tsx
// Trail: N ghost positions sampled at past frames — renders as fading dots
const TRAIL_LENGTH = 8;   // number of ghost dots
const TRAIL_SPACING = 3;  // frames between each ghost sample

// Compute the cursor position at a given past frame using the same spring logic
function getCursorPos(
  atFrame: number,
  steps: typeof CURSOR_STEPS,
  w: number,
  h: number,
  fpsVal: number,
) {
  const si = steps.findLastIndex((s) => atFrame >= s.time);
  const cur = steps[Math.max(0, si)];
  const prv = steps[Math.max(0, si - 1)];
  const TRAVEL = 25;
  const prog = spring({
    frame: atFrame - cur.time,
    fps: fpsVal,
    config: { damping: 18, stiffness: 120 },
    durationInFrames: TRAVEL,
  });
  return {
    x: interpolate(prog, [0, 1], [prv.x * w, cur.x * w]),
    y: interpolate(prog, [0, 1], [prv.y * h, cur.y * h]),
  };
}

// In render:
const trailDots = Array.from({ length: TRAIL_LENGTH }, (_, i) => {
  const pastFrame = Math.max(0, frame - (i + 1) * TRAIL_SPACING);
  const pos = getCursorPos(pastFrame, CURSOR_STEPS, width, height, fps);
  const opacity = interpolate(i, [0, TRAIL_LENGTH - 1], [0.45, 0]);
  const size    = interpolate(i, [0, TRAIL_LENGTH - 1], [10,   3]);
  // Only show trail during travel (before 25-frame arrival window closes)
  const isMoving = frame - currentStep.time < 30;
  return isMoving ? { pos, opacity, size } : null;
}).filter(Boolean);
```

```tsx
{/* Render trail BEHIND cursor (zIndex: 99) */}
{trailDots.map((dot, i) => dot && (
  <div
    key={i}
    style={{
      position: "absolute",
      left: dot.pos.x - dot.size / 2,
      top:  dot.pos.y - dot.size / 2,
      width: dot.size,
      height: dot.size,
      borderRadius: "50%",
      background: `rgba(99,102,241,${dot.opacity})`,
      boxShadow: `0 0 ${dot.size * 2}px rgba(99,102,241,${dot.opacity * 0.8})`,
      zIndex: 99,
      pointerEvents: "none",
    }}
  />
))}
{/* Cursor SVG at zIndex 100 (on top of trail) */}
```

**Key details**: `getCursorPos` must be a pure function (same args → same output) since it's called once per trail dot per frame. The `isMoving` check prevents trail from lingering after the cursor has arrived and settled at a waypoint.

---

## Highlight Pulse on Target Element

When the cursor arrives at a UI element, pulse a highlight ring around it:

```tsx
// Define target element bounding boxes (fractions of video size)
const TARGET_BOXES: Record<number, { x: number; y: number; w: number; h: number }> = {
  0: { x: 0.40, y: 0.33, w: 0.12, h: 0.06 },
  1: { x: 0.57, y: 0.47, w: 0.10, h: 0.10 },
};

{stepIndex >= 0 && TARGET_BOXES[stepIndex] && (() => {
  const box = TARGET_BOXES[stepIndex];
  const framesIn = frame - currentStep.time - TRAVEL_DURATION;
  if (framesIn < 0) return null;
  const pulseOpacity = interpolate(framesIn, [0, 5, 30, 50], [0, 0.5, 0.3, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute",
      left: box.x * width,  top: box.y * height,
      width: box.w * width, height: box.h * height,
      border: "2px solid #6366f1",
      borderRadius: 8,
      boxShadow: "0 0 12px rgba(99,102,241,0.4)",
      opacity: pulseOpacity,
      pointerEvents: "none",
    }} />
  );
})()}
```

---

## Full Integration Example

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

export const CursorShowcase = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const CURSOR_STEPS = [
    { x: 0.45, y: 0.38, label: "Open Dashboard", time: 20,  action: "click" },
    { x: 0.62, y: 0.55, label: "View Analytics",  time: 70,  action: "click" },
    { x: 0.50, y: 0.50, label: "",                time: 130, action: "none"  },
  ];

  const stepIndex    = CURSOR_STEPS.findLastIndex((s) => frame >= s.time);
  const currentStep  = CURSOR_STEPS[Math.max(0, stepIndex)];
  const prevStep     = CURSOR_STEPS[Math.max(0, stepIndex - 1)];
  const TRAVEL       = 25;

  const travelProgress = spring({
    frame: frame - currentStep.time,
    fps,
    config: { damping: 18, stiffness: 120 },
    durationInFrames: TRAVEL,
  });

  const cursorX = interpolate(travelProgress, [0, 1], [prevStep.x * width,  currentStep.x * width]);
  const cursorY = interpolate(travelProgress, [0, 1], [prevStep.y * height, currentStep.y * height]);

  const framesAfterArrival = frame - currentStep.time - TRAVEL;
  const isClicking = currentStep.action === "click" && framesAfterArrival >= 0 && framesAfterArrival < 12;
  const clickPulse = isClicking ? interpolate(framesAfterArrival, [0, 6, 12], [1, 0.8, 1]) : 1;

  return (
    <AbsoluteFill style={{ background: "#f8fafc" }}>
      {/* ... your product UI behind the cursor ... */}

      {/* Cursor overlay */}
      <div style={{ position: "absolute", left: cursorX, top: cursorY, transform: "translate(-4px, -2px)", zIndex: 100 }}>
        <svg width="24" height="28" viewBox="0 0 24 28"
          style={{ transform: `scale(${clickPulse})`, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
          <path d="M0 0 L0 20 L5 15 L10 26 L13 25 L8 14 L15 14 Z" fill="white" />
          <path d="M0 0 L0 20 L5 15 L10 26 L13 25 L8 14 L15 14 Z" fill="none" stroke="#1e293b" strokeWidth="1.5" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
```

---

## Full-Screen Screenshot with Cursor Overlay (Recommended Pattern)

When `ATTACHED_IMAGES[0]` is available, show the actual product screenshot filling the video frame with a thin browser chrome bar at the top. Place the cursor overlay on top.

```tsx
export const CursorShowcase = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // CURSOR_STEPS use video-space coordinates.
  // If DETECTED_ELEMENTS was injected into the prompt, copy those exact x/y values here.
  const CURSOR_STEPS = [
    { x: 0.45, y: 0.38, label: "Open Dashboard", time: 20,  action: "click" },
    { x: 0.62, y: 0.55, label: "View Analytics",  time: 70,  action: "click" },
    { x: 0.50, y: 0.72, label: "Export Report",   time: 120, action: "click" },
    { x: 0.50, y: 0.50, label: "",                time: 170, action: "none"  },
  ];

  const stepIndex   = CURSOR_STEPS.findLastIndex((s) => frame >= s.time);
  const currentStep = CURSOR_STEPS[Math.max(0, stepIndex)];
  const prevStep    = CURSOR_STEPS[Math.max(0, stepIndex - 1)];
  const TRAVEL      = 25;

  const travelProgress = spring({ frame: frame - currentStep.time, fps, config: { damping: 18, stiffness: 120 }, durationInFrames: TRAVEL });
  const cursorX = interpolate(travelProgress, [0, 1], [prevStep.x * width,  currentStep.x * width]);
  const cursorY = interpolate(travelProgress, [0, 1], [prevStep.y * height, currentStep.y * height]);
  const framesAfterArrival = frame - currentStep.time - TRAVEL;
  const isClicking = currentStep.action === "click" && framesAfterArrival >= 0 && framesAfterArrival < 12;
  const clickPulse = isClicking ? interpolate(framesAfterArrival, [0, 6, 12], [1, 0.8, 1]) : 1;
  const rippleScale   = isClicking ? interpolate(framesAfterArrival, [0, 12], [0.2, 2.5]) : 0;
  const rippleOpacity = isClicking ? interpolate(framesAfterArrival, [0, 12], [0.6, 0]) : 0;

  // Fade in the whole scene
  const sceneOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#0a0a14", opacity: sceneOpacity }}>
      {/* Thin browser chrome bar — 6% of video height */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "6%",
        background: "#1e1e2e",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 8,
        zIndex: 50,
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
        </div>
        <div style={{
          flex: 1, maxWidth: 360, height: 20, marginLeft: 12,
          background: "rgba(255,255,255,0.08)", borderRadius: 4,
          display: "flex", alignItems: "center", paddingLeft: 8,
          fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif",
        }}>
          app.yourproduct.com
        </div>
      </div>

      {/* Product screenshot fills the area below the chrome bar */}
      <div style={{ position: "absolute", top: "6%", left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
        {ATTACHED_IMAGES[0] ? (
          <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#f8fafc" }} />
        )}
      </div>

      {/* Cursor overlay — zIndex 100 puts it above everything */}
      <div style={{ position: "absolute", left: cursorX, top: cursorY, transform: "translate(-4px, -2px)", zIndex: 100 }}>
        {/* Ripple */}
        <div style={{
          position: "absolute", width: 40, height: 40, borderRadius: "50%",
          border: "2px solid rgba(99,102,241,0.8)",
          transform: `translate(-50%, -50%) scale(${rippleScale})`,
          opacity: rippleOpacity, left: 8, top: 8,
        }} />
        {/* Cursor SVG */}
        <svg width="24" height="28" viewBox="0 0 24 28"
          style={{ transform: `scale(${clickPulse})`, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}>
          <path d="M0 0 L0 20 L5 15 L10 26 L13 25 L8 14 L15 14 Z" fill="white" />
          <path d="M0 0 L0 20 L5 15 L10 26 L13 25 L8 14 L15 14 Z" fill="none" stroke="#1e293b" strokeWidth="1.5" />
        </svg>
        {/* Tooltip */}
        {currentStep.label && framesAfterArrival >= 0 && (
          <div style={{
            position: "absolute", left: 20, top: -8,
            background: "#1e293b", color: "white",
            padding: "4px 10px", borderRadius: 6,
            fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
            fontFamily: "Inter, sans-serif",
            opacity: interpolate(framesAfterArrival, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(framesAfterArrival, [0, 8], [6, 0], { extrapolateRight: "clamp" })}px)`,
          }}>
            {currentStep.label}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
```

### DETECTED_ELEMENTS Injection Pattern

When the system injects a `DETECTED_ELEMENTS` block into the prompt, those coordinates are already in video space (screenshot sits below 6% chrome bar). Copy them directly into `CURSOR_STEPS`:

```tsx
// Injected by the system when a screenshot is uploaded:
// const DETECTED_ELEMENTS = [
//   { label: "Sign Up button", x: 0.683, y: 0.412 },
//   { label: "Dashboard tab",  x: 0.234, y: 0.089 },
//   ...
// ];

// Select 3–5 and map to CURSOR_STEPS:
const CURSOR_STEPS = [
  { x: DETECTED_ELEMENTS[0].x, y: DETECTED_ELEMENTS[0].y, label: DETECTED_ELEMENTS[0].label, time: 20,  action: "click" },
  { x: DETECTED_ELEMENTS[1].x, y: DETECTED_ELEMENTS[1].y, label: DETECTED_ELEMENTS[1].label, time: 70,  action: "click" },
  { x: DETECTED_ELEMENTS[2].x, y: DETECTED_ELEMENTS[2].y, label: DETECTED_ELEMENTS[2].label, time: 120, action: "click" },
  { x: 0.5, y: 0.5, label: "", time: 170, action: "none" },
];
```

---

## Rules

- Coordinates are **fractions** (0–1) of `width`/`height` from `useVideoConfig()` — never hardcoded pixels
- Always use `Array.findLastIndex` (or a manual loop) to find the current step, not `findIndex`
- Spring `durationInFrames` for travel should be 20–35 frames — fast enough to feel snappy, slow enough to be readable
- Ripple ring should expand AND fade simultaneously for a clean click effect
- Never animate cursor during `action: "none"` — skip click effects
