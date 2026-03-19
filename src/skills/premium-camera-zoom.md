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
    {ATTACHED_IMAGES[0] ? (
      <img
        src={ATTACHED_IMAGES[0]}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
      />
    ) : (
      /* Fallback: white content area with subtle grid */
      <div style={{
        width: "100%", height: "100%",
        backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        backgroundColor: "#f8fafc",
      }} />
    )}
  </div>
</AbsoluteFill>
```

---

## True Parallax Multi-Layer Zoom (Agency Quality)

The single-layer zoom looks flat. The professional version drives three layers from the same spring at different rates — background barely moves, midground floats past, foreground zooms fully. This creates real perceived depth.

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

const zoomProgress = spring({
  frame: frame - 40,
  fps,
  config: { damping: 26, stiffness: 35, mass: 1.5 }, // cinematic weight
});

// ── Layer 1: Deep background (grid + gradient orbs) ──────────────────────────
// Barely moves — only a subtle scale to prevent static feel
const bgScale  = interpolate(zoomProgress, [0, 1], [1.0, 1.12]);
const bgOffsetX = interpolate(zoomProgress, [0, 1], [0, -width * 0.04]); // drift opposite to zoom
const bgOffsetY = interpolate(zoomProgress, [0, 1], [0, -height * 0.03]);

// ── Layer 2: Midground floating UI cards ─────────────────────────────────────
// Moves ~40% of the foreground movement — "flies past" the camera as it pushes in
const mgOffsetY = interpolate(zoomProgress, [0, 1], [0, height * 0.18]);
const mgOffsetX = interpolate(zoomProgress, [0, 1], [0, -width * 0.06]);
const mgScale   = interpolate(zoomProgress, [0, 1], [1.0, 0.72]);
const mgOpacity = interpolate(zoomProgress, [0.7, 1], [1, 0]);

// ── Layer 3: Foreground product screen (full zoom) ───────────────────────────
// Screen inset coordinates — tune to match your device
const START_TOP    = 33.6;
const START_LEFT   = 33.6;
const START_WIDTH  = 29;
const START_HEIGHT = 32;

const top    = interpolate(zoomProgress, [0, 1], [START_TOP,    0]);
const left   = interpolate(zoomProgress, [0, 1], [START_LEFT,   0]);
const w      = interpolate(zoomProgress, [0, 1], [START_WIDTH,  100]);
const h      = interpolate(zoomProgress, [0, 1], [START_HEIGHT, 100]);
const radius = interpolate(zoomProgress, [0, 1], [8, 0]);
const deviceOpacity = interpolate(zoomProgress, [0.8, 1], [1, 0]);
// Sheen sweep — fires once as zoom completes
const sheenX = interpolate(zoomProgress, [0.5, 1.0], [-100, 220]);
```

```tsx
<AbsoluteFill style={{ background: "#0a0a14", overflow: "hidden" }}>

  {/* ── Layer 1: Background ── */}
  <div style={{
    position: "absolute", inset: 0,
    transform: `scale(${bgScale}) translate(${bgOffsetX}px, ${bgOffsetY}px)`,
    transformOrigin: "center center",
    willChange: "transform",
  }}>
    {/* Deep-space gradient */}
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.18) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(59,130,246,0.12) 0%, transparent 60%)",
    }} />
    {/* Dot grid */}
    <div style={{
      position: "absolute", inset: 0, opacity: 0.15,
      backgroundImage: "radial-gradient(rgba(148,163,184,0.8) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    }} />
  </div>

  {/* ── Layer 2: Midground floating UI cards ── */}
  <div style={{
    position: "absolute", inset: 0,
    transform: `scale(${mgScale}) translate(${mgOffsetX}px, ${mgOffsetY}px)`,
    transformOrigin: "center center",
    opacity: mgOpacity,
    willChange: "transform, opacity",
  }}>
    {/* Left floating card */}
    <div style={{
      position: "absolute", top: "20%", left: "5%",
      width: 260, padding: "16px 20px", borderRadius: 16,
      background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
    }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>ACTIVE USERS</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", fontFamily: "Inter, sans-serif" }}>2,847</div>
      <div style={{ fontSize: 12, color: "#22c55e", marginTop: 4, fontFamily: "Inter, sans-serif" }}>↑ 12.4% this week</div>
    </div>
    {/* Right floating card */}
    <div style={{
      position: "absolute", top: "55%", right: "6%",
      width: 220, padding: "14px 18px", borderRadius: 14,
      background: "rgba(99,102,241,0.15)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(99,102,241,0.3)",
      boxShadow: "0 8px 40px rgba(99,102,241,0.2)",
    }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>CONVERSION</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontFamily: "Inter, sans-serif" }}>94.2%</div>
    </div>
  </div>

  {/* ── Layer 3: Device frame (fades as screen expands) ── */}
  {deviceOpacity > 0 && (
    <div style={{ position: "absolute", inset: 0, opacity: deviceOpacity }}>
      <div style={{ width: "100%", height: "100%", background: "#111827" }}>
        {/* Your laptop/device image or CSS frame here */}
      </div>
    </div>
  )}

  {/* ── Layer 4: Product screen — zooms to fill frame ── */}
  <div style={{
    position: "absolute",
    top: `${top}%`, left: `${left}%`,
    width: `${w}%`, height: `${h}%`,
    borderRadius: `${radius}px`,
    overflow: "hidden",
    zIndex: 10,
    willChange: "top, left, width, height",
  }}>
    {ATTACHED_IMAGES[0] ? (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    ) : (
      <div style={{ width: "100%", height: "100%", background: "#f8fafc" }} />
    )}

    {/* Sheen sweep fires as zoom completes */}
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      background: "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.35) 43%, transparent 48%)",
      transform: `translateX(${sheenX}%)`,
      zIndex: 20,
    }} />
  </div>

</AbsoluteFill>
```

**Why this looks premium**: the background drifts *against* the zoom direction (slight parallax counter-movement), the midground cards scale down and slide out of frame as if the camera physically flew past them, and the sheen sweep fires exactly as the screen hits full size — like a camera lens flare on impact.

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

## Works Best with Reconstructed UI

Camera zoom is dramatically more effective with vector-reconstructed UI than with screenshot overlays:

- **Screenshot overlay**: Zoom past 1.5× causes pixelation and blur
- **Reconstructed UI**: Vectors stay perfectly crisp at any zoom level — zoom 2× or 3× with no quality loss

**Recommended pairing**: Use `premium-reconstructed-ui` for the showcase scene, then apply camera zoom to push into the specific UI element being demonstrated:

```tsx
// Zoom into a specific reconstructed component (e.g., a metric card)
const zoomProgress = spring({ frame: frame - 60, fps, config: { damping: 200, stiffness: 80 } });
const scale = interpolate(zoomProgress, [0, 1], [1.0, 1.8]);
const targetX = 0.65 * width;  // metric card position
const targetY = 0.3 * height;

const translateX = (width / 2 - targetX) * (scale - 1);
const translateY = (height / 2 - targetY) * (scale - 1);

// Apply to the reconstructed UI container
<div style={{
  position: "absolute", inset: 0,
  transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
  transformOrigin: "center center",
}}>
  <ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} />
</div>
```
