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
  { x: 0.50, y: 0.85, label: "",                time: 0,   action: "none"  }, // ALWAYS start here — cursor enters from bottom-center
  { x: 0.45, y: 0.38, label: "Click Dashboard", time: 30,  action: "click" },
  { x: 0.62, y: 0.52, label: "Open Analytics",  time: 80,  action: "click" },
  { x: 0.30, y: 0.65, label: "Filter by Month", time: 130, action: "click" },
  { x: 0.50, y: 0.50, label: "",                time: 180, action: "none"  },
];
// x, y are fractions of video width/height (0–1)
// time is the frame number when the cursor spring/movement STARTS (not when it arrives)
// click fires at time + 25 (TRAVEL_DURATION frames after spring starts)
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
const TRAVEL_DURATION = 25; // frames to travel between waypoints (must match TRAVEL=25 everywhere)
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
  const isMoving = frame - currentStep.time < 25;
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
    { x: 0.50, y: 0.85, label: "",                time: 0,   action: "none"  }, // initial anchor — cursor enters from bottom-center
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

## Cursor Style: Arrow vs Hand

This skill renders the default **arrow cursor** (diagonal pointer). For the flat cartoon **pointing hand** used in SaaS explainer videos (Fronter, Arcade, Loom style), use `premium-hand-cursor` instead — it is a drop-in replacement with identical CURSOR_STEPS / spring logic, only the SVG changes.

**Arrow cursor** (this skill) — standard, works for all product types, especially technical/dev tools.
**Hand cursor** (`premium-hand-cursor`) — warmer, friendlier feel; preferred for consumer SaaS, collaboration tools, design tools.

---

## Rules

- Coordinates are **fractions** (0–1) of `width`/`height` from `useVideoConfig()` — never hardcoded pixels
- Always use `Array.findLastIndex` (or a manual loop) to find the current step, not `findIndex`
- Spring `durationInFrames` for travel should be 20–35 frames — fast enough to feel snappy, slow enough to be readable
- Ripple ring should expand AND fade simultaneously for a clean click effect
- Never animate cursor during `action: "none"` — skip click effects

---

## Morphing Cursor (Pointer ↔ I-Beam)

When a step's `elementType === "input"`, swap the cursor SVG to an I-beam to signal text entry.

```tsx
const isInput = currentStep.elementType === "input";

// Render inside the cursor wrapper div:
{isInput ? (
  // I-beam cursor
  <svg width="16" height="28" viewBox="0 0 16 28"
    style={{ transform: `scale(${clickPulse})`, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}>
    {/* Horizontal serifs */}
    <line x1="2" y1="4" x2="14" y2="4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <line x1="2" y1="24" x2="14" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    {/* Vertical stem */}
    <line x1="8" y1="4" x2="8" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    {/* Outline for visibility */}
    <line x1="2" y1="4" x2="14" y2="4" stroke="#1e293b" strokeWidth="0.8" strokeLinecap="round"/>
    <line x1="2" y1="24" x2="14" y2="24" stroke="#1e293b" strokeWidth="0.8" strokeLinecap="round"/>
    <line x1="8" y1="4" x2="8" y2="24" stroke="#1e293b" strokeWidth="0.8" strokeLinecap="round"/>
  </svg>
) : (
  // Default pointer arrow
  <svg width="24" height="28" viewBox="0 0 24 28"
    style={{ transform: `scale(${clickPulse})`, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}>
    <path d="M0 0 L0 20 L5 15 L10 26 L13 25 L8 14 L15 14 Z" fill="white" />
    <path d="M0 0 L0 20 L5 15 L10 26 L13 25 L8 14 L15 14 Z" fill="none" stroke="#1e293b" strokeWidth="1.5" />
  </svg>
)}
```

---

## Chameleon Spotlight (Focus Darkening)

When interacting with an input field, darken the rest of the screen with an SVG inverse-mask that cuts out a transparent rect around the active element. This draws the viewer's eye to the typing action.

