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
  { x: 0.45, y: 0.38, label: "Click Dashboard",  frame: 30,  action: "click" },
  { x: 0.62, y: 0.52, label: "Open Analytics",   frame: 80,  action: "click" },
  { x: 0.30, y: 0.65, label: "Filter by Month",  frame: 130, action: "click" },
  { x: 0.50, y: 0.50, label: null,               frame: 180, action: "idle"  },
];
// x, y are fractions of video width/height (0–1)
```

---

## Cursor Position Interpolation with Spring

For each transition segment, spring from the previous position to the next:

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Find which step we're in
const stepIndex = CURSOR_STEPS.findLastIndex((s) => frame >= s.frame);
const currentStep = CURSOR_STEPS[Math.max(0, stepIndex)];
const prevStep    = CURSOR_STEPS[Math.max(0, stepIndex - 1)];

// Spring progress from prev → current step
const TRAVEL_DURATION = 30; // frames to travel between waypoints
const travelProgress = spring({
  frame: frame - currentStep.frame,
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
const framesAfterArrival = frame - currentStep.frame - TRAVEL_DURATION;
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
  const framesIn = frame - currentStep.frame - TRAVEL_DURATION;
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
    { x: 0.45, y: 0.38, label: "Open Dashboard", frame: 20,  action: "click" },
    { x: 0.62, y: 0.55, label: "View Analytics",  frame: 70,  action: "click" },
    { x: 0.50, y: 0.50, label: null,              frame: 130, action: "idle"  },
  ];

  const stepIndex    = CURSOR_STEPS.findLastIndex((s) => frame >= s.frame);
  const currentStep  = CURSOR_STEPS[Math.max(0, stepIndex)];
  const prevStep     = CURSOR_STEPS[Math.max(0, stepIndex - 1)];
  const TRAVEL       = 25;

  const travelProgress = spring({
    frame: frame - currentStep.frame,
    fps,
    config: { damping: 18, stiffness: 120 },
    durationInFrames: TRAVEL,
  });

  const cursorX = interpolate(travelProgress, [0, 1], [prevStep.x * width,  currentStep.x * width]);
  const cursorY = interpolate(travelProgress, [0, 1], [prevStep.y * height, currentStep.y * height]);

  const framesAfterArrival = frame - currentStep.frame - TRAVEL;
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

## Rules

- Coordinates are **fractions** (0–1) of `width`/`height` from `useVideoConfig()` — never hardcoded pixels
- Always use `Array.findLastIndex` (or a manual loop) to find the current step, not `findIndex`
- Spring `durationInFrames` for travel should be 20–35 frames — fast enough to feel snappy, slow enough to be readable
- Ripple ring should expand AND fade simultaneously for a clean click effect
- Never animate cursor during `action: "idle"` — skip click effects
