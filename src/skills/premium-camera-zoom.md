---
title: Premium Camera Zoom / Hero Reveal
impact: HIGH
impactDescription: creates cinematic "zoom into screen" reveal — starts with a device mockup wide shot, then zooms into the product UI for maximum impact
tags: camera-zoom, hero-reveal, laptop-mockup, zoom, cinematic, pan, parallax
---

## Hero Zoom: Laptop → Full Screen

The most cinematic SaaS technique: start wide showing a laptop on a desk, then slowly spring-zoom into the screen until the product UI fills the frame.

### Spring-Based Zoom

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Delay the zoom — hold the wide shot for 1.5s (45 frames) first
const zoomProgress = spring({
  frame: frame - 45,
  fps,
  config: { damping: 26, stiffness: 35, mass: 1.5 }, // Heavy, slow, cinematic
});

// Laptop screen coordinates as % of video (tune to match your device image)
const START_TOP    = 33.6;  // % from top
const START_LEFT   = 33.6;  // % from left
const START_WIDTH  = 29;    // % of video width
const START_HEIGHT = 32;    // % of video height

// Interpolate from screen inset → full video
const top    = interpolate(zoomProgress, [0, 1], [START_TOP,    0]);
const left   = interpolate(zoomProgress, [0, 1], [START_LEFT,   0]);
const width  = interpolate(zoomProgress, [0, 1], [START_WIDTH,  100]);
const height = interpolate(zoomProgress, [0, 1], [START_HEIGHT, 100]);
const radius = interpolate(zoomProgress, [0, 1], [5,            0]);

// Fade out the device photo as the screen fills the frame
const deviceOpacity = interpolate(zoomProgress, [0.85, 1], [1, 0]);
```

### Rendering

```tsx
<AbsoluteFill style={{ backgroundColor: "#000" }}>
  {/* Laptop/device background photo — fades as zoom completes */}
  {deviceOpacity > 0 && (
    <AbsoluteFill style={{ opacity: deviceOpacity }}>
      {/* Use a flat color or your device image */}
      <div style={{ width: "100%", height: "100%", background: "#0a0a0a" }} />
    </AbsoluteFill>
  )}

  {/* Animated content layer */}
  <div style={{
    position: "absolute",
    top:    `${top}%`,
    left:   `${left}%`,
    width:  `${width}%`,
    height: `${height}%`,
    borderRadius: `${radius}px`,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    zIndex: 10,
  }}>
    {/* Your product UI / dashboard / screenshot here */}
  </div>
</AbsoluteFill>
```

---

## Continuous Slow Pan (Documentary Style)

For Problem/Solution scenes — a gentle continuous scale/pan that keeps the viewer in the same world:

```tsx
// Starts at scale 1.0 (zoomed out) and slowly pushes to 2.2
const cameraScale = interpolate(frame, [0, 150], [1.0, 2.2], { extrapolateRight: "clamp" });
const cameraY     = interpolate(frame, [0, 150], [0,   1],   { extrapolateRight: "clamp" });

<div style={{
  width: "100%", height: "100%",
  transform: `scale(${cameraScale}) translateY(${cameraY}%)`,
  transformOrigin: "center center",
  willChange: "transform",
}}>
  {/* background content */}
</div>
```

**Continuity trick**: If a previous scene ends at `scale(2.2)`, start the next scene at `scale(2.2)` and continue pushing to `scale(2.8)`. This creates a seamless "push" across scene cuts.

---

## Slow Background Scale (Zoom-In Feel Without Moving Content)

For scenes where you want the background to slowly zoom while foreground stays stable:

```tsx
// Subtle slow scale — feels alive without being distracting
const bgScale = interpolate(frame, [0, 300], [1, 1.1]);
const bgPan   = interpolate(frame, [0, 300], [0, -20]); // subtle upward drift

<AbsoluteFill style={{ overflow: "hidden" }}>
  {/* Slow-scaling background */}
  <div style={{
    position: "absolute", inset: 0,
    transform: `scale(${bgScale}) translateY(${bgPan}px)`,
    transformOrigin: "center center",
  }}>
    {/* Background image or gradient */}
  </div>

  {/* Foreground content — unaffected */}
  <div style={{ position: "relative", zIndex: 10 }}>
    {/* ... */}
  </div>
</AbsoluteFill>
```

---

## Device Screen Inset Coordinates

Standard coordinates for common device image configurations. Adjust to match your specific image:

| Device Position | `top` | `left` | `width` | `height` |
|----------------|-------|--------|---------|----------|
| Laptop centered front-facing | 34.5% | 34.5% | 27.5% | 30% |
| Laptop angled (perspective) | 31% | 27.5% | 36% | 39% |
| Monitor slightly tilted | 31% | 27.5% | 36% | 39% |

Add `transform: perspective(1000px) rotateY(-5deg) rotateX(2deg)` to the inset div if the device image is shown in perspective.

---

## Sheen / Glass Sweep Effect

A horizontal light sweep that slides across the UI for premium feel:

```tsx
const SHEEN_DURATION = 120; // frames to complete one sweep
const sheenPos = interpolate(frame, [0, SHEEN_DURATION], [-100, 200]);

<div style={{
  position: "absolute", inset: 0,
  background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, transparent 50%)",
  transform: `translateX(${sheenPos}%)`,
  zIndex: 20,
  pointerEvents: "none",
}} />
```