```tsx
// Only show spotlight when cursor is on an input and has arrived
const framesAfterArrival = frame - currentStep.time - TRAVEL;
const isInput = currentStep.elementType === "input";
const showSpotlight = isInput && framesAfterArrival >= 0;
const spotlightOpacity = showSpotlight
  ? interpolate(framesAfterArrival, [0, 10], [0, 0.55], { extrapolateRight: "clamp" })
  : 0;

// box comes from currentStep.box (populated from INTERACTION_SCRIPT)
const box = currentStep.box ?? { x: 0, y: 0, w: 0, h: 0 };
const bx = box.x * width;
const by = box.y * height;
const bw = box.w * width;
const bh = box.h * height;
const PADDING = 12;

{spotlightOpacity > 0 && (
  <svg
    style={{ position:"absolute", inset:0, zIndex:9, pointerEvents:"none" }}
    width={width} height={height}
  >
    <defs>
      <clipPath id="spotlight-clip">
        <path
          fillRule="evenodd"
          d={`M0 0 H${width} V${height} H0 Z M${bx - PADDING} ${by - PADDING} H${bx + bw + PADDING} V${by + bh + PADDING} H${bx - PADDING} Z`}
        />
      </clipPath>
    </defs>
    <rect
      x={0} y={0} width={width} height={height}
      fill={`rgba(0,0,0,${spotlightOpacity})`}
      clipPath="url(#spotlight-clip)"
    />
  </svg>
)}
```

**Important**: Render the spotlight at `zIndex: 9` (below overlays at 10, below cursor at 100, below chrome bar at 50). The SVG inverse-mask technique uses `fillRule="evenodd"` on a compound path — outer rect creates darkness, inner rect punches a transparent hole around the active element.

---

## Click-Zoom (Punch-In Effect)

The signature look of professional SaaS demo tools (Arcade, Storylane). On each click, the screenshot layer zooms in toward the clicked element and then eases back out. Apply to the screenshot `<img>` tag — **not** to the whole AbsoluteFill (so chrome bar stays stable).

```tsx
// Zoom: punch in toward the click point, hold, then ease back
const ZOOM_HOLD = 20;   // frames at peak zoom before pulling back
const ZOOM_IN  = 18;    // frames to reach peak
const ZOOM_OUT = 22;    // frames to return to 1x

const zoomOriginX = currentStep.x * 100; // CSS % for transform-origin
const zoomOriginY = currentStep.y * 100;

// Only zoom during click steps (not "none")
const shouldZoom = currentStep.action === "click" && framesAfterArrival >= 0;
const zoomPhaseFrame = shouldZoom ? framesAfterArrival : 0;
const zoomScale = shouldZoom
  ? zoomPhaseFrame < ZOOM_IN
    ? interpolate(zoomPhaseFrame, [0, ZOOM_IN], [1.0, 1.06])
    : zoomPhaseFrame < ZOOM_IN + ZOOM_HOLD
      ? 1.06
      : interpolate(zoomPhaseFrame, [ZOOM_IN + ZOOM_HOLD, ZOOM_IN + ZOOM_HOLD + ZOOM_OUT], [1.06, 1.0], { extrapolateRight: "clamp" })
  : 1.0;

// Apply to the screenshot img:
<img
  src={ATTACHED_IMAGES[0]}
  style={{
    width: "100%", height: "100%",
    objectFit: "cover", objectPosition: "top",
    transform: `scale(${zoomScale})`,
    transformOrigin: `${zoomOriginX}% ${zoomOriginY}%`,
    transition: "none", // Remotion handles timing
  }}
/>
```

Keep zoom range **1.0 → 1.06** max. Going higher than 1.1 looks jarring. The `transformOrigin` centered on the click point makes the element "come toward" the viewer.

---

## Double Ripple Click Effect

Two concentric rings expand from the click point at slightly different delays — the signature look of Loom/Screen Studio click effects.

```tsx
// Double ripple: ring 1 at frame 0, ring 2 at frame 4
const RIPPLE_DUR = 16;
const ripple1Scale   = isClicking ? interpolate(framesAfterArrival,     [0, RIPPLE_DUR], [0.1, 2.8]) : 0;
const ripple1Opacity = isClicking ? interpolate(framesAfterArrival,     [0, RIPPLE_DUR], [0.7, 0])   : 0;
const ripple2Scale   = isClicking && framesAfterArrival >= 4 ? interpolate(framesAfterArrival - 4, [0, RIPPLE_DUR], [0.1, 2.2]) : 0;
const ripple2Opacity = isClicking && framesAfterArrival >= 4 ? interpolate(framesAfterArrival - 4, [0, RIPPLE_DUR], [0.5, 0])   : 0;

// Render inside cursor wrapper div:
{/* Ring 1 — larger, faster */}
<div style={{
  position: "absolute",
  width: 44, height: 44, borderRadius: "50%",
  border: `2px solid ${BRAND.primary}`,
  transform: `translate(-50%, -50%) scale(${ripple1Scale})`,
  opacity: ripple1Opacity,
  left: 8, top: 8,
}} />
{/* Ring 2 — smaller, delayed */}
<div style={{
  position: "absolute",
  width: 32, height: 32, borderRadius: "50%",
  border: `1.5px solid rgba(255,255,255,0.6)`,
  transform: `translate(-50%, -50%) scale(${ripple2Scale})`,
  opacity: ripple2Opacity,
  left: 8, top: 8,
}} />
```

