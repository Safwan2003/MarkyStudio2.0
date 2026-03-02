---
title: Premium Match-Cut Transitions & Motion Blur
impact: HIGH
impactDescription: cinematic match cuts (zoom-into-button becomes next scene's background) and simulated motion blur for fast pans — the transition techniques that make cuts feel intentional and expensive
tags: match-cut, transition, zoom, cinematic, motion-blur, wipe, color-match, scene-change, camera-cut
---

## Match-Cut Transition Overview

A match cut: Scene A zooms infinitely into a UI button → the button's color fills the frame → Scene B opens from that color. No crossfade — the geometry connects the two scenes.

**Implementation in a multi-scene `<Sequence>` setup:**
Each scene is its own component. The cut is handled by:
1. Scene A zooms to `scale(40)` at its end — the button fills the frame
2. A color-fill overlay fades over the last few frames
3. Scene B's background is the same color — it starts at `scale(40)` and springs back to `scale(1)`

---

## Scene A — Zoom-Into-Button Exit

```tsx
// Scene A receives a `durationInFrames` prop from the Sequence
// The match-cut begins in the last 30 frames

const frame = useCurrentFrame();
const { fps, durationInFrames } = useVideoConfig();

const CUT_START = durationInFrames - 30;  // last 30 frames

// Exponential zoom into the button
const zoomProgress = interpolate(
  frame,
  [CUT_START, durationInFrames],
  [0, 1],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t * t * t }
);
const matchScale = interpolate(zoomProgress, [0, 1], [1, 40]);
const matchX = interpolate(zoomProgress, [0, 1], [0, -buttonCenterX]);  // pan to button center
const matchY = interpolate(zoomProgress, [0, 1], [0, -buttonCenterY]);

// Color overlay — fills the frame with the button's color
const overlayOpacity = interpolate(zoomProgress, [0.7, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Scene A button center coords (set these to match your layout)
const buttonCenterX = 0;   // offset from screen center in px
const buttonCenterY = 80;  // button is below center
const MATCH_COLOR = "#6366f1";  // the button's brand color
```

```tsx
<AbsoluteFill style={{ overflow: "hidden" }}>
  {/* All Scene A content — scaled and panned together */}
  <div style={{
    width: "100%", height: "100%",
    transform: `scale(${matchScale}) translate(${matchX}px, ${matchY}px)`,
    transformOrigin: "center center",
  }}>
    {/* ... Scene A content ... */}

    {/* The target button */}
    <div style={{
      position: "absolute",
      bottom: "18%", left: "50%",
      transform: "translateX(-50%)",
      background: MATCH_COLOR,
      color: "white",
      fontFamily: "Inter, sans-serif",
      fontSize: 18, fontWeight: 700,
      padding: "16px 40px", borderRadius: 100,
    }}>
      Get Started Free
    </div>
  </div>

  {/* Color fill overlay — last layer */}
  <div style={{
    position: "absolute", inset: 0,
    background: MATCH_COLOR,
    opacity: overlayOpacity,
    pointerEvents: "none",
  }} />
</AbsoluteFill>
```

---

## Scene B — Zoom-Out Entry (same color)

```tsx
// Scene B starts with the same color and zooms out to reveal content
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const MATCH_COLOR = "#6366f1";  // must match Scene A

// Spring zoom-out: starts at scale 40, springs back to 1
const zoomOutSpring = spring({
  frame,
  fps,
  config: { damping: 28, stiffness: 60 },  // slower spring = more cinematic
});
const entryScale = interpolate(zoomOutSpring, [0, 1], [12, 1]);

// Color overlay fades out as the scene reveals
const bgFadeOut = interpolate(frame, [0, 25], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
```

```tsx
<AbsoluteFill style={{ overflow: "hidden" }}>
  {/* Scene B background — same color as match cut */}
  <div style={{ position: "absolute", inset: 0, background: MATCH_COLOR }} />

  {/* Content zooms in from scale 12 */}
  <div style={{
    position: "absolute", inset: 0,
    transform: `scale(${entryScale})`,
    transformOrigin: "center center",
  }}>
    {/* ... Scene B content ... */}
  </div>

  {/* Color overlay fades out to reveal content */}
  <div style={{
    position: "absolute", inset: 0,
    background: MATCH_COLOR,
    opacity: bgFadeOut,
    pointerEvents: "none",
  }} />
</AbsoluteFill>
```

---

## Simulated Motion Blur

For fast camera pans, cursor dashes, or whip-transitions. CSS `filter: blur()` applied only during the fast phase:

```tsx
// Horizontal whip pan — blur peaks at maximum speed
const panProgress = interpolate(
  frame,
  [0, 15, 30],
  [0, 0.5, 1],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);

// Blur is highest at mid-point (fastest speed)
const speedCurve = Math.sin(panProgress * Math.PI);  // 0 → 1 → 0
const motionBlur = speedCurve * 12;  // max 12px horizontal blur

// Pan distance
const panX = interpolate(panProgress, [0, 1], [0, -width * 0.6]);
```

```tsx
<div style={{
  position: "absolute", inset: 0,
  transform: `translateX(${panX}px)`,
  filter: `blur(${motionBlur}px)`,
  // Directional blur illusion: stretch slightly on horizontal pan
  transform: `translateX(${panX}px) scaleX(${1 + speedCurve * 0.04})`,
}}>
  {/* Scene content being panned */}
</div>
```

### Cursor Motion Blur Trail

For the cursor darting between click targets — add a fading duplicate:

```tsx
// Current cursor position (from spring interpolation)
const cursorX = /* current X */;
const cursorY = /* current Y */;

// Trail: previous position with opacity + blur
const trailOpacity = interpolate(speedCurve, [0, 1], [0, 0.35]);
const trailBlur = speedCurve * 6;
```

```tsx
{/* Trail ghost — renders at previous position */}
{trailOpacity > 0.01 && (
  <div style={{
    position: "absolute",
    left: prevCursorX,
    top: prevCursorY,
    width: 28, height: 28,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.4)",
    opacity: trailOpacity,
    filter: `blur(${trailBlur}px)`,
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  }} />
)}

{/* Actual cursor */}
<div style={{
  position: "absolute",
  left: cursorX, top: cursorY,
  transform: "translate(-50%, -50%)",
  // ...cursor SVG/circle...
}} />
```

---

## Whip-Cut Transition (fast + blur)

One scene whips out left, next whips in from right — no crossfade needed:

```tsx
// In the master sequence controller
// Scene A: whips out left
const whipOut = interpolate(
  frame,
  [durationA - 12, durationA],
  [0, -width * 1.2],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t * t }
);
const whipOutBlur = interpolate(frame, [durationA - 12, durationA - 4], [0, 18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Scene B: whips in from right
const whipIn = interpolate(
  frame,
  [0, 14],
  [width * 1.2, 0],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1-t, 3) }
);
const whipInBlur = interpolate(frame, [0, 10], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
```

---

## Key Rules

- **Match color must be identical** — the `MATCH_COLOR` hex in Scene A and Scene B must match exactly
- **Button center offsets**: calculate `buttonCenterX/Y` as the pixel offset from screen center where the button is, then negate for the pan
- **Scene B spring config `damping: 28`**: slower than standard springs (damping 14–18) — the cinematic "breathing room" after a hard cut
- **Motion blur cap at 18px**: beyond 18px blur looks like a rendering error, not intentional motion
- **Whip cuts need 12–14 frames**: slower and the motion is too visible as a slide; faster and it reads as a flash
- **In `<Sequence>` setups**: each scene is isolated — match-cut logic lives entirely at the end of Scene A's component and beginning of Scene B's