---

## Step Annotation Badge

Floating numbered step badge that appears above the cursor tooltip — helps viewers follow along ("Step 1 of 4"). Fades in when cursor arrives at each step, fades out before moving.

```tsx
// Badge: visible for 30 frames after arrival, then fade before cursor travels
const BADGE_VISIBLE = 30;
const showBadge = framesAfterArrival >= 0 && framesAfterArrival < BADGE_VISIBLE + 10;
const badgeOpacity = showBadge
  ? framesAfterArrival < 8
    ? interpolate(framesAfterArrival, [0, 8], [0, 1])
    : interpolate(framesAfterArrival, [BADGE_VISIBLE, BADGE_VISIBLE + 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  : 0;
const totalSteps = CURSOR_STEPS.filter(s => s.action !== "none").length;
const stepNum = stepIndex + 1;

// Render above cursor wrapper (higher position):
{badgeOpacity > 0 && (
  <div style={{
    position: "absolute",
    left: cursorX + 16,
    top: cursorY - 36,
    background: BRAND.primary,
    color: "#fff",
    padding: "3px 10px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: "nowrap",
    fontFamily: BRAND.font + ", sans-serif",
    opacity: badgeOpacity,
    boxShadow: `0 2px 8px ${BRAND.primary}66`,
    zIndex: 102,
    pointerEvents: "none",
    letterSpacing: 0.3,
  }}>
    Step {stepNum} of {totalSteps}
  </div>
)}
```

---

## Keyboard Key Pill

When cursor types in an input or presses Enter/Tab, show a floating keyboard key badge near the cursor. Makes typing interactions readable to the viewer.

```tsx
// Show keyboard key when elementType is "input" and we've been at this step a while
const framesAfterArrival = frame - currentStep.time - TRAVEL;
const isTypingStep = currentStep.elementType === "input";
// Show "Enter ↵" at the END of typing (when moving to next step)
// Show "Tab ⇥" if next step is also input
const nextStep = CURSOR_STEPS[Math.min(stepIndex + 1, CURSOR_STEPS.length - 1)];
const isNextInput = nextStep?.elementType === "input";
const KEY_SHOW_AT = (currentStep.dwellFrames ?? 30) - 15; // near end of dwell

const showKeyPill = isTypingStep && framesAfterArrival > KEY_SHOW_AT && framesAfterArrival < KEY_SHOW_AT + 20;
const keyLabel = isNextInput ? "Tab ⇥" : "Enter ↵";
const keyOpacity = showKeyPill
  ? interpolate(framesAfterArrival, [KEY_SHOW_AT, KEY_SHOW_AT + 6, KEY_SHOW_AT + 14, KEY_SHOW_AT + 20], [0, 1, 1, 0])
  : 0;

{keyOpacity > 0 && (
  <div style={{
    position: "absolute",
    left: cursorX - 20,
    top: cursorY + 28,
    background: "rgba(30,30,50,0.92)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff",
    padding: "4px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "monospace",
    opacity: keyOpacity,
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
    zIndex: 102,
    pointerEvents: "none",
  }}>
    {keyLabel}
  </div>
)}
```

---

## Bezier Arc Cursor Movement

For maximum naturalness, use quadratic bezier interpolation instead of linear lerp between waypoints:

```tsx
// Control point offset perpendicular to movement vector
const controlOffset = 0.15;
const dx = to.x - from.x;
const dy = to.y - from.y;
const cx = (from.x + to.x) / 2 + dy * controlOffset;
const cy = (from.y + to.y) / 2 - dx * controlOffset;

// Quadratic bezier at t (0-1):
const x = (1-t)*(1-t)*from.x + 2*(1-t)*t*cx + t*t*to.x;
const y = (1-t)*(1-t)*from.y + 2*(1-t)*t*cy + t*t*to.y;
```

Where `from` and `to` are the previous and current waypoint in video-coordinate space (multiply by width/height), and `t` is the spring progress (0→1).

## Micro-Jitter During Dwell

When the cursor is dwelling at a waypoint (not moving), add 1-2px sine-wave drift to simulate natural hand tremor:

```tsx
// Add to cursor x/y when progress >= 1 (cursor has arrived)
const jitterX = Math.sin(frame * 0.3) * 1.5;
const jitterY = Math.cos(frame * 0.4) * 1.0;
// cursorX += jitterX; cursorY += jitterY;
```
